export const TAB_TYPE = "note";

export async function scrollTabEditorTo(
  editor: Zotero.EditorInstance | null | undefined,
  options: {
    lineIndex?: number;
    sectionName?: string;
  } = {},
) {
  if (
    !editor ||
    (typeof options.lineIndex !== "number" &&
      typeof options.sectionName !== "string")
  ) {
    return;
  }
  // Zotero.Notes.open already awaits the editor's init promise before
  // resolving, but await it again defensively before scrolling.
  await editor._initPromise;
  if (typeof options.lineIndex === "number") {
    addon.api.editor.scroll(editor, options.lineIndex);
  }
  if (typeof options.sectionName === "string") {
    addon.api.editor.scrollToSection(editor, options.sectionName);
  }
}
