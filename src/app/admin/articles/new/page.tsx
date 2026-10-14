'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ArticleEditor from '@/components/ArticleEditor';

type FormData = {
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
};

export default function NewArticlePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/articles', {
        method: 'POST',
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
        setError(result.error || 'Erreur lors de la création');
        return;
      }

      router.push('/admin/articles');
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Nouvel article</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <ArticleEditor
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Créer l'article"
      />
    </div>
  );
}