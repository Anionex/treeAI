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
      className="node-content bg-white rounded-2xl overflow-hidden"
    >
      <Handle
        type="target"
        position={Position.Top}
      />

      <div className="chat-node-header text-white p-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} />
          <span className="font-medium">Chat Node</span>
        </div>
        
        <div className="flex space-x-1 node-toolbar">
          <button 
            className="p-1 rounded hover:bg-blue-500/30 transition-colors"
            onClick={() => setShowSettings(!showSettings)}
            title="Model Settings"
          >
            <Settings size={16} />
          </button>
          <button 
            className="p-1 rounded hover:bg-blue-500/30 transition-colors"
            onClick={() => onDelete(node.id)}
            title="Delete Node"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 settings-panel">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={node.modelId || ''}
              onChange={(e) => onModelChange(node.id, e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        className="user-message border-b border-gray-100 p-2"
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
              }}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter message..."
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
          <div className="text-gray-400 italic min-h-[160px]">
            {node.error ? 'Retry to get AI response' : 'AI response will appear here'}
          </div>
        ) : null}
      </div>

      <div className="flex justify-between items-center border-t border-gray-200 pt-2 px-2 pb-2 bg-gradient-to-b from-gray-50 to-white">
        <div className="flex space-x-2">
          <button 
            onClick={() => handleCopyToClipboard(node.assistantMessage)}
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Copy to clipboard"
          >
            <Copy size={18} />
          </button>
          <button 
            onClick={() => onRetry(node.id)} 
            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
            title="Regenerate response"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
        
        <button 
          className="gradient-button flex items-center space-x-1 px-1.5 py-1.5 text-white rounded-full"
          onClick={() => onAddChild(node.id)}
        >
          <Plus size={14} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
      />
    </div>
  );
};

export default ChatNode;