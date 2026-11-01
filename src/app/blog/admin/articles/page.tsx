'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BlogPostStatus } from '@/lib/ricewareModels';
import { BLOG_STATUS_LABELS } from '@/lib/blog/status';

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

const STATUS_COLORS: Record<BlogPostStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  review: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-red-100 text-red-600',
};

function StatusBadge({ status }: { status: BlogPostStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {BLOG_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function BlogArticlesListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchArticles = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/blog-admin/articles', { credentials: 'same-origin' });
      if (res.status === 401) { router.push('/blog/admin/login'); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArticles(data);
    } catch {
      setError('Erreur lors du chargement des articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchArticles(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer l'article « ${title} » ? Cette action est irréversible.`)) return;
    try {
      const res = await fetch(`/api/blog-admin/articles/${id}`, { method: 'DELETE', credentials: 'same-origin' });
      if (!res.ok) throw new Error('Erreur suppression');
      setArticles((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Erreur lors de la suppression. Veuillez réessayer.');
    }
  };

  const handleStatusChange = async (id: string, status: 'draft' | 'published' | 'archived') => {
    try {
      const res = await fetch(`/api/blog-admin/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('Erreur changement de statut');
      setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    } catch {
      alert('Erreur lors du changement de statut.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-sm text-gray-500 mt-0.5">{articles.length} article{articles.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Link
          href="/blog/admin/articles/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <span>+</span> Nouvel article
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => void fetchArticles()} className="ml-2 underline">Réessayer</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-500 mb-4">Aucun article pour l'instant.</p>
          <Link
            href="/blog/admin/articles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
          >
            Créer le premier article
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Titre</th>
                  <th className="px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Catégorie</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Modifié</th>
                  <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/blog/admin/articles/${article.id}`}
                        className="font-medium text-gray-900 hover:text-emerald-700 transition-colors line-clamp-1"
                      >
                        {article.title}
                      </Link>
                      {article.excerpt && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{article.excerpt}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {article.categoryNames[0] || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={article.status} />
                        {article.isPublic && (
                          <a
                            href={`/blog/${article.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:underline"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell whitespace-nowrap">
                      {formatDate(article.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Link
                          href={`/blog/admin/articles/${article.id}`}
                          className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Modifier
                        </Link>

                        {/* Quick status */}
                        {article.status !== 'published' && (
                          <button
                            onClick={() => void handleStatusChange(article.id, 'published')}
                            className="rounded border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            Publier
                          </button>
                        )}
                        {article.status === 'published' && (
                          <button
                            onClick={() => void handleStatusChange(article.id, 'draft')}
                            className="rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                          >
                            Dépublier
                          </button>
                        )}

                        <button
                          onClick={() => void handleDelete(article.id, article.title)}
                          className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
