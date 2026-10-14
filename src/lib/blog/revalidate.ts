import { revalidatePath } from 'next/cache';

/** À appeler après toute modification d’un article, d’un média ou d’une taxonomie. */
export function revalidateBlogPages() {
  revalidatePath('/blog');
  revalidatePath('/blog/[slug]', 'page');
  revalidatePath('/admin', 'layout');
}
