'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard, MessageSquare, Calendar, Map,
  Settings, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Zap, LogOut, Eye, Binoculars, ClipboardCheck,
  UserCog, Puzzle, Brain, Briefcase, Users, Gauge,
} from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { AlertBell } from '@/components/alerts/AlertBell';

interface NavItem {
  path: string;
  label: string;
  icon: typeof Eye;
}

interface NavSection {
  title: string;
  color: string;       // brand color for the section
  borderColor: string;  // active item left border color
  items: NavItem[];
}

const PILLAR_SECTIONS: NavSection[] = [
  {
    title: 'INTELLIGENCE',
    color: 'text-blue-500 dark:text-blue-400',
    borderColor: 'border-blue-500',
    items: [
      { path: '/brain', label: 'Brain', icon: Brain },
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    ],
  },
  {
    title: 'VISION',
    color: 'text-purple-500 dark:text-purple-400',
    borderColor: 'border-purple-500',
    items: [
      { path: '/vision', label: 'North Star', icon: Eye },
      { path: '/vision/audiences', label: 'Audiences', icon: Users },
      { path: '/landscape', label: 'Landscape', icon: Binoculars },
    ],
  },
  {
    title: 'STRATEGY',
    color: 'text-amber-500 dark:text-amber-400',
    borderColor: 'border-amber-500',
    items: [
      { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
      { path: '/roadmap', label: 'Roadmap', icon: Map },
      { path: '/assessment', label: 'Assessment', icon: ClipboardCheck },
    ],
  },
  {
    title: 'TACTICS',
    color: 'text-teal-500 dark:text-teal-400',
    borderColor: 'border-teal-500',
    items: [
      { path: '/tactics', label: 'Execution', icon: Gauge },
      { path: '/meetings', label: 'Meetings', icon: Calendar },
      { path: '/value-meter', label: 'Value', icon: LayoutDashboard },
    ],
  },
];

const SETTINGS_ITEMS: NavItem[] = [
  { path: '/integrations', label: 'Integrations', icon: Puzzle },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/profile', label: 'Profile', icon: UserCog },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ SETTINGS: true });
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

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/' || pathname === '/dashboard';
    // Exact match only — /vision must NOT match /vision/audiences
    return pathname === path;
  };

  const renderNavItem = (item: NavItem, borderColor: string) => {
    const Icon = item.icon;
    const active = isActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => router.push(item.path)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
          active
            ? `bg-sidebar-primary text-sidebar-primary-foreground border-l-2 ${borderColor}`
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span className="font-medium">{item.label}</span>}
      </button>
    );
  };

  return (
    <div className={cn(
      'flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 h-screen sticky top-0',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-lg">Azmyra 3.0</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <AlertBell />
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Pillar Sections */}
        {PILLAR_SECTIONS.map((section) => {
          const isSectionCollapsed = collapsedSections[section.title];
          return (
            <div key={section.title} className="mb-2">
              {!collapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wider uppercase"
                >
                  <span className={section.color}>{section.title}</span>
                  {isSectionCollapsed
                    ? <ChevronDown className={cn('h-3 w-3', section.color)} />
                    : <ChevronUp className={cn('h-3 w-3', section.color)} />}
                </button>
              )}
              {(!isSectionCollapsed || collapsed) && (
                <div className="space-y-0.5">
                  {section.items.map(item => renderNavItem(item, section.borderColor))}
                </div>
              )}
            </div>
          );
        })}

        {/* Separator */}
        <div className="border-t border-sidebar-border my-2" />

        {/* Settings Section — collapsed by default */}
        <div className="mb-2">
          {!collapsed && (
            <button
              onClick={() => toggleSection('SETTINGS')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold tracking-wider uppercase"
            >
              <span className="text-muted-foreground">SETTINGS</span>
              {collapsedSections['SETTINGS']
                ? <ChevronDown className="h-3 w-3 text-muted-foreground" />
                : <ChevronUp className="h-3 w-3 text-muted-foreground" />}
            </button>
          )}
          {(!collapsedSections['SETTINGS'] || collapsed) && (
            <div className="space-y-0.5">
              {SETTINGS_ITEMS.map(item => renderNavItem(item, 'border-slate-500'))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{session.user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-red-400 hover:bg-sidebar-accent flex-shrink-0 h-8 w-8"
                onClick={() => { localStorage.removeItem('vppo-user-id'); localStorage.removeItem('vppo-storage'); signOut({ callbackUrl: '/' }); }}
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
