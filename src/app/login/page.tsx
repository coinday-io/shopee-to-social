'use client';

import * as React from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchJson } from '@/lib/fetch-client';

export default function LoginPage() {
  // Read ?from= directly from window so the page stays statically
  // pre-renderable (no useSearchParams Suspense requirement).
  const fromPath = React.useMemo(() => {
    if (typeof window === 'undefined') return '/products';
    const from = new URL(window.location.href).searchParams.get('from');
    return from && from.startsWith('/') ? from : '/products';
  }, []);

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      toast.success('Login berhasil');
      // Use window.location to force a fresh navigation that triggers middleware
      window.location.href = fromPath.startsWith('/') ? fromPath : '/products';
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login gagal');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
            S
          </div>
          <h1 className="text-lg font-semibold">Shopee to Social</h1>
          <p className="mt-0.5 text-sm text-neutral-500">Login untuk akses dashboard</p>
        </div>

        <Input
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Login
        </Button>

        <p className="text-center text-xs text-neutral-400">
          Single-user private tool · Credentials di env vars
        </p>
      </form>
    </div>
  );
}
