'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { AlertPanel } from './AlertPanel';

export function AlertBell() {
  const { unreadAlertCount, setUnreadAlertCount } = useAppStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/alerts/unread-count');
        if (res.ok) {
          const data = await res.json();
          setUnreadAlertCount(data.count ?? 0);
        }
      } catch {
        // silently fail
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [setUnreadAlertCount]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadAlertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">
            {unreadAlertCount > 9 ? '9+' : unreadAlertCount}
          </span>
        )}
      </Button>
      {open && <AlertPanel onClose={() => setOpen(false)} />}
    </>
  );
}
