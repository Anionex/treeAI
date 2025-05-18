import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import { MdPreview } from 'md-editor-rt';
import 'md-editor-rt/lib/preview.css';
import { Plus, Send, RefreshCcw, Copy, Settings, Trash2, MessageSquare } from 'lucide-react';
import { useModelStore } from '../../stores/modelStore';
import { gsap } from 'gsap';

interface ChatNodeProps {
  id: string;
  data: any;
}

const ChatNode: React.FC<ChatNodeProps> = ({ id, data }) => {
  const { node, onEdit, onAddChild, onDelete, onRetry, onModelChange, onTemperatureChange, onMaxTokensChange } = data;
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

  // 监控并限制节点宽度
  // 节点最大宽度常量
  const NODE_MAX_WIDTH = 400;

  useEffect(() => {
    if (!nodeRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const element = entry.target as HTMLDivElement;
        if (element.offsetWidth > NODE_MAX_WIDTH) {
          element.style.width = `${NODE_MAX_WIDTH}px`;
          element.style.maxWidth = `${NODE_MAX_WIDTH}px`;
          console.log(`Force resizing Node ${id} from ${element.offsetWidth}px to ${NODE_MAX_WIDTH}px`);
        }
      }
    });
    
    resizeObserver.observe(nodeRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [id]);
  
  // Debug log for width changes
  useEffect(() => {
    if (nodeRef.current && node.assistantMessage) {
      console.log(`Node ${id} width: ${nodeRef.current.offsetWidth}px`);
    }
  }, [node.assistantMessage, id]);

  useEffect(() => {
    // Only update userMessage from node if not editing or current input is empty
    if (!isEditingUser || !userMessage) {
      setUserMessage(node.userMessage || '');
    }
  }, [node.userMessage, isEditingUser, userMessage]);

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
      className="node-content bg-white rounded-lg shadow-md overflow-hidden"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#4f46e5' }}
      />

      <div className="bg-indigo-600 text-white p-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} />
          <span className="font-medium">Chat Node</span>
        </div>
        
        <div className="flex space-x-1 node-toolbar">
          <button 
            className="p-1 rounded hover:bg-indigo-500 transition-colors"
            onClick={() => setShowSettings(!showSettings)}
            title="Model Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            className="p-1 rounded hover:bg-indigo-500 transition-colors"
            onClick={() => onDelete(node.id)}
            title="Delete Node"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 bg-indigo-50 border-b border-indigo-200">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={node.modelId || ''}
              onChange={(e) => onModelChange(node.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {models.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
          
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {node.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={node.temperature}
              onChange={(e) => onTemperatureChange(node.id, parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens: {node.maxTokens}
            </label>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={node.maxTokens}
              onChange={(e) => onMaxTokensChange(node.id, parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      <div 
        className="user-message p-3 border-b border-gray-100"
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
                onEdit(node.id, e.target.value, 'user');
              }}
              className="w-full p-2 border border-gray-300 rounded-md min-h-[30px] pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Type your message..."
              onKeyDown={handleKeyDown}
            />
            <button
              className="absolute bottom-2 right-2 p-1 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
              onClick={handleSubmitUserMessage}
              disabled={!userMessage.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        ) : (
          <div className="relative group">
            <div 
              className="pr-8 min-h-[160px]"
              onClick={() => setIsEditingUser(true)}
            >
              {node.userMessage || <span className="text-gray-400 italic">Click to add message...</span>}
            </div>
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
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

        {node.assistantMessage ? (
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
                className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                onClick={() => handleCopyToClipboard(node.assistantMessage)}
                title="Copy"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ) : !node.isStreaming ? (
          <div className="text-gray-400 italic min-h-[160px]">
            {node.error ? 'Retry to get AI response' : 'AI response will appear here'}
          </div>
        ) : null}
      </div>

      <div className="bg-gray-50 p-2 flex justify-between border-t border-gray-100">
        <button 
          className="flex items-center space-x-1 px-2 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          onClick={() => onRetry(node.id)}
          disabled={!node.userMessage || node.isStreaming}
        >
          <RefreshCcw size={14} />
          <span className="text-sm">Retry</span>
        </button>
        
        <button 
          className="flex items-center space-x-1 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          onClick={() => onAddChild(node.id)}
        >
          <Plus size={14} />
          <span className="text-sm">Add Child</span>
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#4f46e5' }}
      />
    </div>
  );
};

export default ChatNode;