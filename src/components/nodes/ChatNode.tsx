import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { Plus, Send, RefreshCcw, Copy, Settings, Trash2, MessageSquare, MoreHorizontal } from 'lucide-react';
import { useModelStore } from '../../stores/modelStore';
import { gsap } from 'gsap';
import { showSuccess, showInfo, showWarning } from '../../utils/notification';

interface ChatNodeProps {
  id: string;
  data: any;
}

const ChatNode: React.FC<ChatNodeProps> = ({ id, data }) => {
  const { node, streamingResponse, onEdit, onAddChild, onDelete, onRetry, onModelChange, onTemperatureChange, onMaxTokensChange } = data;
  const [userMessage, setUserMessage] = useState(node.userMessage || '');
  const [isEditingUser, setIsEditingUser] = useState(!node.userMessage);
  const [showSettings, setShowSettings] = useState(false);
  
  const { models } = useModelStore();
  const model = models.find(m => m.id === node.modelId);
  
  const userInputRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (nodeRef.current) {
      gsap.fromTo(nodeRef.current, 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
      );
    }
  }, []);

  
  // Debug log for width changes
  useEffect(() => {
    if (nodeRef.current && node.assistantMessage) {
      console.debug(`Node ${id} width: ${nodeRef.current.offsetWidth}px`);
    }
  }, [node.assistantMessage, id]);


  useEffect(() => {
    if (isEditingUser && userInputRef.current) {
      userInputRef.current.focus();
      userInputRef.current.setSelectionRange(
        userInputRef.current.value.length,
        userInputRef.current.value.length
      );
    }
  }, [isEditingUser]);

  const handleSubmitUserMessage = () => {
    if (!userMessage.trim()) return;
    
    onEdit(node.id, userMessage, 'user');
    // setIsEditingUser(false); // 发送后不切换编辑态，输入框内容不变
    
    // If there's no AI response yet, trigger one
    if (!node.assistantMessage && !node.isStreaming) {
      setTimeout(() => {
        onRetry(node.id);
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmitUserMessage();
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    
    // Show a brief animation
    const button = document.activeElement;
    if (button) {
      gsap.fromTo(
        button,
        { backgroundColor: 'rgba(79, 70, 229, 0.2)' },
        { backgroundColor: 'transparent', duration: 1 }
      );
    }
    
    // 显示通知
    showSuccess('内容已复制到剪贴板');
  };

  // 阻止滚轮事件冒泡，仅在消息区域内滚动
  const handleWheel = useCallback((e: WheelEvent) => {
    // 检查事件是否发生在节点容器内
    if (nodeRef.current && nodeRef.current.contains(e.target as Node)) {
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    // 使用捕获阶段监听滚轮事件
    const node = nodeRef.current;
    if (node) {
      node.addEventListener('wheel', handleWheel, { capture: true });
    }

    return () => {
      if (node) {
        node.removeEventListener('wheel', handleWheel, { capture: true });
      }
    };
  }, [handleWheel]);

  return (
    <div 
      ref={nodeRef}
      className="node-content bg-white rounded-lg overflow-hidden border border-neutral-200 shadow-minimal"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-neutral-400 !border-white"
      />

      <div className="flex justify-between items-center p-2 text-neutral-700 border-b border-neutral-100">
        <div className="flex items-center">
          <MessageSquare size={14} className="mr-1.5 text-neutral-500" />
          <span className="text-xs font-medium">对话节点</span>
        </div>
        
        <div className="flex space-x-1 node-toolbar">
          <button 
            className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            onClick={() => setShowSettings(!showSettings)}
            title="模型设置"
          >
            <Settings size={12} />
          </button>
          <button 
            className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            onClick={() => {
              onDelete(node.id);
              showWarning('节点已删除');
            }}
            title="删除节点"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 bg-neutral-50 border-b border-neutral-100">
          <div className="mb-3">
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              模型
            </label>
            <select
              value={node.modelId || ''}
              onChange={(e) => {
                onModelChange(node.id, e.target.value);
                const selectedModel = models.find(m => m.id === e.target.value);
                if (selectedModel) {
                  showInfo(`已切换到模型: ${selectedModel.name}`);
                }
              }}
              className="w-full p-1.5 text-xs border border-neutral-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-neutral-700">
                温度
              </label>
              <span className="text-xs text-neutral-500">{node.temperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={node.temperature}
              onChange={(e) => onTemperatureChange(node.id, parseFloat(e.target.value))}
              className="w-full accent-neutral-700"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-neutral-700">
                最大令牌数
              </label>
              <span className="text-xs text-neutral-500">{node.maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={node.maxTokens}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                onMaxTokensChange(node.id, value);
                if (value % 1024 === 0) { // 只在1024的整数倍时显示通知
                  showInfo(`最大令牌数设置为: ${value}`);
                }
              }}
              className="w-full accent-neutral-700"
            />
          </div>
        </div>
      )}

      <div 
        className="p-3 border-b border-neutral-100"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {isEditingUser ? (
          <div className="relative">
            <textarea
              ref={userInputRef}
              value={userMessage}
              onChange={(e) => {
                setUserMessage(e.target.value);
                onEdit(node.id, e.target.value, 'user', true);
              }}
              onBlur={() => {
                onEdit(node.id, userMessage, 'user', false);
                if (userMessage.trim() && userMessage !== node.userMessage) {
                  showInfo('消息已保存');
                }
              }}
              className="w-full p-2.5 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 text-sm"
              placeholder="在此输入您的消息..."
              onKeyDown={handleKeyDown}
              rows={3}
            />
            <div className="flex justify-end mt-2 pr-2" style={{ marginTop: "-30px" }}>
              <button
                onClick={handleSubmitUserMessage}
                disabled={!userMessage.trim()}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
                  userMessage.trim() 
                    ? 'send-button'
                    : 'send-button disabled'
                } transition-colors`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <div 
              className="pr-8 max-h-[200px] min-h-[80px]"
              onClick={() => setIsEditingUser(true)}
            >
              {node.userMessage || <span className="text-gray-400 italic">Click to add message...</span>}
            </div>
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                onClick={() => handleCopyToClipboard(node.userMessage)}
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div 
        className="assistant-message p-3 relative"
        onWheel={(e) => {
          e.stopPropagation();
        }}
      >
        {node.isStreaming ? (
          <div className="flex items-center space-x-2 text-gray-500 mb-2">
            <div className="animate-pulse">AI is thinking...</div>
            <div className="animate-bounce delay-100">.</div>
            <div className="animate-bounce delay-200">.</div>
            <div className="animate-bounce delay-300">.</div>
          </div>
        ) : node.error ? (
          <div className="text-red-500 mb-2">
            Error: {node.error}
          </div>
        ) : null}

        {(streamingResponse !== null && node.isStreaming) ? (
          <div className="relative group">
            <div 
              className="preview-container"
              onWheel={(e: React.WheelEvent) => {
                e.stopPropagation();
              }}
            >
              <MdPreview 
                editorId={`preview-${node.id}`}
                modelValue={streamingResponse}
                className="md-preview overflow-auto break-words"
                style={{ backgroundColor: 'transparent', maxWidth: '100%' }}
                previewTheme="vuepress"
              />
            </div>
          </div>
        ) : node.assistantMessage ? (
          <div className="relative group">
            <div 
              className="preview-container"
              onWheel={(e: React.WheelEvent) => {
                e.stopPropagation();
              }}
            >
              <MdPreview 
                editorId={`preview-${node.id}`}
                modelValue={node.assistantMessage}
                className="md-preview overflow-auto break-words"
                style={{ backgroundColor: 'transparent', maxWidth: '100%' }}
                previewTheme="vuepress"
              />
            </div>
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                onClick={() => handleCopyToClipboard(node.assistantMessage)}
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ) : !node.isStreaming ? (
          <div className="text-neutral-400 italic min-h-[160px] text-sm">
            {node.error ? '请点击重试获取AI回复' : 'AI回复将显示在这里'}
          </div>
        ) : null}
      </div>

      <div className="flex justify-between items-center border-t border-neutral-100 p-2">
        <div className="flex space-x-2">
          <button 
            onClick={() => handleCopyToClipboard(node.assistantMessage)}
            className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            title="复制到剪贴板"
          >
            <Copy size={14} />
          </button>
          <button 
            onClick={() => {
              onRetry(node.id);
              showInfo('正在重新生成回复...');
            }} 
            className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            title="重新生成回复"
          >
            <RefreshCcw size={14} />
          </button>
        </div>
        
        <button 
          className="flex items-center justify-center p-1.5 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
          onClick={() => onAddChild(node.id)}
          title="添加子节点"
        >
          <Plus size={14} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-neutral-400 !border-white"
      />
    </div>
  );
};

export default ChatNode;