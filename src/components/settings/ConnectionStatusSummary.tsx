'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ConnectionStatus {
  integrationType: string;
  status: string;
}

export function ConnectionStatusSummary() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/integrations/status');
        if (res.ok) {
          const data = await res.json();
          const connected = (data.connections || []).filter(
            (c: ConnectionStatus) => c.status === 'connected'
          );
          setConnections(connected);
        }
      } catch {
        // Non-critical — show nothing on error
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (connections.length === 0) {
    return <span className="text-sm text-muted-foreground">No connections</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {connections.map((c) => (
        <Badge key={c.integrationType} variant="secondary" className="text-xs">
          {c.integrationType}
        </Badge>
      ))}
      <span className="text-xs text-muted-foreground">
        {connections.length} connected
      </span>
    </div>
  );
}
