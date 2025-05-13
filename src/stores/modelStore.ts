import { create } from 'zustand';
import { Model } from '../types';
import db from '../db/db';

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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  }
}));