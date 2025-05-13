import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  Edge,
  Node,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import SystemNode from './nodes/SystemNode';
import ChatNode from './nodes/ChatNode';
import { useSessionStore } from '../stores/sessionStore';
import { useModelStore } from '../stores/modelStore';
import { ChatNode as ChatNodeType, Session } from '../types';
import { sendChatRequest, abortRequest } from '../services/apiService';
import { Share2, DownloadCloud } from 'lucide-react';
import { exportToMindmap } from '../utils/exportUtils';
import { gsap } from 'gsap';
import FileUploadButton from './FileUploadButton';

const nodeTypes = {
  system: SystemNode,
  chat: ChatNode,
};

interface ChatFlowProps {
  sessionId: string;
}

const ReactFlowWrapper: React.FC<ChatFlowProps> = ({ sessionId }) => {
  const { sessions, updateSession, addNodeToSession, updateNodeInSession, deleteNodeFromSession } = useSessionStore();
  const { models, defaultModelId } = useModelStore();
  const session = sessions.find(s => s.id === sessionId);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const reactFlowInstance = useReactFlow();
  const abortControllerRef = useRef<Record<string, AbortController>>({});

  const calculateNodeLayout = useCallback(() => {
    if (!session || !session.nodes) return;

    const nodeWidth = 350;
    const nodeHeight = 250;
    const horizontalSpacing = 100;
    const verticalSpacing = 150;

    const nodePositions = new Map<string, { x: number, y: number }>();
    const nodeMap = new Map<string, ChatNodeType>();
    
    // Create a map of nodes by ID
    session.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    // First determine the levels of each node (depth in the tree)
    const nodeLevels = new Map<string, number>();
    const determineLevel = (nodeId: string, level: number) => {
      nodeLevels.set(nodeId, level);
      
      // Find all children
      const children = session.nodes.filter(n => n.parentId === nodeId);
      children.forEach(child => {
        determineLevel(child.id, level + 1);
      });
    };

    // Start with the system node (root)
    const systemNode = session.nodes.find(n => n.type === 'system');
    if (systemNode) {
      determineLevel(systemNode.id, 0);
    }

    // Group nodes by level
    const nodesByLevel = new Map<number, string[]>();
    nodeLevels.forEach((level, nodeId) => {
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)?.push(nodeId);
    });

    // Calculate horizontal position for each node
    let maxY = 0;
    nodesByLevel.forEach((nodeIds, level) => {
      const levelWidth = nodeIds.length * nodeWidth + (nodeIds.length - 1) * horizontalSpacing;
      const startX = -levelWidth / 2;
      
      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * (nodeWidth + horizontalSpacing);
        const y = level * (nodeHeight + verticalSpacing);
        nodePositions.set(nodeId, { x, y });
        maxY = Math.max(maxY, y);
      });
    });

    // Generate React Flow nodes
    const reactFlowNodes = session.nodes.map(node => {
      const position = nodePositions.get(node.id) || { x: 0, y: 0 };
      return {
        id: node.id,
        type: node.type,
        position,
        data: { 
          node,
          onAddChild: handleAddChildNode,
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
          onRetry: handleRetryNode,
          onModelChange: handleModelChange,
          onTemperatureChange: handleTemperatureChange,
          onMaxTokensChange: handleMaxTokensChange,
          isRoot: node.type === 'system'
        }
      };
    });

    // Generate React Flow edges
    const reactFlowEdges = session.nodes
      .filter(node => node.parentId)
      .map(node => ({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId!,
        target: node.id,
        type: 'smoothstep',
        animated: false,
      }));

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);

    // Center the view on the first initialization
    if (reactFlowInstance && reactFlowNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    }
  }, [session, reactFlowInstance]);

  useEffect(() => {
    calculateNodeLayout();
  }, [calculateNodeLayout, session?.nodes]);

  const handleAddChildNode = async (parentId: string) => {
    if (!session || !defaultModelId) return;
    
    const parentNode = session.nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    const newNode: ChatNodeType = {
      id: crypto.randomUUID(),
      parentId,
      type: 'chat',
      userMessage: "",
      assistantMessage: "",
      modelId: parentNode.modelId || defaultModelId,
      temperature: parentNode.temperature || 0.7,
      maxTokens: parentNode.maxTokens || 2048,
      createdAt: new Date().toISOString(),
    };

    addNodeToSession(sessionId, newNode);
  };

  const handleEditNode = (nodeId: string, content: string, type: 'user' | 'assistant' | 'system') => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;

    let updatedNode: ChatNodeType;
    
    if (type === 'system') {
      updatedNode = {
        ...node,
        userMessage: content
      };
    } else if (type === 'user') {
      updatedNode = {
        ...node,
        userMessage: content
      };
    } else {
      updatedNode = {
        ...node,
        assistantMessage: content
      };
    }

    updateNodeInSession(sessionId, updatedNode);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!session) return;
    deleteNodeFromSession(sessionId, nodeId);
  };

  const handleRetryNode = async (nodeId: string) => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const model = models.find(m => m.id === node.modelId);
    if (!model) return;
    
    // Cancel previous request if exists
    if (abortControllerRef.current[nodeId]) {
      abortControllerRef.current[nodeId].abort();
    }
    
    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current[nodeId] = abortController;
    
    // Update node to show streaming
    updateNodeInSession(sessionId, {
      ...node,
      assistantMessage: "",
      isStreaming: true,
      error: undefined
    });
    
    try {
      // Find the system node content
      const systemNode = session.nodes.find(n => n.type === 'system');
      const systemPrompt = systemNode?.userMessage || model.defaultSystemPrompt;
      
      // Get the parent messages for context if this is not a direct child of system
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      // Get the parent message chain
      let currentParentId = node.parentId;
      const messageChain = [];
      
      while (currentParentId) {
        const parentNode = session.nodes.find(n => n.id === currentParentId);
        if (parentNode && parentNode.type === 'chat') {
          messageChain.unshift({
            user: parentNode.userMessage,
            assistant: parentNode.assistantMessage
          });
        }
        currentParentId = parentNode?.parentId || null;
      }
      
      // Add the message chain to the messages array
      messageChain.forEach(msg => {
        if (msg.user) messages.push({ role: 'user', content: msg.user });
        if (msg.assistant) messages.push({ role: 'assistant', content: msg.assistant });
      });
      
      // Add the current user message
      messages.push({ role: 'user', content: node.userMessage });
      
      // Start streaming
      let accumulatedResponse = '';
      
      await sendChatRequest({
        messages,
        model,
        temperature: node.temperature,
        maxTokens: node.maxTokens,
        signal: abortController.signal,
        onChunk: (chunk) => {
          accumulatedResponse += chunk;
          updateNodeInSession(sessionId, {
            ...node,
            assistantMessage: accumulatedResponse,
            isStreaming: true
          });
        }
      });
      
      // Update with final response
      updateNodeInSession(sessionId, {
        ...node,
        assistantMessage: accumulatedResponse,
        isStreaming: false
      });
      
    } catch (error: any) {
      console.error('Chat request failed:', error);
      
      // Handle errors
      updateNodeInSession(sessionId, {
        ...node,
        isStreaming: false,
        error: error.message || 'Failed to get response'
      });
    } finally {
      delete abortControllerRef.current[nodeId];
    }
  };

  const handleModelChange = (nodeId: string, modelId: string) => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    updateNodeInSession(sessionId, {
      ...node,
      modelId
    });
  };

  const handleTemperatureChange = (nodeId: string, temperature: number) => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    updateNodeInSession(sessionId, {
      ...node,
      temperature
    });
  };

  const handleMaxTokensChange = (nodeId: string, maxTokens: number) => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    updateNodeInSession(sessionId, {
      ...node,
      maxTokens
    });
  };

  const handleExport = () => {
    if (!session) return;
    exportToMindmap(session);
  };

  useEffect(() => {
    // Initialize with system node if session is empty
    if (session && session.nodes.length === 0 && models.length > 0) {
      const systemNode: ChatNodeType = {
        id: crypto.randomUUID(),
        parentId: null,
        type: 'system',
        userMessage: models[0].defaultSystemPrompt,
        assistantMessage: "", // Not used for system nodes
        modelId: models[0].id,
        temperature: 0.7,
        maxTokens: 2048,
        createdAt: new Date().toISOString(),
      };
      
      addNodeToSession(sessionId, systemNode);
    }
  }, [session, sessionId, models, addNodeToSession]);

  const handleUploadComplete = (extractedText: string) => {
    if (!session || !defaultModelId) return;
    
    // Find the system node
    const systemNode = session.nodes.find(n => n.type === 'system');
    if (!systemNode) return;

    const newNode: ChatNodeType = {
      id: crypto.randomUUID(),
      parentId: systemNode.id,
      type: 'chat',
      userMessage: extractedText,
      assistantMessage: "",
      modelId: systemNode.modelId || defaultModelId,
      temperature: systemNode.temperature || 0.7,
      maxTokens: systemNode.maxTokens || 2048,
      createdAt: new Date().toISOString(),
    };

    addNodeToSession(sessionId, newNode);
  };

  if (!session) {
    return <div>Session not found</div>;
  }

  return (
    <div className="h-full w-full relative">
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <FileUploadButton onUploadComplete={handleUploadComplete} />
        <button 
          className="flex items-center space-x-2 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={handleExport}
        >
          <Share2 size={16} />
          <span>Export Mindmap</span>
        </button>
      </div>
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.2}
        maxZoom={2}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
};

const ChatFlow: React.FC<ChatFlowProps> = ({ sessionId }) => (
  <ReactFlowProvider>
    <ReactFlowWrapper sessionId={sessionId} />
  </ReactFlowProvider>
);

export default ChatFlow;