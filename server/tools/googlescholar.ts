import * as cheerio from 'cheerio';
import { ParsedReference, GoogleScholarResult } from '../types.js';

function normalizeTitle(title: string): string {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes Traditional to Simplified Chinese (Basic implementation)
 * Note: A full implementation would require a dedicated library.
 * This is a lightweight version for common punctuation and minor variants.
 */
function normalizeChinese(text: string): string {
  // Simple mapping for demonstration or very basic cases
  // In a real app, use opencc-js or similar if full precision is needed
  return text.replace(/（/g, '(').replace(/）/g, ')').replace(/：/g, ':').replace(/、/g, ',');
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
      const normalizedParsedTitle = normalizeTitle(normalizeChinese(parsed.title));
      
      let bestMatch: 'exact' | 'similar' | 'none' = 'none';

      for (const cand of candidates) {
        const normalizedCandTitle = normalizeTitle(normalizeChinese(cand.title));
        
        if (normalizedCandTitle === normalizedParsedTitle) {
          bestMatch = 'exact';
          break;
        }
        
        // Similar match: High overlap (e.g. 80% chars match or one contains the other)
        if (normalizedCandTitle.includes(normalizedParsedTitle) || normalizedParsedTitle.includes(normalizedCandTitle)) {
          bestMatch = 'similar';
        } else {
          // Check for long shared substrings or Jaro-Winkler equivalents could go here
          // For now, simple inclusion is "similar" as per instructions
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
