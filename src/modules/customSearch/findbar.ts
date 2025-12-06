/**
 * Inline Findbar - Native-like search UI embedded in editor
 * Features: Real-time search, highlight, prev/next navigation, replace
 */

export class InlineFindbar {
  private editor: Zotero.EditorInstance;
  private doc: Document;
  private findbar: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private replaceInput: HTMLInputElement | null = null;
  private replaceRow: HTMLDivElement | null = null;
  private statusSpan: HTMLSpanElement | null = null;
  
  // Store match positions without modifying DOM
  private matches: Array<{ node: Text; start: number; length: number }> = [];
  private currentIndex = -1;
  private searchQuery = '';
  private highlightOverlays: HTMLElement[] = [];
  private searchDebounceTimer: number | null = null;
  
  // Performance: Only render visible overlays + buffer zone
  private readonly MAX_OVERLAYS = 200; // Limit to prevent lag

  constructor(editor: Zotero.EditorInstance) {
    this.editor = editor;
    this.doc = editor._iframeWindow!.document;
  }

  /**
   * Toggle findbar visibility
   */
  show(): void {
    if (this.findbar) {
      // If already shown, hide it (toggle behavior)
      ztoolkit.log('[CustomSearch] Toggling findbar off');
      this.hide();
      return;
    }

    ztoolkit.log('[CustomSearch] Toggling findbar on');
    this.createFindbarUI();
    this.searchInput?.focus();
  }

  /**
   * Hide and remove findbar
   */
  hide(): void {
    this.clearHighlights();
    
    // Force repaint by triggering editor update
    const editorBody = this.doc.querySelector('.ProseMirror');
    if (editorBody) {
      // Trigger reflow
      void (editorBody as HTMLElement).offsetHeight;
    }
    
    this.findbar?.remove();
    this.findbar = null;
    this.searchQuery = '';
    this.matches = [];
    this.currentIndex = -1;
  }

  /**
   * Create findbar HTML structure
   */
  private createFindbarUI(): void {
    const editorBody = this.doc.querySelector('.primary-editor') || this.doc.body;
    
    // Create findbar container
    this.findbar = this.doc.createElement('div');
    this.findbar.className = 'custom-findbar';
    this.findbar.style.cssText = `
      position: sticky;
      top: 0;
      z-index: 99;
      display: grid;
      grid-template-columns: 1fr auto auto auto auto auto;
      grid-template-rows: auto auto;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background-color: #f0f0f0;
      border-bottom: 1px solid var(--material-border, #ddd);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
      font-size: 13px;
      width: 100%;
      box-sizing: border-box;
    `;

    // Search input
    this.searchInput = this.doc.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Find';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 4px 8px;
      border: 1px solid var(--material-border);
      border-radius: 3px;
      font-size: 13px;
    `;
    this.searchInput.addEventListener('input', () => this.onSearchInput());
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.shiftKey ? this.findPrevious() : this.findNext();
      } else if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Status (e.g., "2/5")
    this.statusSpan = this.doc.createElement('span');
    this.statusSpan.style.cssText = `
      color: var(--fill-secondary);
      font-size: 12px;
      min-width: 40px;
      flex-shrink: 0;
    `;

    // Previous button
    const prevBtn = this.createButton('Previous', `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor">
        <path d="M2.884 14 2 13.116l8-8 8 8-.884.884L10 6.884z"/>
      </svg>
    `);
    prevBtn.addEventListener('click', () => this.findPrevious());

    // Next button
    const nextBtn = this.createButton('Next', `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor">
        <path d="m17.116 6 .884.884-8 8-8-8L2.884 6 10 13.116z"/>
      </svg>
    `);
    nextBtn.addEventListener('click', () => this.findNext());

    // Replace checkbox
    const replaceCheckbox = this.doc.createElement('input');
    replaceCheckbox.type = 'checkbox';
    replaceCheckbox.id = 'custom-findbar-replace-toggle';
    replaceCheckbox.style.cssText = 'flex-shrink: 0;';
    const replaceLabel = this.doc.createElement('label');
    replaceLabel.htmlFor = 'custom-findbar-replace-toggle';
    replaceLabel.textContent = 'Replace';
    replaceLabel.style.cssText = 'cursor: pointer; user-select: none; white-space: nowrap; flex-shrink: 0; margin: 0 8px 0 4px;';
    replaceCheckbox.addEventListener('change', () => this.toggleReplaceUI());

    // Replace input (initially hidden)
    this.replaceInput = this.doc.createElement('input');
    this.replaceInput.type = 'text';
    this.replaceInput.placeholder = 'Replace';
    this.replaceInput.style.cssText = `
      flex: 1 1 auto;
      min-width: 0;
      padding: 4px 8px;
      border: 1px solid var(--material-border);
      border-radius: 3px;
      font-size: 13px;
    `;

    // Replace button
    const replaceBtn = this.createTextButton('Replace');
    replaceBtn.addEventListener('click', () => this.replaceOne());

    // Replace All button
    const replaceAllBtn = this.createTextButton('Replace All');
    replaceAllBtn.addEventListener('click', () => this.replaceAll());

    // Close button
    const closeBtn = this.createButton('Close', `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
      </svg>
    `);
    closeBtn.style.marginLeft = 'auto';
    closeBtn.addEventListener('click', () => this.hide());

    // Create replace row container
    this.replaceRow = this.doc.createElement('div');
    this.replaceRow.style.cssText = `
      grid-column: 1 / -1;
      display: none;
      gap: 8px;
      align-items: center;
    `;

    // Assemble UI
    this.findbar.appendChild(this.searchInput);
    this.findbar.appendChild(this.statusSpan);
    this.findbar.appendChild(prevBtn);
    this.findbar.appendChild(nextBtn);
    this.findbar.appendChild(replaceCheckbox);
    this.findbar.appendChild(replaceLabel);
    
    // Add replace elements to row container
    this.replaceRow.appendChild(this.replaceInput);
    this.replaceRow.appendChild(replaceBtn);
    this.replaceRow.appendChild(replaceAllBtn);
    this.findbar.appendChild(this.replaceRow);

    // Insert before editor body
    editorBody.parentElement?.insertBefore(this.findbar, editorBody);
    
    // Apply dark mode background if needed
    const isDarkMode = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')?.matches || false;
    if (isDarkMode) {
      if (this.findbar) {
        this.findbar.style.backgroundColor = '#2a2a2a';
        this.findbar.style.borderBottomColor = '#555';
      }
      if (this.replaceRow) {
        this.replaceRow.style.backgroundColor = '#2a2a2a';
      }
    }
  }

  /**
   * Create icon button
   */
  private createButton(title: string, svg: string): HTMLButtonElement {
    const btn = this.doc.createElement('button');
    btn.className = 'toolbar-button';
    btn.title = title;
    btn.innerHTML = svg;
    btn.style.cssText = `
      padding: 4px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 3px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    `;
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--fill-quinary)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
    return btn;
  }

  /**
   * Create text button
   */
  private createTextButton(text: string): HTMLButtonElement {
    const btn = this.doc.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 4px 12px;
      border: 1px solid var(--material-border);
      background: var(--material-background);
      cursor: pointer;
      border-radius: 3px;
      font-size: 12px;
      flex-shrink: 0;
    `;
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--fill-quinary)');
    btn.addEventListener('mouseleave', () => btn.style.background = 'var(--material-background)');
    return btn;
  }

  /**
   * Toggle replace UI visibility
   */
  private toggleReplaceUI(): void {
    const show = (this.findbar?.querySelector('#custom-findbar-replace-toggle') as HTMLInputElement)?.checked || false;
    
    // Show/hide the entire replace row (flex container)
    if (this.replaceRow) {
      this.replaceRow.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Handle search input change with debounce
   */
  private onSearchInput(): void {
    const newQuery = this.searchInput?.value || '';
    
    // Clear previous debounce timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    
    // Debounce search to avoid lag on fast typing
    this.searchDebounceTimer = setTimeout(() => {
      // Clear highlights if query changed
      if (newQuery !== this.searchQuery) {
            this.clearHighlights();
      }
      
      this.searchQuery = newQuery;
      
      if (this.searchQuery.length === 0) {
        this.updateStatus();
        return;
      }

      this.performSearch();
      this.searchDebounceTimer = null;
    }, 300) as unknown as number; // 300ms debounce
  }

  /**
   * Perform search and highlight matches
   * @param preserveIndex Whether to preserve current match index (for navigation)
   */
  private performSearch(preserveIndex = false): void {
    const savedIndex = this.currentIndex;
    
    this.clearHighlights();
    this.matches = [];
    this.currentIndex = -1;

    if (!this.searchQuery) {
      this.updateStatus();
      return;
    }

    const editorBody = this.doc.querySelector('.ProseMirror');
    if (!editorBody) return;

    // Use TreeWalker to find text nodes
    // NodeFilter.SHOW_TEXT = 4 (constant value)
    const walker = this.doc.createTreeWalker(
      editorBody,
      4, // NodeFilter.SHOW_TEXT
      null
    );

    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Search in each text node and store positions
    const regex = new RegExp(this.searchQuery, 'gi');
    textNodes.forEach((textNode) => {
      const text = textNode.textContent || '';
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        this.matches.push({
          node: textNode,
          start: match.index,
          length: match[0].length
        });
      }
    });

    // Create visual highlights (CSS overlays, not DOM modification)
    this.createHighlightOverlays();
    
    // Set current index
    if (this.matches.length > 0) {
      if (preserveIndex && savedIndex >= 0 && savedIndex < this.matches.length) {
        this.currentIndex = savedIndex;
      } else {
        this.currentIndex = 0;
      }
      this.scrollToMatch(this.currentIndex);
    }

    this.updateStatus();
  }

  /**
   * Create CSS overlay highlights (no DOM modification)
   */
  private createHighlightOverlays(): void {
    // Remove old overlays
    this.highlightOverlays.forEach(el => el.remove());
    this.highlightOverlays = [];
    
    const editorBody = this.doc.querySelector('.ProseMirror') as HTMLElement;
    if (!editorBody) {
      ztoolkit.log('[CustomSearch] ERROR: Cannot find .ProseMirror element');
      return;
    }
    
    // Create or get overlay container (outside ProseMirror to prevent clearing)
    let container = this.doc.getElementById('custom-search-overlay-container') as HTMLElement;
    if (!container) {
      container = this.doc.createElement('div');
      container.id = 'custom-search-overlay-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 10;
      `;
      
      // Insert container as sibling of editor (not child)
      const editorContainer = editorBody.parentElement;
      if (editorContainer) {
        editorContainer.style.position = 'relative'; // Ensure relative positioning
        editorContainer.appendChild(container);
          } else {
        ztoolkit.log('[CustomSearch] ERROR: Cannot find editor parent');
        return;
      }
    }
    
    // Performance: Only render visible overlays + buffer
    const renderStart = Math.max(0, this.currentIndex - 50);
    const renderEnd = Math.min(this.matches.length, this.currentIndex + 150);
    const matchesToRender = Math.min(this.MAX_OVERLAYS, renderEnd - renderStart);
    
    
    for (let index = renderStart; index < renderEnd && this.highlightOverlays.length < this.MAX_OVERLAYS; index++) {
      const match = this.matches[index];
      const { node, start, length } = match;
      
      // Create Range to get bounding rect
      const range = this.doc.createRange();
      try {
        range.setStart(node, start);
        range.setEnd(node, start + length);
        
        const rects = range.getClientRects();
        if (!rects || rects.length === 0) {
          continue;
        }
        
        const editorRect = editorBody.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Create overlay for each rect (handles multi-line matches)
        for (let i = 0; i < rects.length; i++) {
          const rect = rects[i];
          const overlay = this.doc.createElement('div');
          overlay.className = 'custom-search-overlay';
          overlay.dataset.matchIndex = String(index);
          overlay.style.cssText = `
            position: absolute;
            left: ${rect.left - containerRect.left + container.scrollLeft}px;
            top: ${rect.top - containerRect.top + container.scrollTop}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: yellow;
            opacity: 0.6;
            pointer-events: none;
            z-index: 1;
          `;
          
          container.appendChild(overlay);
          this.highlightOverlays.push(overlay);
          
          // Safety limit
          if (this.highlightOverlays.length >= this.MAX_OVERLAYS) {
            break;
          }
        }
      } catch (e) {
        }
    }
    
  }

  /**
   * Clear all highlight overlays
   */
  private clearHighlights(): void {
    
    this.highlightOverlays.forEach(el => el.remove());
    this.highlightOverlays = [];
    
    this.matches = [];
    this.currentIndex = -1;
    
  }

  /**
   * Find next match
   */
  private findNext(): void {
    if (this.matches.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.matches.length;
    
    // Re-perform search to rebuild highlights (ProseMirror clears manual DOM changes)
    this.performSearch(true); // Pass true to preserve currentIndex
  }

  /**
   * Find previous match
   */
  private findPrevious(): void {
    if (this.matches.length === 0) return;
    
    this.currentIndex = (this.currentIndex - 1 + this.matches.length) % this.matches.length;
    
    // Re-perform search to rebuild highlights
    this.performSearch(true); // Pass true to preserve currentIndex
  }

  /**
   * Scroll to specific match
   */
  private scrollToMatch(index: number): void {
    // Reset all overlays to yellow
    this.doc.querySelectorAll('.custom-search-overlay').forEach((el) => {
      (el as HTMLElement).style.background = 'yellow';
    });

    // Highlight current match in orange
    const currentOverlays = this.doc.querySelectorAll(`[data-match-index="${index}"]`);
    currentOverlays.forEach((el) => {
      (el as HTMLElement).style.background = 'orange';
    });
    
    // Scroll to match - use native scrollIntoView
    if (this.matches[index] && currentOverlays.length > 0) {
      const firstOverlay = currentOverlays[0] as HTMLElement;
      
      // Use smooth scrolling to first overlay of current match
      firstOverlay.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
      
    } else {
    }
  }

  /**
   * Update status text (e.g., "2/5")
   */
  private updateStatus(): void {
    if (!this.statusSpan) return;
    
    if (this.matches.length === 0) {
      this.statusSpan.textContent = this.searchQuery ? 'No results' : '';
    } else {
      this.statusSpan.textContent = `${this.currentIndex + 1}/${this.matches.length}`;
    }
  }

  /**
   * Replace current match
   */
  private replaceOne(): void {
    if (this.currentIndex < 0 || this.currentIndex >= this.matches.length) return;
    
    const replaceText = this.replaceInput?.value || '';
    const match = this.matches[this.currentIndex];
    
    if (match) {
      const { node, start, length } = match;
      const text = node.textContent || '';
      
      // Replace text in node
      node.textContent = text.substring(0, start) + replaceText + text.substring(start + length);
      
      // Re-search to update matches
      this.performSearch();
      
    }
  }

  /**
   * Replace all matches
   */
  private replaceAll(): void {
    const replaceText = this.replaceInput?.value || '';
    const count = this.matches.length;
    
    // Replace from end to start (avoid offset issues)
    for (let i = this.matches.length - 1; i >= 0; i--) {
      const { node, start, length } = this.matches[i];
      const text = node.textContent || '';
      node.textContent = text.substring(0, start) + replaceText + text.substring(start + length);
    }
    
    // Clear and re-search
    this.clearHighlights();
    this.matches = [];
    this.currentIndex = -1;
    this.updateStatus();
    
  }
}
