import { ParsedReference } from '../types.js';
import { providerConfig } from '../config/providers.js';
import { scoreMatch } from '../services/scoreMatch.js';

export async function searchSemanticScholar(parsed: ParsedReference, options?: { signal?: AbortSignal }): Promise<any | null> {
  if (!providerConfig.semanticScholar.isConfigured) {
    console.log('Semantic Scholar is not configured (missing SEMANTIC_SCHOLAR_API_KEY). Skipping.');
    return null;
  }

  const apiKey = providerConfig.semanticScholar.apiKey;
  
  try {
    let url = 'https://api.semanticscholar.org/graph/v1/paper/';
    const fields = 'title,authors,year,venue,url,externalIds';
    
    if (parsed.doi) {
      url += `DOI:${encodeURIComponent(parsed.doi)}?fields=${fields}`;
    } else if (parsed.title) {
      let searchUrl = `search?query=${encodeURIComponent(parsed.title)}&limit=5&fields=${fields}`;
      if (parsed.year) {
        searchUrl += `&year=${parsed.year}`;
      }
      url += searchUrl;
    } else {
      return null;
    }

    const headers: Record<string, string> = {
      'x-api-key': apiKey
    };

    let response = await fetch(url, { headers, signal: options?.signal });
    
    if (response.status === 429) {
      console.log('Semantic Scholar rate limited. Retrying after 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      response = await fetch(url, { headers, signal: options?.signal });
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (parsed.doi) {
      return mapSemanticScholarData(data);
    } else if (data.data && data.data.length > 0) {
      let bestCandidate = null;
      let highestScore = -1;

      for (const result of data.data) {
        const candidate = mapSemanticScholarData(result);
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
    console.error('Semantic Scholar search error:', error);
    return null;
  }
}

function mapSemanticScholarData(item: any) {
  return {
    source: 'Semantic Scholar',
    title: item.title,
    authors: item.authors ? item.authors.map((a: any) => a.name) : [],
    year: item.year,
    journal_or_book: item.venue,
    doi: item.externalIds ? item.externalIds.DOI : null,
    url: item.url,
    type: 'paper'
  };
}
