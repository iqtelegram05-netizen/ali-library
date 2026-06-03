'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

/* ===================================================================
   Custom Session Hook — Bypasses next-auth useSession() to avoid
   React 19 Suspense conflict (error #310).
   Uses /api/auth/me endpoint directly instead of React Context.
   Supports phone-based credentials authentication.
   =================================================================== */

interface UserData {
  id?: string;
  name?: string | null;
  phone?: string | null;
  image?: string | null;
  role?: string;
  displayName?: string | null;
  isVerified?: boolean;
}

interface SessionResult {
  session: { user: UserData } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionResult>({
  session: null,
  status: 'loading',
  refresh: async () => {},
});

export function useAppSession(): SessionResult {
  return useContext(SessionContext);
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<{ user: UserData } | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (!mountedRef.current) return;

      if (data?.user?.phone) {
        setSession({ user: data.user });
        setStatus('authenticated');
      } else {
        setSession(null);
        setStatus('unauthenticated');
      }
    } catch {
      if (!mountedRef.current) return;
      setSession(null);
      setStatus('unauthenticated');
    }
  }, []);

  // Initial fetch + polling + cross-tab sync
  useEffect(() => {
    mountedRef.current = true;

    refresh();

    // Poll every 30 seconds
    const interval = setInterval(refresh, 30000);

    // Cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('next-auth') || e.key === 'session-event') {
        refresh();
      }
    };
    // Re-fetch when tab gains focus
    const handleFocus = () => refresh();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ session, status, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}
