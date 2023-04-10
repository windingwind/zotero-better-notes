import ZoteroToolkit from "zotero-plugin-toolkit/dist/index";
import {
  ColumnOptions,
  VirtualizedTableHelper,
} from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import hooks from "./hooks";
import api from "./api";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    // ztoolkit: MyToolkit;
    ztoolkit: ZoteroToolkit;
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
      noteId?: number;
      lineIndex?: number;
    };
    prompt?: Prompt;
  } = {
    alive: true,
    env: __env__,
    // ztoolkit: new MyToolkit(),
    ztoolkit: new ZoteroToolkit(),
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
    templatePicker: {},
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

import { BasicTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { getPref, setPref } from "./utils/prefs";
import { OutlineType } from "./utils/workspace";
import { Prompt } from "zotero-plugin-toolkit/dist/managers/prompt";

export class MyToolkit extends BasicTool {
  UI: UITool;
  PreferencePane: PreferencePaneManager;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.PreferencePane = new PreferencePaneManager(this);
  }

  unregisterAll() {
    unregister(this);
  }
}

export default Addon;
