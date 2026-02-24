'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bot, Send, Sparkles, Trash2, ChevronDown, ChevronRight,
  Target, Search, ShieldAlert, MessageSquare, GraduationCap, Brain,
  Check, X, Paperclip, Wrench, Pencil, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { StyledMarkdown } from '@/components/ui/styled-markdown';
import { KnowledgeUploader } from '@/components/knowledge/KnowledgeUploader';
import type { AgentId, AgentChatMessage } from '@/lib/types';

// Agent metadata for UI
const AGENT_INFO: Record<string, { name: string; icon: any; color: string; bgColor: string }> = {
  strategy: { name: 'Strategy', icon: Target, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  discovery: { name: 'Discovery', icon: Search, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  risk: { name: 'Risk', icon: ShieldAlert, color: 'text-red-600', bgColor: 'bg-red-100' },
  communications: { name: 'Communications', icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-100' },
  advisor: { name: 'Expert Advisor', icon: GraduationCap, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  thinker: { name: 'Thinker', icon: Brain, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
};

const AGENT_OPTIONS: Array<{ value: AgentId | null; label: string }> = [
  { value: null, label: 'Auto (smart routing)' },
  { value: 'strategy', label: 'Strategy Agent' },
  { value: 'discovery', label: 'Discovery Agent' },
  { value: 'risk', label: 'Risk Agent' },
  { value: 'communications', label: 'Communications Agent' },
  { value: 'advisor', label: 'Expert Advisor' },
  { value: 'thinker', label: 'Thinker' },
];

// Processing status steps
const PROCESSING_STEPS = [
  { text: 'Analyzing your question...', duration: 2000 },
  { text: 'Checking connected integrations...', duration: 3000 },
  { text: 'Querying Jira for live data...', duration: 4000 },
  { text: 'Generating response...', duration: 6000 },
];

export function ChatInterface() {
  const {
    chatMessages, addChatMessage, setChatMessages, clearChat, settings,
    selectedAgent, setSelectedAgent,
    pendingActions, addPendingAction, updatePendingAction, removePendingAction,
    initiatives, risks, roadmapItems, meetings,
    addInitiative, updateInitiative, moveInitiative,
    jiraProjectSchema,
    pendingChatPrompt, setPendingChatPrompt,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingPromptConsumed = useRef(false);
  const processingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

  // Animate processing steps
  useEffect(() => {
    if (isLoading) {
      setProcessingStep(0);
      let step = 0;
      const advance = () => {
        step++;
        if (step < PROCESSING_STEPS.length) {
          setProcessingStep(step);
          processingTimerRef.current = setTimeout(advance, PROCESSING_STEPS[step].duration);
        }
      };
      processingTimerRef.current = setTimeout(advance, PROCESSING_STEPS[0].duration);
    } else {
      if (processingTimerRef.current) {
        clearTimeout(processingTimerRef.current);
        processingTimerRef.current = null;
      }
      setProcessingStep(0);
    }
    return () => {
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, [isLoading]);

  // Consume pending chat prompt from quick actions — auto-send immediately
  useEffect(() => {
    if (pendingChatPrompt && !pendingPromptConsumed.current) {
      pendingPromptConsumed.current = true;
      const prompt = pendingChatPrompt;
      setPendingChatPrompt(null);
      handleSend(prompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingChatPrompt]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };
    addChatMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          history: chatMessages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          settings,
          storeData: { initiatives, risks, roadmapItems, meetings, jiraProjectSchema },
          agentId: selectedAgent,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      const pendingActionsList = (data.pending_actions || []).map((a: any) => ({
        id: a.id,
        agentId: a.agent_id || 'strategy',
        toolName: a.tool_name,
        toolArguments: a.tool_arguments,
        description: a.description,
        status: 'pending' as const,
        createdAt: new Date(),
      }));

      const assistantMessage: AgentChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'I apologize, I encountered an issue processing your request.',
        timestamp: new Date(),
        agentId: data.agent_id,
        agentName: data.agent_name,
        toolsExecuted: data.tools_executed || [],
        pendingActions: pendingActionsList,
        suggestedNextSteps: data.suggested_next_steps || [],
        sources: data.sources || [],
      };
      addChatMessage(assistantMessage);

      for (const action of pendingActionsList) {
        addPendingAction(action);
      }
    } catch (error) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Error connecting to AI service. Please check your LLM settings in Settings > LLM Provider.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, isLoading, chatMessages, settings, initiatives, risks, roadmapItems, meetings, selectedAgent]);

  // Edit and resubmit: truncate history from the edited message and resend
  const handleEditSubmit = useCallback(async (messageId: string) => {
    if (!editInput.trim() || isLoading) return;

    const idx = chatMessages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    // Truncate: keep messages before the edited one
    const kept = chatMessages.slice(0, idx);
    setChatMessages(kept);
    setEditingMessageId(null);

    const messageToSend = editInput.trim();
    setEditInput('');
    setIsLoading(true);

    const userMessage: AgentChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageToSend,
      timestamp: new Date(),
    };
    setChatMessages([...kept, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          history: kept.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          settings,
          storeData: { initiatives, risks, roadmapItems, meetings, jiraProjectSchema },
          agentId: selectedAgent,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      const data = await response.json();

      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'I apologize, I encountered an issue processing your request.',
        timestamp: new Date(),
        agentId: data.agent_id,
        agentName: data.agent_name,
        toolsExecuted: data.tools_executed || [],
        pendingActions: data.pending_actions || [],
        sources: data.sources || [],
      });
    } catch (error) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Error connecting to AI service. Please check your LLM settings in Settings > LLM Provider.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editInput, isLoading, chatMessages, settings, initiatives, risks, roadmapItems, meetings, selectedAgent]);

  const handleApproveAction = async (actionId: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    try {
      const resp = await fetch('/api/agents/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          decision: 'approve',
          toolName: action.toolName,
          toolArguments: action.toolArguments,
          settings: { integrations: settings.integrations },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          updatePendingAction(actionId, { status: 'executed', result: JSON.stringify(data.result) });

          // Apply store mutations if returned
          if (data.storeAction) {
            switch (data.storeAction.type) {
              case 'addInitiative':
                addInitiative(data.storeAction.payload);
                break;
              case 'updateInitiative':
                updateInitiative(data.storeAction.payload.id, data.storeAction.payload.updates);
                break;
              case 'moveInitiative':
                moveInitiative(data.storeAction.payload.id, data.storeAction.payload.newStatus);
                break;
            }
          }

          // Build descriptive success message
          const resultInfo = data.result?.key ? ` (${data.result.key})` : '';
          toast.success(`Action executed${resultInfo}: ${action.description}`);
        } else {
          toast.error(`Action failed: ${data.error || 'Unknown error'}`);
        }
      } else {
        toast.error('Failed to execute action');
      }
    } catch {
      toast.error('Error executing action');
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      await fetch('/api/agents/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId, decision: 'reject' }),
      });
      updatePendingAction(actionId, { status: 'rejected' });
      toast.info('Action rejected');
    } catch {
      toast.error('Error rejecting action');
    }
  };

  const toggleTools = (messageId: string) => {
    setExpandedTools((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  };

  const startEditing = (message: AgentChatMessage) => {
    setEditingMessageId(message.id);
    setEditInput(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditInput('');
  };

  const suggestions = [
    'What are the current risks?',
    'Summarize recent meetings',
    'What do we know about the top initiative?',
    'What should I prioritize this sprint?',
    'Give me the big picture of our roadmap',
  ];

  const activePending = pendingActions.filter((a) => a.status === 'pending');

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="p-4 border-b bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">AI Product Assistant</h2>
              <p className="text-sm text-slate-500">6 specialized agents at your service</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className="gap-1"
              >
                {selectedAgent ? (
                  <>
                    {(() => { const info = AGENT_INFO[selectedAgent]; const Icon = info.icon; return <Icon className={cn('h-4 w-4', info.color)} />; })()}
                    {AGENT_INFO[selectedAgent]?.name}
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4" />
                    Auto
                  </>
                )}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showAgentSelector && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border rounded-lg shadow-lg z-50 py-1">
                  {AGENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value ?? 'auto'}
                      onClick={() => { setSelectedAgent(opt.value as any); setShowAgentSelector(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2',
                        selectedAgent === opt.value && 'bg-slate-100 dark:bg-slate-700'
                      )}
                    >
                      {opt.value ? (() => { const info = AGENT_INFO[opt.value]; const Icon = info.icon; return <Icon className={cn('h-4 w-4', info.color)} />; })() : <Bot className="h-4 w-4 text-slate-400" />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {chatMessages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => { clearChat(); toast.success('Chat cleared'); }}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Pending Actions Banner */}
      {activePending.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            {activePending.length} action{activePending.length > 1 ? 's' : ''} awaiting approval
          </p>
          <div className="space-y-2">
            {activePending.map((action) => (
              <div key={action.id} className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-2 border border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{action.description}</span>
                  <Badge variant="outline" className="text-xs">{action.agentId}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-green-600 hover:bg-green-50" onClick={() => handleApproveAction(action.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-red-600 hover:bg-red-50" onClick={() => handleRejectAction(action.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-4">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">How can I help you today?</h3>
            <p className="text-slate-500 mb-4 max-w-md">
              I have 6 specialized agents ready to help with strategy, discovery, risk, communications, expert advice, and deep analysis.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {Object.entries(AGENT_INFO).map(([id, info]) => {
                const Icon = info.icon;
                return (
                  <Badge key={id} variant="outline" className="py-1 px-2 cursor-pointer hover:bg-slate-100" onClick={() => setSelectedAgent(id as AgentId)}>
                    <Icon className={cn('h-3 w-3 mr-1', info.color)} />
                    {info.name}
                  </Badge>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)} className="text-slate-600 dark:text-slate-300">
                  {s}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {chatMessages.map((message) => (
              <div key={message.id} className={cn('flex gap-3 group', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={cn(
                      message.agentId ? AGENT_INFO[message.agentId]?.bgColor : 'bg-blue-100',
                      message.agentId ? AGENT_INFO[message.agentId]?.color : 'text-blue-600'
                    )}>
                      {message.agentId ? (() => { const Icon = AGENT_INFO[message.agentId]?.icon || Bot; return <Icon className="h-4 w-4" />; })() : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn('max-w-[80%] rounded-lg relative', message.role === 'user' ? 'bg-blue-600 text-white p-3' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white p-3')}>
                  {/* Edit button for user messages */}
                  {message.role === 'user' && !isLoading && editingMessageId !== message.id && (
                    <button
                      onClick={() => startEditing(message)}
                      className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      title="Edit and resend"
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  )}

                  {/* Agent badge */}
                  {message.role === 'assistant' && message.agentName && (
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={cn('text-xs', message.agentId && AGENT_INFO[message.agentId]?.color)}>
                        {message.agentName}
                      </Badge>
                    </div>
                  )}

                  {/* Message content — editable or static */}
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) handleEditSubmit(message.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="bg-white text-slate-900 dark:bg-slate-700 dark:text-white"
                        autoFocus
                      />
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-200 hover:text-white hover:bg-blue-700" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button size="sm" className="h-6 px-2 text-xs bg-white text-blue-600 hover:bg-blue-50" onClick={() => handleEditSubmit(message.id)}>
                          <Send className="h-3 w-3 mr-1" /> Resend
                        </Button>
                      </div>
                    </div>
                  ) : message.role === 'assistant' ? (
                    <StyledMarkdown>{message.content}</StyledMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}

                  {/* Tools executed (collapsible) */}
                  {message.toolsExecuted && message.toolsExecuted.length > 0 && (
                    <div className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <button
                        onClick={() => toggleTools(message.id)}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                      >
                        {expandedTools[message.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <Wrench className="h-3 w-3" />
                        {message.toolsExecuted.length} action{message.toolsExecuted.length > 1 ? 's' : ''} taken
                      </button>
                      {expandedTools[message.id] && (
                        <div className="mt-1 space-y-1">
                          {message.toolsExecuted.map((tool, i) => (
                            <div key={i} className="text-xs flex items-center gap-1">
                              <span className={cn(
                                'inline-block h-2 w-2 rounded-full',
                                tool.status === 'executed' ? 'bg-green-500' :
                                tool.status === 'pending' ? 'bg-amber-500' :
                                tool.status === 'blocked' ? 'bg-slate-400' : 'bg-red-500'
                              )} />
                              <span className="text-slate-600 dark:text-slate-400">
                                {tool.toolName}
                              </span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1">{tool.status}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.sources.map((src, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] py-0">
                          {src.sourceType}: {src.sourceLabel}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Inline proposed actions */}
                  {message.role === 'assistant' && message.pendingActions && message.pendingActions.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <p className="text-xs font-medium text-slate-500">Proposed Actions:</p>
                      {message.pendingActions.map((action) => {
                        const storeAction = pendingActions.find((a) => a.id === action.id);
                        const status = storeAction?.status || action.status;
                        return (
                          <div key={action.id} className={cn(
                            'rounded-lg border p-3',
                            status === 'executed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                            status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60' :
                            'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                          )}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Wrench className="h-4 w-4 text-amber-600 shrink-0" />
                                <span className="text-sm font-medium truncate">{action.description}</span>
                              </div>
                              {status === 'pending' && (
                                <div className="flex gap-1 shrink-0">
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30" onClick={() => handleApproveAction(action.id)}>
                                    <Check className="h-3 w-3 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleRejectAction(action.id)}>
                                    <X className="h-3 w-3 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                              {status === 'executed' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">Executed</Badge>}
                              {status === 'rejected' && <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 shrink-0">Rejected</Badge>}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                              {action.toolName}: {JSON.stringify(action.toolArguments).substring(0, 120)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Suggested next steps */}
                  {message.role === 'assistant' && message.suggestedNextSteps && message.suggestedNextSteps.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <p className="text-xs font-medium text-slate-500 mb-2">Suggested Next Steps:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.suggestedNextSteps.map((step, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSend(step.chatPrompt)}
                          >
                            {step.text}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingMessageId !== message.id && (
                    <p className={cn('text-xs mt-1', message.role === 'user' ? 'text-blue-200' : 'text-slate-400')}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-slate-200 text-slate-600">U</AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {/* Processing indicator with step-by-step status */}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={cn(
                    selectedAgent ? AGENT_INFO[selectedAgent]?.bgColor : 'bg-blue-100',
                    selectedAgent ? AGENT_INFO[selectedAgent]?.color : 'text-blue-600'
                  )}>
                    {selectedAgent ? (() => { const Icon = AGENT_INFO[selectedAgent]?.icon || Bot; return <Icon className="h-4 w-4" />; })() : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedAgent ? AGENT_INFO[selectedAgent]?.name : 'Processing'}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {PROCESSING_STEPS.map((step, i) => (
                      <div key={i} className={cn(
                        'flex items-center gap-2 text-xs transition-all duration-300',
                        i < processingStep ? 'text-green-600 dark:text-green-400' :
                        i === processingStep ? 'text-blue-600 dark:text-blue-400' :
                        'text-slate-300 dark:text-slate-600'
                      )}>
                        {i < processingStep ? (
                          <Check className="h-3 w-3 shrink-0" />
                        ) : i === processingStep ? (
                          <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                        ) : (
                          <div className="h-3 w-3 shrink-0" />
                        )}
                        <span>{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white dark:bg-slate-900">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="shrink-0 relative">
                <Paperclip className="h-4 w-4" />
                {knowledgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                    {knowledgeCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-96">
              <KnowledgeUploader
                compact
                onDocsChange={(docs) => setKnowledgeCount(docs.length)}
              />
            </PopoverContent>
          </Popover>
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={selectedAgent ? `Ask the ${AGENT_INFO[selectedAgent]?.name}...` : 'Ask anything — auto-routed to the right agent...'}
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
