/**
 * Async Search Engine - Non-blocking search for note content
 * Future: Can be upgraded to Web Worker
 */

import type { SearchOptions, SearchResult } from './types';

export class AsyncSearchEngine {
  /**
   * Async search (using setTimeout to simulate non-blocking)
   */
  async searchAsync(content: string, options: SearchOptions): Promise<SearchResult[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const results = this.searchSync(content, options);
        resolve(results);
      }, 0);
    });
  }

  /**
   * Synchronous search logic
   */
  private searchSync(content: string, options: SearchOptions): SearchResult[] {
    const { query, caseSensitive = false, useRegex = false } = options;
    const results: SearchResult[] = [];

    // Strip HTML tags, extract plain text
    const text = this.stripHtml(content);
    const lines = text.split('\n');

    try {
      const pattern = useRegex
        ? new RegExp(query, caseSensitive ? 'g' : 'gi')
        : new RegExp(this.escapeRegex(query), caseSensitive ? 'g' : 'gi');

      lines.forEach((line, index) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          results.push({
            lineNumber: index + 1,
            text: line,
            matchIndex: match.index,
            matchLength: match[0].length
          });
        }
      });
    } catch (error) {
      ztoolkit.log('[CustomSearch] Search error:', error);
    }

    return results;
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').trim();
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
