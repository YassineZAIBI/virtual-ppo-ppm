'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Workflow,
  Users,
  BarChart3,
  Cog,
  ArrowRight,
  Lock,
  Bell,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { ViewShell } from '@/components/views/shared/ViewShell';

const tacticsFeatures = [
  {
    icon: Workflow,
    title: 'Execution Orchestrator',
    description:
      'Convert strategies into actionable Jira epics, tasks, and team assignments. Auto-generate sprint backlogs from your strategic initiatives.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Users,
    title: 'Team Capacity Planner',
    description:
      'Visualize team bandwidth, allocate resources across initiatives, and identify bottlenecks before they impact delivery.',
    color: 'from-violet-500 to-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Delivery Dashboard',
    description:
      'Track tactical execution progress with velocity metrics, burn-down charts, and real-time delivery health indicators.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Cog,
    title: 'Methodology Engine',
    description:
      'Support for Scrum, Kanban, and SAFe workflows. Azmyra adapts to your team\'s methodology while keeping everything aligned to vision.',
    color: 'from-emerald-500 to-green-500',
  },
];

export function TacticsView() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleNotify = async () => {
    if (!email.trim()) return;
    setSubscribing(true);
    // Simulate subscription — in the future this stores a flag in UserSettingsRecord
    await new Promise((resolve) => setTimeout(resolve, 800));
    setSubscribed(true);
    setSubscribing(false);
    toast.success('You\'ll be notified when Tactics launches!');
  };

  return (
    <ViewShell
      title="Tactics Pillar"
      description="The third pillar of Azmyra's three-pillar framework. Transform your strategies into tactical execution — closing the loop from vision to delivery."
      className="max-w-5xl mx-auto"
      actions={
        <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Coming Soon
        </div>
      }
    >
      {/* Strategy → Tactics flow indicator */}
      <div className="flex items-center justify-center gap-3 py-4">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 px-3 py-1">
          Vision (WHY)
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 px-3 py-1">
          Strategy (WHAT & WHEN)
        </Badge>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 px-3 py-1">
          Tactics (HOW)
        </Badge>
      </div>

      {/* Feature preview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tacticsFeatures.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="relative overflow-hidden border-dashed">
              <div className="absolute top-0 right-0 p-2">
                <Lock className="h-4 w-4 text-muted-foreground/40" />
              </div>
              <CardHeader className="pb-3">
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connection to Strategy */}
      <Card className="bg-gradient-to-r from-purple-500/5 to-amber-500/5 border-purple-500/20">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <ArrowRight className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <p className="font-semibold">Strategy to Tactics Flow</p>
            <p className="text-sm text-muted-foreground">
              Your strategic initiatives will flow directly into tactical execution here.
              Each strategy becomes a set of actionable tasks, assigned to teams, tracked to completion.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notify me */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <Bell className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="font-semibold text-lg">Get Notified</p>
            <p className="text-sm text-muted-foreground">
              Be the first to know when the Tactics pillar launches
            </p>
          </div>
          {subscribed ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">You&apos;re on the list!</span>
            </div>
          ) : (
            <div className="flex gap-2 w-full max-w-sm">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNotify()}
              />
              <Button onClick={handleNotify} disabled={subscribing || !email.trim()}>
                {subscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Notify Me'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </ViewShell>
  );
}
