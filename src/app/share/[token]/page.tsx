'use client';

import { useState, useEffect, use } from 'react';
import { GuestHeader } from '@/components/share/GuestHeader';
import { SharedCommentSection } from '@/components/share/SharedCommentSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  AlertCircle, Loader2, Briefcase, Clock, AlertTriangle, Calendar,
} from 'lucide-react';

function SharedDashboard({ data }: { data: any }) {
  const initiatives = data.initiatives || [];
  const risks = data.risks || [];
  const meetings = data.meetings || [];

  const active = initiatives.filter((i: any) => i.status !== 'idea').length;
  const pending = initiatives.filter((i: any) => i.status === 'definition').length;
  const criticalRisks = risks.filter((r: any) => r.severity === 'critical' || r.severity === 'high').length;
  const upcoming = meetings.filter((m: any) => m.status === 'scheduled').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Active Initiatives</p><p className="text-3xl font-bold">{active}</p></div><div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><Briefcase className="h-6 w-6 text-blue-600" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Pending Approvals</p><p className="text-3xl font-bold">{pending}</p></div><div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="h-6 w-6 text-amber-600" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Active Risks</p><p className="text-3xl font-bold">{criticalRisks}</p></div><div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-600" /></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-500">Upcoming Meetings</p><p className="text-3xl font-bold">{upcoming}</p></div><div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><Calendar className="h-6 w-6 text-green-600" /></div></div></CardContent></Card>
      </div>

      {initiatives.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Initiatives</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {initiatives.map((init: any) => (
                <div key={init.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-2 w-2 rounded-full', init.businessValue === 'high' ? 'bg-green-500' : init.businessValue === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{init.title}</p>
                        {init.jiraKey && <Badge variant="outline" className="text-[10px] font-mono text-blue-600 border-blue-300">{init.jiraKey}</Badge>}
                      </div>
                      <p className="text-sm text-slate-500">{(init.description || '').slice(0, 80)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{init.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {risks.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-700"><AlertTriangle className="h-5 w-5" /> Active Risks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk: any) => (
                <div key={risk.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <Badge className={cn('shrink-0', risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500')}>{risk.severity?.toUpperCase()}</Badge>
                  <div><p className="font-medium">{risk.title}</p><p className="text-sm text-slate-600">{risk.description}</p></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SharedInitiatives({ data }: { data: any }) {
  const initiatives = data.initiatives || [];
  const stages = [
    { id: 'idea', label: 'Ideas', color: 'bg-slate-200' },
    { id: 'discovery', label: 'Discovery', color: 'bg-blue-200' },
    { id: 'validation', label: 'Validation', color: 'bg-amber-200' },
    { id: 'definition', label: 'Definition', color: 'bg-purple-200' },
    { id: 'approved', label: 'Approved', color: 'bg-green-200' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {stages.map((stage) => {
        const items = initiatives.filter((i: any) => i.status === stage.id);
        return (
          <div key={stage.id}>
            <div className={cn('rounded-t-lg px-3 py-2 text-sm font-medium flex items-center justify-between', stage.color)}>
              <span>{stage.label}</span>
              <Badge variant="outline" className="text-xs">{items.length}</Badge>
            </div>
            <div className="bg-slate-50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
              {items.map((init: any) => (
                <Card key={init.id}>
                  <CardContent className="p-3">
                    <h4 className="font-medium text-sm">{init.title}</h4>
                    {init.jiraKey && <Badge variant="outline" className="text-[10px] mt-1 font-mono text-blue-600 border-blue-300">{init.jiraKey}</Badge>}
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{init.description}</p>
                    <div className="flex gap-1 mt-2">
                      <Badge variant="outline" className={cn('text-[10px]', init.businessValue === 'high' && 'border-green-500 text-green-600', init.businessValue === 'medium' && 'border-amber-500 text-amber-600')}>{init.businessValue} value</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SharedRoadmap({ data }: { data: any }) {
  const initiatives = data.initiatives || [];
  const roadmapItems = initiatives.filter((i: any) => ['approved', 'definition', 'validation', 'discovery'].includes(i.status));

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">{roadmapItems.length} initiatives on the roadmap</p>
      {roadmapItems.map((item: any) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{item.title}</h4>
                  {item.jiraKey && <Badge variant="outline" className="text-[10px] font-mono text-blue-600 border-blue-300">{item.jiraKey}</Badge>}
                </div>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Badge variant="outline" className="capitalize">{item.status}</Badge>
                <Badge variant="outline" className={cn(item.businessValue === 'high' && 'border-green-500 text-green-600', item.businessValue === 'medium' && 'border-amber-500 text-amber-600')}>{item.businessValue}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SharedMeetings({ data }: { data: any }) {
  const meetings = data.meetings || [];
  if (meetings.length === 0) return <p className="text-slate-500 text-center py-8">No meetings to display</p>;

  return (
    <div className="space-y-3">
      {meetings.map((meeting: any) => (
        <Card key={meeting.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{meeting.title}</h4>
              <Badge variant="outline" className="capitalize">{meeting.status}</Badge>
            </div>
            <p className="text-sm text-slate-500">{new Date(meeting.date).toLocaleDateString()} | {meeting.duration} min | {(meeting.participants || []).join(', ')}</p>
            {meeting.summary && <p className="text-sm mt-2 text-slate-700">{meeting.summary}</p>}
            {meeting.decisions?.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium text-slate-500 uppercase">Decisions</p>
                <ul className="text-sm text-slate-600 list-disc list-inside">{meeting.decisions.map((d: string, i: number) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SharedValueMeter({ data }: { data: any }) {
  const initiatives = data.initiatives || [];
  const sorted = [...initiatives].sort((a: any, b: any) => {
    const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (order[b.businessValue] || 0) - (order[a.businessValue] || 0);
  });

  return (
    <div className="space-y-3">
      {sorted.map((init: any) => (
        <Card key={init.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><h4 className="font-medium">{init.title}</h4><p className="text-sm text-slate-500 capitalize">Status: {init.status}</p></div>
              <Badge className={cn(init.businessValue === 'high' && 'bg-green-500', init.businessValue === 'medium' && 'bg-amber-500', init.businessValue === 'low' && 'bg-slate-400')}>{init.businessValue} value</Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function SharedViewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Invalid share link');
          return;
        }
        const data = await res.json();
        setShareData(data);
      } catch {
        setError('Failed to load shared content');
      } finally {
        setIsLoading(false);
      }
    };
    validate();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h2 className="text-xl font-bold">Link Unavailable</h2>
              <p className="text-slate-500 mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot = shareData?.dataSnapshot || {};
  const resourceType = shareData?.resourceType || 'dashboard';

  const renderContent = () => {
    switch (resourceType) {
      case 'dashboard': return <SharedDashboard data={snapshot} />;
      case 'initiatives': return <SharedInitiatives data={snapshot} />;
      case 'roadmap': return <SharedRoadmap data={snapshot} />;
      case 'meetings': return <SharedMeetings data={snapshot} />;
      case 'value-meter': return <SharedValueMeter data={snapshot} />;
      default: return <SharedDashboard data={snapshot} />;
    }
  };

  return (
    <div>
      <GuestHeader expiresAt={shareData.expiresAt} resourceType={shareData.resourceType} />

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold capitalize">{resourceType} View</h1>
          <p className="text-sm text-slate-500">
            Shared read-only view | Views: {shareData.viewCount} | Access: {shareData.accessLevel === 'view_comment' ? 'View + Comment' : 'View Only'}
          </p>
        </div>

        {Object.keys(snapshot).length > 0 ? renderContent() : (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <p className="text-slate-500">No data available in this snapshot.</p>
            </CardContent>
          </Card>
        )}

        {shareData.accessLevel === 'view_comment' && (
          <SharedCommentSection token={token} accessLevel={shareData.accessLevel} />
        )}
      </main>
    </div>
  );
}
