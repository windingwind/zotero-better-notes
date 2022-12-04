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
    this.transferable.init(null);
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
    let parts = source.split(",");
    if (!parts[0].includes("base64")) {
      return;
    }
    let mime = parts[0].match(/:(.*?);/)[1];
    let bstr = atob(parts[1]);
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    let imgTools = Components.classes["@mozilla.org/image/tools;1"].getService(
      Components.interfaces.imgITools
    );
    let imgPtr = Components.classes[
      "@mozilla.org/supports-interface-pointer;1"
    ].createInstance(Components.interfaces.nsISupportsInterfacePointer);
    imgPtr.data = imgTools.decodeImageFromArrayBuffer(u8arr.buffer, mime);
    this.transferable.addDataFlavor(mime);
    this.transferable.setTransferData(mime, imgPtr, 0);
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
  return new Promise((resolve) => {
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

enum SyncCode {
  UpToDate = 0,
  NoteAhead,
  MDAhead,
  NeedDiff,
}

enum NodeMode {
  default = 0,
  wrap,
  replace,
  direct,
}

function getDOMParser(): DOMParser {
  if (Zotero.platformMajorVersion > 60) {
    return new DOMParser();
  } else {
    return Components.classes[
      "@mozilla.org/xmlextras/domparser;1"
    ].createInstance(Components.interfaces.nsIDOMParser);
  }
}

export {
  EditorMessage,
  OutlineType,
  NoteTemplate,
  CopyHelper,
  pick,
  SyncCode,
  NodeMode,
  getDOMParser,
};
