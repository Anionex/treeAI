import { create } from 'zustand';
import { Model } from '../types';
import db from '../db/db';
import { showError, showInfo, showSuccess } from '../utils/notification';

interface ModelState {
  models: Model[];
  defaultModelId: string | null;
  
  setModels: (models: Model[]) => void;
  setDefaultModelId: (id: string | null) => void;
  createModel: (model: Model) => void;
  updateModel: (model: Model) => void;
  deleteModel: (id: string) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  defaultModelId: null,
  
  setModels: (models) => {
    set({ 
      models,
      defaultModelId: models.length > 0 ? models[0].id : null
    });
  },
  
  setDefaultModelId: (id) => {
    set({ defaultModelId: id });
  },
  
  createModel: async (model) => {
    try {
      await db.saveModel(model);
      set((state) => {
        const newModels = [...state.models, model];
        const newDefaultId = state.defaultModelId || model.id;
        
        return { 
          models: newModels,
          defaultModelId: newDefaultId
        };
      });
      showSuccess('模型创建成功');
    } catch (error: any) {
      showError('模型创建失败:' + error.message);
      console.error('Failed to create model:', error);
    }
  },
  
  updateModel: async (model) => {
    try {
      await db.saveModel(model);
      set((state) => ({
        models: state.models.map(m => 
          m.id === model.id ? model : m
        )
      }));
      showSuccess('模型更新成功');
    } catch (error: any) {
      showError('模型更新失败：' + error.message);
      console.error('Failed to update model:', error);
    }
  },
  
  deleteModel: async (id) => {
    try {
      await db.deleteModel(id);
      set((state) => {
        const newModels = state.models.filter(m => m.id !== id);
        const newDefaultId = state.defaultModelId === id 
          ? (newModels.length > 0 ? newModels[0].id : null) 
          : state.defaultModelId;
          
        return {
          models: newModels,
          defaultModelId: newDefaultId
        };
      });
      showInfo('模型已删除');
    } catch (error: any) {
      showError('模型删除失败:' + error.message);
      console.error('Failed to delete model:', error);
    }
  }
}));