'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlogEditor, { type EditorPayload } from '@/components/blog-admin/BlogEditor';

export default function BlogArticleNewPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(data: EditorPayload) {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/blog-admin/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin',
      });

      const result = await res.json();

      if (!res.ok) {
        const issues = result.issues as string[] | undefined;
        throw new Error(issues?.join(' · ') || result.error || 'Erreur lors de la création.');
      }

      router.push('/blog/admin/articles');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <BlogEditor
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      submitLabel="Créer l'article"
    />
  );
}
