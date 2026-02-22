'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, MessageSquare, Calendar, Map, Lightbulb, Search,
  Settings, ChevronLeft, ChevronRight, Zap, UserCircle, Gauge, LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { path: '/meetings', label: 'Meetings', icon: Calendar },
  { path: '/roadmap', label: 'Roadmap', icon: Map },
  { path: '/initiatives', label: 'Initiatives', icon: Lightbulb },
  { path: '/discovery', label: 'Discovery', icon: Search },
  { path: '/value-meter', label: 'Value Meter', icon: Gauge },
  { path: '/user-journey', label: 'User Journey', icon: UserCircle },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  // Hide sidebar on auth/onboarding/share pages and when not authenticated
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/share') ||
    !session
  ) return null;

  return (
    <div className={cn('flex flex-col bg-slate-900 text-white transition-all duration-300 h-screen sticky top-0', collapsed ? 'w-16' : 'w-64')}>
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg">Azmyra</span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-slate-400 hover:text-white hover:bg-slate-800">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
                isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-700">
        {!collapsed && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Zap className="h-4 w-4" />
              <span>Autonomous Mode</span>
              <Badge variant="outline" className="ml-auto text-green-400 border-green-400">Active</Badge>
            </div>
          </div>
        )}

        {/* User info & Logout */}
        {session?.user && (
          <div className="p-3">
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {(session.user.name || session.user.email || '?')[0].toUpperCase()}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-red-400 hover:bg-slate-800 flex-shrink-0 h-8 w-8"
                onClick={() => signOut({ callbackUrl: '/' })}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
