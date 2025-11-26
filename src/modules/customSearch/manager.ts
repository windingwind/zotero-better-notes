/**
 * Custom Search Manager for Better Notes
 * Provides toolbar button and keyboard shortcut for enhanced note search
 */

import { InlineFindbar } from './findbar';
import { getPref } from '../../utils/prefs';

export class CustomSearchManager {
  private findbarMap: WeakMap<Zotero.EditorInstance, InlineFindbar> = new WeakMap();

  constructor() {
    // Findbar instances are created per-editor
  }

  /**
   * Register search button in editor toolbar
   * Called by toolbar.ts for each editor instance
   */
  registerToolbarButton(editor: Zotero.EditorInstance, toolbar: HTMLDivElement): void {
    // Check if custom search is enabled
    if (!getPref("editor.customSearch")) {
      ztoolkit.log('[CustomSearch] Feature disabled in preferences');
      return;
    }

    const doc = editor._iframeWindow?.document;
    if (!doc) {
      ztoolkit.log('[CustomSearch] No iframe document');
      return;
    }

    // Create search button
    const searchBtn = doc.createElement('button');
    searchBtn.className = 'toolbar-button';
    searchBtn.title = 'Custom Search (Ctrl+Shift+F)';
    searchBtn.setAttribute('aria-label', 'Custom Search');
    searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
    </svg>`;
    
    searchBtn.addEventListener('click', () => {
      this.triggerSearch(editor);
    });

    // Insert into toolbar start area
    const toolbarStart = toolbar.querySelector('.start');
    if (toolbarStart) {
      toolbarStart.appendChild(searchBtn);
    }

    // Add keyboard shortcut
    this.addKeyboardShortcut(editor);
  }

  /**
   * Add Ctrl+Shift+F keyboard shortcut
   */
  private addKeyboardShortcut(editor: Zotero.EditorInstance): void {
    const doc = editor._iframeWindow?.document;
    if (!doc) return;

    doc.addEventListener('keydown', (event: KeyboardEvent) => {
      // Ctrl+Shift+F
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        this.triggerSearch(editor);
      }
    });

  }

  /**
   * Trigger inline findbar
   */
  private triggerSearch(editor: Zotero.EditorInstance): void {
    let findbar = this.findbarMap.get(editor);
    
    if (!findbar) {
      findbar = new InlineFindbar(editor);
      this.findbarMap.set(editor, findbar);
    }
    
    findbar.show();
  }
}
