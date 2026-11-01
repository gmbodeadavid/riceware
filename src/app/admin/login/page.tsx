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
    <div className="min-h-screen flex items-center justify-center bg-ground px-4">
      <div className="w-full max-w-md bg-surface rounded-lg border border-line p-8">
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <BrandMark className="h-9 w-auto" />
            <span className="font-display font-bold text-paddy text-[18px] sm:text-[20px] whitespace-nowrap">
              RiceWare CI
            </span>
          </div>
          <span
            className="text-[10px] font-semibold tracking-wide uppercase"
            style={{ color: '#7c3aed', animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }}
          >
            Back-office
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
              Email <span className="font-normal text-ink-muted">(comptes multi-rôles, optionnel)</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="prenom@riceware.ci"
              className="w-full px-4 py-2 border border-line rounded bg-ground text-ink focus:outline-none focus:ring-2 focus:ring-paddy focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border border-line rounded bg-ground text-ink focus:outline-none focus:ring-2 focus:ring-paddy focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-paddy text-white font-semibold rounded hover:bg-paddy-deep transition disabled:opacity-50"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="mt-4 text-xs leading-5 text-ink-muted">
          Sans email, le mot de passe administrateur historique est utilisé. Les comptes
          multi-rôles se connectent avec leur email et leur mot de passe.
        </p>

        <p className="mt-6 text-center text-sm text-ink-muted">
          <Link href="/" className="text-paddy hover:underline">← Retour au site</Link>
        </p>
      </div>
    </div>
  );
}
