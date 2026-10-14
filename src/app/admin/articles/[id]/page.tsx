'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ArticleEditor from '@/components/ArticleEditor';

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
  content: any[];
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  scheduledAt?: string;
  allowComments?: boolean;
};

export default function EditArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      router.push('/admin/articles');
      return;
    }

    const fetchArticle = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`/api/admin/articles/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          localStorage.removeItem('admin_token');
          router.push('/admin/login');
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Article non trouvé');
          return;
        }

        setArticle(data);
      } catch {
        setError('Erreur lors du chargement de l'article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, router]);

  const handleSubmit = async (data: {
    title: string;
    excerpt?: string;
    content: any[];
    status: string;
    featuredImageId?: string;
    authorId: string;
    categoryIds: string[];
    tagIds: string[];
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    scheduledAt?: string;
    allowComments?: boolean;
  }) => {
    if (!id) return;
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/admin/login');
        return;
      }

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Erreur lors de la mise à jour');
        return;
      }

      router.push('/admin/articles');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-paddy"></div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">
        {error || 'Article non trouvé'}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Modifier l'article</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <ArticleEditor
        initialData={{
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          status: article.status,
          featuredImageId: article.featuredImageId,
          authorId: article.author.id,
          categoryIds: article.categories.map((c) => c.id),
          tagIds: article.tags.map((t) => t.id),
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          seoKeywords: article.seoKeywords,
          scheduledAt: article.scheduledAt,
          allowComments: article.allowComments,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}