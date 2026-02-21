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
  addInitiative: (initiative: Initiative) => void;
  updateInitiative: (id: string, updates: Partial<Initiative>) => void;
  deleteInitiative: (id: string) => void;
  moveInitiative: (id: string, newStatus: Initiative['status']) => void;

  // Meetings
  meetings: Meeting[];
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
  addRisk: (risk: Risk) => void;
  updateRisk: (id: string, updates: Partial<Risk>) => void;
  deleteRisk: (id: string) => void;

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
        pendingActions: state.pendingActions,
      }),
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
};
