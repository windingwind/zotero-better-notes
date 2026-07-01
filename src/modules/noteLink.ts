import { getNoteLinkParams } from "../utils/link";

export function registerNoteLinkProxyHandler() {
  const openNoteExtension = {
    noContent: true,
    doAction: async (uri: any) => {
      const linkParams = getNoteLinkParams(uri.spec);
      if (linkParams.noteItem) {
        addon.hooks.onOpenNote(linkParams.noteItem.id, "auto", {
          lineIndex: linkParams.lineIndex,
          sectionName: linkParams.sectionName,
          // Without forceTakeover, onOpenNote early-returns via the plain
          // ZoteroPane.openNote and drops the navigation target (see #1596).
          forceTakeover: true,
        });
      }
    },
    newChannel: function (uri: any) {
      this.doAction(uri);
    },
  };
  // @ts-ignore
  Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
    "zotero://note"
  ] = openNoteExtension;
}
