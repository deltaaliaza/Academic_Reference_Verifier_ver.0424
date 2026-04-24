/**
 * Central configuration for external scholarly metadata providers.
 * Secrets are kept server-side and never exposed to the client.
 */

export const providerConfig = {
  crossref: {
    mailto: process.env.CROSSREF_MAILTO || '',
    get isConfigured() { return !!this.mailto; },
    isMandatory: false
  },
  openalex: {
    apiKey: process.env.OPENALEX_API_KEY || '',
    get isConfigured() { return !!this.apiKey; },
    isMandatory: false
  },
  semanticScholar: {
    apiKey: process.env.SEMANTIC_SCHOLAR_API_KEY || '',
    get isConfigured() { return !!this.apiKey; },
    isMandatory: true
  },
  pubmed: {
    isConfigured: true, // No key required for basic
    isMandatory: false
  },
  europepmc: {
    isConfigured: true, // No key required for basic
    isMandatory: false
  },
  googlebooks: {
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
    get isConfigured() { return !!this.apiKey; },
    isMandatory: false
  },
  openlibrary: {
    isConfigured: true, 
    isMandatory: false
  },
  googlescholar: {
    isConfigured: true, // It's scraping, no key
    isMandatory: false
  }
};
