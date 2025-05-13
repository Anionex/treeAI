import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatFlow from './components/ChatFlow';
import ModelManager from './components/ModelManager';
import { useSessionStore } from './stores/sessionStore';
import { useModelStore } from './stores/modelStore';
import { useDatabaseContext } from './context/DatabaseContext';
import { Session } from './types';

const App: React.FC = () => {
  const [showModelManager, setShowModelManager] = useState(false);
  const { currentSessionId, setCurrentSessionId } = useSessionStore();
  const { loadSessions, loadModels } = useDatabaseContext();
  const { sessions } = useSessionStore();
  const { models } = useModelStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeData = async () => {
      await loadSessions();
      await loadModels();
      setIsLoading(false);
    };

    initializeData();
  }, [loadSessions, loadModels]);

  useEffect(() => {
    if (!isLoading && sessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId, setCurrentSessionId, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-lg text-gray-700">Loading TreeChat AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar 
        onModelManagerClick={() => setShowModelManager(true)} 
      />
      <main className="flex-1 overflow-hidden relative">
        {currentSessionId ? (
          <ChatFlow sessionId={currentSessionId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-bold gradient-text mb-4">Welcome to TreeChat AI</h2>
              <p className="text-gray-600 mb-6">
                Create a new session to start a tree-structured conversation with AI.
              </p>
              <button 
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                onClick={() => {
                  if (models.length === 0) {
                    setShowModelManager(true);
                  } else {
                    const newSession: Session = {
                      id: crypto.randomUUID(),
                      title: "New Conversation",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      nodes: []
                    };
                    useSessionStore.getState().createSession(newSession);
                    setCurrentSessionId(newSession.id);
                  }
                }}
              >
                {models.length === 0 ? "Set Up Models First" : "Create New Session"}
              </button>
            </div>
          </div>
        )}
      </main>

      {showModelManager && (
        <ModelManager onClose={() => setShowModelManager(false)} />
      )}
    </div>
  );
};

export default App;