'use client';

import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  Clock, AlertTriangle, ExternalLink, Rocket, ShieldAlert, Archive, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BrainDomain } from '@/lib/types';

interface RelatedNode {
  id: string;
  title: string;
  type: string;
  domain: BrainDomain;
  relationType: string;
  direction: 'incoming' | 'outgoing';
}

interface NodeDetail {
  id: string;
  type: string;
  title: string;
  content: string;
  summary: string;
  source: string;
  sourceUrl: string;
  domain: BrainDomain;
  importance: number;
  stale: boolean;
  agentType: string;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  relatedNodes: RelatedNode[];
}

interface BrainNodePanelProps {
  nodeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateNode: (nodeId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  vision: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  goal: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  persona: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  need: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  decision: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400',
  initiative: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  risk: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  market_signal: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  agent_learning: 'bg-slate-500/15 text-slate-700 dark:text-slate-400',
  fact: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  analysis: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  recommendation: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
};

export function BrainNodePanel({ nodeId, open, onOpenChange, onNavigateNode }: BrainNodePanelProps) {
  const [node, setNode] = useState<NodeDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nodeId || !open) {
      setNode(null);
      return;
    }
    setLoading(true);
    fetch(`/api/brain/node/${nodeId}`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setNode)
      .catch(() => toast.error('Failed to load node'))
      .finally(() => setLoading(false));
  }, [nodeId, open]);

  const handleImportanceChange = async (value: number[]) => {
    if (!node) return;
    const importance = value[0];
    setNode(prev => prev ? { ...prev, importance } : prev);
    await fetch(`/api/brain/node/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ importance }),
    });
  };

  const handleDismiss = async () => {
    if (!node) return;
    await fetch(`/api/brain/node/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stale: true }),
    });
    setNode(prev => prev ? { ...prev, stale: true } : prev);
    toast.success('Node marked as stale');
  };

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isOld = node ? new Date(node.updatedAt).getTime() < thirtyDaysAgo : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
        {node && !loading && (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg leading-tight">{node.title}</SheetTitle>
              <SheetDescription className="sr-only">Node detail</SheetDescription>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge className={cn('text-[10px]', TYPE_COLORS[node.type] || 'bg-muted')}>
                  {node.type}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{node.domain}</Badge>
                {node.stale && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="h-3 w-3 mr-0.5" /> Stale
                  </Badge>
                )}
                {isOld && !node.stale && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Clock className="h-3 w-3 mr-0.5" /> 30+ days old
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="px-4 space-y-5 pb-6">
              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Source: {node.source}</span>
                {node.agentType !== 'global' && <span>Agent: {node.agentType}</span>}
                <span>Confidence: {Math.round(node.confidence * 100)}%</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Created {formatRelativeTime(node.createdAt)}</span>
                <span>Updated {formatRelativeTime(node.updatedAt)}</span>
              </div>

              {/* Content */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-sm">{node.content}</p>
              </div>

              {/* Importance slider */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Importance: {Math.round(node.importance * 100)}%
                </label>
                <Slider
                  value={[node.importance]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueCommit={handleImportanceChange}
                />
              </div>

              {/* Related nodes */}
              {node.relatedNodes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-2">
                    Related Nodes ({node.relatedNodes.length})
                  </h3>
                  <div className="space-y-1">
                    {node.relatedNodes.map((rn, i) => (
                      <button
                        key={`${rn.id}-${i}`}
                        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors text-sm"
                        onClick={() => onNavigateNode(rn.id)}
                      >
                        <Badge className={cn('text-[9px] flex-shrink-0', TYPE_COLORS[rn.type] || 'bg-muted')}>
                          {rn.type}
                        </Badge>
                        <span className="truncate">{rn.title}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto flex-shrink-0">
                          {rn.direction === 'outgoing' ? '\u2192' : '\u2190'} {rn.relationType}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/portfolio?prefill=${encodeURIComponent(node.title)}`;
                  }}
                >
                  <Rocket className="h-3.5 w-3.5 mr-1" /> Create Initiative
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.location.href = `/assessment?prefill=${encodeURIComponent(node.title)}`;
                  }}
                >
                  <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Create Risk
                </Button>
                {!node.stale && (
                  <Button variant="ghost" size="sm" onClick={handleDismiss}>
                    <Archive className="h-3.5 w-3.5 mr-1" /> Dismiss
                  </Button>
                )}
                {node.sourceUrl && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={node.sourceUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Source
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
