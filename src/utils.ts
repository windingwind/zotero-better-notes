/*
 * This file contains definitions of commonly used structures.
 */

class EditorMessage {
  public type: string;
  public content: {
    event?: XUL.XULEvent;
    editorInstance?: Zotero.EditorInstance;
    params?: any;
  };
  constructor(type: string, content: object) {
    this.type = type;
    this.content = content;
  }
}

enum OutlineType {
  treeView = 1,
  mindMap,
  bubbleMap,
}

class NoteTemplate {
  name: string;
  disabled: boolean;
  text?: string;
}

class CopyHelper {
  transferable: any;
  clipboardService: any;

  constructor() {
    this.transferable = Components.classes[
      "@mozilla.org/widget/transferable;1"
    ].createInstance(Components.interfaces.nsITransferable);
    this.clipboardService = Components.classes[
      "@mozilla.org/widget/clipboard;1"
    ].getService(Components.interfaces.nsIClipboard);
  }

  public addText(source: string, type: "text/html" | "text/unicode") {
    const str = Components.classes[
      "@mozilla.org/supports-string;1"
    ].createInstance(Components.interfaces.nsISupportsString);
    str.data = source;
    this.transferable.addDataFlavor(type);
    this.transferable.setTransferData(type, str, source.length * 2);
    return this;
  }

  public addImage(source: string) {
    const io = Components.classes[
      "@mozilla.org/network/io-service;1"
    ].getService(Components.interfaces.nsIIOService);
    const channel = io.newChannel(source, null, null);
    const input = channel.open();
    const imgTools = Components.classes[
      "@mozilla.org/image/tools;1"
    ].getService(Components.interfaces.imgITools);

    const buffer = NetUtil.readInputStreamToString(input, input.available());
    const container = imgTools.decodeImageFromBuffer(
      buffer,
      buffer.length,
      channel.contentType
    );

    this.transferable.addDataFlavor(channel.contentType);
    this.transferable.setTransferData(channel.contentType, container, -1);
    return this;
  }

  public copy() {
    this.clipboardService.setData(
      this.transferable,
      null,
      Components.interfaces.nsIClipboard.kGlobalClipboard
    );
  }
}

async function pick(
  title: string,
  mode: "open" | "save" | "folder",
  filters?: [string, string][],
  suggestion?: string
): Promise<string> {
  const fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(
    Components.interfaces.nsIFilePicker
  );

  if (suggestion) fp.defaultString = suggestion;

  mode = {
    open: Components.interfaces.nsIFilePicker.modeOpen,
    save: Components.interfaces.nsIFilePicker.modeSave,
    folder: Components.interfaces.nsIFilePicker.modeGetFolder,
  }[mode];

  fp.init(window, title, mode);

  for (const [label, ext] of filters || []) {
    fp.appendFilter(label, ext);
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return new Zotero.Promise((resolve) => {
    fp.open((userChoice) => {
      switch (userChoice) {
        case Components.interfaces.nsIFilePicker.returnOK:
        case Components.interfaces.nsIFilePicker.returnReplace:
          resolve(fp.file.path);
          break;

        default: // aka returnCancel
          resolve("");
          break;
      }
    });
  });
}
export { EditorMessage, OutlineType, NoteTemplate, CopyHelper, pick };
