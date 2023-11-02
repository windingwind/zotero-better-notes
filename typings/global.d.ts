declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  window: Window;
  document: Document;
  OS: typeof OS;
  Blob: typeof Blob;
  ztoolkit: ZToolkit;
  addon: typeof addon;
};

declare interface Window {
  openDialog(
    url?: string | URL,
    target?: string,
    features?: string,
    ...args: any
  ): Window;
}

declare type ZToolkit = ReturnType<
  typeof import("../src/utils/ztoolkit").createZToolkit
>;

declare const ztoolkit: ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";

declare class Localization {}
