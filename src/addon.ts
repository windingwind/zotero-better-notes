import {
  Prompt,
} from "zotero-plugin-toolkit/dist/managers/prompt";
import {
  ColumnOptions,
  VirtualizedTableHelper,
} from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import ToolkitGlobal from "zotero-plugin-toolkit/dist/managers/toolkitGlobal";

import { getPref, setPref } from "./utils/prefs";
import { OutlineType } from "./utils/workspace";
import hooks from "./hooks";
import api from "./api";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    // ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
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
      editor?: any;
      templates: { name: string }[];
    };
    templatePicker: {
      mode: "insert" | "create" | "export";
      data: Record<string, any>;
    };
    readonly prompt?: Prompt;
  } = {
    alive: true,
    env: __env__,
    ztoolkit: createZToolkit(),
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
        const recentMainNoteIds = getPref("recentMainNoteIds") as string;
        const recentMainNoteIdsArr = recentMainNoteIds
          ? recentMainNoteIds.split(",").map((id) => parseInt(id))
          : [];
        const idx = recentMainNoteIdsArr.indexOf(id);
        if (idx !== -1) {
          recentMainNoteIdsArr.splice(idx, 1);
        }
        recentMainNoteIdsArr.unshift(id);
        setPref(
          "recentMainNoteIds",
          recentMainNoteIdsArr
            .slice(0, 10)
            .filter((id) => Zotero.Items.get(id).isNote())
            .join(","),
        );
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
    get prompt() {
      return ToolkitGlobal.getInstance().prompt.instance;
    }
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

export default Addon;
