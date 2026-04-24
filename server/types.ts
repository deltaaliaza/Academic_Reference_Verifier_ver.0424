export interface ParsedReference {
  raw_reference: string;
  title: string | null;
  authors: string[];
  year: number | null;
  journal_or_book: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  type_hint: 'journal_article' | 'conference_paper' | 'book' | 'other' | 'unknown';
  language_hint: 'western' | 'non_western' | 'unknown';
}

export type ResultCategory = 'confirmed' | 'likely_exists_but_citation_incorrect' | 'possible_near_match' | 'not_verified';

export interface VerificationResult {
  rawInput: string;
  parsedMetadata: ParsedReference | null;
  bestCandidate: any | null;
  resultCategory: ResultCategory;
  confidenceScore: number;
  matchedFields: string[];
  mismatchedFields: string[];
  explanation: string;
  needsManualReview: boolean;
  googleScholar?: GoogleScholarResult;
}

export interface GoogleScholarResult {
  searchUrl: string;
  candidates: {
    title: string;
    link: string;
    snippet?: string;
  }[];
  classification: 'exact_title_match' | 'similar_title_match' | 'no_similar_result';
  status: 'success' | 'fetch_failed';
}

export interface ScoredMatch {
  bestCandidate: any | null;
  category: ResultCategory;
  score: number;
  matchedFields: string[];
  mismatchedFields: string[];
  googleScholar?: GoogleScholarResult;
}
