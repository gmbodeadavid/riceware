'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandMark from '@/components/BrandMark';

export default function BlogAdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/blog-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motDePasse: password }),
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion.');
      } else {
        router.push('/blog/admin/articles');
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
            style={{ color: '#059669', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          >
            Rédaction &amp; blog
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface px-6 py-7 shadow-sm space-y-5">
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
          <a href="/blog" className="hover:underline">← Retour au blog</a>
        </p>
      </div>
    </div>
  );
}
