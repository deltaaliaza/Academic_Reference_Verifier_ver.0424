import { ParsedReference } from '../types.js';

export async function searchOpenLibrary(parsed: ParsedReference, options: { signal?: AbortSignal } = {}) {
  try {
    const query = `title=${encodeURIComponent(parsed.title || '')}${parsed.authors[0] ? `&author=${encodeURIComponent(parsed.authors[0])}` : ''}`;
    const url = `https://openlibrary.org/search.json?${query}&limit=1`;
    
    const res = await fetch(url, { signal: options.signal });
    if (!res.ok) return null;
    
    const data = await res.json();
    const doc = data.docs?.[0];
    
    if (!doc) return null;
    
    return {
      source: 'Open Library',
      title: doc.title,
      authors: doc.author_name || [],
      year: doc.first_publish_year,
      publisher: doc.publisher?.[0],
      isbn: doc.isbn?.[0],
      url: `https://openlibrary.org${doc.key}`
    };
  } catch (error) {
    console.error('Open Library search error:', error);
    return null;
  }
}
