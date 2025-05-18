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
  const [isTyping, setIsTyping] = useState(false);
  const [streamingResponses, setStreamingResponses] = useState<Record<string, string>>({});

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
      // 首先查找保存的位置
      let position: { x: number, y: number };
      
      if (node.position) {
        // 如果节点有保存的位置，使用它
        position = { x: node.position.x, y: node.position.y };
      } else {
        // 否则使用通过算法计算的位置
        const calculatedPosition = nodePositions.get(node.id);
        position = calculatedPosition || { x: 0, y: 0 };
      }
      
      return {
        id: node.id,
        type: node.type,
        position,
        data: { 
          node,
          streamingResponse: streamingResponses[node.id] || null,
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
  }, [session, nodeDimensions, streamingResponses]);

  useEffect(() => {
    // 不再根据任何状态自动触发calculateNodeLayout
    // 仅在手动点击重排按钮时通过handleReorganizeLayout调用
  }, []);

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
    
    const parentNode = session.nodes.find(n => n.id === parentId);
    if (!parentNode) return;

    // 查找父节点的 ReactFlow 节点，获取其位置
    const parentFlowNode = nodes.find(n => n.id === parentId);
    let position = { x: 0, y: 0 };
    
    if (parentFlowNode) {
      // 计算子节点的初始位置：父节点下方偏右
      const siblingCount = nodes.filter(n => 
        n.data.node.parentId === parentId
      ).length;
      
      position = {
        x: parentFlowNode.position.x + siblingCount * 100,
        y: parentFlowNode.position.y + 250
      };
    }

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
      position // 保存初始位置
    };

    addNodeToSession(sessionId, newNode);
  };

  const handleEditNode = (nodeId: string, content: string, type: 'user' | 'assistant' | 'system', isInputting = false) => {
    if (!session) return;
    
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) return;

    let updatedNode: ChatNodeType;
    
    if (type === 'system') {
      updatedNode = { ...node, userMessage: content };
    } else if (type === 'user') {
      updatedNode = { ...node, userMessage: content };
    } else {
      updatedNode = { ...node, assistantMessage: content };
    }

    updateNodeInSession(sessionId, updatedNode);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!session) return;
    deleteNodeFromSession(sessionId, nodeId);
    
    // 删除后不需要手动计算布局，useEffect会处理
    // setTimeout(() => {
    //   calculateNodeLayout();
    // }, 100);
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
    
    // 只更新streaming状态，不更新内容
    updateNodeInSession(sessionId, {
      ...node,
      isStreaming: true,
      error: undefined
    });
    
    // 初始化流式响应
    setStreamingResponses(prev => ({
      ...prev,
      [nodeId]: ""
    }));
    
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
          // 只更新流式响应状态，不更新节点
          setStreamingResponses(prev => ({
            ...prev,
            [nodeId]: accumulatedResponse
          }));
        }
      });
      
      // 完成后再一次性更新节点内容
      updateNodeInSession(sessionId, {
        ...node,
        assistantMessage: accumulatedResponse,
        isStreaming: false
      });
      
      // 清除流式状态
      setStreamingResponses(prev => {
        const newState = {...prev};
        delete newState[nodeId];
        return newState;
      });
      
    } catch (error: any) {
      console.error('Chat request failed:', error);
      
      updateNodeInSession(sessionId, {
        ...node,
        isStreaming: false,
        error: error.message || 'Failed to get response'
      });
      
      // 清除流式状态
      setStreamingResponses(prev => {
        const newState = {...prev};
        delete newState[nodeId];
        return newState;
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

  useEffect(() => {
    if (!session?.nodes) return;
    
    // 创建节点对象，优先使用保存的位置
    const reactFlowNodes = session.nodes.map(node => {
      return {
        id: node.id,
        type: node.type,
        position: node.position || { x: 0, y: 0 }, // 如果没有保存位置则使用默认值
        data: { 
          node,
          streamingResponse: streamingResponses[node.id] || null,
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

    // 清除之前的节点和边
    setNodes([]);
    setEdges([]);
    
    // 设置新的节点和边
    setTimeout(() => {
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    }, 50);
  }, [session?.id]); // 只在会话ID变化时执行，避免循环渲染

  // 在用户离开会话或组件卸载时保存节点位置
  useEffect(() => {
    return () => {
      // 组件卸载时保存所有节点位置
      saveAllNodePositions();
    };
  }, []);

  // 当会话ID变更时，保存上一个会话的节点位置
  useEffect(() => {
    return () => {
      if (session) {
        saveAllNodePositions();
      }
    };
  }, [sessionId]);

  // 保存所有节点位置的函数
  const saveAllNodePositions = useCallback(() => {
    if (!session) return;
    
    // 获取当前节点的位置信息
    const nodesWithPosition = nodes.map(node => {
      const chatNode = session.nodes.find(n => n.id === node.id);
      if (!chatNode) return null;
      
      return {
        ...chatNode,
        position: {
          x: node.position.x,
          y: node.position.y
        }
      };
    }).filter(Boolean) as ChatNodeType[];
    
    // 更新会话中的节点
    if (nodesWithPosition.length > 0) {
      const updatedSession = {
        ...session,
        nodes: nodesWithPosition,
        updatedAt: new Date().toISOString()
      };
      
      updateSession(updatedSession);
    }
  }, [session, nodes, updateSession]);

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
        onNodeDragStop={(event, node) => {
          // 节点拖动结束后保存位置
          if (!session) return;
          
          const chatNode = session.nodes.find(n => n.id === node.id);
          if (!chatNode) return;
          
          // 更新节点位置
          updateNodeInSession(sessionId, {
            ...chatNode,
            position: {
              x: node.position.x,
              y: node.position.y
            }
          });
        }}
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