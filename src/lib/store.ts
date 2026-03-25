import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  UserSettings,
  defaultSettings,
  Initiative,
  Meeting,
  RoadmapItem,
  ChatMessage,
  Risk,
  Persona,
  JiraProjectSchema,
  MarketResearchReport,
  VisionPyramid,
  NorthStarData,
  BusinessGoalData,
  TargetGroupData,
  NeedData,
  ProductMappingData,
  CompetitorData,
  CompetitorFeedItem,
  UserAlertData,
  CronJobData,
  ChatSessionData,
} from './types';
import type { AgentId, AgentChatMessage, AgentPendingAction } from './types';

interface AppState {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Settings
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateLLMConfig: (config: Partial<UserSettings['llm']>) => void;
  updateIntegrations: (integrations: Partial<UserSettings['integrations']>) => void;
  updatePreferences: (preferences: Partial<UserSettings['preferences']>) => void;

  // Initiatives
  initiatives: Initiative[];
  setInitiatives: (initiatives: Initiative[]) => void;
  addInitiative: (initiative: Initiative) => void;
  updateInitiative: (id: string, updates: Partial<Initiative>) => void;
  deleteInitiative: (id: string) => void;
  moveInitiative: (id: string, newStatus: Initiative['status']) => void;

  // Meetings
  meetings: Meeting[];
  setMeetings: (meetings: Meeting[]) => void;
  addMeeting: (meeting: Meeting) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;

  // Roadmap
  roadmapItems: RoadmapItem[];
  addRoadmapItem: (item: RoadmapItem) => void;
  updateRoadmapItem: (id: string, updates: Partial<RoadmapItem>) => void;
  deleteRoadmapItem: (id: string) => void;

  // Chat (agent-aware)
  chatMessages: AgentChatMessage[];
  addChatMessage: (message: AgentChatMessage) => void;
  setChatMessages: (messages: AgentChatMessage[]) => void;
  clearChat: () => void;

  // Agent state
  selectedAgent: AgentId | null;
  setSelectedAgent: (agent: AgentId | null) => void;
  pendingActions: AgentPendingAction[];
  addPendingAction: (action: AgentPendingAction) => void;
  updatePendingAction: (id: string, updates: Partial<AgentPendingAction>) => void;
  removePendingAction: (id: string) => void;

  // Knowledge Base
  knowledgeDocs: Array<{ id: string; sourceType: string; sourceName: string; sourceUrl?: string; fileType?: string; fileSize?: number; createdAt: Date }>;
  setKnowledgeDocs: (docs: any[]) => void;

  // Risks
  risks: Risk[];
  setRisks: (risks: Risk[]) => void;
  addRisk: (risk: Risk) => void;
  updateRisk: (id: string, updates: Partial<Risk>) => void;
  deleteRisk: (id: string) => void;

  // Personas
  personas: Persona[];
  setPersonas: (personas: Persona[]) => void;
  addPersona: (persona: Persona) => void;
  updatePersona: (id: string, updates: Partial<Persona>) => void;
  deletePersona: (id: string) => void;

  // Jira Project Schema (discovered on connection)
  jiraProjectSchema: JiraProjectSchema | null;
  setJiraProjectSchema: (schema: JiraProjectSchema | null) => void;

  // Pending chat prompt (for quick actions navigation)
  pendingChatPrompt: string | null;
  setPendingChatPrompt: (prompt: string | null) => void;

  // Market Intelligence
  marketResearches: MarketResearchReport[];
  setMarketResearches: (items: MarketResearchReport[]) => void;
  addMarketResearch: (item: MarketResearchReport) => void;
  updateMarketResearch: (id: string, updates: Partial<MarketResearchReport>) => void;
  deleteMarketResearch: (id: string) => void;

  // Vision Pillar (Azmyra 3.0)
  visionPyramid: VisionPyramid;
  visionLoading: boolean;
  setVisionLoading: (loading: boolean) => void;
  setNorthStar: (ns: NorthStarData | null) => void;
  setBusinessGoals: (goals: BusinessGoalData[]) => void;
  addBusinessGoal: (goal: BusinessGoalData) => void;
  updateBusinessGoal: (id: string, updates: Partial<BusinessGoalData>) => void;
  deleteBusinessGoal: (id: string) => void;
  setTargetGroups: (groups: TargetGroupData[]) => void;
  addTargetGroup: (group: TargetGroupData) => void;
  updateTargetGroup: (id: string, updates: Partial<TargetGroupData>) => void;
  deleteTargetGroup: (id: string) => void;
  setNeeds: (needs: NeedData[]) => void;
  addNeed: (need: NeedData) => void;
  updateNeed: (id: string, updates: Partial<NeedData>) => void;
  deleteNeed: (id: string) => void;
  setProducts: (products: ProductMappingData[]) => void;
  addProduct: (product: ProductMappingData) => void;
  deleteProduct: (id: string) => void;
  setVisionComplete: (complete: boolean) => void;

  // Competitors Eye
  competitors: CompetitorData[];
  competitorFeed: CompetitorFeedItem[];
  setCompetitors: (items: CompetitorData[]) => void;
  addCompetitor: (item: CompetitorData) => void;
  updateCompetitor: (id: string, updates: Partial<CompetitorData>) => void;
  deleteCompetitor: (id: string) => void;
  setCompetitorFeed: (items: CompetitorFeedItem[]) => void;

  // User Alerts
  userAlerts: UserAlertData[];
  unreadAlertCount: number;
  setUserAlerts: (alerts: UserAlertData[]) => void;
  addUserAlert: (alert: UserAlertData) => void;
  markAlertRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  setUnreadAlertCount: (count: number) => void;

  // Cron Jobs
  cronJobs: CronJobData[];
  setCronJobs: (jobs: CronJobData[]) => void;
  updateCronJob: (id: string, updates: Partial<CronJobData>) => void;

  // Chat Sessions
  chatSessions: ChatSessionData[];
  activeChatSessionId: string | null;
  setChatSessions: (sessions: ChatSessionData[]) => void;
  addChatSession: (session: ChatSessionData) => void;
  setActiveChatSessionId: (id: string | null) => void;
  updateChatSession: (id: string, updates: Partial<ChatSessionData>) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Navigation
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateLLMConfig: (config) =>
        set((state) => ({
          settings: {
            ...state.settings,
            llm: { ...state.settings.llm, ...config },
          },
        })),
      updateIntegrations: (integrations) =>
        set((state) => ({
          settings: {
            ...state.settings,
            integrations: { ...state.settings.integrations, ...integrations },
          },
        })),
      updatePreferences: (preferences) =>
        set((state) => ({
          settings: {
            ...state.settings,
            preferences: { ...state.settings.preferences, ...preferences },
          },
        })),

      // Initiatives
      initiatives: [],
      setInitiatives: (initiatives) => set({ initiatives }),
      addInitiative: (initiative) =>
        set((state) => ({ initiatives: [...state.initiatives, initiative] })),
      updateInitiative: (id, updates) =>
        set((state) => ({
          initiatives: state.initiatives.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),
      deleteInitiative: (id) =>
        set((state) => ({
          initiatives: state.initiatives.filter((i) => i.id !== id),
        })),
      moveInitiative: (id, newStatus) =>
        set((state) => ({
          initiatives: state.initiatives.map((i) =>
            i.id === id ? { ...i, status: newStatus } : i
          ),
        })),

      // Meetings
      meetings: [],
      setMeetings: (meetings) => set({ meetings }),
      addMeeting: (meeting) =>
        set((state) => ({ meetings: [...state.meetings, meeting] })),
      updateMeeting: (id, updates) =>
        set((state) => ({
          meetings: state.meetings.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      deleteMeeting: (id) =>
        set((state) => ({
          meetings: state.meetings.filter((m) => m.id !== id),
        })),

      // Roadmap
      roadmapItems: [],
      addRoadmapItem: (item) =>
        set((state) => ({ roadmapItems: [...state.roadmapItems, item] })),
      updateRoadmapItem: (id, updates) =>
        set((state) => ({
          roadmapItems: state.roadmapItems.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteRoadmapItem: (id) =>
        set((state) => ({
          roadmapItems: state.roadmapItems.filter((r) => r.id !== id),
        })),

      // Chat (agent-aware)
      chatMessages: [],
      addChatMessage: (message) =>
        set((state) => ({ chatMessages: [...state.chatMessages, message] })),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      clearChat: () => set({ chatMessages: [] }),

      // Agent state
      selectedAgent: null,
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),
      pendingActions: [],
      addPendingAction: (action) =>
        set((state) => ({ pendingActions: [...state.pendingActions, action] })),
      updatePendingAction: (id, updates) =>
        set((state) => ({
          pendingActions: state.pendingActions.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      removePendingAction: (id) =>
        set((state) => ({
          pendingActions: state.pendingActions.filter((a) => a.id !== id),
        })),

      // Knowledge Base
      knowledgeDocs: [],
      setKnowledgeDocs: (docs) => set({ knowledgeDocs: docs }),

      // Risks
      risks: [],
      setRisks: (risks) => set({ risks }),
      addRisk: (risk) =>
        set((state) => ({ risks: [...state.risks, risk] })),
      updateRisk: (id, updates) =>
        set((state) => ({
          risks: state.risks.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      deleteRisk: (id) =>
        set((state) => ({
          risks: state.risks.filter((r) => r.id !== id),
        })),

      // Personas
      personas: [],
      setPersonas: (personas) => set({ personas }),
      addPersona: (persona) =>
        set((state) => ({ personas: [...state.personas, persona] })),
      updatePersona: (id, updates) =>
        set((state) => ({
          personas: state.personas.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deletePersona: (id) =>
        set((state) => ({
          personas: state.personas.filter((p) => p.id !== id),
        })),

      // Jira Project Schema
      jiraProjectSchema: null,
      setJiraProjectSchema: (schema) => set({ jiraProjectSchema: schema }),

      // Pending chat prompt
      pendingChatPrompt: null,
      setPendingChatPrompt: (prompt) => set({ pendingChatPrompt: prompt }),

      // Market Intelligence
      marketResearches: [],
      setMarketResearches: (items) => set({ marketResearches: items }),
      addMarketResearch: (item) => set((state) => ({ marketResearches: [...state.marketResearches, item] })),
      updateMarketResearch: (id, updates) => set((state) => ({
        marketResearches: state.marketResearches.map((r) => r.id === id ? { ...r, ...updates } : r),
      })),
      deleteMarketResearch: (id) => set((state) => ({
        marketResearches: state.marketResearches.filter((r) => r.id !== id),
      })),

      // Vision Pillar (Azmyra 3.0)
      visionPyramid: {
        northStar: null,
        businessGoals: [],
        targetGroups: [],
        needs: [],
        products: [],
        visionComplete: false,
      },
      visionLoading: false,
      setVisionLoading: (loading) => set({ visionLoading: loading }),
      setNorthStar: (ns) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, northStar: ns },
      })),
      setBusinessGoals: (goals) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, businessGoals: goals },
      })),
      addBusinessGoal: (goal) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, businessGoals: [...state.visionPyramid.businessGoals, goal] },
      })),
      updateBusinessGoal: (id, updates) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          businessGoals: state.visionPyramid.businessGoals.map((g) => g.id === id ? { ...g, ...updates } : g),
        },
      })),
      deleteBusinessGoal: (id) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          businessGoals: state.visionPyramid.businessGoals.filter((g) => g.id !== id),
        },
      })),
      setTargetGroups: (groups) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, targetGroups: groups },
      })),
      addTargetGroup: (group) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, targetGroups: [...state.visionPyramid.targetGroups, group] },
      })),
      updateTargetGroup: (id, updates) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          targetGroups: state.visionPyramid.targetGroups.map((g) => g.id === id ? { ...g, ...updates } : g),
        },
      })),
      deleteTargetGroup: (id) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          targetGroups: state.visionPyramid.targetGroups.filter((g) => g.id !== id),
        },
      })),
      setNeeds: (needs) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, needs },
      })),
      addNeed: (need) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, needs: [...state.visionPyramid.needs, need] },
      })),
      updateNeed: (id, updates) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          needs: state.visionPyramid.needs.map((n) => n.id === id ? { ...n, ...updates } : n),
        },
      })),
      deleteNeed: (id) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          needs: state.visionPyramid.needs.filter((n) => n.id !== id),
        },
      })),
      setProducts: (products) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, products },
      })),
      addProduct: (product) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, products: [...state.visionPyramid.products, product] },
      })),
      deleteProduct: (id) => set((state) => ({
        visionPyramid: {
          ...state.visionPyramid,
          products: state.visionPyramid.products.filter((p) => p.id !== id),
        },
      })),
      setVisionComplete: (complete) => set((state) => ({
        visionPyramid: { ...state.visionPyramid, visionComplete: complete },
      })),

      // Competitors Eye
      competitors: [],
      competitorFeed: [],
      setCompetitors: (items) => set({ competitors: items }),
      addCompetitor: (item) => set((state) => ({ competitors: [...state.competitors, item] })),
      updateCompetitor: (id, updates) => set((state) => ({
        competitors: state.competitors.map((c) => c.id === id ? { ...c, ...updates } : c),
      })),
      deleteCompetitor: (id) => set((state) => ({
        competitors: state.competitors.filter((c) => c.id !== id),
      })),
      setCompetitorFeed: (items) => set({ competitorFeed: items }),

      // User Alerts
      userAlerts: [],
      unreadAlertCount: 0,
      setUserAlerts: (alerts) => set({ userAlerts: alerts }),
      addUserAlert: (alert) => set((state) => ({
        userAlerts: [alert, ...state.userAlerts],
        unreadAlertCount: state.unreadAlertCount + 1,
      })),
      markAlertRead: (id) => set((state) => ({
        userAlerts: state.userAlerts.map((a) => a.id === id ? { ...a, isRead: true } : a),
        unreadAlertCount: Math.max(0, state.unreadAlertCount - 1),
      })),
      dismissAlert: (id) => set((state) => ({
        userAlerts: state.userAlerts.map((a) => a.id === id ? { ...a, isDismissed: true } : a),
      })),
      setUnreadAlertCount: (count) => set({ unreadAlertCount: count }),

      // Cron Jobs
      cronJobs: [],
      setCronJobs: (jobs) => set({ cronJobs: jobs }),
      updateCronJob: (id, updates) => set((state) => ({
        cronJobs: state.cronJobs.map((j) => j.id === id ? { ...j, ...updates } : j),
      })),

      // Chat Sessions
      chatSessions: [],
      activeChatSessionId: null,
      setChatSessions: (sessions) => set({ chatSessions: sessions }),
      addChatSession: (session) => set((state) => ({
        chatSessions: [session, ...state.chatSessions],
      })),
      setActiveChatSessionId: (id) => set({ activeChatSessionId: id }),
      updateChatSession: (id, updates) => set((state) => ({
        chatSessions: state.chatSessions.map((s) => s.id === id ? { ...s, ...updates } : s),
      })),

      // UI State
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'vppo-storage',
      partialize: (state) => ({
        settings: state.settings,
        initiatives: state.initiatives,
        meetings: state.meetings,
        roadmapItems: state.roadmapItems,
        chatMessages: state.chatMessages,
        risks: state.risks,
        personas: state.personas,
        pendingActions: state.pendingActions,
        jiraProjectSchema: state.jiraProjectSchema,
      }),
      merge: (persistedState: any, currentState: any) => {
        // Deep-merge persisted settings with defaults so new keys never come back as undefined
        const persisted = (persistedState || {}) as Record<string, any>;
        const mergedSettings = {
          ...defaultSettings,
          ...persisted.settings,
          llm: { ...defaultSettings.llm, ...persisted.settings?.llm },
          integrations: {
            ...defaultSettings.integrations,
            ...persisted.settings?.integrations,
            jira: { ...defaultSettings.integrations.jira, ...persisted.settings?.integrations?.jira },
            slack: { ...defaultSettings.integrations.slack, ...persisted.settings?.integrations?.slack },
            confluence: { ...defaultSettings.integrations.confluence, ...persisted.settings?.integrations?.confluence },
            email: { ...defaultSettings.integrations.email, ...persisted.settings?.integrations?.email },
            zoom: { ...defaultSettings.integrations.zoom, ...persisted.settings?.integrations?.zoom },
            teams: { ...defaultSettings.integrations.teams, ...persisted.settings?.integrations?.teams },
          },
          preferences: { ...defaultSettings.preferences, ...persisted.settings?.preferences },
        };
        return {
          ...currentState,
          ...persisted,
          settings: mergedSettings,
        };
      },
    }
  )
);

// Sample data for demo
export const loadSampleData = () => {
  const state = useAppStore.getState();

  if (state.initiatives.length === 0) {
    // Add sample initiatives
    const sampleInitiatives: Initiative[] = [
      {
        id: '1',
        title: 'AI-Powered Analytics Dashboard',
        description: 'Build a real-time analytics dashboard with AI insights for business users',
        status: 'approved',
        businessValue: 'high',
        effort: 'high',
        stakeholders: ['Product Team', 'Data Science', 'Engineering'],
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        tags: ['AI', 'Analytics', 'Dashboard'],
        risks: ['Data privacy concerns', 'Performance at scale'],
        dependencies: ['Data pipeline v2'],
      },
      {
        id: '2',
        title: 'Customer Self-Service Portal',
        description: 'Enable customers to manage their accounts and view usage analytics',
        status: 'definition',
        businessValue: 'high',
        effort: 'medium',
        stakeholders: ['Customer Success', 'Engineering'],
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        tags: ['Customer', 'Portal', 'Self-service'],
        risks: ['Security review required'],
        dependencies: [],
      },
      {
        id: '3',
        title: 'ML Model Monitoring System',
        description: 'Implement monitoring and alerting for production ML models',
        status: 'discovery',
        businessValue: 'medium',
        effort: 'medium',
        stakeholders: ['Data Science', 'DevOps'],
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        tags: ['ML', 'Monitoring', 'DevOps'],
        risks: [],
        dependencies: [],
      },
      {
        id: '4',
        title: 'API Rate Limiting Enhancement',
        description: 'Improve API rate limiting with dynamic limits based on customer tier',
        status: 'idea',
        businessValue: 'low',
        effort: 'low',
        stakeholders: ['Engineering', 'Sales'],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['API', 'Infrastructure'],
        risks: [],
        dependencies: [],
      },
    ];

    sampleInitiatives.forEach((i) => state.addInitiative(i));
  }

  if (state.meetings.length === 0) {
    const sampleMeetings: Meeting[] = [
      {
        id: '1',
        title: 'Q3 Roadmap Planning',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        duration: 60,
        participants: ['Product Team', 'Engineering Lead', 'Stakeholders'],
        status: 'summarized',
        summary: 'Discussed Q3 priorities including AI Dashboard and Customer Portal. Agreement on focusing resources on high-impact initiatives. Need to revisit timeline for ML Monitoring.',
        actionItems: [
          { id: 'a1', description: 'Finalize Q3 roadmap document', assignee: 'PM', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'pending', source: '1' },
          { id: 'a2', description: 'Schedule technical review for AI Dashboard', assignee: 'Tech Lead', status: 'pending', source: '1' },
        ],
        decisions: ['AI Dashboard is top priority for Q3', 'ML Monitoring moved to Q4'],
        challenges: ['Resource constraints between AI Dashboard and Portal projects'],
      },
      {
        id: '2',
        title: 'Sprint Review - Team Alpha',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        duration: 30,
        participants: ['Team Alpha', 'Scrum Master', 'PM'],
        status: 'completed',
        actionItems: [],
        decisions: [],
        challenges: [],
      },
      {
        id: '3',
        title: 'Stakeholder Sync - Enterprise Customers',
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        duration: 45,
        participants: ['Enterprise Sales', 'Customer Success', 'PM'],
        status: 'scheduled',
        actionItems: [],
        decisions: [],
        challenges: [],
      },
    ];

    sampleMeetings.forEach((m) => state.addMeeting(m));
  }

  if (state.risks.length === 0) {
    const sampleRisks: Risk[] = [
      {
        id: '1',
        title: 'Resource Bottleneck - AI Team',
        description: 'AI team is overloaded with multiple high-priority initiatives',
        severity: 'high',
        probability: 'high',
        impact: 'high',
        status: 'identified',
        relatedItems: ['1', '3'],
        mitigationPlan: 'Consider external contractors or reprioritization',
        createdAt: new Date(),
      },
      {
        id: '2',
        title: 'Security Review Delay',
        description: 'Customer Portal requires security review which has 3-week backlog',
        severity: 'medium',
        probability: 'medium',
        impact: 'medium',
        status: 'mitigating',
        relatedItems: ['2'],
        mitigationPlan: 'Engage security team early, provide documentation in advance',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    sampleRisks.forEach((r) => state.addRisk(r));
  }

  if (state.personas.length === 0) {
    const samplePersonas: Persona[] = [
      {
        id: 'p1',
        name: 'Data Analyst',
        role: 'Analytics User',
        goals: ['Access real-time dashboards', 'Export reports easily'],
        painPoints: ['Complex query building', 'Slow load times'],
      },
      {
        id: 'p2',
        name: 'Product Manager',
        role: 'Decision Maker',
        goals: ['View KPIs at a glance', 'Track roadmap progress'],
        painPoints: ['Too many clicks to find info', 'Lack of mobile access'],
      },
    ];

    samplePersonas.forEach((p) => state.addPersona(p));

    // Link sample personas to sample initiatives
    state.updateInitiative('1', { personaIds: ['p1', 'p2'] });
    state.updateInitiative('2', { personaIds: ['p2'] });
  }
};
