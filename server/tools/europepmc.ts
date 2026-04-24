import { ParsedReference } from '../types.js';

export async function searchEuropePMC(parsed: ParsedReference, options: { signal?: AbortSignal } = {}) {
  try {
    const query = parsed.doi ? `DOI:${parsed.doi}` : `TITLE:"${parsed.title}" ${parsed.authors[0] || ''}`;
    const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&resultType=lite`;
    
    const res = await fetch(url, { signal: options.signal });
    if (!res.ok) return null;
    
    const data = await res.json();
    const result = data.resultList?.result?.[0];
    
    if (!result) return null;
    
    return {
      source: 'Europe PMC',
      title: result.title,
      authors: result.authorString?.split(', ') || [],
      year: result.pubYear ? parseInt(result.pubYear) : null,
      journal_or_book: result.journalTitle,
      doi: result.doi,
      url: `https://europepmc.org/article/MED/${result.pmid || result.id}`
    };
  } catch (error) {
    console.error('Europe PMC search error:', error);
    return null;
  }
}
