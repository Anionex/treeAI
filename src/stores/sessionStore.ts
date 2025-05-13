import { create } from 'zustand';
import { Session, ChatNode } from '../types';
import db from '../db/db';

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  searchQuery: string;
  filteredSessions: Session[];
  
  setSessions: (sessions: Session[]) => void;
  setCurrentSessionId: (id: string | null) => void;
  createSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  addNodeToSession: (sessionId: string, node: ChatNode) => void;
  updateNodeInSession: (sessionId: string, node: ChatNode) => void;
  deleteNodeFromSession: (sessionId: string, nodeId: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSessionId: null,
  searchQuery: '',
  filteredSessions: [],
  
  setSessions: (sessions) => {
    set({ 
      sessions,
      filteredSessions: sessions
    });
  },
  
  setCurrentSessionId: (id) => {
    set({ currentSessionId: id });
  },
  
  createSession: async (session) => {
    try {
      await db.saveSession(session);
      set((state) => ({ 
        sessions: [...state.sessions, session],
        filteredSessions: [...state.sessions, session],
        currentSessionId: session.id
      }));
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  },
  
  updateSession: async (session) => {
    try {
      const updatedSession = { 
        ...session, 
        updatedAt: new Date().toISOString()
      };
      await db.saveSession(updatedSession);
      set((state) => ({
        sessions: state.sessions.map(s => 
          s.id === session.id ? updatedSession : s
        ),
        filteredSessions: state.sessions.map(s => 
          s.id === session.id ? updatedSession : s
        )
      }));
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  },
  
  deleteSession: async (id) => {
    try {
      await db.deleteSession(id);
      set((state) => {
        const newSessions = state.sessions.filter(s => s.id !== id);
        const newCurrentId = state.currentSessionId === id 
          ? (newSessions.length > 0 ? newSessions[0].id : null) 
          : state.currentSessionId;
          
        return {
          sessions: newSessions,
          filteredSessions: newSessions,
          currentSessionId: newCurrentId
        };
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },
  
  addNodeToSession: (sessionId, node) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const updatedSession = { 
      ...session, 
      nodes: [...session.nodes, node],
      updatedAt: new Date().toISOString()
    };
    
    get().updateSession(updatedSession);
  },
  
  updateNodeInSession: (sessionId, node) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const updatedSession = { 
      ...session, 
      nodes: session.nodes.map(n => n.id === node.id ? node : n),
      updatedAt: new Date().toISOString()
    };
    
    get().updateSession(updatedSession);
  },
  
  deleteNodeFromSession: (sessionId, nodeId) => {
    const session = get().sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Remove this node and its children recursively
    const nodesToRemove = new Set<string>();
    
    const collectNodesToRemove = (id: string) => {
      nodesToRemove.add(id);
      session.nodes
        .filter(n => n.parentId === id)
        .forEach(child => collectNodesToRemove(child.id));
    };
    
    collectNodesToRemove(nodeId);
    
    const updatedSession = { 
      ...session, 
      nodes: session.nodes.filter(n => !nodesToRemove.has(n.id)),
      updatedAt: new Date().toISOString()
    };
    
    get().updateSession(updatedSession);
  },
  
  setSearchQuery: (query) => {
    const filtered = query 
      ? get().sessions.filter(s => 
          s.title.toLowerCase().includes(query.toLowerCase())
        )
      : get().sessions;
      
    set({ 
      searchQuery: query,
      filteredSessions: filtered
    });
  }
}));