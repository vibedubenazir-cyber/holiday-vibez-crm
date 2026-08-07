'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginResponseDTO, UserDTO } from '@holiday-vibez/shared';
import { api, setAccessToken } from './api';
import { clearSelectedModule } from './modules';

interface AuthContextValue {
  user: UserDTO | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresTwoFactor: true; userId: string } | void>;
  verifyTwoFactor: (userId: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.accessToken);
        setUser(data.user);
      }
    } catch {
      // no active session
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.post<LoginResponseDTO>('/auth/login', { email, password });
      if (data.requiresTwoFactor) {
        return { requiresTwoFactor: true as const, userId: data.userId };
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      router.push('/modules');
    },
    [router],
  );

  const verifyTwoFactor = useCallback(
    async (userId: string, code: string) => {
      const data = await api.post<{ accessToken: string; user: UserDTO }>('/auth/2fa/verify', { userId, code });
      setAccessToken(data.accessToken);
      setUser(data.user);
      router.push('/modules');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
    clearSelectedModule();
    router.push('/login');
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, login, verifyTwoFactor, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
