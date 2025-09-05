import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatFlow from './components/ChatFlow';
import ModelManager from './components/ModelManager';
import NotificationContainer from './components/Notification';
import { useSessionStore } from './stores/sessionStore';
import { useModelStore } from './stores/modelStore';
import { useDatabaseContext } from './context/DatabaseContext';
import { Session } from './types';
import { ChevronRight, Loader2, PlusCircle } from 'lucide-react';

const App: React.FC = () => {
  const [showModelManager, setShowModelManager] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-neutral-500 mx-auto" />
          <p className="mt-4 text-base text-neutral-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {sidebarCollapsed && (
        <button 
          className="absolute top-4 left-4 z-20 bg-white p-1.5 rounded-full shadow-minimal border border-neutral-200"
          onClick={toggleSidebar}
        >
          <ChevronRight size={14} className="text-neutral-600" />
        </button>
      )}
      
      <Sidebar 
        onModelManagerClick={() => setShowModelManager(true)} 
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <main className="flex-1 overflow-hidden relative">
        {currentSessionId ? (
          <ChatFlow sessionId={currentSessionId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-subtle border border-neutral-100">
              <h2 className="text-xl font-medium text-neutral-800 mb-4">欢迎使用 TreeChat</h2>
              <p className="text-neutral-600 mb-6 text-sm leading-relaxed">
                创建一个新会话，开始与 AI 进行树状结构的对话。
              </p>
              <button 
                className="flex items-center justify-center space-x-2 px-5 py-2 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 transition-colors"
                onClick={() => {
                  if (models.length === 0) {
                    setShowModelManager(true);
                  } else {
                    const newSession: Session = {
                      id: crypto.randomUUID(),
                      title: "新会话",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      nodes: []
                    };
                    useSessionStore.getState().createSession(newSession);
                    setCurrentSessionId(newSession.id);
                  }
                }}
              >
                <PlusCircle size={16} className="mr-2" />
                <span>{models.length === 0 ? "设置模型" : "创建新会话"}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {showModelManager && (
        <ModelManager onClose={() => setShowModelManager(false)} />
      )}
      
      <NotificationContainer />
    </div>
  );
};

export default App;