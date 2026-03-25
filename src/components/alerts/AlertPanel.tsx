'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, Info, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { UserAlertData } from '@/lib/types';

interface AlertPanelProps {
  onClose: () => void;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  critical: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
} as const;

export function AlertPanel({ onClose }: AlertPanelProps) {
  const { userAlerts, setUserAlerts, markAlertRead, dismissAlert } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (res.ok) {
          const data = await res.json();
          setUserAlerts(Array.isArray(data) ? data : data.alerts ?? []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, [setUserAlerts]);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      markAlertRead(id);
    } catch {
      // silently fail
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDismissed: true }),
      });
      dismissAlert(id);
    } catch {
      // silently fail
    }
  };

  const visibleAlerts = userAlerts.filter((a) => !a.isDismissed);

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <Card
        className="absolute top-14 right-4 w-96 max-h-[70vh] overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Notifications</CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(70vh-60px)] space-y-2 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
          ) : (
            visibleAlerts.map((alert) => {
              const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 ${config.bg} ${config.border} ${alert.isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{alert.title}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {alert.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                      {alert.source && (
                        <span className="text-[10px] text-muted-foreground mt-1 block">
                          Source: {alert.source}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!alert.isRead && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMarkRead(alert.id)} title="Mark as read">
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => handleDismiss(alert.id)} title="Dismiss">
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
