/**
 * Search Result Dialog - Display search results and handle navigation
 */

import type { SearchResult } from './types';

export class SearchResultDialog {
  /**
   * Show search results in modal dialog
   * @param results Search results array
   * @param onNavigate Callback when user clicks a result
   */
  show(results: SearchResult[], onNavigate: (lineNumber: number) => void): void {
    ztoolkit.log('[CustomSearch] Showing results dialog:', results.length);

    const mainWindow = Zotero.getMainWindow() as any;
    const Services = mainWindow.Services;

    // Build HTML content
    const html = this.buildDialogHTML(results);

    // Create dialog
    const dialog = Services.prompt.confirmEx(
      mainWindow as any,
      'Search Results',
      `Found ${results.length} match(es). Click a result to navigate:\n\n${html}`,
      Services.prompt.BUTTON_TITLE_OK * Services.prompt.BUTTON_POS_0,
      null,
      null,
      null,
      null,
      {}
    );

    // Note: Native prompt dialog doesn't support HTML rendering
    // For better UX, consider using ztoolkit.UI dialog in future
    // Current implementation shows plain text list
  }

  /**
   * Build HTML markup for search results
   */
  private buildDialogHTML(results: SearchResult[]): string {
    return results.map((result, index) => {
      const { lineNumber, text, matchIndex, matchLength } = result;
      
      // Highlight matched text
      const before = text.substring(0, matchIndex);
      const match = text.substring(matchIndex, matchIndex + matchLength);
      const after = text.substring(matchIndex + matchLength);
      
      return `[${index + 1}] Line ${lineNumber}: ${before}**${match}**${after}`;
    }).join('\n');
  }
}
