import { Router } from 'express';
import { scoreMatch } from './services/scoreMatch.js';
import { searchCrossref } from './tools/crossref.js';
import { searchOpenAlex } from './tools/openalex.js';
import { searchSemanticScholar } from './tools/semanticscholar.js';
import { searchPubMed } from './tools/pubmed.js';
import { searchEuropePMC } from './tools/europepmc.js';
import { searchGoogleBooks } from './tools/googlebooks.js';
import { searchOpenLibrary } from './tools/openlibrary.js';
import { searchGoogleScholar } from './tools/googlescholar.js';
import { ParsedReference, ScoredMatch } from './types.js';
import { providerConfig } from './config/providers.js';

const router = Router();

router.get('/config', (req, res) => {
  // Return current server-level baseline, but UI will mostly use localStorage
  res.json(providerConfig);
});

const SEARCH_TIMEOUT_MS = 15000; // Increased to 15s for stability

router.post('/searchExternal', async (req, res) => {
  try {
    const { parsedReference, settings } = req.body;
    if (!parsedReference) {
      return res.status(400).json({ error: 'Invalid parsedReference' });
    }

    const parsed = parsedReference as ParsedReference;
    const enabledSources = settings?.enabledSources || {};
    const providerConfigs = settings?.providerConfigs || {};

    // Determine Route
    let route: 'book' | 'western_non_book' | 'non_western_non_book';
    if (parsed.type_hint === 'book') {
      route = 'book';
    } else if (parsed.language_hint === 'western') {
      route = 'western_non_book';
    } else {
      route = 'non_western_non_book';
    }

    let bestScoredMatch: ScoredMatch = scoreMatch(parsed, null);

    const runSearch = async (searchFn: Function, name: string, ...args: any[]) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
        
        const candidate = await searchFn(parsed, ...args, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (candidate) {
          return scoreMatch(parsed, candidate);
        }
      } catch (error: any) {
        console.error(`[${name}] Search error for "${parsed.title}":`, error.message);
      }
      return null;
    };

    if (route === 'western_non_book') {
      // Order: Crossref, OpenAlex, Semantic Scholar, PubMed, Europe PMC
      const providers = [
        { id: 'crossref', name: 'Crossref', fn: searchCrossref, args: [providerConfigs.crossref || {}] },
        { id: 'openalex', name: 'OpenAlex', fn: searchOpenAlex, args: [providerConfigs.openalex?.apiKey] },
        { id: 'semanticScholar', name: 'Semantic Scholar', fn: searchSemanticScholar, args: [providerConfigs.semanticScholar?.apiKey] },
        { id: 'pubmed', name: 'PubMed', fn: searchPubMed, args: [] },
        { id: 'europepmc', name: 'Europe PMC', fn: searchEuropePMC, args: [] },
      ];

      for (const p of providers) {
        if (!enabledSources[p.id]) continue;
        
        const match = await runSearch(p.fn, p.name, ...p.args);
        if (match) {
          if (!bestScoredMatch.bestCandidate || match.score > bestScoredMatch.score) {
            bestScoredMatch = match;
          }
          if (bestScoredMatch.category === 'confirmed') break;
        }
      }
    } else if (route === 'book') {
      // Order: Google Books, Open Library
      const providers = [
        { id: 'googlebooks', name: 'Google Books', fn: searchGoogleBooks, args: [providerConfigs.googlebooks?.apiKey] },
        { id: 'openlibrary', name: 'Open Library', fn: searchOpenLibrary, args: [] },
      ];

      for (const p of providers) {
        if (!enabledSources[p.id]) continue;

        const match = await runSearch(p.fn, p.name, ...p.args);
        if (match) {
          if (!bestScoredMatch.bestCandidate || match.score > bestScoredMatch.score) {
            bestScoredMatch = match;
          }
          if (bestScoredMatch.category === 'confirmed') break;
        }
      }
    } else {
      // non_western_non_book: Google Scholar only
      if (enabledSources.googlescholar) {
        const gsResult = await searchGoogleScholar(parsed);
        bestScoredMatch.googleScholar = gsResult;
        
        // Even if non-API, we might still have a "confirmed" level of confidence if exact match
        if (gsResult.classification === 'exact_title_match') {
          bestScoredMatch.category = 'confirmed';
          bestScoredMatch.score = 90; // Signal high confidence
        } else if (gsResult.classification === 'similar_title_match') {
          bestScoredMatch.category = 'likely_exists_but_citation_incorrect';
          bestScoredMatch.score = 60;
        }
      }
    }

    res.json(bestScoredMatch);
  } catch (error: any) {
    console.error('Search external error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
