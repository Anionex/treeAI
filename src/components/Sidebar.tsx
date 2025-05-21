import React, { useState, useRef, useEffect } from 'react';
import { useSessionStore } from '../stores/sessionStore';
import { Search, Plus, Settings, Trash2, Edit, X, ChevronLeft } from 'lucide-react';
import { gsap } from 'gsap';

interface SidebarProps {
  onModelManagerClick: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onModelManagerClick, collapsed, onToggleCollapse }) => {
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    createSession,
    deleteSession,
    updateSession,
    searchQuery,
    setSearchQuery,
    filteredSessions
  } = useSessionStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animation for sidebar entrance
    if (sidebarRef.current) {
      gsap.from(sidebarRef.current, {
        x: -20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    }
  }, []);

  const handleCreateSession = () => {
    const newSession = {
      id: crypto.randomUUID(),
      title: "New Conversation",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      nodes: []
    };
    createSession(newSession);
  };

  const handleStartEdit = (id: string, title: string) => {
    setEditingId(id);
    setEditTitle(title);
  };

  const handleSaveEdit = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session && editTitle.trim()) {
      updateSession({
        ...session,
        title: editTitle.trim()
      });
    }
    setEditingId(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  if (collapsed) return null;

  return (
    <div 
      ref={sidebarRef}
      className="sidebar w-64 h-full bg-white border-r border-gray-200 flex flex-col z-10 pl-4 relative"
    >
      <button 
        className="absolute -right-3 top-4 bg-white p-1 rounded-full border border-gray-200 shadow-md z-20"
        onClick={onToggleCollapse}
      >
        <ChevronLeft size={16} />
      </button>

      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold gradient-text">TreeChat AI</h1>
      </div>

      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          {searchQuery && (
            <button 
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery('')}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-hide">
        {filteredSessions.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div 
              key={session.id}
              className={`sidebar-session p-2 pr-1 flex justify-between items-center ${currentSessionId === session.id ? 'active' : ''}`}
            >
              {editingId === session.id ? (
                <input
                  type="text"
                  className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(session.id)}
                  onKeyDown={(e) => handleKeyPress(e, session.id)}
                  autoFocus
                />
              ) : (
                <div 
                  className="flex-1 truncate cursor-pointer" 
                  onClick={() => setCurrentSessionId(session.id)}
                >
                  {session.title}
                </div>
              )}
              
              <div className="flex space-x-1">
                <button 
                  className="text-gray-500 hover:text-indigo-600 p-1 rounded-md hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(session.id, session.title);
                  }}
                >
                  <Edit size={16} />
                </button>
                <button 
                  className="text-gray-500 hover:text-red-600 p-1 rounded-md hover:bg-gray-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200 flex justify-between">
        <button
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleCreateSession}
          className="w-full flex items-center justify-center space-x-2 py-2 px-4 gradient-primary-button text-white rounded-md transition-colors"
        >
          <Plus size={16} />
          <span>新建会话</span>
        </button>
      </div>
      
      <div className="p-3 border-t border-gray-200">
        <button 
          className="w-full flex items-center space-x-2 py-2 px-4 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          onClick={onModelManagerClick}
        >
          <Settings size={18} />
          <span>Manage Models</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;