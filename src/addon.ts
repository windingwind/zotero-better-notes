import { BasicTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { LibraryTabPanelManager } from "zotero-plugin-toolkit/dist/managers/libraryTabPanel";
import {
  Prompt,
  PromptManager,
} from "zotero-plugin-toolkit/dist/managers/prompt";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { ReaderInstanceManager } from "zotero-plugin-toolkit/dist/managers/readerInstance";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { FilePickerHelper } from "zotero-plugin-toolkit/dist/helpers/filePicker";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import {
  ColumnOptions,
  VirtualizedTableHelper,
} from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";

import { getPref, setPref } from "./utils/prefs";
import { OutlineType } from "./utils/workspace";
import hooks from "./hooks";
import api from "./api";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: MyToolkit;
    // ztoolkit: ZoteroToolkit;
    locale?: {
      stringBundle: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    export: {
      pdf: { promise?: _ZoteroTypes.PromiseObject };
      docx: { worker?: HTMLIFrameElement };
    };
    sync: {
      lock: boolean;
      manager: {
        window?: Window;
        tableHelper?: VirtualizedTableHelper;
        data: {
          noteId: number;
          noteName: string;
          lastSync: string;
          filePath: string;
        }[];
      };
      diff: {
        window?: Window;
      };
    };
    notify: Array<Parameters<_ZoteroTypes.Notifier.Notify>>;
    workspace: {
      mainId: number;
      previewId: number;
      tab: {
        active: boolean;
        id?: string;
        container?: XUL.Box;
      };
      window: {
        active: boolean;
        window?: Window;
        container?: XUL.Box;
      };
      outline: OutlineType;
    };
    imageViewer: {
      window?: Window;
      srcList: string[];
      idx: number;
      scaling: number;
      title: string;
      pined: boolean;
      anchorPosition?: {
        left: number;
        top: number;
      };
    };
    templateEditor: {
      window?: Window;
      tableHelper?: VirtualizedTableHelper;
      templates: { name: string }[];
    };
    templatePicker: {
      mode: "insert" | "create" | "export";
      data: Record<string, any>;
    };
    prompt?: Prompt;
  } = {
    alive: true,
    env: __env__,
    ztoolkit: new MyToolkit(),
    // ztoolkit: new ZoteroToolkit(),
    export: {
      pdf: { promise: undefined },
      docx: { worker: undefined },
    },
    sync: {
      lock: false,
      manager: {
        data: [],
      },
      diff: {},
    },
    notify: [],
    workspace: {
      get mainId(): number {
        return parseInt(getPref("mainKnowledgeID") as string);
      },
      set mainId(id: number) {
        setPref("mainKnowledgeID", id);
      },
      previewId: -1,
      tab: {
        active: false,
      },
      window: {
        active: false,
      },
      outline: OutlineType.treeView,
    },
    imageViewer: {
      window: undefined,
      srcList: [],
      idx: -1,
      scaling: 1,
      title: "Note",
      pined: false,
      anchorPosition: undefined,
    },
    templateEditor: {
      window: undefined,
      tableHelper: undefined,
      templates: [],
    },
    templatePicker: {
      mode: "insert",
      data: {},
    },
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: typeof api;

  constructor() {
    this.hooks = hooks;
    this.api = api;
  }
}

/**
 * Alternatively, import toolkit modules you use to minify the plugin size.
 *
 * Steps to replace the default `ztoolkit: ZoteroToolkit` with your `ztoolkit: MyToolkit`:
 *
 * 1. Uncomment this file's line 30:            `ztoolkit: new MyToolkit(),`
 *    and comment line 31:                      `ztoolkit: new ZoteroToolkit(),`.
 * 2. Uncomment this file's line 10:            `ztoolkit: MyToolkit;` in this file
 *    and comment line 11:                      `ztoolkit: ZoteroToolkit;`.
 * 3. Uncomment `./typing/global.d.ts` line 12: `declare const ztoolkit: import("../src/addon").MyToolkit;`
 *    and comment line 13:                      `declare const ztoolkit: import("zotero-plugin-toolkit").ZoteroToolkit;`.
 *
 * You can now add the modules under the `MyToolkit` class.
 */

export class MyToolkit extends BasicTool {
  UI: UITool;
  Prompt: PromptManager;
  LibraryTabPanel: LibraryTabPanelManager;
  ReaderTabPanel: ReaderTabPanelManager;
  ReaderInstance: ReaderInstanceManager;
  Menu: MenuManager;
  PreferencePane: PreferencePaneManager;
  Clipboard: typeof ClipboardHelper;
  FilePicker: typeof FilePickerHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  VirtualizedTable: typeof VirtualizedTableHelper;
  Dialog: typeof DialogHelper;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.Prompt = new PromptManager(this);
    this.LibraryTabPanel = new LibraryTabPanelManager(this);
    this.ReaderTabPanel = new ReaderTabPanelManager(this);
    this.ReaderInstance = new ReaderInstanceManager(this);
    this.Menu = new MenuManager(this);
    this.PreferencePane = new PreferencePaneManager(this);
    this.Clipboard = ClipboardHelper;
    this.FilePicker = FilePickerHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.VirtualizedTable = VirtualizedTableHelper;
    this.Dialog = DialogHelper;
  }

  unregisterAll() {
    unregister(this);
  }
}

export default Addon;
