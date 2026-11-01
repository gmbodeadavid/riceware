'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ArticleEditor from '@/components/ArticleEditor';
import type { ArticleEditorData, ArticleFormValues } from '@/lib/blog/types';

export default function EditArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [article, setArticle] = useState<ArticleEditorData | null>(null);
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
        const res = await fetch(`/api/admin/articles/${id}`);

        if (res.status === 401) {
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
        setError("Erreur lors du chargement de l'article");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id, router]);

  const handleSubmit = async (data: ArticleFormValues) => {
    if (!id) return;
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
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
        <h1 className="font-display text-2xl font-bold text-ink">Modifier l&apos;article</h1>
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
          scheduledAt: article.scheduledAt,
          featuredImage: article.featuredImage,
          authorId: article.authorId,
          categoryIds: article.categoryIds,
          tagIds: article.tagIds,
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          slug: article.slug,
          isFeatured: article.isFeatured,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Enregistrer les modifications"
      />
    </div>
  );
}
