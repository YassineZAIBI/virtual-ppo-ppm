// Multi-Agent System Types

export type AgentId = 'strategy' | 'discovery' | 'risk' | 'communications' | 'advisor' | 'thinker';

export type AutonomyLevel = 'full' | 'oversight' | 'advisory' | 'manual';

export type AutonomyGateResult = 'execute' | 'gate' | 'block';

export type SourceType =
  | 'jira'
  | 'confluence'
  | 'slack'
  | 'meeting'
  | 'initiative'
  | 'risk'
  | 'roadmap'
  | 'file'
  | 'url';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color
  temperature: number;
  maxIterations: number;
  tools: string[]; // MCP tool names this agent can use
  capabilities: string[];
}

export interface SourceAttribution {
  sourceType: SourceType;
  sourceId: string;
  sourceLabel: string;
  excerpt?: string;
  relevance?: number; // 0-1
}

export interface ToolExecution {
  toolName: string;
  arguments: Record<string, any>;
  result?: string;
  status: 'executed' | 'pending' | 'blocked' | 'failed';
  timestamp: Date;
}

export interface PendingAction {
  id: string;
  agentId: AgentId;
  toolName: string;
  toolArguments: Record<string, any>;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  result?: string;
  createdAt: Date;
}

export interface AgentResponse {
  agentId: AgentId;
  agentName: string;
  content: string;
  toolsExecuted: ToolExecution[];
  pendingActions: PendingAction[];
  handoffTo?: AgentId;
  ragContext: RAGDocument[];
  sources: SourceAttribution[];
  iterations: number;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  agentId?: AgentId;
  agentName?: string;
  toolsExecuted?: ToolExecution[];
  pendingActions?: PendingAction[];
  sources?: SourceAttribution[];
  metadata?: {
    sources?: string[];
    confidence?: number;
  };
}

export interface RAGDocument {
  sourceType: 'confluence' | 'file' | 'url';
  sourceId: string;
  sourceName: string;
  content: string;
  relevance: number;
}

export interface KnowledgeDocument {
  id: string;
  sourceType: 'file' | 'url';
  sourceName: string;
  sourceUrl?: string;
  content: string;
  contentChunks: string[];
  fileType?: string;
  fileSize?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Context snapshot sent from client store per request
export interface StoreDataSnapshot {
  initiatives: any[];
  risks: any[];
  roadmapItems: any[];
  meetings: any[];
}

// Chat API request/response shapes
export interface AgentChatRequest {
  message: string;
  history?: AgentChatMessage[];
  settings: any;
  storeData?: StoreDataSnapshot;
  agentId?: AgentId | null; // null = auto-route
  pendingActionId?: string;
  pendingActionDecision?: 'approve' | 'reject';
}

export interface AgentChatResponse {
  response: string;
  agentId: AgentId;
  agentName: string;
  toolsExecuted: ToolExecution[];
  pendingActions: PendingAction[];
  ragContext: RAGDocument[];
  sources: SourceAttribution[];
}
