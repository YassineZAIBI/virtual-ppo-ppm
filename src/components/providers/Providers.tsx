'use client';

import { useEffect, useRef } from 'react';
import { SessionProvider, useSession } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useAppStore } from '@/lib/store';

const STORE_USER_KEY = 'vppo-user-id';

/** Clears Zustand persisted state when the logged-in user changes */
function StoreGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const clearChat = useAppStore((s) => s.clearChat);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const checked = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || checked.current) return;
    checked.current = true;

    const currentUserId = (session?.user as { id?: string })?.id;
    if (!currentUserId) return;

    const previousUserId = localStorage.getItem(STORE_USER_KEY);
    if (previousUserId && previousUserId !== currentUserId) {
      // Different user — wipe persisted store to prevent data leaks
      localStorage.removeItem('vppo-storage');
      clearChat();
      updateSettings({ llm: { provider: 'groq', apiKey: '', model: '' } });
      window.location.reload();
      return;
    }

    localStorage.setItem(STORE_USER_KEY, currentUserId);
  }, [status, session, clearChat, updateSettings]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <StoreGuard>
          {children}
        </StoreGuard>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}
