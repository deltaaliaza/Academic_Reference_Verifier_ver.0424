import { ParsedReference } from '../types.js';

export async function searchGoogleBooks(parsed: ParsedReference, apiKey?: string, options: { signal?: AbortSignal } = {}) {
  try {
    const query = `intitle:"${parsed.title}"${parsed.authors[0] ? ` inauthor:"${parsed.authors[0]}"` : ''}`;
    let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
    if (apiKey) {
      url += `&key=${apiKey}`;
    }
    
    const res = await fetch(url, { signal: options.signal });
    if (!res.ok) return null;
    
    const data = await res.json();
    const item = data.items?.[0];
    
    if (!item) return null;
    
    const info = item.volumeInfo;
    return {
      source: 'Google Books',
      title: info.title,
      authors: info.authors || [],
      year: info.publishedDate ? parseInt(info.publishedDate.split('-')[0]) : null,
      publisher: info.publisher,
      isbn: info.industryIdentifiers?.find((i: any) => i.type === 'ISBN_13')?.identifier || info.industryIdentifiers?.[0]?.identifier,
      url: info.infoLink
    };
  } catch (error) {
    console.error('Google Books search error:', error);
    return null;
  }
}
