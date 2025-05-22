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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold gradient-text">Model Manager</h2>
          <button 
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r border-gray-200 p-3 overflow-y-auto">
            <div className="mb-3 flex justify-between items-center">
              <h3 className="font-semibold text-gray-700">Your Models</h3>
              <button 
                className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800"
                onClick={handleAddModel}
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {models.length === 0 ? (
                <div className="text-center text-gray-500 p-4">
                  No models configured yet
                </div>
              ) : (
                models.map(model => (
                  <div 
                    key={model.id}
                    className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${
                      editingModel?.id === model.id ? 'bg-indigo-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleEditModel(model)}
                  >
                    <span className="truncate">{model.name}</span>
                    <button 
                      className="text-gray-500 hover:text-red-600 p-1"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API URL
                  </label>
                  <input
                    type="url"
                    value={editingModel.baseUrl}
                    onChange={(e) => setEditingModel({ ...editingModel, baseUrl: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://api.openai.com/v1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={editingModel.apiKey}
                    onChange={(e) => setEditingModel({ ...editingModel, apiKey: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Name (e.g., gpt-4)
                  </label>
                  <input
                    type="text"
                    value={editingModel.modelName}
                    onChange={(e) => setEditingModel({ ...editingModel, modelName: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default System Prompt
                  </label>
                  <textarea
                    value={editingModel.defaultSystemPrompt}
                    onChange={(e) => setEditingModel({ ...editingModel, defaultSystemPrompt: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Temperature: {editingModel.temperature.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={editingModel.temperature}
                      onChange={(e) => setEditingModel({ ...editingModel, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Max Tokens: {editingModel.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="4096"
                      step="256"
                      value={editingModel.maxTokens}
                      onChange={(e) => setEditingModel({ ...editingModel, maxTokens: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-3 border-t border-gray-200">
                  <button
                    type="button"
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    onClick={() => setEditingModel(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center space-x-2 px-4 py-2 gradient-primary-button text-white rounded-md transition-colors"
                  >
                    <Save size={16} />
                    <span>Save Model</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200 max-w-md">
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Model Configuration</h3>
                  <p className="mb-4">
                    Select a model from the list to edit or create a new one.
                  </p>
                  <button 
                    className="inline-flex items-center space-x-2 px-4 py-2 gradient-primary-button text-white rounded-md transition-colors"
                    onClick={handleAddModel}
                  >
                    <Plus size={16} />
                    <span>Add New Model</span>
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