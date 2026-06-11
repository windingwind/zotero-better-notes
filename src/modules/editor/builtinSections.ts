import { getNoteLinkSectionOptions } from "../workspace/link";
import { getNoteRelationSectionOptions } from "../workspace/relation";
import { registerEditorSection, unregisterEditorSection } from "./section";
import { getPref } from "../../utils/prefs";

const registeredPaneIDs: string[] = [];

export function registerBuiltinEditorSections() {
  if (!getPref("editor.paneNoteSection")) {
    return;
  }
  const sections = [
    getNoteLinkSectionOptions("inbound"),
    getNoteLinkSectionOptions("outbound"),
    getNoteRelationSectionOptions(),
  ];
  for (const options of sections) {
    const paneID = registerEditorSection({
      ...options,
      shouldMount: mountInItemPane,
    });
    if (paneID) {
      registeredPaneIDs.push(paneID);
    }
  }
}

export function unregisterBuiltinEditorSections() {
  while (registeredPaneIDs.length) {
    unregisterEditorSection(registeredPaneIDs.pop()!);
  }
}

/**
 * Only mount in the main window item pane note view
 */
function mountInItemPane(
  editor: Zotero.EditorInstance,
  host: HTMLElement,
): boolean {
  return (
    !editor._tabID &&
    !host.closest("bn-workspace") &&
    host.ownerGlobal?.ZoteroPane
  );
}
