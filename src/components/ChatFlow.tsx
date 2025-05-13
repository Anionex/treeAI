import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  Edge,
  Node,
  useReactFlow,
  applyNodeChanges,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import SystemNode from './nodes/SystemNode';
import ChatNode from './nodes/ChatNode';
import { useSessionStore } from '../stores/sessionStore';
import { useModelStore } from '../stores/modelStore';
import { ChatNode as ChatNodeType, Session } from '../types';
import { sendChatRequest, abortRequest } from '../services/apiService';
import { Share2, DownloadCloud, LayoutGrid } from 'lucide-react';
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
  const prevNodeCountRef = useRef<number>(0);
  const [nodeDimensions, setNodeDimensions] = useState<Record<string, { width: number, height: number }>>({});
  const [autoLayout, setAutoLayout] = useState(true);

  const calculateNodeLayout = useCallback(() => {
    if (!session || !session.nodes) return;

    const defaultNodeWidth = 350;
    const defaultNodeHeight = 250;
    const horizontalSpacing = 200;
    const verticalSpacing = 100;
    
    const getNodeDimensions = (nodeId: string) => {
      return nodeDimensions[nodeId] || { width: defaultNodeWidth, height: defaultNodeHeight };
    };
    
    const nodeHeights = new Map<string, number>();
    session.nodes.forEach(node => {
      nodeHeights.set(node.id, getNodeDimensions(node.id).height);
    });
    
    const nodePositions = new Map<string, { x: number, y: number }>();
    const nodeMap = new Map<string, ChatNodeType>();
    
    session.nodes.forEach(node => {
      nodeMap.set(node.id, node);
    });

    const nodeLevels = new Map<string, number>();
    const determineLevel = (nodeId: string, level: number) => {
      nodeLevels.set(nodeId, level);
      
      const children = session.nodes.filter(n => n.parentId === nodeId);
      children.forEach(child => {
        determineLevel(child.id, level + 1);
      });
    };

    const systemNode = session.nodes.find(n => n.type === 'system');
    if (systemNode) {
      determineLevel(systemNode.id, 0);
    }

    const subtreeWidths = new Map<string, number>();
    const calculateSubtreeWidth = (nodeId: string): number => {
      const children = session.nodes.filter(n => n.parentId === nodeId);
      const nodeDim = getNodeDimensions(nodeId);
      
      if (children.length === 0) {
        subtreeWidths.set(nodeId, nodeDim.width);
        return nodeDim.width;
      }
      
      const childrenWidth = children.reduce((total, child, index) => {
        const width = calculateSubtreeWidth(child.id);
        return total + width + (index < children.length - 1 ? horizontalSpacing : 0);
      }, 0);
      
      const subtreeWidth = Math.max(nodeDim.width, childrenWidth);
      subtreeWidths.set(nodeId, subtreeWidth);
      return subtreeWidth;
    };

    if (systemNode) {
      calculateSubtreeWidth(systemNode.id);
    }

    const levelHeights = new Map<number, number>();
    
    const calculateNodePosition = (nodeId: string, startX: number, level: number, startY: number) => {
      const nodeDim = getNodeDimensions(nodeId);
      const width = subtreeWidths.get(nodeId) || nodeDim.width;
      const height = nodeHeights.get(nodeId) || nodeDim.height;
      const x = startX + width / 2 - nodeDim.width / 2;
      const y = startY;
      
      nodePositions.set(nodeId, { x, y });
      
      const nextLevelY = y + height + verticalSpacing;
      
      const children = session.nodes.filter(n => n.parentId === nodeId);
      let childStartX = startX;
      
      children.forEach(child => {
        const childWidth = subtreeWidths.get(child.id) || getNodeDimensions(child.id).width;
        calculateNodePosition(child.id, childStartX, level + 1, nextLevelY);
        childStartX += childWidth + horizontalSpacing;
      });
    };

    if (systemNode) {
      const rootWidth = subtreeWidths.get(systemNode.id) || getNodeDimensions(systemNode.id).width;
      calculateNodePosition(systemNode.id, -rootWidth / 2, 0, 0);
    }

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
  }, [session, nodeDimensions]);

  useEffect(() => {
    if (autoLayout) {
      calculateNodeLayout();
    }
  }, [calculateNodeLayout, session?.nodes, autoLayout]);

  useEffect(() => {
    if (!session?.nodes?.length) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      const newDimensions: Record<string, { width: number, height: number }> = {...nodeDimensions};
      let didUpdate = false;
      
      entries.forEach(entry => {
        const nodeElement = entry.target as HTMLElement;
        const nodeId = nodeElement.getAttribute('data-id');
        
        if (nodeId) {
          const { width, height } = entry.contentRect;
          
          if (
            !newDimensions[nodeId] || 
            Math.abs(newDimensions[nodeId].width - width) > 5 || 
            Math.abs(newDimensions[nodeId].height - height) > 5
          ) {
            newDimensions[nodeId] = { width, height };
            didUpdate = true;
          }
        }
      });
      
      if (didUpdate) {
        setNodeDimensions(newDimensions);
      }
    });
    
    setTimeout(() => {
      document.querySelectorAll('.react-flow__node').forEach(node => {
        resizeObserver.observe(node);
      });
    }, 300);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [session?.nodes]);

  const handleAddChildNode = async (parentId: string) => {
    if (!session || !defaultModelId) return;
    
    setAutoLayout(false);
    
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
    
    setTimeout(() => {
      setAutoLayout(true);
    }, 500);
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
    
    if (abortControllerRef.current[nodeId]) {
      abortControllerRef.current[nodeId].abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current[nodeId] = abortController;
    
    updateNodeInSession(sessionId, {
      ...node,
      assistantMessage: "",
      isStreaming: true,
      error: undefined
    });
    
    try {
      const systemNode = session.nodes.find(n => n.type === 'system');
      const systemPrompt = systemNode?.userMessage || model.defaultSystemPrompt;
      
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system' as const, content: systemPrompt });
      }
      
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
      
      messageChain.forEach(msg => {
        if (msg.user) messages.push({ role: 'user' as const, content: msg.user });
        if (msg.assistant) messages.push({ role: 'assistant' as const, content: msg.assistant });
      });
      
      messages.push({ role: 'user' as const, content: node.userMessage });
      
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
      
      updateNodeInSession(sessionId, {
        ...node,
        assistantMessage: accumulatedResponse,
        isStreaming: false
      });
      
    } catch (error: any) {
      console.error('Chat request failed:', error);
      
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

  const handleReorganizeLayout = useCallback(() => {
    calculateNodeLayout();
    setTimeout(() => {
      //reactFlowInstance.fitView({ padding: 0.2 });
    }, 50);
  }, [calculateNodeLayout, reactFlowInstance]);

  useEffect(() => {
    if (session && session.nodes.length === 0 && models.length > 0) {
      const systemNode: ChatNodeType = {
        id: crypto.randomUUID(),
        parentId: null,
        type: 'system',
        userMessage: models[0].defaultSystemPrompt,
        assistantMessage: "",
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
        nodesDraggable={true}
        elementsSelectable={true}
        fitView={false}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        onNodesChange={(changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds))}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
      </ReactFlow>
      
      <div className="absolute bottom-4 right-4 z-10">
        <button 
          className="flex items-center justify-center bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition-colors shadow-md"
          onClick={handleReorganizeLayout}
          title="重新排布节点"
        >
          <LayoutGrid size={20} />
        </button>
      </div>
    </div>
  );
};

const ChatFlow: React.FC<ChatFlowProps> = ({ sessionId }) => (
  <ReactFlowProvider>
    <ReactFlowWrapper sessionId={sessionId} />
  </ReactFlowProvider>
);

export default ChatFlow;