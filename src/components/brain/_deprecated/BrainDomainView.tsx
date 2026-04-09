'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { BrainGraph } from './BrainGraph';
import { BrainNodePanel } from './BrainNodePanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, Search } from 'lucide-react';
import type { BrainDomain } from '@/lib/types';

interface DomainNode {
  id: string;
  title: string;
  type: string;
  domain: string;
  importance: number;
  source: string;
  summary: string;
  stale: boolean;
  agentType: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface DomainEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

interface DomainData {
  nodes: DomainNode[];
  edges: DomainEdge[];
  domain: string;
}

const DOMAIN_LABELS: Record<BrainDomain, string> = {
  vision: 'Vision',
  product: 'Product',
  market: 'Market',
  risk: 'Risk',
  operations: 'Operations',
  general: 'General',
};

interface BrainDomainViewProps {
  domain: BrainDomain;
}

export function BrainDomainView({ domain }: BrainDomainViewProps) {
  const [data, setData] = useState<DomainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/brain/domain/${domain}`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to load domain data');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [domain]);

  // Filtered nodes for graph
  const { filteredNodes, filteredEdges, activeTypes } = useMemo(() => {
    if (!data) return { filteredNodes: [], filteredEdges: [], activeTypes: [] };

    const types = [...new Set(data.nodes.map(n => n.type))];
    let nodes = data.nodes;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      nodes = nodes.filter(n => n.title.toLowerCase().includes(q));
    }
    if (typeFilter) {
      nodes = nodes.filter(n => n.type === typeFilter);
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    return { filteredNodes: nodes, filteredEdges: edges, activeTypes: types };
  }, [data, searchQuery, typeFilter]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setPanelOpen(true);
  };

  const handleNavigateNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    // Keep panel open, it will refetch
  };

  return (
    <ViewShell
      title={`${DOMAIN_LABELS[domain]} Domain`}
      description={data ? `${data.nodes.length} knowledge nodes` : undefined}
      loading={loading}
      error={error}
      empty={!data || data.nodes.length === 0}
      emptyMessage={`No nodes in ${DOMAIN_LABELS[domain]}`}
      emptyDescription="Brain nodes will appear here as AI agents capture intelligence in this domain."
      actions={
        <Button variant="ghost" size="sm" onClick={() => router.push('/brain')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Brain
        </Button>
      }
    >
      {data && (
        <>
          {/* Filter toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <Badge
                variant={typeFilter === null ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setTypeFilter(null)}
              >
                All ({data.nodes.length})
              </Badge>
              {activeTypes.map(type => {
                const count = data.nodes.filter(n => n.type === type).length;
                return (
                  <Badge
                    key={type}
                    variant={typeFilter === type ? 'default' : 'outline'}
                    className="cursor-pointer text-[10px]"
                    onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                  >
                    {type} ({count})
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Graph */}
          <div className="border rounded-lg bg-card" style={{ height: '500px' }}>
            <BrainGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
            />
          </div>

          {/* Node panel */}
          <BrainNodePanel
            nodeId={selectedNodeId}
            open={panelOpen}
            onOpenChange={setPanelOpen}
            onNavigateNode={handleNavigateNode}
          />
        </>
      )}
    </ViewShell>
  );
}
