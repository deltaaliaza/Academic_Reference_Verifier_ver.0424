import { ParsedReference } from '../types.js';
import { providerConfig } from '../config/providers.js';
import { scoreMatch } from '../services/scoreMatch.js';

export async function searchCrossref(parsed: ParsedReference, options?: { signal?: AbortSignal }): Promise<any | null> {
  const mailto = providerConfig.crossref.mailto;

  try {
    let url = 'https://api.crossref.org/works?';
    const params = new URLSearchParams();
    
    if (parsed.doi) {
      url = `https://api.crossref.org/works/${encodeURIComponent(parsed.doi)}`;
    } else if (parsed.title) {
      params.append('query.title', parsed.title);
      if (parsed.authors && parsed.authors.length > 0) {
        params.append('query.author', parsed.authors[0]);
      }
      if (parsed.journal_or_book) {
        params.append('query.container-title', parsed.journal_or_book);
      }
      params.append('rows', '5');
      params.append('select', 'DOI,URL,title,author,issued,container-title,type');
      url += params.toString();
    } else {
      return null;
    }

    const headers: Record<string, string> = {
      'User-Agent': `AcademicReferenceVerifier/1.0 (mailto:${mailto})`
    };

    const response = await fetch(url, { headers, signal: options?.signal });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (parsed.doi) {
      return mapCrossrefData(data.message);
    } else if (data.message.items && data.message.items.length > 0) {
      let bestCandidate = null;
      let highestScore = -1;

      for (const result of data.message.items) {
        const candidate = mapCrossrefData(result);
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
    console.error('Crossref search error:', error);
    return null;
  }
}

function mapCrossrefData(item: any) {
  return {
    source: 'Crossref',
    title: item.title ? item.title[0] : null,
    authors: item.author ? item.author.map((a: any) => `${a.given} ${a.family}`) : [],
    year: item.issued && item.issued['date-parts'] ? item.issued['date-parts'][0][0] : null,
    journal_or_book: item['container-title'] ? item['container-title'][0] : null,
    doi: item.DOI,
    url: item.URL,
    type: item.type
  };
}
