import { getNoteLinkParams } from "../utils/link";

export function registerNoteLinkProxyHandler() {
  const openNoteExtension = {
    noContent: true,
    doAction: async (uri: any) => {
      const linkParams = getNoteLinkParams(uri.spec);
      if (linkParams.noteItem) {
        addon.hooks.onOpenNote(linkParams.noteItem.id, "auto", {
          lineIndex: linkParams.lineIndex || undefined,
        });
      }
    },
    newChannel: function (uri: any) {
      this.doAction(uri);
    },
  };
  Services.io.getProtocolHandler("zotero").wrappedJSObject._extensions[
    "zotero://note"
  ] = openNoteExtension;
}
