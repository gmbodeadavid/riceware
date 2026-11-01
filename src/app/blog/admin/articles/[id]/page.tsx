'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BlogEditor, { type EditorPayload } from '@/components/blog-admin/BlogEditor';
import type { ArticleEditorData } from '@/lib/blog/types';

export default function BlogArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [initialData, setInitialData] = useState<ArticleEditorData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/blog-admin/articles/${id}`, { credentials: 'same-origin' })
      .then(async (res) => {
        if (res.status === 401) { router.push('/blog/admin/login'); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInitialData(data as ArticleEditorData);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Erreur de chargement.');
      });
  }, [id, router]);

  async function handleSubmit(data: EditorPayload) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/blog-admin/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      });

      const result = await res.json();

      if (!res.ok) {
        const issues = result.issues as string[] | undefined;
        throw new Error(issues?.join(' · ') || result.error || 'Erreur lors de la sauvegarde.');
      }

      router.push('/blog/admin/articles');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center text-red-700">
        <p className="font-medium">{loadError}</p>
        <button
          onClick={() => router.push('/blog/admin/articles')}
          className="mt-3 text-sm underline"
        >
          Retour aux articles
        </button>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <BlogEditor
      initialData={initialData}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Enregistrer les modifications"
    />
  );
}
