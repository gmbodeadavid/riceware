'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() || undefined, motDePasse: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur de connexion');
        return;
      }

      const suite = new URLSearchParams(window.location.search).get('suite');
      router.push(suite && suite.startsWith('/admin') && !suite.startsWith('/admin/login') ? suite : '/admin');
      router.refresh();
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ground px-4 py-12 relative overflow-hidden">
      {/* Decorative background radial glow */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 size-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #71a57d 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #d3a61f 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md bg-surface rounded-panel border border-line p-8 sm:p-10 shadow-xl relative z-10">
        <div className="mb-8 flex flex-col items-center gap-1.5 text-center">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-paddy/10 p-2.5 mb-1 ring-1 ring-paddy/20">
            <BrandMark className="h-full w-auto" />
          </div>
          <span className="font-display font-bold text-ink text-2xl tracking-tight">
            RiceWare CI
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paddy/10 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-paddy-deep">
            <span className="size-1.5 rounded-full bg-paddy" aria-hidden="true" />
            Back-office interne
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-danger/10 border border-danger/30 text-danger rounded-control text-sm font-medium" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
              Email <span className="font-normal lowercase text-ink-muted/80">(optionnel pour compte admin)</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="prenom@riceware.ci"
              className="w-full px-3.5 py-2.5 border border-line rounded-control bg-ground/50 text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-paddy focus:border-transparent transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Mot de passe
              </label>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-line rounded-control bg-ground/50 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-paddy focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-paddy hover:bg-paddy-deep active:scale-[0.98] text-on-paddy font-semibold rounded-control shadow-sm transition-all duration-150 disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-5 text-xs text-center leading-relaxed text-ink-muted">
          Comptes multi-rôles : utilisez email et mot de passe attribués.
        </p>

        <div className="mt-6 pt-5 border-t border-line/70 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-paddy transition-colors">
            ← Retour au site public
          </Link>
        </div>
      </div>
    </div>
  );
}
