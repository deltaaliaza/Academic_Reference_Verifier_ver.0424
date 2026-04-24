import { ParsedReference } from '../types.js';

export async function searchPubMed(parsed: ParsedReference, options: { signal?: AbortSignal } = {}) {
  try {
    const query = parsed.doi ? parsed.doi : `"${parsed.title}" ${parsed.authors[0] || ''}`;
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json`;
    
    const searchRes = await fetch(searchUrl, { signal: options.signal });
    if (!searchRes.ok) return null;
    
    const searchData = await searchRes.json();
    const id = searchData.esearchresult?.idlist?.[0];
    
    if (!id) return null;
    
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${id}&retmode=json`;
    const summaryRes = await fetch(summaryUrl, { signal: options.signal });
    if (!summaryRes.ok) return null;
    
    const summaryData = await summaryRes.json();
    const result = summaryData.result[id];
    
    if (!result) return null;
    
    return {
      source: 'PubMed',
      title: result.title,
      authors: result.authors?.map((a: any) => a.name) || [],
      year: result.pubdate ? parseInt(result.pubdate.split(' ')[0]) : null,
      journal_or_book: result.fulljournalname || result.source,
      volume: result.volume,
      issue: result.issue,
      pages: result.pages,
      doi: result.elocationid?.startsWith('doi: ') ? result.elocationid.replace('doi: ', '') : null,
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
    };
  } catch (error) {
    console.error('PubMed search error:', error);
    return null;
  }
}
