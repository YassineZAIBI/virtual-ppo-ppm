'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Globe, BookOpen, SquareKanban, TrendingUp, MessageSquare,
  Search, FileText, Landmark, Database, GraduationCap,
  RefreshCw, CheckCircle2, XCircle, Loader2, Plus, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface AdapterInfo {
  key: string;
  metadata: {
    name: string;
    icon: string;
    category: string;
    description: string;
    rateLimit: { requests: number; windowMs: number };
    capabilities: { searchable: boolean; streamable: boolean; realtime: boolean };
    requiresConfig: boolean;
  };
}

interface ConnectorConfig {
  id: string;
  name: string;
  adapterKey: string;
  type: string;
  isActive: boolean;
  refreshSchedule: string;
  lastFetchAt: string | null;
  lastFetchStatus: string | null;
}

const ICON_MAP: Record<string, typeof Globe> = {
  Globe, BookOpen, SquareKanban, TrendingUp, MessageSquare,
  Search, FileText, Landmark, Database, GraduationCap,
};

const CATEGORY_COLORS: Record<string, string> = {
  search: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  social: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  research: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  government: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  mcp: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  feed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  activity: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  custom: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
};

export function ConnectorManager() {
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; error?: string }>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/data-pipeline/adapters').then(r => r.ok ? r.json() : []),
      fetch('/api/connectors').then(r => r.ok ? r.json() : []),
    ]).then(([a, c]) => {
      setAdapters(Array.isArray(a) ? a : []);
      setConnectors(Array.isArray(c) ? c : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const testAdapter = async (key: string) => {
    setTestingKey(key);
    try {
      const res = await fetch(`/api/data-pipeline/adapters/${key}/test`, { method: 'POST' });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [key]: { ok: data.ok, error: data.error } }));
      if (data.ok) toast.success(`${key} connection successful`);
      else toast.error(`${key} test failed: ${data.error || 'Unknown error'}`);
    } catch {
      setTestResults(prev => ({ ...prev, [key]: { ok: false, error: 'Network error' } }));
      toast.error('Connection test failed');
    } finally {
      setTestingKey(null);
    }
  };

  const enableConnector = async (adapter: AdapterInfo) => {
    try {
      const res = await fetch('/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adapter.metadata.name,
          adapterKey: adapter.key,
          type: 'preset',
          isActive: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setConnectors(prev => [...prev, created]);
        toast.success(`${adapter.metadata.name} enabled`);
      }
    } catch {
      toast.error('Failed to enable connector');
    }
  };

  const toggleConnector = async (connector: ConnectorConfig) => {
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !connector.isActive }),
      });
      if (res.ok) {
        setConnectors(prev => prev.map(c => c.id === connector.id ? { ...c, isActive: !c.isActive } : c));
      }
    } catch {
      toast.error('Failed to update connector');
    }
  };

  const deleteConnector = async (id: string) => {
    try {
      await fetch(`/api/connectors/${id}`, { method: 'DELETE' });
      setConnectors(prev => prev.filter(c => c.id !== id));
      toast.success('Connector removed');
    } catch {
      toast.error('Failed to remove connector');
    }
  };

  // Group adapters by category
  const grouped = adapters.reduce<Record<string, AdapterInfo[]>>((acc, a) => {
    const cat = a.metadata.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  const connectorByKey = connectors.reduce<Record<string, ConnectorConfig>>((acc, c) => {
    acc[c.adapterKey] = c;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Data Connectors</h3>
        <p className="text-sm text-muted-foreground">
          Enable data sources for market research. {adapters.length} adapters available, {connectors.filter(c => c.isActive).length} active.
        </p>
      </div>

      {Object.entries(grouped).map(([category, categoryAdapters]) => (
        <div key={category}>
          <h4 className="text-sm font-medium text-muted-foreground mb-3 capitalize flex items-center gap-2">
            <Badge variant="secondary" className={cn('text-xs', CATEGORY_COLORS[category])}>
              {category}
            </Badge>
            <span>{categoryAdapters.length} source{categoryAdapters.length !== 1 ? 's' : ''}</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoryAdapters.map((adapter) => {
              const connector = connectorByKey[adapter.key];
              const isEnabled = !!connector;
              const isActive = connector?.isActive ?? false;
              const Icon = ICON_MAP[adapter.metadata.icon] || Globe;
              const test = testResults[adapter.key];

              return (
                <Card key={adapter.key} className={cn(
                  'transition-all',
                  isActive ? 'border-green-200 dark:border-green-800' : '',
                  !isEnabled && 'opacity-70',
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                        isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted',
                      )}>
                        <Icon className={cn('h-5 w-5', isActive ? 'text-green-600' : 'text-muted-foreground')} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm text-foreground truncate">{adapter.metadata.name}</h5>
                          {adapter.metadata.requiresConfig && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Config needed</Badge>
                          )}
                          {test && (
                            test.ok
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              : <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{adapter.metadata.description}</p>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {adapter.metadata.rateLimit.requests}/{Math.round(adapter.metadata.rateLimit.windowMs / 60000)}min
                          </Badge>
                          {adapter.metadata.capabilities.realtime && (
                            <Badge variant="secondary" className="text-[10px]">Realtime</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {isEnabled ? (
                          <>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => toggleConnector(connector)}
                            />
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => testAdapter(adapter.key)}
                                disabled={testingKey === adapter.key}
                              >
                                {testingKey === adapter.key
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <RefreshCw className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => deleteConnector(connector.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => enableConnector(adapter)}
                          >
                            <Plus className="h-3 w-3 mr-1" />Enable
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {adapters.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No adapters found</p>
            <p className="text-sm mt-1">Data pipeline adapters could not be loaded.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
