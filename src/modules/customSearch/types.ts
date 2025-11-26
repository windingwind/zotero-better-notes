/**
 * Type definitions for custom search module
 */

export interface SearchResult {
  lineNumber: number;
  text: string;
  matchIndex: number;
  matchLength: number;
}

export interface SearchOptions {
  query: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
}
