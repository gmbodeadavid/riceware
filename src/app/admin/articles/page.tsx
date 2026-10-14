'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StatusBadge from '@/components/admin/StatusBadge';
import type { BlogPostStatus } from '@/lib/ricewareModels';

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  status: BlogPostStatus;
  publishedAt?: string;
  updatedAt: string;
  scheduledAt?: string;
  categoryNames: string[];
  authorName: string;
  isPublic: boolean;
};

export default function ArticlesListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/articles');

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArticles(data);
    } catch {
      setError('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Erreur suppression');
      setArticles(articles.filter((a) => a.id !== id));
    } catch {
      alert('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-paddy"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-paddy text-white rounded hover:bg-paddy-deep transition"
        >
          Nouvel article
        </Link>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => void fetchArticles()}
          disabled={loading}
          className="rounded border border-line px-4 py-2 text-sm font-semibold text-ink transition hover:bg-husk-soft disabled:opacity-60"
        >
          {loading ? 'Chargement...' : articles.length ? 'Rafraîchir la liste' : 'Charger les articles'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-ink-muted">
              <th className="pb-2 pr-4">Titre</th>
              <th className="pb-2 pr-4">Catégorie</th>
              <th className="pb-2 pr-4">Statut</th>
              <th className="pb-2 pr-4">Modifié le</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-ink-muted">
                  Aucun article. <Link href="/admin/articles/new" className="text-paddy">Créer le premier</Link>
                </td>
              </tr>
            ) : (
              articles.map((article) => (
                <tr key={article.id} className="border-b border-line/50 hover:bg-husk-soft/50">
                  <td className="py-4 pr-4">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="font-medium text-ink hover:text-paddy"
                    >
                      {article.title}
                    </Link>
                    {article.excerpt && (
                      <p className="text-sm text-ink-muted mt-1 line-clamp-1">{article.excerpt}</p>
                    )}
                  </td>
                  <td className="py-4 pr-4 text-sm text-ink-muted">
                    {article.categoryNames[0] || '—'}
                  </td>
                  <td className="py-4 pr-4"><StatusBadge status={article.status} /></td>
                  <td className="py-4 pr-4 text-sm text-ink-muted">
                    {formatDate(article.updatedAt)}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="px-3 py-1 text-sm border border-line rounded hover:bg-husk-soft transition"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 transition"
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
