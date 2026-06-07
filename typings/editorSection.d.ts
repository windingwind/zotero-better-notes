/* eslint-disable @typescript-eslint/ban-types */

declare type EditorSectionOptions =
  _ZoteroTypes.ItemPaneManagerSection.ItemDetailsSectionOptions<string> & {
    /**
     * Whether this section should mount for a given editor. Return `false` to
     * skip (e.g. when another surface already shows it). Defaults to mounting in
     * every note editor.
     */
    shouldMount?: (editor: Zotero.EditorInstance, host: HTMLElement) => boolean;
  };
