import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { Plus, Settings, Trash2 } from 'lucide-react';
import { useModelStore } from '../../stores/modelStore';
import { gsap } from 'gsap';

interface SystemNodeProps {
  id: string;
  data: any;
}

const SystemNode: React.FC<SystemNodeProps> = ({ id, data }) => {
  const { node, onEdit, onAddChild, onDelete, onModelChange, onTemperatureChange, onMaxTokensChange } = data;
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(node.userMessage || '');
  
  const { models } = useModelStore();
  const model = models.find(m => m.id === node.modelId);
  
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (nodeRef.current && node.userMessage) {
      console.debug(`System Node ${id} width: ${nodeRef.current.offsetWidth}px`);
    }
  }, [node.userMessage, id]);

  useEffect(() => {
    setSystemPrompt(node.userMessage || '');
  }, [node.userMessage]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    onEdit(node.id, systemPrompt, 'system');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setSystemPrompt(node.userMessage || '');
    }
  };

  const nodeHeight = isEditing || showSettings ? 'auto' : 'min-h-[100px]';

  return (
    <div 
      ref={nodeRef}
      className={`node-content bg-white rounded-lg overflow-hidden border border-neutral-200 shadow-minimal ${nodeHeight}`}
    >
      <div className="flex justify-between items-center p-2 text-neutral-700 border-b border-neutral-100">
        <div className="flex items-center">
          <Settings size={14} className="mr-1.5 text-neutral-500" />
          <span className="text-xs font-medium">系统提示词</span>
        </div>
        
        <div className="flex space-x-1 node-toolbar">
          <button 
            className="p-1 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 rounded transition-colors"
            onClick={() => setShowSettings(!showSettings)}
            title="模型设置"
          >
            <Settings size={12} />
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
              onChange={(e) => onModelChange(node.id, e.target.value)}
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
              onChange={(e) => onMaxTokensChange(node.id, parseInt(e.target.value))}
              className="w-full accent-neutral-700"
            />
          </div>
        </div>
      )}

      <div className="p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full h-32 p-2.5 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
            placeholder="在此输入系统提示词..."
          />
        ) : (
          <div 
            className="min-h-[60px] cursor-pointer text-sm" 
            onClick={handleEdit}
            style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
          >
            {node.userMessage || (
              <span className="text-neutral-400 italic">
                点击添加系统提示词...
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-2 flex justify-end space-x-2 border-t border-neutral-100">
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

export default SystemNode;