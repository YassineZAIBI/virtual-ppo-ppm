'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  type: string;
  importance: number;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  type: string;
  strength: number;
}

interface BrainGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId?: string | null;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  vision: '#3b82f6',
  goal: '#6366f1',
  persona: '#8b5cf6',
  need: '#a855f7',
  decision: '#7c3aed',
  initiative: '#2dd4bf',
  risk: '#f59e0b',
  market_signal: '#14b8a6',
  agent_learning: '#64748b',
  fact: '#3b82f6',
  analysis: '#8b5cf6',
  recommendation: '#14b8a6',
  context: '#94a3b8',
};

function truncateLabel(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 1) + '\u2026' : text;
}

export function BrainGraph({ nodes, edges, onNodeClick, selectedNodeId }: BrainGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  const render = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 500;

    svg.selectAll('*').remove();

    // Clone data so D3 mutation doesn't affect React state
    const simNodes: GraphNode[] = nodes.map(n => ({ ...n }));
    const simEdges: GraphEdge[] = edges.map(e => ({
      ...e,
      source: typeof e.source === 'string' ? e.source : (e.source as GraphNode).id,
      target: typeof e.target === 'string' ? e.target : (e.target as GraphNode).id,
    }));

    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(simEdges)
        .id(d => d.id)
        .distance(80))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => 20 + d.importance * 20));

    simulationRef.current = simulation;

    // Zoom
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        container.attr('transform', event.transform.toString());
      });
    svg.call(zoomBehavior);

    const container = svg.append('g');

    // Edges
    const links = container.selectAll<SVGLineElement, GraphEdge>('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', 'currentColor')
      .attr('class', 'text-border')
      .attr('stroke-width', d => 0.5 + d.strength * 2)
      .attr('stroke-opacity', 0.3);

    // Node groups
    const nodeGroups = container.selectAll<SVGGElement, GraphNode>('g.node')
      .data(simNodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClickRef.current(d.id));

    // Circles
    nodeGroups.append('circle')
      .attr('r', d => 8 + d.importance * 16)
      .attr('fill', d => NODE_TYPE_COLORS[d.type] || '#94a3b8')
      .attr('fill-opacity', 0.85)
      .attr('stroke', d => d.id === selectedNodeId ? '#ffffff' : 'transparent')
      .attr('stroke-width', 2.5);

    // Labels
    nodeGroups.append('text')
      .text(d => truncateLabel(d.title, 22))
      .attr('dy', d => 8 + d.importance * 16 + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', 'currentColor')
      .attr('class', 'text-muted-foreground')
      .style('font-size', '11px')
      .style('pointer-events', 'none');

    // Hover highlight
    nodeGroups
      .on('mouseenter', (_event, d) => {
        const connected = new Set<string>([d.id]);
        simEdges.forEach(e => {
          const srcId = typeof e.source === 'string' ? e.source : (e.source as GraphNode).id;
          const tgtId = typeof e.target === 'string' ? e.target : (e.target as GraphNode).id;
          if (srcId === d.id) connected.add(tgtId);
          if (tgtId === d.id) connected.add(srcId);
        });
        nodeGroups.attr('opacity', n => connected.has(n.id) ? 1 : 0.15);
        links.attr('stroke-opacity', l => {
          const srcId = typeof l.source === 'string' ? l.source : (l.source as GraphNode).id;
          const tgtId = typeof l.target === 'string' ? l.target : (l.target as GraphNode).id;
          return srcId === d.id || tgtId === d.id ? 0.7 : 0.05;
        });
      })
      .on('mouseleave', () => {
        nodeGroups.attr('opacity', 1);
        links.attr('stroke-opacity', 0.3);
      });

    // Drag
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeGroups.call(drag);

    // Tick
    simulation.on('tick', () => {
      links
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);
      nodeGroups.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [nodes, edges, selectedNodeId]);

  useEffect(() => {
    const cleanup = render();
    return () => { cleanup?.(); simulationRef.current?.stop(); };
  }, [render]);

  // Handle resize
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      simulationRef.current?.stop();
      render();
    });
    if (svgRef.current?.parentElement) {
      observer.observe(svgRef.current.parentElement);
    }
    return () => observer.disconnect();
  }, [render]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No nodes in this domain
      </div>
    );
  }

  return <svg ref={svgRef} className="w-full h-full min-h-[400px]" />;
}
