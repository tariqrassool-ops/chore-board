import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { syncAlarms } from './alarms';
import { firebaseConfigured } from './firebase';
import { loadIdentity, saveIdentity, type Identity } from './identity';
import { subscribe, topUp } from './store';
import type { Household } from './types';

type Status = 'loading' | 'not-configured' | 'needs-setup' | 'ready' | 'missing' | 'error';

interface HouseholdState extends Identity {
  status: Status;
  household: Household | null;
  error: string | null;
  setIdentity: (next: Identity) => Promise<void>;
  /** How many alarms this phone has set. */
  alarmCount: number;
  resyncAlarms: () => Promise<void>;
}

const Ctx = createContext<HouseholdState | null>(null);

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<Identity>({ householdId: null, memberId: null });
  const [loaded, setLoaded] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [alarmCount, setAlarmCount] = useState(0);
  const latest = useRef<Household | null>(null);

  useEffect(() => {
    loadIdentity().then((id) => {
      setIdentityState(id);
      setLoaded(true);
    });
  }, []);

  // Live subscription to the shared household document.
  useEffect(() => {
    if (!loaded) return;
    if (!firebaseConfigured) return setStatus('not-configured');
    if (!identity.householdId) return setStatus('needs-setup');
    setStatus('loading');
    const id = identity.householdId;
    return subscribe(
      id,
      (h) => {
        latest.current = h;
        setHousehold(h);
        if (!h) return setStatus('missing');
        setStatus(identity.memberId && h.members.some((m) => m.id === identity.memberId) ? 'ready' : 'needs-setup');
        // Deal out any chores that nobody has yet. Once written, the next snapshot has nothing to add.
        topUp(id, h).catch(() => {});
      },
      (e) => {
        setError(e.message);
        setStatus('error');
      },
    );
  }, [loaded, identity.householdId, identity.memberId]);

  const resyncAlarms = useCallback(async () => {
    if (!latest.current) return;
    try {
      setAlarmCount(await syncAlarms(latest.current, identity.memberId));
    } catch {
      // Permissions not granted yet; the Alarms screen explains how to fix it.
    }
  }, [identity.memberId]);

  // Keep this phone's alarms in step with the board, and refresh when the app comes back.
  useEffect(() => {
    if (status !== 'ready') return;
    const t = setTimeout(resyncAlarms, 800);
    return () => clearTimeout(t);
  }, [household, status, resyncAlarms]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && resyncAlarms());
    return () => sub.remove();
  }, [resyncAlarms]);

  const setIdentity = useCallback(async (next: Identity) => {
    await saveIdentity(next);
    setIdentityState(next);
  }, []);

  const value = useMemo(
    () => ({ ...identity, status, household, error, setIdentity, alarmCount, resyncAlarms }),
    [identity, status, household, error, setIdentity, alarmCount, resyncAlarms],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHousehold(): HouseholdState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHousehold must be used inside HouseholdProvider');
  return v;
}
