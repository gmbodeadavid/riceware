import { BLOG_STATUS_LABELS } from '@/lib/blog/status';
import type { BlogPostStatus } from '@/lib/ricewareModels';

const STATUS_CLASSES: Record<BlogPostStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  review: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-red-100 text-red-800',
};

export default function StatusBadge({ status }: { status: BlogPostStatus }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {BLOG_STATUS_LABELS[status]}
    </span>
  );
}
