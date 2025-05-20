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
      className={`node-content system-node shadow-md rounded-lg overflow-hidden ${nodeHeight}`}
    >
      <div className="bg-blue-600 text-white p-2 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Settings size={16} />
          <span className="font-medium">System Prompt</span>
        </div>
        
        <div className="flex space-x-1 node-toolbar">
          <button 
            className="p-1 rounded hover:bg-blue-500 transition-colors"
            onClick={() => setShowSettings(!showSettings)}
            title="Model Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
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

      <div className="p-3">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter system prompt..."
          />
        ) : (
          <div 
            className="min-h-[60px] cursor-pointer overflow-wrap-break-word" 
            onClick={handleEdit}
            style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
          >
            {node.userMessage || (
              <span className="text-gray-400 italic">
                Click to add system prompt...
              </span>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 p-2 flex justify-end space-x-2 border-t border-blue-100">
        <button 
          className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          onClick={() => onAddChild(node.id)}
        >
          <Plus size={14} />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#2563eb' }}
      />
    </div>
  );
};

export default SystemNode;