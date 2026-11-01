import type { MediaSummary } from '@/lib/blog/types';
import type { AnyBlogBlock } from '@/lib/ricewareModels';

function lineBreaksToHtml(text: string): string {
  return text.replace(/\n/g, '<br />');
}

/**
 * Convertit les blocs d’un article en HTML pour l’API publique.
 * Le texte des paragraphes/titres contient déjà du HTML assaini (gras, italique,
 * liens) et est injecté tel quel.
 */
export function blocksToHtml(blocks: AnyBlogBlock[], media: Record<string, MediaSummary>): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return `<p>${lineBreaksToHtml(block.content.text)}</p>`;
        case 'heading': {
          const level = block.content.level === 3 ? 3 : 2;
          return `<h${level}>${block.content.text}</h${level}>`;
        }
        case 'quote': {
          const author = block.content.author ? `<cite>${block.content.author}</cite>` : '';
          return `<blockquote><p>${lineBreaksToHtml(block.content.text)}</p>${author}</blockquote>`;
        }
        case 'callout': {
          const title = block.content.title ? `<strong>${block.content.title}</strong>` : '';
          return `<aside class="callout callout-${block.content.variant}">${title}<p>${lineBreaksToHtml(block.content.text)}</p></aside>`;
        }
        case 'image': {
          const image = media[block.content.mediaId];
          if (!image) return '';
          const caption = block.content.caption ? `<figcaption>${block.content.caption}</figcaption>` : '';
          return `<figure><img src="${image.url}" alt="${image.altText ?? ''}" loading="lazy" />${caption}</figure>`;
        }
        case 'video': {
          const video = media[block.content.mediaId];
          if (!video) return '';
          const attrs = [];
          if (block.content.autoplay) attrs.push('autoplay');
          if (block.content.loop) attrs.push('loop');
          if (block.content.muted) attrs.push('muted');
          const caption = block.content.caption ? `<figcaption>${block.content.caption}</figcaption>` : '';
          return `<figure controls ${attrs.join(' ')}><source src="${video.url}" type="${video.mimeType ?? 'video/mp4'}" />${caption}</figure>`;
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
