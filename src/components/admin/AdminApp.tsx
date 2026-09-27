'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Container, FullPageLoading } from '../ui';
import AdminDashboard from './AdminDashboard';
import AdminLogin from './AdminLogin';

type AuthState = 'checking' | 'out' | 'in';

export default function AdminApp() {
  const [auth, setAuth] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ authenticated: boolean }>('/api/admin/session')
      .then((result) => {
        if (!cancelled) {
          setAuth(result.authenticated ? 'in' : 'out');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuth('out');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnauthorized = useCallback(() => setAuth('out'), []);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ログアウト要求に失敗してもクライアント側の状態は解除する
    }
    setAuth('out');
  }, []);

  return (
    <Container wide>
      {auth === 'checking' && <FullPageLoading />}
      {auth === 'out' && <AdminLogin onSuccess={() => setAuth('in')} />}
      {auth === 'in' && <AdminDashboard onUnauthorized={handleUnauthorized} onLogout={() => void handleLogout()} />}
    </Container>
  );
}
