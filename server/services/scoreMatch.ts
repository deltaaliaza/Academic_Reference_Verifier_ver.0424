import { ParsedReference, ScoredMatch } from '../types.js';
import stringSimilarity from 'string-similarity';

export function scoreMatch(parsed: ParsedReference, candidate: any | null): ScoredMatch {
  if (!candidate) {
    return {
      bestCandidate: null,
      category: 'not_verified',
      score: 0,
      matchedFields: [],
      mismatchedFields: ['No candidates found from external APIs']
    };
  }

  return evaluateCandidate(parsed, candidate);
}

function evaluateCandidate(parsed: ParsedReference, candidate: any): ScoredMatch {
  let score = 0;
  const matchedFields: string[] = [];
  const mismatchedFields: string[] = [];

  // DOI exact match is strongest
  if (parsed.doi && candidate.doi) {
    const cleanParsedDoi = parsed.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
    const cleanCandidateDoi = candidate.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
    
    if (cleanParsedDoi === cleanCandidateDoi) {
      score += 50;
      matchedFields.push('DOI');
    } else {
      mismatchedFields.push('DOI');
    }
  }

  // Title similarity
  if (parsed.title && candidate.title) {
    const similarity = stringSimilarity.compareTwoStrings(parsed.title.toLowerCase(), candidate.title.toLowerCase());
    if (similarity > 0.9) {
      score += 40;
      matchedFields.push('Title (Exact)');
    } else if (similarity > 0.7) {
      score += 20;
      matchedFields.push('Title (Similar)');
    } else {
      mismatchedFields.push('Title');
    }
  }

  // Year match
  if (parsed.year && candidate.year) {
    if (parsed.year === candidate.year) {
      score += 15;
      matchedFields.push('Year');
    } else if (Math.abs(parsed.year - candidate.year) <= 1) {
      score += 5;
      matchedFields.push('Year (Off by 1)');
    } else {
      mismatchedFields.push('Year');
    }
  }

  // Author match (basic check of first author or any author)
  if (parsed.authors && parsed.authors.length > 0 && candidate.authors && candidate.authors.length > 0) {
    const parsedFirstAuthor = parsed.authors[0].toLowerCase();
    const candidateAuthorsStr = candidate.authors.join(' ').toLowerCase();
    
    let lastNameMatch = '';
    if (parsedFirstAuthor.includes(',')) {
      // Format: "LastName, FirstName" or "LastName, F."
      lastNameMatch = parsedFirstAuthor.split(',')[0].trim();
    } else {
      // Format: "FirstName LastName" or "F. LastName"
      lastNameMatch = parsedFirstAuthor.split(' ').pop() || '';
    }

    // Clean up the last name to just alphanumeric characters for matching
    lastNameMatch = lastNameMatch.replace(/[^a-z0-9]/g, '');

    if (lastNameMatch && candidateAuthorsStr.includes(lastNameMatch)) {
      score += 15;
      matchedFields.push('Author');
    } else {
      mismatchedFields.push('Author');
    }
  }

  // Journal/Venue match
  if (parsed.journal_or_book && candidate.journal_or_book) {
    const similarity = stringSimilarity.compareTwoStrings(parsed.journal_or_book.toLowerCase(), candidate.journal_or_book.toLowerCase());
    if (similarity > 0.8) {
      score += 10;
      matchedFields.push('Journal/Venue');
    } else if (similarity > 0.5) {
      score += 5;
      matchedFields.push('Journal/Venue (Similar)');
    } else {
      mismatchedFields.push('Journal/Venue');
    }
  }

  let category: ScoredMatch['category'] = 'not_verified';
  if (score >= 80) {
    category = 'confirmed';
  } else if (score >= 50) {
    category = 'likely_exists_but_citation_incorrect';
  } else if (score >= 20) {
    category = 'possible_near_match';
  }

  return {
    bestCandidate: candidate,
    category,
    score,
    matchedFields,
    mismatchedFields
  };
}
