'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar, Plus, CheckCircle2, Clock, ArrowRight, Bot,
  Sparkles, Loader2, Play, Square, Video, Shield, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Meeting } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';
import { isSampleData } from '@/lib/sample-data';
import { ExampleBadge } from '@/components/ui/example-badge';

function detectPlatform(url: string): 'zoom' | 'teams' | null {
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams';
  return null;
}

function PlatformBadge({ url }: { url: string }) {
  const platform = detectPlatform(url);
  if (!platform) return null;
  return (
    <Badge variant="outline" className={cn(
      'text-xs',
      platform === 'zoom' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600'
    )}>
      {platform === 'zoom' ? <Video className="h-3 w-3 mr-1" /> : <Shield className="h-3 w-3 mr-1" />}
      {platform === 'zoom' ? 'Zoom' : 'Teams'}
    </Badge>
  );
}

export function MeetingsView() {
  const { meetings, addMeeting, updateMeeting, setMeetings, settings } = useAppStore();

  useEffect(() => {
    fetch('/api/meetings').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setMeetings(d); }).catch(() => {});
  }, []);

  const [showUpload, setShowUpload] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'joining' | 'active' | 'summarizing'>('idle');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleProcessMeeting = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, settings: { llm: settings.llm } }),
      });
      if (!response.ok) throw new Error('Failed to process meeting');
      const data = await response.json();
      addMeeting({
        id: crypto.randomUUID(),
        title: data.title || 'Meeting Summary',
        date: new Date(),
        duration: 30,
        participants: [],
        status: 'summarized',
        transcript,
        summary: data.summary,
        actionItems: data.actionItems || [],
        decisions: data.decisions || [],
        challenges: data.challenges || [],
      });
      setTranscript('');
      setShowUpload(false);
      toast.success('Meeting processed successfully!');
    } catch (error) {
      toast.error('Failed to process meeting. Check your LLM settings.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartAgent = async () => {
    if (!meetingUrl.trim()) return;

    const platform = detectPlatform(meetingUrl);
    if (!platform) {
      toast.error('Unsupported URL. Please use a Zoom or Microsoft Teams meeting link.');
      return;
    }

    // Check if credentials are configured
    if (platform === 'zoom' && !settings.integrations.zoom?.enabled) {
      toast.error('Zoom credentials not configured. Go to Settings → Integrations to set up Zoom.');
      return;
    }
    setAgentStatus('joining');

    try {
      const credentials = {
        zoom: platform === 'zoom' ? {
          accountId: settings.integrations.zoom?.accountId,
          clientId: settings.integrations.zoom?.clientId,
          clientSecret: settings.integrations.zoom?.clientSecret,
        } : undefined,
      };

      const res = await fetch('/api/meetings/bot/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingUrl, credentials }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to join meeting');
      }

      const data = await res.json();
      setActiveMeetingId(data.meetingId);
      setAgentStatus('active');
      setElapsedTime(0);
      setLiveTranscript('');
      toast.success(`Azmyra Bot joined the ${platform === 'zoom' ? 'Zoom' : 'Teams'} meeting!`);

      // Start elapsed time counter
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);

      // Start polling for transcript updates (mainly for Zoom live transcription)
      pollingRef.current = setInterval(async () => {
        if (!data.meetingId) return;
        try {
          const statusRes = await fetch(`/api/meetings/bot/status/${data.meetingId}`);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            if (statusData.transcriptPreview) {
              setLiveTranscript(statusData.transcriptPreview);
            }
          }
        } catch {
          // Polling failure is non-critical
        }
      }, 5000);

    } catch (err: any) {
      toast.error(err.message || 'Failed to join meeting');
      setAgentStatus('idle');
    }
  };

  const handleStopAgent = async () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    setAgentStatus('summarizing');

    try {
      const platform = detectPlatform(meetingUrl);
      const res = await fetch('/api/meetings/bot/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: activeMeetingId,
          llmConfig: settings.llm,
        }),
      });

      const data = res.ok ? await res.json() : null;

      if (data) {
        addMeeting({
          id: activeMeetingId || crypto.randomUUID(),
          title: data.title || 'Live Meeting',
          date: new Date(),
          duration: Math.round(elapsedTime / 60),
          participants: ['Azmyra Bot'],
          status: 'summarized',
          platform: platform || undefined,
          meetingUrl,
          summary: data.summary || '',
          actionItems: data.actionItems || [],
          decisions: data.decisions || [],
          challenges: data.challenges || [],
          transcript: data.transcript,
        });
        toast.success('Meeting summary generated!');
      } else {
        toast.error('Failed to generate meeting summary');
      }
    } catch {
      toast.error('Failed to stop agent and generate summary');
    } finally {
      setAgentStatus('idle');
      setMeetingUrl('');
      setActiveMeetingId(null);
      setLiveTranscript('');
      setElapsedTime(0);
      setShowAgent(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meetings</h1>
          <p className="text-slate-500">AI-powered meeting management & autonomous attendance</p>
        </div>
        <div className="flex gap-2">
          <ShareButton resourceType="meetings" />
          <Button variant="outline" onClick={() => setShowAgent(true)}>
            <Bot className="h-4 w-4 mr-2" />AI Agent
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Meeting
          </Button>
        </div>
      </div>

      {/* AI Agent Meeting Attendance */}
      {showAgent && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-500/10 dark:border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Bot className="h-5 w-5" />AI Meeting Agent
            </CardTitle>
            <CardDescription>Azmyra Bot joins your meeting as a visible participant, captures the transcript, and generates an AI summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Meeting URL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://zoom.us/j/... or https://teams.microsoft.com/l/..."
                    disabled={agentStatus !== 'idle'}
                  />
                  {meetingUrl && <PlatformBadge url={meetingUrl} />}
                </div>
              </div>
              {agentStatus === 'idle' ? (
                <Button onClick={handleStartAgent} disabled={!meetingUrl.trim()} className="mt-6">
                  <Play className="h-4 w-4 mr-2" />Start Agent
                </Button>
              ) : agentStatus === 'active' ? (
                <Button onClick={handleStopAgent} variant="destructive" className="mt-6">
                  <Square className="h-4 w-4 mr-2" />End & Summarize
                </Button>
              ) : (
                <Button disabled className="mt-6">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {agentStatus === 'joining' ? 'Joining...' : 'Summarizing...'}
                </Button>
              )}
            </div>

            {/* Active meeting status */}
            {agentStatus !== 'idle' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn('h-3 w-3 rounded-full animate-pulse', agentStatus === 'active' ? 'bg-green-500' : 'bg-amber-500')} />
                    <span>
                      {agentStatus === 'joining' ? 'Azmyra Bot is joining the meeting...' :
                       agentStatus === 'active' ? 'Azmyra Bot is in the meeting' :
                       'Generating meeting summary...'}
                    </span>
                  </div>
                  {agentStatus === 'active' && (
                    <Badge variant="secondary" className="font-mono">
                      {formatTime(elapsedTime)}
                    </Badge>
                  )}
                </div>

                {/* Live Transcript Panel */}
                {agentStatus === 'active' && (
                  <div className="rounded-lg border bg-background p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">Live Transcript</span>
                      {detectPlatform(meetingUrl) === 'teams' && (
                        <span className="text-xs text-amber-600">Full transcript available when meeting ends</span>
                      )}
                    </div>
                    <div className="max-h-[200px] overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                      {liveTranscript || (
                        <span className="italic text-slate-400">
                          {detectPlatform(meetingUrl) === 'zoom'
                            ? 'Waiting for speech...'
                            : 'Teams transcript will be fetched when the meeting ends.'}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Credential warnings */}
            {meetingUrl && agentStatus === 'idle' && (() => {
              const platform = detectPlatform(meetingUrl);
              if (platform === 'zoom' && !settings.integrations.zoom?.enabled) {
                return (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Zoom credentials not configured. Go to <strong>Settings → Integrations → Zoom</strong> to set up your Server-to-Server OAuth app.
                    </AlertDescription>
                  </Alert>
                );
              }
              if (!platform && meetingUrl.trim()) {
                return (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Unsupported meeting URL. Currently supporting <strong>Zoom</strong> and <strong>Microsoft Teams</strong> links.
                    </AlertDescription>
                  </Alert>
                );
              }
              return null;
            })()}

            {agentStatus === 'idle' && (
              <Alert>
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  The AI agent will join the meeting as "Azmyra Bot", listen to discussions, capture the transcript, identify action items, and generate a comprehensive summary.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Transcript */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Meeting Transcript</CardTitle>
            <CardDescription>Paste your meeting transcript for AI analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste meeting transcript here..."
              className="min-h-[200px]"
            />
            <div className="flex gap-2">
              <Button onClick={handleProcessMeeting} disabled={isProcessing || !transcript.trim()}>
                {isProcessing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Analyze with AI</>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meetings List */}
      <div className="space-y-4">
        {meetings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No meetings yet. Add a meeting or use the AI Agent!</p>
            </CardContent>
          </Card>
        ) : (
          meetings.map((meeting) => (
            <Card
              key={meeting.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedMeeting(selectedMeeting?.id === meeting.id ? null : meeting)}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center',
                      meeting.status === 'summarized' ? 'bg-green-100 dark:bg-green-500/15' :
                      meeting.status === 'recording' ? 'bg-red-100 dark:bg-red-500/15' :
                      meeting.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-500/15' :
                      'bg-muted'
                    )}>
                      {meeting.status === 'summarized' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
                       meeting.status === 'recording' ? <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" /> :
                       meeting.status === 'scheduled' ? <Calendar className="h-5 w-5 text-blue-600" /> :
                       <Clock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{meeting.title}</h3>
                        {meeting.platform && (
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            meeting.platform === 'zoom' ? 'border-blue-400 text-blue-600' : 'border-purple-400 text-purple-600'
                          )}>
                            {meeting.platform === 'zoom' ? 'Zoom' : meeting.platform === 'teams' ? 'Teams' : 'Manual'}
                          </Badge>
                        )}
                        {isSampleData(meeting.id) && <ExampleBadge />}
                      </div>
                      <p className="text-sm text-slate-500">
                        {new Date(meeting.date).toLocaleDateString()} &bull; {meeting.duration} min
                      </p>
                      {meeting.summary && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{meeting.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      'capitalize',
                      meeting.status === 'summarized' && 'border-green-500 text-green-600',
                      meeting.status === 'recording' && 'border-red-500 text-red-600',
                      meeting.status === 'scheduled' && 'border-blue-500 text-blue-600'
                    )}>
                      {meeting.status}
                    </Badge>
                    <ArrowRight className={cn('h-4 w-4 transition-transform text-slate-400', selectedMeeting?.id === meeting.id && 'rotate-90')} />
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedMeeting?.id === meeting.id && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {meeting.actionItems && meeting.actionItems.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Action Items</h4>
                        <div className="space-y-2">
                          {(typeof meeting.actionItems === 'string' ? JSON.parse(meeting.actionItems) : meeting.actionItems).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm bg-card p-2 rounded">
                              <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="flex-1">{item.description}</span>
                              {item.assignee && <Badge variant="secondary" className="text-xs">{item.assignee}</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {meeting.decisions && meeting.decisions.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Decisions</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {(typeof meeting.decisions === 'string' ? JSON.parse(meeting.decisions) : meeting.decisions).map((d: string, i: number) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                    )}
                    {meeting.challenges && meeting.challenges.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Challenges</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                          {(typeof meeting.challenges === 'string' ? JSON.parse(meeting.challenges) : meeting.challenges).map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
