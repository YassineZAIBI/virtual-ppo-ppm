// Azmyra Types

export type OnboardingRole = 'solo' | 'head' | 'vp' | 'explore';

export interface OnboardingJourney {
  role: OnboardingRole;
  steps: string[];
  totalSteps: number;
}

export type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'ollama' | 'z-ai' | 'gemini' | 'groq';

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
  zoom: {
    enabled: boolean;
    accountId: string;
    clientId: string;
    clientSecret: string;
  };
  teams: {
    enabled: boolean;
    clientId: string;
    tenantId: string;
    clientSecret: string;
  };
}

export type PortfolioGranularity = 'verticals' | 'initiatives' | 'ideas' | 'all';

export interface PortfolioTerminology {
  vertical: string;
  initiative: string;
  idea: string;
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
    portfolioGranularity: PortfolioGranularity;
    portfolioTerminology: PortfolioTerminology;
  };
}

export type VerticalStatus = 'active' | 'paused' | 'archived';
export type GranularityLevel = 'vertical' | 'initiative' | 'idea';

export interface ProductVerticalData {
  id: string;
  userId: string;
  name: string;
  description: string;
  strategy: string;
  color: string;
  icon: string;
  status: VerticalStatus;
  sortOrder: number;
  productMappingId: string;
  brainNodeId: string;
  metadata: string;
  createdAt: string;
  updatedAt: string;
  initiatives?: Initiative[];
  _count?: { initiatives: number };
}

export interface Initiative {
  id: string;
  title: string;
  description: string;
  status: 'idea' | 'discovery' | 'validation' | 'definition' | 'approved';
  businessValue: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  /** DB: JSON string — API normalizes to array. Use parseJSON() if accessing raw DB data */
  stakeholders: string[];
  createdAt: Date;
  updatedAt: Date;
  /** DB: JSON string — API normalizes to array */
  tags: string[];
  /** DB: JSON string — API normalizes to array */
  risks: string[];
  /** DB: JSON string — API normalizes to array */
  dependencies: string[];
  jiraKey?: string;
  jiraIssueType?: string;
  // Business case fields
  whyNeeded?: string;
  whatIfNot?: string;
  expectedValue?: string;
  expectedTimeToMarket?: string;
  /** DB: JSON string — API normalizes to object. Use parseJSON() if accessing raw DB data */
  discovery?: DiscoveryData;
  /** DB: JSON string — API normalizes to array */
  personaIds?: string[];
  // Azmyra 3.0 Strategy extensions
  level?: 'solution' | 'epic' | 'idea';
  pillar?: 'vision' | 'strategy' | 'tactics';
  alignmentScore?: number;
  businessImpactId?: string;
  competitiveRank?: number;
  // Product Vertical grouping (Sprint Architecture)
  verticalId?: string | null;
  granularity?: GranularityLevel;
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
  source?: 'ai-generated' | 'user-edited' | string;
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
  /** DB: JSON string — API normalizes to array */
  participants: string[];
  status: 'scheduled' | 'completed' | 'processing' | 'summarized' | 'recording';
  transcript?: string;
  summary?: string;
  /** DB: JSON string — API normalizes to array */
  actionItems: ActionItem[];
  /** DB: JSON string — API normalizes to array */
  decisions: string[];
  /** DB: JSON string — API normalizes to array */
  challenges: string[];
  followUpEmail?: string;
  platform?: 'zoom' | 'teams' | 'manual';
  meetingUrl?: string;
  botSessionId?: string;
  liveTranscript?: string;
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

// Jira Project Schema (discovered on connection)

export interface JiraProjectSchema {
  projectKey: string;
  projectName: string;
  issueTypes: Array<{
    id: string;
    name: string;
    subtask: boolean;
    hierarchyLevel: number; // -1=subtask, 0=base, 1=epic, 2+=initiative
  }>;
  hierarchy: Array<{
    level: number;
    typeName: string;
    issueTypeNames: string[];
    canContain: string[]; // type names at lower levels
  }>;
  discoveredAt: string;
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

// ============ Market Intelligence ============

export interface MarketResearchReport {
  id: string;
  initiativeId?: string;
  title: string;
  query: string;
  status: 'pending' | 'gathering' | 'synthesizing' | 'completed' | 'failed';
  dataPoints: MarketDataPoint[];
  synthesizedReport?: string;
  reportMetadata: { sourceCount: number; dataPointCount: number };
  createdAt: Date;
  updatedAt: Date;
}

export interface MarketDataPoint {
  id: string;
  adapterKey: string;
  sourceUrl: string;
  sourceName: string;
  title: string;
  rawContent: string;
  contentType: string;
  extractedFacts: Array<{ fact: string; confidence: number; category: string }>;
  publishedAt?: Date;
  fetchedAt: Date;
  metadata: Record<string, any>;
}

export interface DataConnectorConfigType {
  id: string;
  type: 'preset' | 'custom';
  name: string;
  adapterKey: string;
  config: Record<string, any>;
  dataMapping: Record<string, string>;
  refreshSchedule: 'manual' | 'daily' | 'weekly';
  isActive: boolean;
  lastFetchAt?: Date;
  lastFetchStatus?: string;
}

export interface ContentVersionEntry {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  editedBy: 'ai' | 'user';
  changeDescription?: string;
  createdAt: Date;
}

export interface DataJobStatus {
  id: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ============ Vision Pillar (Azmyra 3.0) ============

export interface NorthStarData {
  id: string;
  statement: string;
  context?: string;
  confidence: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessGoalData {
  id: string;
  northStarId: string;
  title: string;
  description?: string;
  metric?: string;
  target?: string;
  deadline?: Date;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  // Expanded relations (present when fetched via /api/vision/pyramid)
  targetGroups?: TargetGroupData[];
  targetAudiences?: Array<{ name: string; description?: string; role?: string }>;
}

export interface TargetGroupPersona {
  // JTBD
  jtbdStatement: string;
  jtbdFunctional: string[];
  jtbdEmotional: string[];
  jtbdSocial: string[];
  // Empathy
  empathyThinks: string[];
  empathySays: string[];
  empathyFeels: string[];
  empathyDoes: string[];
  // Behavioral
  triggers: string[];
  decisionDrivers: string[];
  currentWorkarounds: string[];
  churnRisks: string[];
  successMetrics: string[];
  preferredChannels: string[];
  // Context
  companyStage: string;
  teamSize: string;
  industryContext: string;
  dayInLife: string;
  typicalQuote: string;
}

export interface TargetGroupData {
  id: string;
  businessGoalId?: string | null;
  name: string;
  description?: string;
  role?: string;
  demographics?: string;
  behaviors?: string;
  goals?: string;
  painPoints?: string;
  source?: string;
  needs?: NeedData[];
  // Persona fields (stored as JSON strings in DB)
  jtbdStatement?: string;
  jtbdFunctional?: string;
  jtbdEmotional?: string;
  jtbdSocial?: string;
  empathyThinks?: string;
  empathySays?: string;
  empathyFeels?: string;
  empathyDoes?: string;
  triggers?: string;
  decisionDrivers?: string;
  currentWorkarounds?: string;
  churnRisks?: string;
  successMetrics?: string;
  preferredChannels?: string;
  companyStage?: string;
  teamSize?: string;
  industryContext?: string;
  dayInLife?: string;
  typicalQuote?: string;
  confidence?: number;
  lastEnrichedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NeedData {
  id: string;
  targetGroupId: string;
  title: string;
  description?: string;
  severity: number;
  frequency?: string;
  products?: ProductMappingData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMappingData {
  id: string;
  needId: string;
  name: string;
  type: 'existing' | 'planned' | 'idea';
  createdAt: Date;
  updatedAt: Date;
}

export interface VisionPyramid {
  northStar: NorthStarData | null;
  businessGoals: BusinessGoalData[];
  targetGroups: TargetGroupData[];
  needs: NeedData[];
  products: ProductMappingData[];
  visionComplete: boolean;
}

// ============ Competitors Eye ============

export interface CompetitorData {
  id: string;
  name: string;
  website?: string;
  description?: string;
  tags?: string[];
  isActive: boolean;
  feeds?: CompetitorFeedItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type CompetitorFeedType = 'news' | 'product_update' | 'vision_shift' | 'rumor' | 'pricing' | 'hiring';

export interface CompetitorFeedItem {
  id: string;
  competitorId: string;
  type: CompetitorFeedType;
  title: string;
  summary: string;
  source?: string;
  sourceAdapter?: string;
  relevance: number;
  sentiment?: 'positive' | 'negative' | 'neutral';
  publishedAt?: Date;
  createdAt: Date;
}

// ============ Competitor Intelligence ============

export type CompetitorAlertType =
  | 'pricing_change' | 'new_feature' | 'funding' | 'website_change'
  | 'job_signal' | 'product_launch' | 'partnership' | 'reputation';

export interface CompetitorMonitorData {
  id: string;
  competitorId: string;
  domain: string;
  monitoredPaths: string[]; // parsed from JSON
  lastScannedAt?: Date | null;
  contentHashes: Record<string, string>; // parsed from JSON
  scanFrequency: string;
  isActive: boolean;
}

export interface CompetitorAlertData {
  id: string;
  competitorId: string;
  userId: string;
  alertType: CompetitorAlertType;
  title: string;
  summary: string;
  evidence: string; // JSON stored as string
  significance: number;
  strategicNote: string;
  sourceUrls: string; // JSON stored as string
  publishedAt?: Date | null;
  scrapedAt: Date;
  status: 'new' | 'read' | 'dismissed' | 'actioned';
  dismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
  competitor?: { name: string; website?: string | null };
}

// ============ Alignment & Impact ============

export interface AlignmentScoreData {
  id: string;
  entityType: 'initiative' | 'strategy_item' | 'risk';
  entityId: string;
  overallScore: number;
  northStarRelevance: number;
  businessGoalCoverage: number;
  targetGroupImpact: number;
  needFulfillment: number;
  reasoning?: string;
  computedBy: 'ai' | 'manual';
  version: number;
  createdAt: Date;
}

export interface BusinessImpactData {
  id: string;
  entityType: string;
  entityId: string;
  revenueEstimate?: number;
  roiPercent?: number;
  timeToValueWeeks?: number;
  marketShareDelta?: number;
  confidenceLevel?: 'low' | 'medium' | 'high';
  assumptions?: string;
  computedBy: 'ai' | 'manual';
  createdAt: Date;
}

// ============ Autonomous Cron ============

export type CronJobType = 'competitor_scan' | 'strategy_eval' | 'risk_reassess' | 'market_pulse' | 'full_portfolio_review';

export interface CronJobData {
  id: string;
  jobType: CronJobType;
  schedule: string;
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'paused' | 'failed';
  lastResult?: string;
  lastError?: string;
  runCount: number;
  config?: string;
  createdAt: Date;
}

export interface CronRunData {
  id: string;
  jobType: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: Date;
  endedAt?: Date;
  result?: string;
  error?: string;
  duration?: number;
  tokensUsed?: number;
}

// ============ User Alerts ============

export type AlertType = 'competitor_move' | 'strategy_risk' | 'alignment_drift' | 'market_shift' | 'action_required';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface UserAlertData {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: Date;
}

// ============ Session Continuity ============

export interface ChatSessionData {
  id: string;
  title?: string;
  pillar?: 'vision' | 'strategy' | 'tactics' | 'general';
  agent?: string;
  isActive: boolean;
  messageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============ Utility ============

export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw !== 'string') return raw as T;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

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
    zoom: { enabled: false, accountId: '', clientId: '', clientSecret: '' },
    teams: { enabled: false, clientId: '', tenantId: '', clientSecret: '' },
  },
  preferences: {
    autonomyLevel: 'oversight',
    notificationsEnabled: true,
    autoSendEmails: false,
    autoCreateJiraStories: true,
    theme: 'system',
    portfolioGranularity: 'all',
    portfolioTerminology: { vertical: 'Product Vertical', initiative: 'Initiative', idea: 'Idea' },
  },
};

// ============================================
// Brain Graph (Big Picture)
// ============================================

// ============================================
// Proactive Intelligence (Sprint 3)
// ============================================

export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'read' | 'dismissed' | 'actioned';
export type InsightSourceType = 'drift' | 'competitor' | 'market' | 'risk' | 'strategy';

export interface ProactiveInsightData {
  id: string;
  userId: string;
  agentType: string;
  title: string;
  content: string;
  summary: string;
  priority: InsightPriority;
  status: InsightStatus;
  sourceType: InsightSourceType | string;
  sourceId: string;
  metadata: string; // JSON stored as string — JSON.parse() on read
  createdAt: Date;
  updatedAt: Date;
}

export type BrainNodeType =
  | 'vision' | 'goal' | 'persona' | 'need' | 'decision'
  | 'initiative' | 'risk' | 'market_signal' | 'agent_learning';

export type BrainNodeSource =
  | 'onboarding' | 'notion' | 'slack' | 'jira' | 'agent' | 'manual';

export type BrainRelationType =
  | 'supports' | 'contradicts' | 'depends_on' | 'created_by' | 'related_to';

export type BrainDomain = 'vision' | 'product' | 'market' | 'risk' | 'operations' | 'general';

export type BrainClusterHealth = 'healthy' | 'stale' | 'sparse';

export interface BrainCluster {
  domain: BrainDomain;
  nodeCount: number;
  lastUpdated: Date | null;
  topNodes: BrainNodeSummary[];
  insights: number;
  health: BrainClusterHealth;
}

export interface BrainNodeSummary {
  id: string;
  title: string;
  type: string;
  domain: BrainDomain;
  importance: number;
  source: string;
  createdAt: Date;
}

export interface BrainNodeData {
  id: string;
  userId: string;
  type: BrainNodeType;
  title: string;
  content: string;
  summary: string;
  source: BrainNodeSource;
  sourceUrl: string;
  sourceId: string;
  embedding: string; // JSON string — vector for RAG
  metadata: string;  // JSON string — extra structured data
  agentType: string;
  confidence: number;
  domain: BrainDomain;
  importance: number;
  stale: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  relations?: BrainRelationData[];
  relatedBy?: BrainRelationData[];
}

export interface BrainRelationData {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: BrainRelationType;
  strength: number;
  createdAt: Date;
}

// Sprint Brain V2 — Strategy Canvas

export type BrainViewMode = 'story' | 'value';

export interface InitiativeSummary {
  id: string;
  title: string;
  description: string;
  status: string;
  businessValue: string;
  verticalId: string | null;
  updatedAt: Date;
}

export interface VerticalWithInitiatives {
  id: string;
  name: string;
  description: string;
  initiatives: Array<InitiativeSummary & { alignmentScore: number | null }>;
  initiativeCount: number;
}

export interface BrainStats {
  totalNodes: number;
  totalRelations: number;
  totalInitiatives: number;
  totalRisks: number;
  totalVerticals: number;
  portfolioAlignment: number | null;
}

export interface BrainOverviewData {
  northStar: { id: string; statement: string; updatedAt: string } | null;
  goals: Array<{ id: string; title: string; description: string | null; metric: string | null; target: string | null }>;
  verticals: VerticalWithInitiatives[];
  orphanInitiatives: Array<InitiativeSummary & { alignmentScore: number | null }>;
  personas: Array<{ id: string; name: string; description: string | null }>;
  risks: Array<{ id: string; title: string; description: string; severity: string; probability: string }>;
  competitors: Array<{ id: string; name: string; website: string | null; description: string | null }>;
  insights: Array<{ id: string; title: string; summary: string; agentType: string; priority: string; createdAt: string }>;
  value: { portfolioAlignment: number | null; risksAtRisk: number };
  stats: BrainStats;
}

export interface BrainConnection {
  type: 'vision' | 'vertical' | 'risk' | 'persona' | 'goal' | 'competitor';
  label: string;
  value: string;
  description: string;
  targetSection: string;
  targetIndex: number;
}

// Sprint 4 — Agent Collaboration Protocol

export type AgentType =
  | 'discovery'
  | 'risk'
  | 'strategy'
  | 'communications'
  | 'advisor'
  | 'thinker'
  | 'orchestrator';

export type WorkflowType =
  | 'initiative_deep_dive'
  | 'market_threat_response'
  | 'risk_escalation'
  | 'competitive_response';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

export type MessageType =
  | 'finding'
  | 'assessment'
  | 'recommendation'
  | 'draft'
  | 'summary';

export interface AgentMessageData {
  id: string;
  userId: string;
  workflowId: string;
  workflowType: string;
  stepIndex: number;
  fromAgent: string;
  toAgent: string;
  messageType: string;
  payload: string;
  status: string;
  errorMessage: string;
  initiativeId: string;
  metadata: string;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkflowStep {
  agent: AgentType;
  messageType: MessageType;
  promptTemplate: string;
  outputKey: string;
}

export interface WorkflowDefinition {
  type: WorkflowType;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

// ─── Integration Hub (Sprint 5) ─────────────────────────────────────────────

export type IntegrationType =
  | 'notion'
  | 'linear'
  | 'github'
  | 'jira'
  | 'confluence'
  | 'slack'
  | 'mixpanel'
  | 'amplitude'
  | 'ga4';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface IntegrationConnectionData {
  id: string;
  userId: string;
  integrationType: IntegrationType;
  status: IntegrationStatus;
  displayName: string;
  lastSyncAt: Date | null;
  errorMessage: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  docsUrl: string;
  fields: IntegrationField[];
}

export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  helpText?: string;
}
