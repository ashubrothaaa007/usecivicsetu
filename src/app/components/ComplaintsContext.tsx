// ——— Global complaints context — real-time via Supabase Realtime + polling fallback ———
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Complaint, Status, computeWorstWardsFromList, WorstWard } from './data';
import { apiFetchComplaints, apiPostComplaint, apiPatchStatus } from './api';

// Singleton Supabase client for Realtime
const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

interface ComplaintsContextType {
  complaints: Complaint[];
  loading: boolean;
  error: string | null;
  addComplaint: (c: Complaint) => Promise<void>;
  updateStatus: (id: string, status: Status) => Promise<void>;
  refresh: () => Promise<void>;
  worstWards: WorstWard[];
  lastSynced: Date | null;
}

const ComplaintsContext = createContext<ComplaintsContextType>({
  complaints: [],
  loading: true,
  error: null,
  addComplaint: async () => {},
  updateStatus: async () => {},
  refresh: async () => {},
  worstWards: [],
  lastSynced: null,
});

export function useComplaints() {
  return useContext(ComplaintsContext);
}

export function ComplaintsProvider({ children }: { children: React.ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetchComplaints();
      setComplaints(data);
      setError(null);
      setLastSynced(new Date());
    } catch (e) {
      console.error('ComplaintsContext refresh error:', e);
      setError(String(e));
    }
  }, []);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.removeItem('civicsetu_complaints_v2');
      localStorage.removeItem('nammaooru_complaints_v2');
    } catch {
      // ignore
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  // Subscribes to all INSERT / UPDATE changes on the kv_store table.
  useEffect(() => {
    const channel = supabase
      .channel('kv-complaints-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',          // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'kv_store_6b140eaf',
        },
        (payload) => {
          // Only react to complaint keys to avoid noise from other KV entries
          const record = (payload.new || payload.old) as { key?: string } | null;
          const key: string = record?.key || '';
          if (key.startsWith('civicsetu:complaint:') || key.startsWith('nammaooru:complaint:')) {
            refresh();
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [refresh]);

  // ── Polling fallback — every 8 s (paused when page hidden) ────────────────
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (document.hidden) return; // Skip polling when tab is inactive to preserve resources
      refresh();
    }, 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  // ── Page-visibility refresh — fires when user returns to tab / app ────────
  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, [refresh]);

  // ── Add complaint ─────────────────────────────────────────────────────────
  const addComplaint = useCallback(async (c: Complaint) => {
    try {
      // 1. Optimistically show on this device immediately
      setComplaints(prev => [c, ...prev]);

      // 2. Persist to Supabase via our API
      await apiPostComplaint(c);

      // 3. Pull fresh server state so our copy is canonical
      await refresh();

      window.dispatchEvent(new CustomEvent('civicsetu:newreport', { detail: c }));
    } catch (e) {
      // Roll back optimistic update on failure
      setComplaints(prev => prev.filter(x => x.id !== c.id));
      console.error('addComplaint error:', e);
      throw e;
    }
  }, [refresh]);

  // ── Update status ─────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (id: string, status: Status) => {
    try {
      // Optimistic local update
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status } : c));

      await apiPatchStatus(id, status);

      // Sync canonical state
      await refresh();

      window.dispatchEvent(new CustomEvent('civicsetu:statusupdate'));
    } catch (e) {
      console.error('updateStatus error:', e);
      await refresh();
      throw e;
    }
  }, [refresh]);

  // Memoize worst wards computation to avoid unnecessary recalculations
  const worstWards = useMemo(() => computeWorstWardsFromList(complaints), [complaints]);

  // Memoize context value to eliminate cascading re-renders across consumers
  const contextValue = useMemo(() => ({
    complaints,
    loading,
    error,
    addComplaint,
    updateStatus,
    refresh,
    worstWards,
    lastSynced,
  }), [complaints, loading, error, addComplaint, updateStatus, refresh, worstWards, lastSynced]);

  return (
    <ComplaintsContext.Provider value={contextValue}>
      {children}
    </ComplaintsContext.Provider>
  );
}
