'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import BrandMark from '@/components/BrandMark';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse: password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Identifiants incorrects.');
      } else {
        const suite = searchParams.get('suite') || '/boutique/articles-admin';
        router.push(suite);
        router.refresh();
      }
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ground font-body text-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <BrandMark className="h-9 w-auto" />
            <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
              RiceWare CI
            </span>
          </div>
          <span
            className="text-[10px] font-semibold tracking-wide uppercase"
            style={{ color: '#f97316', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          >
            Administration catalogue
          </span>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-line bg-surface px-6 py-7 shadow-sm space-y-5"
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-control border border-line bg-ground px-3 py-2.5 text-sm outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/20 transition"
              placeholder="admin@riceware.ci"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-control border border-line bg-ground px-3 py-2.5 text-sm outline-none focus:border-paddy focus:ring-2 focus:ring-paddy/20 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-control bg-paddy px-4 py-2.5 text-sm font-semibold text-on-paddy hover:bg-paddy-deep disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-muted">
          <Link href="/boutique" className="hover:underline">← Retour à la boutique</Link>
        </p>
      </div>
    </div>
  );
}

export default function BoutiqueAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground" />}>
      <LoginForm />
    </Suspense>
  );
}
