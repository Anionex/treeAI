import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Trash2 } from 'lucide-react';
import { useModelStore } from '../stores/modelStore';
import { Model } from '../types';
import { gsap } from 'gsap';
import { showSuccess, showInfo, showWarning, showError } from '../utils/notification';
interface ModelManagerProps {
  onClose: () => void;
}

const ModelManager: React.FC<ModelManagerProps> = ({ onClose }) => {
  const { models, createModel, updateModel, deleteModel } = useModelStore();
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Animation for modal entrance
    if (modalRef.current) {
      gsap.fromTo(modalRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" }
      );
    }

    // Close on Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleAddModel = () => {
    const newModel: Model = {
      id: crypto.randomUUID(),
      name: 'New Model',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      modelName: 'gpt-4',
      defaultSystemPrompt: 'You are a helpful assistant.',
      maxTokens: 2048,
      temperature: 0.7
    };
    
    setEditingModel(newModel);
  };

  const handleEditModel = (model: Model) => {
    setEditingModel({ ...model });
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingModel) return;
    
    if (models.some(m => m.id === editingModel.id)) {
      updateModel(editingModel);
    } else {
      createModel(editingModel);
    }
    
    setEditingModel(null);
  };

  const handleDeleteModel = (id: string) => {
    if (confirm('Are you sure you want to delete this model?')) {
      deleteModel(id);
      if (editingModel?.id === id) {
        setEditingModel(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-subtle max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-neutral-100">
          <h2 className="text-lg font-medium text-neutral-800">模型管理</h2>
          <button 
            className="text-neutral-500 hover:text-neutral-700 p-1 rounded-md hover:bg-neutral-50"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r border-neutral-100 p-4 overflow-y-auto">
            <div className="mb-3 flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-700">模型列表</h3>
              <button 
                className="flex items-center space-x-1 text-neutral-600 hover:text-neutral-800 p-1 rounded hover:bg-neutral-50"
                onClick={handleAddModel}
              >
                <Plus size={14} />
                <span className="text-xs">添加</span>
              </button>
            </div>
            
            <div className="space-y-1">
              {models.length === 0 ? (
                <div className="text-center text-neutral-400 p-4 text-sm">
                  暂无配置模型
                </div>
              ) : (
                models.map(model => (
                  <div 
                    key={model.id}
                    className={`py-2 px-3 rounded-md cursor-pointer flex justify-between items-center ${
                      editingModel?.id === model.id ? 'bg-neutral-100 text-neutral-900' : 'hover:bg-neutral-50 text-neutral-600'
                    }`}
                    onClick={() => handleEditModel(model)}
                  >
                    <span className="truncate text-sm">{model.name}</span>
                    <button 
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded hover:bg-neutral-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="w-2/3 p-4 overflow-y-auto">
            {editingModel ? (
              <form ref={formRef} onSubmit={handleSaveModel} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    模型名称
                  </label>
                  <input
                    type="text"
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    API 地址
                  </label>
                  <input
                    type="url"
                    value={editingModel.baseUrl}
                    onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    placeholder="https://api.openai.com/v1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    API 密钥
                  </label>
                  <input
                    type="password"
                    value={editingModel.apiKey}
                    onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    模型标识 (例如: gpt-4)
                  </label>
                  <input
                    type="text"
                    value={editingModel.modelName}
                    onChange={(e) => setEditingModel({ ...editingModel, modelName: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    默认系统提示词
                  </label>
                  <textarea
                    value={editingModel.defaultSystemPrompt}
                    onChange={(e) => setEditingModel({ ...editingModel, defaultSystemPrompt: e.target.value })}
                    className="w-full p-2 border border-neutral-200 rounded-md h-32 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-neutral-700">
                        默认温度
                      </label>
                      <span className="text-xs text-neutral-500">{editingModel.temperature.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={editingModel.temperature}
                      onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })}
                      className="w-full accent-neutral-700"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-medium text-neutral-700">
                        默认最大令牌数
                      </label>
                      <span className="text-xs text-neutral-500">{editingModel.maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="256"
                      max="4096"
                      step="256"
                      value={editingModel.maxTokens}
                      onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) })}
                      className="w-full accent-neutral-700"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    className="px-4 py-2 border border-neutral-200 rounded-md text-neutral-600 hover:bg-neutral-50 text-sm transition-colors"
                    onClick={() => setEditingModel(null)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 text-sm transition-colors"
                  >
                    <Save size={14} />
                    <span>保存模型</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                <div className="text-center p-6 bg-neutral-50 rounded-lg border border-neutral-100 max-w-md">
                  <h3 className="text-base font-medium text-neutral-700 mb-2">模型配置</h3>
                  <p className="mb-4 text-sm text-neutral-500">
                    从左侧列表选择一个模型进行编辑，或创建一个新模型。
                  </p>
                  <button 
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 text-sm transition-colors"
                    onClick={handleAddModel}
                  >
                    <Plus size={14} />
                    <span>添加新模型</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelManager;