'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Eye, Briefcase, ClipboardCheck, Gauge, Calendar } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'Brain', desc: 'Your strategy canvas — see how everything connects.', color: 'text-blue-500' },
  { icon: Eye, title: 'Vision', desc: 'Define your north star, goals, personas, and needs.', color: 'text-purple-500' },
  { icon: Briefcase, title: 'Portfolio', desc: 'Organize initiatives into verticals with a kanban pipeline.', color: 'text-amber-500' },
  { icon: ClipboardCheck, title: 'Assessment', desc: 'Track risks, evaluate strategy, and run discovery.', color: 'text-red-500' },
  { icon: Gauge, title: 'Execution', desc: 'Track delivery with boards synced to Jira/Linear.', color: 'text-teal-500' },
  { icon: Calendar, title: 'Meetings', desc: 'AI bot joins meetings, transcribes, and extracts action items.', color: 'text-green-500' },
];

interface QuickTourStepProps {
  onComplete?: () => void;
}

export function QuickTourStep({ onComplete }: QuickTourStepProps = {}) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Here&apos;s what Azmyra can do</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Explore any section when you&apos;re ready. You can always come back to set things up later.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {FEATURES.map(f => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="border-border">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${f.color}`} />
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {onComplete && (
        <Button onClick={onComplete} className="w-full mt-4">
          Got it — take me in
        </Button>
      )}
    </div>
  );
}
