'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  status: string;
  featuredImageId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
  author: { id: string; name: string; slug: string };
  featuredImage?: { url: string } | null;
};

export default function ArticlesListPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/articles', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setArticles(data);
    } catch (err) {
      setError('Erreur lors du chargement des articles');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ?')) return;

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-800',
      draft: 'bg-gray-100 text-gray-800',
      review: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-blue-100 text-blue-800',
      archived: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded ${styles[status] || styles.draft}`}>
        {status}
      </span>
    );
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
                    {article.categories[0]?.name || '—'}
                  </td>
                  <td className="py-4 pr-4">{statusBadge(article.status)}</td>
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