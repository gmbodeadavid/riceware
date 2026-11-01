'use client';

import type { AnyBlogBlock } from '@/lib/ricewareModels';
import type { MediaSummary } from '@/lib/blog/types';

type Props = {
  block: AnyBlogBlock;
  media: Record<string, MediaSummary>;
};

const CALLOUT_STYLES: Record<string, string> = {
  info: 'border-blue-300 bg-blue-50 text-blue-900',
  tip: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  success: 'border-green-300 bg-green-50 text-green-900',
  warning: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  danger: 'border-red-300 bg-red-50 text-red-900',
};

export default function BlockPreview({ block, media }: Props) {
  if (block.type === 'paragraph') {
    const text = block.content.text;
    return (
      <p
        className="text-base leading-relaxed text-gray-800 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }}
      />
    );
  }

  if (block.type === 'heading') {
    const { text, level } = block.content as { text: string; level?: number };
    const Tag = level === 3 ? 'h3' : level === 4 ? 'h4' : 'h2';
    return (
      <Tag
        className="font-bold text-gray-900 text-xl mt-4 mb-2"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  if (block.type === 'quote') {
    const { text, author } = block.content as { text: string; author?: string };
    return (
      <blockquote className="border-l-4 border-emerald-500 pl-4 italic text-gray-600 my-4">
        <p dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }} />
        {author && <cite className="block not-italic text-sm font-semibold mt-1">— {author}</cite>}
      </blockquote>
    );
  }

  if (block.type === 'callout') {
    const { text, title, variant } = block.content as { text: string; title?: string; variant?: string };
    const style = CALLOUT_STYLES[variant ?? 'info'] ?? CALLOUT_STYLES.info;
    return (
      <aside className={`rounded border px-4 py-3 my-4 ${style}`}>
        {title && <strong className="block mb-1 font-semibold text-sm">{title}</strong>}
        <p className="text-sm" dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br />') }} />
      </aside>
    );
  }

  if (block.type === 'image') {
    const { mediaId, caption } = block.content as { mediaId?: string; caption?: string };
    const img = media[mediaId ?? ''];
    if (!img) {
      return (
        <figure className="my-4 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-400">
          Image introuvable ({mediaId?.slice(0, 8)}…)
        </figure>
      );
    }
    return (
      <figure className="my-4 text-center">
        <img
          src={img.url}
          alt={img.altText ?? ''}
          className="max-w-full rounded border border-gray-200 mx-auto"
        />
        {caption && <figcaption className="mt-1 text-xs text-gray-500">{caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'video') {
    const { mediaId, caption } = block.content as { mediaId?: string; caption?: string };
    const vid = media[mediaId ?? ''];
    if (!vid) {
      return (
        <figure className="my-4 rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-400">
          Vidéo introuvable ({mediaId?.slice(0, 8)}…)
        </figure>
      );
    }
    return (
      <figure className="my-4 text-center">
        <video
          controls
          muted
          src={vid.url}
          className="max-w-full rounded border border-gray-200 mx-auto"
        />
        {caption && <figcaption className="mt-1 text-xs text-gray-500">{caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === 'divider') {
    return <hr className="my-6 border-gray-200" />;
  }

  return null;
}
