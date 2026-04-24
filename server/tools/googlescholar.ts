import * as cheerio from 'cheerio';
import { ParsedReference, GoogleScholarResult } from '../types.js';

/**
 * Normalize a title string for comparison purposes.
 * Handles punctuation differences, Unicode compatibility forms (NFKC),
 * and common Chinese variants to reduce false mismatches.
 */
function normalizeTitleForComparison(title: string): string {
  if (!title) return '';

  // 1. Apply Unicode normalization (NFKC)
  // This handles compatibility forms (e.g., 數 -> 數)
  let normalized = title.normalize('NFKC');

  // 2. Curated Chinese variant mapping to canonical comparison forms
  const variantMap: Record<string, string> = {
    '臺': '台',
    '裏': '裡',
    '爲': '為',
    '平臺': '平台',
  };
  
  for (const [variant, canonical] of Object.entries(variantMap)) {
    normalized = normalized.split(variant).join(canonical);
  }

  // 3. Remove punctuation and special characters (Latin, CJK, full-width, half-width)
  // 4. Remove all whitespace differences
  // 5. Convert Latin letters to lowercase
  return normalized
    .replace(/[\s\p{P}\p{S}]/gu, '') // \p{P} is punctuation, \p{S} is symbols
    .toLowerCase();
}

export async function searchGoogleScholar(parsed: ParsedReference, options: { signal?: AbortSignal } = {}): Promise<GoogleScholarResult> {
  const query = `${parsed.title} ${parsed.authors[0] || ''}`.trim();
  const searchUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
  
  const result: GoogleScholarResult = {
    searchUrl,
    candidates: [],
    classification: 'no_similar_result',
    status: 'success'
  };

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: options.signal
    });

    if (!response.ok) {
      result.status = 'fetch_failed';
      return result;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const candidates: any[] = [];
    $('.gs_ri').slice(0, 3).each((_, el) => {
      const titleEl = $(el).find('.gs_rt a');
      const title = titleEl.text().replace(/\[[A-Z]+\]/, '').trim();
      const link = titleEl.attr('href') || '';
      const snippet = $(el).find('.gs_rs').text().trim();
      
      if (title) {
        candidates.push({ title, link, snippet });
      }
    });

    result.candidates = candidates;

    if (candidates.length > 0 && parsed.title) {
      // Normalize both titles before comparison
      const normalizedParsedTitle = normalizeTitleForComparison(parsed.title);
      
      // If the title becomes empty after normalization, we skip exact matching
      if (!normalizedParsedTitle) {
        return result;
      }

      let bestMatch: 'exact' | 'similar' | 'none' = 'none';

      for (const cand of candidates) {
        const normalizedCandTitle = normalizeTitleForComparison(cand.title);
        
        // Exact comparison using normalized strings
        if (normalizedCandTitle === normalizedParsedTitle) {
          bestMatch = 'exact';
          break;
        }
        
        // Similar match fallback: existing overlap/truncation logic on normalized strings
        if (normalizedCandTitle.length > 0) {
          if (normalizedCandTitle.includes(normalizedParsedTitle) || normalizedParsedTitle.includes(normalizedCandTitle)) {
            bestMatch = 'similar';
          }
        }
      }

      if (bestMatch === 'exact') result.classification = 'exact_title_match';
      else if (bestMatch === 'similar') result.classification = 'similar_title_match';
    }

    return result;
  } catch (error) {
    console.error('Google Scholar search error:', error);
    result.status = 'fetch_failed';
    return result;
  }
}
