import type { MediaSummary } from '@/lib/blog/types';
import type { AnyBlogBlock } from '@/lib/ricewareModels';

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

function paragraphsToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

/**
 * Convertit les blocs d’un article en HTML pour l’API publique.
 * Tout le texte saisi est échappé : le résultat peut être injecté tel quel.
 */
export function blocksToHtml(blocks: AnyBlogBlock[], media: Record<string, MediaSummary>): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${paragraphsToHtml(block.content.text)}</p>`;
        case 'heading': {
          const level = block.content.level === 3 ? 3 : 2;
          return `<h${level}>${escapeHtml(block.content.text)}</h${level}>`;
        }
        case 'quote': {
          const author = block.content.author ? `<cite>${escapeHtml(block.content.author)}</cite>` : '';
          return `<blockquote><p>${paragraphsToHtml(block.content.text)}</p>${author}</blockquote>`;
        }
        case 'callout': {
          const title = block.content.title ? `<strong>${escapeHtml(block.content.title)}</strong>` : '';
          return `<aside class="callout callout-${escapeHtml(block.content.variant)}">${title}<p>${paragraphsToHtml(block.content.text)}</p></aside>`;
        }
        case 'image': {
          const image = media[block.content.mediaId];
          if (!image) return '';
          const caption = block.content.caption ? `<figcaption>${escapeHtml(block.content.caption)}</figcaption>` : '';
          return `<figure><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.altText ?? '')}" loading="lazy" />${caption}</figure>`;
        }
        case 'divider':
          return '<hr />';
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join('\n');
}
