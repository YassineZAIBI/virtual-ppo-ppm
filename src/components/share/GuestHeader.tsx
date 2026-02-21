'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, Clock } from 'lucide-react';

interface GuestHeaderProps {
  expiresAt: string;
  resourceType: string;
}

export function GuestHeader({ expiresAt, resourceType }: GuestHeaderProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(hours > 0 ? `${hours}h ${minutes}m remaining` : `${minutes}m remaining`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-7 w-7 text-blue-600" />
          <span className="font-bold text-lg text-slate-900 dark:text-white">Virtual PPO</span>
          <Badge variant="secondary" className="capitalize">{resourceType} View</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {timeLeft}
          </Badge>
        </div>
      </div>
    </header>
  );
}
