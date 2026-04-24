# Academic Reference Verifier (Refactored)

A full-stack tool to verify academic references against multiple scholarly metadata sources.

## Key Features

- **Multi-Source Verification**: Supports Crossref, OpenAlex, Semantic Scholar, PubMed, Europe PMC, Google Books, Open Library, and Google Scholar.
- **Smart Routing**: automatically routes references to the most appropriate provider group:
  - **Western Non-Book**: Journals and conference papers in western languages.
  - **Non-Western Non-Book**: Journals and conference papers in non-western languages (powered by Google Scholar).
  - **Book**: Monographs and books globally.
- **AI-Powered Parsing**: One-pass extraction using Gemini to determine bibliographic metadata, language (`western` vs `non_western`), and type (`book` vs `journal_article`, etc.).
- **Google Scholar Integration**: Non-API scraping-based module for broad coverage, especially for non-western content.
- **Source Management**: Complete control over which providers are enabled and their respective configurations (stored in localStorage).
- **Sequential Execution & Early Exit**: Optimizes performance and rate limits by stopping search once a "Confirmed" match is found.

## Execution Order

### Western Non-Book
1. Crossref
2. OpenAlex
3. Semantic Scholar
4. NCBI / PubMed
5. Europe PMC

### Book
1. Google Books API
2. Open Library API

### Non-Western Non-Book
1. Google Scholar (Search URL + Scraping top 3 results)

## Parsing Schema

The single AI parsing step outputs:
```json
{
  "raw_reference": "string",
  "title": "string | null",
  "authors": ["string"],
  "year": number | null,
  "journal_or_book": "string | null",
  "volume": "string | null",
  "issue": "string | null",
  "pages": "string | null",
  "doi": "string | null",
  "url": "string | null",
  "type_hint": "journal_article | conference_paper | book | other | unknown",
  "language_hint": "western | non_western | unknown"
}
```

## Setup

1. **AI Configuration**: Configure your Gemini API key in the app settings ([Get Key](https://aistudio.google.com/app/api-keys)).
2. **Provider Settings**: Enable the desired sources in "Source Management".
3. **Environment**: (Optional) Set server-side defaults in `.env`.

## Failure & Fallback

- **Provider Failure**: If one provider fails or times out, the system automatically proceeds to the next eligible enabled provider in the same route.
- **Google Scholar Fallback**: If scraping fails, the system still provides a direct search link for manual verification.
- **Batch Resiliency**: A failure in one reference does not stop the processing of the remaining batch.
