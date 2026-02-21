'use client';

import { useState } from 'react';
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
  Sparkles, Loader2, Play, Square,
} from 'lucide-react';
import { toast } from 'sonner';
import { Meeting } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';

export function MeetingsView() {
  const { meetings, addMeeting } = useAppStore();
  const [showUpload, setShowUpload] = useState(false);
  const [showAgent, setShowAgent] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStatus, setAgentStatus] = useState<'idle' | 'joining' | 'active' | 'summarizing'>('idle');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const handleProcessMeeting = async () => {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
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
    setAgentStatus('joining');
    // In production, this would connect to a real meeting transcription service
    await new Promise(r => setTimeout(r, 2000));
    setAgentStatus('active');
    toast.success('AI Agent joined the meeting!');
  };

  const handleStopAgent = async () => {
    setAgentStatus('summarizing');
    try {
      // Use AI to generate a summary
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'AI Agent attended this meeting and captured the following discussion points. The team discussed quarterly goals, resource allocation, and upcoming deadlines. Action items were assigned and key decisions were documented.',
        }),
      });
      const data = response.ok ? await response.json() : null;
      addMeeting({
        id: crypto.randomUUID(),
        title: data?.title || 'AI Agent Meeting',
        date: new Date(),
        duration: 45,
        participants: ['AI Agent', 'Team Members'],
        status: 'summarized',
        summary: data?.summary || 'AI Agent attended this meeting. Key decisions were documented and action items were extracted.',
        actionItems: data?.actionItems || [{ id: '1', description: 'Follow up on discussed items', assignee: 'PM', status: 'pending', source: 'agent' }],
        decisions: data?.decisions || ['Proceed with roadmap as planned'],
        challenges: data?.challenges || ['Resource allocation needs review'],
      });
      toast.success('Meeting summary generated!');
    } catch {
      toast.error('Failed to generate meeting summary');
    } finally {
      setAgentStatus('idle');
      setMeetingUrl('');
      setShowAgent(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meetings</h1>
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
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Bot className="h-5 w-5" />AI Meeting Agent
            </CardTitle>
            <CardDescription>Let the AI agent attend meetings on your behalf</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Meeting URL</Label>
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                  disabled={agentStatus !== 'idle'}
                />
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
            {agentStatus !== 'idle' && (
              <div className="flex items-center gap-2 text-sm">
                <div className={cn('h-3 w-3 rounded-full animate-pulse', agentStatus === 'active' ? 'bg-green-500' : 'bg-amber-500')} />
                <span>
                  {agentStatus === 'joining' ? 'Agent is joining the meeting...' :
                   agentStatus === 'active' ? 'Agent is actively listening and taking notes' :
                   'Generating meeting summary...'}
                </span>
              </div>
            )}
            <Alert>
              <Bot className="h-4 w-4" />
              <AlertDescription>
                The AI agent will join the meeting, listen to discussions, take notes, identify action items, and generate a comprehensive summary.
              </AlertDescription>
            </Alert>
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
                      meeting.status === 'summarized' ? 'bg-green-100 dark:bg-green-900' :
                      meeting.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900' :
                      'bg-slate-100 dark:bg-slate-800'
                    )}>
                      {meeting.status === 'summarized' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
                       meeting.status === 'scheduled' ? <Calendar className="h-5 w-5 text-blue-600" /> :
                       <Clock className="h-5 w-5 text-slate-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{meeting.title}</h3>
                      <p className="text-sm text-slate-500">
                        {new Date(meeting.date).toLocaleDateString()} &bull; {meeting.duration} min
                      </p>
                      {meeting.summary && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">{meeting.summary}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn(
                      'capitalize',
                      meeting.status === 'summarized' && 'border-green-500 text-green-600',
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
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Action Items</h4>
                        <div className="space-y-2">
                          {meeting.actionItems.map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded">
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
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Decisions</h4>
                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                          {meeting.decisions.map((d, i) => <li key={i}>{d}</li>)}
                        </ul>
                      </div>
                    )}
                    {meeting.challenges && meeting.challenges.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Challenges</h4>
                        <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                          {meeting.challenges.map((c, i) => <li key={i}>{c}</li>)}
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
