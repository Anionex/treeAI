import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import db from '../db/db';
import { useSessionStore } from '../stores/sessionStore';
import { useModelStore } from '../stores/modelStore';

interface DatabaseContextType {
  loadSessions: () => Promise<void>;
  loadModels: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setSessions } = useSessionStore();
  const { setModels } = useModelStore();

  const loadSessions = useCallback(async () => {
    try {
      const sessions = await db.getAllSessions();
      setSessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }, [setSessions]);

  const loadModels = useCallback(async () => {
    try {
      const models = await db.getAllModels();
      setModels(models);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }, [setModels]);

  return (
    <DatabaseContext.Provider value={{ loadSessions, loadModels }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
};