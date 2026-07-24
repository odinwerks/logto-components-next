/**
 * Converts a string into a URL-safe slug.
 * Shared utility to avoid duplication across server and client components.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
