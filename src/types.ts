// Main data types for the application

export interface Model {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  defaultSystemPrompt: string;
  maxTokens: number;
  temperature: number;
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  nodes: ChatNode[];
}

export interface ChatNode {
  id: string;
  parentId: string | null;
  type: 'system' | 'chat';
  userMessage: string;
  assistantMessage: string;
  modelId: string;
  temperature: number;
  maxTokens: number;
  createdAt: string;
  isStreaming?: boolean;
  error?: string;
  position?: NodePosition;
}

export interface Position {
  x: number;
  y: number;
}

export interface NodeData {
  node: ChatNode;
  onAddChild: (parentId: string) => void;
  onEdit: (nodeId: string, content: string, type: 'user' | 'assistant' | 'system') => void;
  onDelete: (nodeId: string) => void;
  onRetry: (nodeId: string) => void;
  onModelChange: (nodeId: string, modelId: string) => void;
  onTemperatureChange: (nodeId: string, temperature: number) => void;
  onMaxTokensChange: (nodeId: string, maxTokens: number) => void;
  isRoot?: boolean;
}

export interface ModelResponse {
  text: string;
  isComplete: boolean;
  error?: string;
}

export interface FileExtractResult {
  text: string;
  filename: string;
  mimeType: string;
}

export interface NodePosition {
  x: number;
  y: number;
}