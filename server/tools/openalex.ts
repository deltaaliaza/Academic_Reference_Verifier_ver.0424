import { ParsedReference } from '../types.js';
import { providerConfig } from '../config/providers.js';
import { scoreMatch } from '../services/scoreMatch.js';

export async function searchOpenAlex(parsed: ParsedReference, options?: { signal?: AbortSignal }): Promise<any | null> {
  const apiKey = providerConfig.openalex.apiKey;
  
  try {
    let url = 'https://api.openalex.org/works?';
    const params = new URLSearchParams();
    
    if (parsed.doi) {
      url = `https://api.openalex.org/works/doi:${encodeURIComponent(parsed.doi)}`;
    } else if (parsed.title) {
      // Remove colons and other special characters that might break OpenAlex filter syntax
      const safeTitle = parsed.title.replace(/[:|]/g, ' ').replace(/\s+/g, ' ').trim();
      params.append('filter', `title.search:${safeTitle}`);
      params.append('per-page', '5');
      params.append('select', 'id,doi,title,authorships,publication_year,primary_location,type');
      url += params.toString();
    } else {
      return null;
    }

    const headers: Record<string, string> = {};
    if (apiKey) {
      // OpenAlex doesn't strictly require the key in a header, it can be added to the URL,
      // but if we use a header or email, we can do it here.
      // For OpenAlex, adding email to polite pool is also an option, but we'll just use the key if provided.
      // Actually, OpenAlex uses `mailto` for polite pool, but we'll just pass the key if they provided one.
    }

    const response = await fetch(url, { headers, signal: options?.signal });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (parsed.doi) {
      return mapOpenAlexData(data);
    } else if (data.results && data.results.length > 0) {
      let bestCandidate = null;
      let highestScore = -1;

      for (const result of data.results) {
        const candidate = mapOpenAlexData(result);
        const scored = scoreMatch(parsed, candidate);
        if (scored.score > highestScore) {
          highestScore = scored.score;
          bestCandidate = candidate;
        }
      }

      return bestCandidate;
    }

    return null;
  } catch (error) {
    console.error('OpenAlex search error:', error);
    return null;
  }
}

function mapOpenAlexData(item: any) {
  return {
    source: 'OpenAlex',
    title: item.title,
    authors: item.authorships ? item.authorships.map((a: any) => a.author.display_name) : [],
    year: item.publication_year,
    journal_or_book: item.primary_location && item.primary_location.source ? item.primary_location.source.display_name : null,
    doi: item.doi ? item.doi.replace('https://doi.org/', '') : null,
    url: item.id,
    type: item.type
  };
}
