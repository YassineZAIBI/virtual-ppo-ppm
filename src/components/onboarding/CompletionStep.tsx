'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PartyPopper, Brain, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CompletionStepProps {
  role: string;
  onComplete: () => void;
}

export function CompletionStep({ role, onComplete }: CompletionStepProps) {
  const router = useRouter();
  const [stats, setStats] = useState({ verticals: 0, initiatives: 0, alignment: null as number | null });

  useEffect(() => {
    fetch('/api/brain')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.stats) {
          setStats({
            verticals: data.stats.totalVerticals || 0,
            initiatives: data.stats.totalInitiatives || 0,
            alignment: data.stats.portfolioAlignment ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  const messages: Record<string, string> = {
    solo: 'Your product is set up. AI generated your vision and persona.',
    head: 'Your backlog is organized. Verticals created from your imported data.',
    vp: 'Your strategic foundation is complete. Vision, personas, and verticals defined.',
    explore: 'You\u2019re all set to explore.',
  };

  const handleBrain = async () => {
    await onComplete();
    router.push('/brain');
  };

  const handleDashboard = async () => {
    await onComplete();
    router.push('/dashboard');
  };

  return (
    <div className="space-y-6 text-center py-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-green-600" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold">You&apos;re ready!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {messages[role] || 'Setup complete.'}
        </p>
      </div>
      {stats.verticals > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <div className="text-lg font-semibold">{stats.verticals}</div>
            <div className="text-xs text-muted-foreground">verticals</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-lg font-semibold">{stats.initiatives}</div>
            <div className="text-xs text-muted-foreground">initiatives</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-lg font-semibold">{stats.alignment !== null ? `${stats.alignment}%` : '\u2014'}</div>
            <div className="text-xs text-muted-foreground">aligned</div>
          </Card>
        </div>
      )}
      <div className="space-y-3">
        <Button className="w-full gap-2" onClick={handleBrain}>
          <Brain className="h-4 w-4" /> Open your company brain
        </Button>
        <Button variant="outline" className="w-full gap-2" onClick={handleDashboard}>
          <LayoutDashboard className="h-4 w-4" /> Go to dashboard
        </Button>
      </div>
    </div>
  );
}
