'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Rocket, Layers, Building, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OnboardingRole } from '@/lib/types';

export type { OnboardingRole };

interface RoleSelectionStepProps {
  onSelect: (role: OnboardingRole) => void;
}

const ROLES = [
  {
    key: 'solo' as const,
    title: 'Solo PM / Startup',
    desc: 'Small team, under 200 people. I need to move fast and let AI do the heavy lifting.',
    time: '~3 min setup',
    icon: Rocket,
    color: 'border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10',
  },
  {
    key: 'head' as const,
    title: 'Head of Product',
    desc: '200-1000 people. I have existing tools and need clarity across products.',
    time: '~10 min setup',
    icon: Layers,
    color: 'border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10',
  },
  {
    key: 'vp' as const,
    title: 'VP / Director of Product',
    desc: '1000+ people. I need governance, compliance, and cross-team visibility.',
    time: '~15 min setup',
    icon: Building,
    color: 'border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10',
  },
  {
    key: 'explore' as const,
    title: 'Just exploring',
    desc: 'Show me what Azmyra can do before I commit to setup.',
    time: '~1 min tour',
    icon: Compass,
    color: 'border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500/10',
  },
];

export function RoleSelectionStep({ onSelect }: RoleSelectionStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">What best describes you?</h2>
      <p className="text-sm text-muted-foreground mb-6">
        This helps us tailor your setup experience.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map(r => {
          const Icon = r.icon;
          return (
            <Card
              key={r.key}
              className={cn(
                'cursor-pointer transition-all border-l-4',
                r.color
              )}
              onClick={() => onSelect(r.key)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{r.title}</p>
                      <span className="text-[10px] text-muted-foreground">{r.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
