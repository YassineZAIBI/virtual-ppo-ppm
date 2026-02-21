'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import {
  Search, Sparkles, FileText, Users, TrendingUp, Target,
  Plus, Trash2, Loader2, ChevronLeft, ArrowLeft,
  BookOpen, MessageSquare, BarChart3, Zap, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Initiative, DiscoveryNote } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';

const DISCOVERY_TABS = [
  { id: 'ai-prep', label: 'AI Preparation', icon: Sparkles },
  { id: 'documentation', label: 'Documentation', icon: FileText },
  { id: 'interviews', label: 'Interviews', icon: Users },
  { id: 'market-research', label: 'Market Research', icon: BarChart3 },
  { id: 'impact', label: 'Impact Analysis', icon: TrendingUp },
];

export function DiscoveryView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { initiatives, updateInitiative, settings } = useAppStore();

  const selectedId = searchParams.get('id');
  const discoveryInitiatives = initiatives.filter((i) => i.status === 'discovery');

  const [activeInitiativeId, setActiveInitiativeId] = useState<string | null>(selectedId);
  const [activeTab, setActiveTab] = useState('ai-prep');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', type: 'general' as DiscoveryNote['type'] });

  const activeInitiative = initiatives.find((i) => i.id === activeInitiativeId);

  useEffect(() => {
    if (selectedId && initiatives.find((i) => i.id === selectedId)) {
      setActiveInitiativeId(selectedId);
    } else if (discoveryInitiatives.length > 0 && !activeInitiativeId) {
      setActiveInitiativeId(discoveryInitiatives[0].id);
    }
  }, [selectedId, discoveryInitiatives.length]);

  const getDiscoveryData = (initiative: Initiative) => {
    return initiative.discovery || { notes: [], status: 'not_started' as const };
  };

  const getNotesByType = (initiative: Initiative, type: string) => {
    const data = getDiscoveryData(initiative);
    if (type === 'general') return data.notes;
    return data.notes.filter((n) => n.type === type);
  };

  const addNote = () => {
    if (!activeInitiative || !newNote.title.trim()) return;
    const data = getDiscoveryData(activeInitiative);
    const note: DiscoveryNote = {
      id: crypto.randomUUID(),
      type: newNote.type,
      title: newNote.title,
      content: newNote.content,
      createdAt: new Date(),
    };
    updateInitiative(activeInitiative.id, {
      discovery: {
        ...data,
        notes: [...data.notes, note],
        status: 'in_progress',
        lastUpdated: new Date(),
      },
    });
    setNewNote({ title: '', content: '', type: 'general' });
    setShowAddNote(false);
    toast.success('Note added!');
  };

  const deleteNote = (noteId: string) => {
    if (!activeInitiative) return;
    const data = getDiscoveryData(activeInitiative);
    updateInitiative(activeInitiative.id, {
      discovery: {
        ...data,
        notes: data.notes.filter((n) => n.id !== noteId),
        lastUpdated: new Date(),
      },
    });
    toast.success('Note removed');
  };

  const runAiAnalysis = async (prompt: string, context: string) => {
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          settings,
        }),
      });
      if (!response.ok) throw new Error('AI request failed');
      const data = await response.json();
      return data.response || data.content || 'No response generated.';
    } catch (error) {
      toast.error('AI analysis failed. Check your LLM settings.');
      return null;
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDiscoveryPrep = async () => {
    if (!activeInitiative) return;
    const prompt = `You are a senior product discovery consultant. Prepare a comprehensive discovery plan for this initiative.

**Initiative:** ${activeInitiative.title}
**Description:** ${activeInitiative.description || 'Not provided'}
**Why Needed:** ${activeInitiative.whyNeeded || 'Not provided'}
**What If Not Done:** ${activeInitiative.whatIfNot || 'Not provided'}
**Expected Value:** ${activeInitiative.expectedValue || 'Not provided'}
**Time to Market:** ${activeInitiative.expectedTimeToMarket || 'Not provided'}
**Stakeholders:** ${activeInitiative.stakeholders.join(', ') || 'Not specified'}
**Tags:** ${activeInitiative.tags.join(', ') || 'None'}
**Risks:** ${activeInitiative.risks.join(', ') || 'None identified'}

Provide:
1. **Discovery Goals** - What we need to learn
2. **Key Hypotheses** - Assumptions to validate
3. **Research Plan** - Interviews, surveys, data analysis needed
4. **Documentation Needed** - PRDs, specs, competitive analysis
5. **Market Research Areas** - Competitive landscape, market sizing, trends
6. **Impact Assessment Framework** - How to measure potential impact
7. **Recommended Timeline** - Discovery phases and milestones
8. **Risk Mitigation** - How to de-risk before investing

Use markdown formatting with headers and bullet points.`;

    const result = await runAiAnalysis(prompt, 'discovery-prep');
    if (result) {
      const data = getDiscoveryData(activeInitiative);
      updateInitiative(activeInitiative.id, {
        discovery: {
          ...data,
          aiAnalysis: result,
          status: 'in_progress',
          lastUpdated: new Date(),
        },
      });
      toast.success('AI discovery preparation complete!');
    }
  };

  const handleAiSectionGenerate = async (section: string) => {
    if (!activeInitiative) return;
    const sectionPrompts: Record<string, string> = {
      documentation: `Generate a documentation outline and initial draft for the initiative "${activeInitiative.title}". Include: PRD skeleton, technical requirements, user stories, acceptance criteria, and architecture considerations. Description: ${activeInitiative.description}. Use markdown.`,
      interviews: `Create an interview guide for discovering needs related to "${activeInitiative.title}". Include: interview objectives, target personas (5+), sample questions per persona (5-8 each), what to listen for, and synthesis framework. Description: ${activeInitiative.description}. Use markdown.`,
      'market-research': `Conduct a market research analysis framework for "${activeInitiative.title}". Include: competitive landscape analysis template, market sizing approach, trend analysis, TAM/SAM/SOM estimation guide, key competitors to watch, and differentiation opportunities. Description: ${activeInitiative.description}. Use markdown.`,
      impact: `Create an impact analysis for "${activeInitiative.title}". Include: impact dimensions (revenue, cost, user satisfaction, operational efficiency, strategic value), measurement metrics, baseline vs. expected outcomes, ROI calculation framework, risk-adjusted value, and sensitivity analysis approach. Expected value: ${activeInitiative.expectedValue || 'Not specified'}. Use markdown.`,
    };

    const prompt = sectionPrompts[section];
    if (!prompt) return;

    const result = await runAiAnalysis(prompt, section);
    if (result) {
      const data = getDiscoveryData(activeInitiative);
      const note: DiscoveryNote = {
        id: crypto.randomUUID(),
        type: section === 'market-research' ? 'market_research' : section as DiscoveryNote['type'],
        title: `AI Generated: ${DISCOVERY_TABS.find((t) => t.id === section)?.label || section}`,
        content: result,
        createdAt: new Date(),
        source: 'ai-generated',
      };
      updateInitiative(activeInitiative.id, {
        discovery: {
          ...data,
          notes: [...data.notes, note],
          status: 'in_progress',
          lastUpdated: new Date(),
        },
      });
      toast.success(`${DISCOVERY_TABS.find((t) => t.id === section)?.label} content generated!`);
    }
  };

  const tabTypeMap: Record<string, DiscoveryNote['type']> = {
    documentation: 'documentation',
    interviews: 'interview',
    'market-research': 'market_research',
    impact: 'impact',
  };

  return (
    <div className="flex h-[calc(100vh-0px)]">
      {/* Left Navigation Panel */}
      <div className="w-72 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push('/initiatives')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold text-sm">Discovery Workspace</h2>
              <p className="text-xs text-slate-500">{discoveryInitiatives.length} initiative(s)</p>
            </div>
            <ShareButton resourceType="discovery" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {discoveryInitiatives.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No discovery initiatives</p>
                <p className="text-xs mt-1">Move items to Discovery in the Pipeline</p>
              </div>
            ) : (
              discoveryInitiatives.map((init) => {
                const data = getDiscoveryData(init);
                const isActive = init.id === activeInitiativeId;
                return (
                  <button
                    key={init.id}
                    onClick={() => setActiveInitiativeId(init.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all',
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">{init.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{init.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className={cn(
                        'text-[10px] px-1.5 py-0',
                        data.status === 'completed' && 'border-green-500 text-green-600',
                        data.status === 'in_progress' && 'border-blue-500 text-blue-600',
                        data.status === 'not_started' && 'border-slate-400 text-slate-500',
                      )}>
                        {data.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{data.notes.length} notes</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {!activeInitiative ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">Select an Initiative</h3>
              <p className="text-sm">Choose an initiative from the left panel to start discovery.</p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Initiative Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{activeInitiative.title}</h1>
                <Badge variant="outline" className="text-xs">{activeInitiative.businessValue} value</Badge>
              </div>
              <p className="text-sm text-slate-500">{activeInitiative.description}</p>

              {/* Business case summary */}
              {(activeInitiative.whyNeeded || activeInitiative.expectedValue || activeInitiative.expectedTimeToMarket) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  {activeInitiative.whyNeeded && (
                    <Card className="border-blue-200 dark:border-blue-800">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider mb-1">Why Needed</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">{activeInitiative.whyNeeded}</p>
                      </CardContent>
                    </Card>
                  )}
                  {activeInitiative.expectedValue && (
                    <Card className="border-green-200 dark:border-green-800">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-1">Expected Value</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{activeInitiative.expectedValue}</p>
                      </CardContent>
                    </Card>
                  )}
                  {activeInitiative.expectedTimeToMarket && (
                    <Card className="border-purple-200 dark:border-purple-800">
                      <CardContent className="p-3">
                        <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-1">Time to Market</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{activeInitiative.expectedTimeToMarket}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* Discovery Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="w-full justify-start">
                {DISCOVERY_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {/* AI Preparation Tab */}
              <TabsContent value="ai-prep" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      AI Discovery Preparation
                    </CardTitle>
                    <CardDescription>
                      Let AI analyze your initiative and create a comprehensive discovery plan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={handleAiDiscoveryPrep} disabled={isAiLoading}>
                      {isAiLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</>
                      ) : getDiscoveryData(activeInitiative).aiAnalysis ? (
                        <><RefreshCw className="h-4 w-4 mr-2" />Regenerate Discovery Plan</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" />Generate Discovery Plan</>
                      )}
                    </Button>

                    {getDiscoveryData(activeInitiative).aiAnalysis && (
                      <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                        <ReactMarkdown>{getDiscoveryData(activeInitiative).aiAnalysis!}</ReactMarkdown>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Content Tabs (Documentation, Interviews, Market Research, Impact) */}
              {DISCOVERY_TABS.filter((t) => t.id !== 'ai-prep').map((tab) => {
                const noteType = tabTypeMap[tab.id];
                const notes = noteType ? getNotesByType(activeInitiative, noteType) : [];
                const Icon = tab.icon;

                return (
                  <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {tab.label}
                        <Badge variant="secondary" className="text-xs">{notes.length}</Badge>
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAiSectionGenerate(tab.id)}
                          disabled={isAiLoading}
                        >
                          {isAiLoading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1" />
                          )}
                          AI Generate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setNewNote({ ...newNote, type: noteType || 'general' });
                            setShowAddNote(true);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />Add Note
                        </Button>
                      </div>
                    </div>

                    {notes.length === 0 ? (
                      <Card>
                        <CardContent className="py-12">
                          <div className="text-center text-slate-400">
                            <Icon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-medium mb-1">No {tab.label.toLowerCase()} yet</p>
                            <p className="text-xs mb-4">Add notes manually or let AI generate content for you.</p>
                            <div className="flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAiSectionGenerate(tab.id)}
                                disabled={isAiLoading}
                              >
                                <Sparkles className="h-3.5 w-3.5 mr-1" />AI Generate
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setNewNote({ ...newNote, type: noteType || 'general' });
                                  setShowAddNote(true);
                                }}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />Add Manually
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <Card key={note.id}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  {note.title}
                                  {note.source === 'ai-generated' && (
                                    <Badge variant="secondary" className="text-[10px]">AI Generated</Badge>
                                  )}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-400 hover:text-red-500"
                                    onClick={() => deleteNote(note.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{note.content}</ReactMarkdown>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}
      </div>

      {/* Add Note Dialog */}
      <Dialog open={showAddNote} onOpenChange={setShowAddNote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Discovery Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="Note title..."
              />
            </div>
            <div>
              <Label>Content (Markdown supported)</Label>
              <Textarea
                value={newNote.content}
                onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                placeholder="Write your discovery notes here..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddNote(false)}>Cancel</Button>
            <Button onClick={addNote}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
