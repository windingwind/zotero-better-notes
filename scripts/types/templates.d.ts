/**
 * Template-specific global variables for Better Notes templates
 * Based on the note template documentation
 */

// Shared environment variable for all templates
declare const _env: {
  /** True in preview mode (template editor), false during actual template execution */
  dryRun: boolean;
};

// === Item Template Variables ===

// Variables available in beforeloop stage
declare const items: Zotero.Item[];
declare const targetNoteItem: Zotero.Item | undefined;
declare const copyNoteImage: (noteItem: Zotero.Item) => void;
declare const sharedObj: Record<string, any>;

// Variables available in default stage (item loop)
declare const topItem: Zotero.Item;
declare const item: Zotero.Item;
/** @deprecated Use topItem instead */
declare const itemNotes: Zotero.Item[];

// Variables available in afterloop stage
// items, targetNoteItem, copyNoteImage, sharedObj (already declared above)

// === Text Template Variables ===
// targetNoteItem, sharedObj (already declared above)

// === Builtin Template Variables ===

// QuickInsertV3 template variables
declare const link: string;
declare const linkText: string;
declare const subNoteItem: Zotero.Item;
declare const noteItem: Zotero.Item;
declare const lineIndex: number;
declare const sectionName: string;

// QuickImportV2 template variables
// link, noteItem (already declared above)

// QuickNoteV5 template variables
declare const annotationItem: Zotero.Item;
// topItem, noteItem (already declared above)

// ExportMDFileNameV2 template variables
// noteItem (already declared above)

// ExportMDFileHeaderV2 template variables
// noteItem (already declared above)

// ExportMDFileContent template variables
declare const mdContent: string;
// noteItem (already declared above)

// ExportLatexFileContent template variables
declare const latexContent: string;
// noteItem (already declared above)
