import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '@bcv2/shared';
import { getToken, setToken, trpc } from './trpc.js';

const REMEMBER_ME_KEY = 'bcm_remember_me';

// Idle auto-logout: sessions default to a 30-minute inactivity window
// (warning at 29 minutes, logout at 30) unless the user opted into "keep me
// logged in" at login/register — see docs/DECISIONS.md. Skipped entirely
// when rememberMe is true.
const IDLE_WARNING_MS = 29 * 60_000;
const IDLE_LOGOUT_MS = 30 * 60_000;
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart'] as const;

function getStoredRememberMe(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) === '1';
}

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    nick: string,
    password: string,
    inviteCode?: string,
    turnstileToken?: string,
    rememberMe?: boolean
  ) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  idleWarning: boolean;
  dismissIdleWarning: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(getStoredRememberMe);
  const [idleWarning, setIdleWarning] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    trpc.auth.me
      .query()
      .then((me) => setUser(me))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string, remember = false) => {
    const res = await trpc.auth.login.mutate({ identifier, password, rememberMe: remember });
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0');
    setRememberMe(remember);
  }, []);

  const register = useCallback(
    async (
      email: string,
      nick: string,
      password: string,
      inviteCode?: string,
      turnstileToken?: string,
      remember = false
    ) => {
      const res = await trpc.auth.register.mutate({
        email,
        nick,
        password,
        inviteCode,
        turnstileToken,
        rememberMe: remember,
      });
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0');
      setRememberMe(remember);
    },
    []
  );

  const clearIdleTimers = useCallback(() => {
    clearTimeout(warningTimer.current);
    clearTimeout(logoutTimer.current);
  }, []);

  const logout = useCallback(() => {
    clearIdleTimers();
    setIdleWarning(false);
    localStorage.removeItem(REMEMBER_ME_KEY);
    setRememberMe(false);
    setToken(null);
    setUser(null);
  }, [clearIdleTimers]);

  const refreshUser = useCallback(async () => {
    if (!getToken()) return;
    const me = await trpc.auth.me.query();
    setUser(me);
  }, []);

  const idleLogout = useCallback(() => {
    logout();
    navigate('/login?reason=idle');
  }, [logout, navigate]);

  const resetIdleTimers = useCallback(() => {
    clearIdleTimers();
    setIdleWarning(false);
    warningTimer.current = setTimeout(() => setIdleWarning(true), IDLE_WARNING_MS);
    logoutTimer.current = setTimeout(idleLogout, IDLE_LOGOUT_MS);
  }, [clearIdleTimers, idleLogout]);

  // "Any click on the modal or the app in general resets the timer" is
  // exactly what the shared activity listener below already does — the
  // warning modal's own button doesn't need bespoke wiring beyond that.
  const dismissIdleWarning = useCallback(() => {
    resetIdleTimers();
  }, [resetIdleTimers]);

  useEffect(() => {
    if (!user || rememberMe) {
      clearIdleTimers();
      setIdleWarning(false);
      return;
    }
    resetIdleTimers();
    const onActivity = () => resetIdleTimers();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resetIdleTimers();
    };
    for (const evt of ACTIVITY_EVENTS) window.addEventListener(evt, onActivity);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearIdleTimers();
      for (const evt of ACTIVITY_EVENTS) window.removeEventListener(evt, onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, rememberMe, resetIdleTimers, clearIdleTimers]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser, idleWarning, dismissIdleWarning }),
    [user, loading, login, register, logout, refreshUser, idleWarning, dismissIdleWarning]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>');
  }
  return ctx;
}
