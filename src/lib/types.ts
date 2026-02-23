// Azmyra Types

export type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'ollama' | 'z-ai' | 'gemini';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  apiEndpoint?: string;
  model?: string;
}

export interface IntegrationCredentials {
  jira: {
    enabled: boolean;
    url: string;
    email: string;
    apiToken: string;
    projectKey: string;
  };
  slack: {
    enabled: boolean;
    botToken: string;
    channelId: string;
  };
  confluence: {
    enabled: boolean;
    url: string;
    email: string;
    apiToken: string;
  };
  email: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    fromEmail: string;
  };
}

export interface UserSettings {
  llm: LLMConfig;
  integrations: IntegrationCredentials;
  preferences: {
    autonomyLevel: 'full' | 'oversight' | 'advisory' | 'manual';
    notificationsEnabled: boolean;
    autoSendEmails: boolean;
    autoCreateJiraStories: boolean;
    theme: 'light' | 'dark' | 'system';
  };
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  status: 'idea' | 'discovery' | 'validation' | 'definition' | 'approved';
  businessValue: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  stakeholders: string[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  risks: string[];
  dependencies: string[];
  jiraKey?: string;
  jiraIssueType?: string;
  // Business case fields
  whyNeeded?: string;
  whatIfNot?: string;
  expectedValue?: string;
  expectedTimeToMarket?: string;
  // Discovery data
  discovery?: DiscoveryData;
  // Linked personas
  personaIds?: string[];
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  goals: string[];
  painPoints: string[];
}

export interface DiscoveryNote {
  id: string;
  type: 'documentation' | 'interview' | 'market_research' | 'impact' | 'general';
  title: string;
  content: string;
  createdAt: Date;
  source?: string;
}

export interface DiscoveryData {
  notes: DiscoveryNote[];
  aiAnalysis?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  lastUpdated?: Date;
}

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  duration: number; // minutes
  participants: string[];
  status: 'scheduled' | 'completed' | 'processing' | 'summarized';
  transcript?: string;
  summary?: string;
  actionItems: ActionItem[];
  decisions: string[];
  challenges: string[];
  followUpEmail?: string;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
  source: string; // meeting id or other source
}

export interface RoadmapItem {
  id: string;
  title: string;
  type: 'initiative' | 'epic' | 'feature';
  status: 'planned' | 'in_progress' | 'at_risk' | 'completed' | 'delayed';
  startDate: Date;
  endDate: Date;
  progress: number; // 0-100
  dependencies: string[];
  owner: string;
  jiraKey?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    sources?: string[];
    confidence?: number;
  };
}

export interface Risk {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  probability: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
  status: 'identified' | 'mitigating' | 'resolved' | 'accepted';
  relatedItems: string[];
  mitigationPlan?: string;
  createdAt: Date;
}

export interface KPI {
  id: string;
  name: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  relatedInitiatives: string[];
}

export interface Document {
  id: string;
  title: string;
  type: 'prd' | 'specification' | 'decision_log' | 'meeting_notes' | 'other';
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  source: 'uploaded' | 'generated' | 'synced';
}

// Integration types

export interface JiraIssue {
  key: string;
  summary: string;
  description: string;
  status: string;
  assignee: string | null;
  priority: string;
  issueType: string;
  labels: string[];
  created: string;
  updated: string;
  storyPoints?: number;
}

export interface JiraProject {
  key: string;
  name: string;
  id: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  blocks?: any[];
  threadTs?: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  body: string;
  version: number;
  url: string;
}

// MCP types

export interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  content: string;
  isError: boolean;
  metadata?: Record<string, any>;
}

// Onboarding types

export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export interface OnboardingProgress {
  currentStep: number;
  completed: boolean;
  jiraConnected: boolean;
  confluenceConnected: boolean;
  slackConnected: boolean;
  syncStarted: boolean;
  syncCompleted: boolean;
  syncLog: SyncLogEntry[];
}

export interface SyncLogEntry {
  timestamp: Date;
  source: string;
  message: string;
  status: 'info' | 'success' | 'error' | 'warning';
}

export interface SyncPreviewItem {
  externalId: string;
  title: string;
  source: 'jira' | 'confluence' | 'slack';
  type: string;
  selected: boolean;
  details?: string;
}

export interface SyncResult {
  source: string;
  imported: number;
  skipped: number;
  failed: number;
  items: Array<{
    externalId: string;
    localId: string;
    title: string;
    status: 'synced' | 'failed' | 'skipped';
    error?: string;
  }>;
}

// Share link types

export interface ShareLinkData {
  id: string;
  token: string;
  resourceType: 'dashboard' | 'initiatives' | 'roadmap' | 'discovery' | 'value-meter' | 'meetings';
  resourceId?: string;
  accessLevel: 'view_only' | 'view_comment';
  expiresAt: Date;
  isActive: boolean;
  viewCount: number;
  createdAt: Date;
}

export interface ShareCommentData {
  id: string;
  guestName: string;
  content: string;
  targetSection?: string;
  createdAt: Date;
}

// Re-export agent types
export type {
  AgentId,
  AgentDefinition,
  AgentResponse,
  AgentChatMessage,
  PendingAction as AgentPendingAction,
  SourceAttribution,
  ToolExecution,
  RAGDocument,
  KnowledgeDocument as KnowledgeDocumentType,
  StoreDataSnapshot,
  AgentChatRequest,
  AgentChatResponse,
  AutonomyLevel,
  AutonomyGateResult,
} from './agents/types';

// Default settings
export const defaultSettings: UserSettings = {
  llm: {
    provider: 'openai',
    apiKey: '',
    model: '',
  },
  integrations: {
    jira: { enabled: false, url: '', email: '', apiToken: '', projectKey: '' },
    slack: { enabled: false, botToken: '', channelId: '' },
    confluence: { enabled: false, url: '', email: '', apiToken: '' },
    email: { enabled: false, smtpHost: '', smtpPort: 587, username: '', password: '', fromEmail: '' },
  },
  preferences: {
    autonomyLevel: 'oversight',
    notificationsEnabled: true,
    autoSendEmails: false,
    autoCreateJiraStories: true,
    theme: 'system',
  },
};
