import { VirtualizedTableHelper } from "zotero-plugin-toolkit";
import { LargePrefHelper } from "zotero-plugin-toolkit";

import { SyncDataType } from "./modules/sync/managerWindow";
import hooks from "./hooks";
import api from "./api";
import { createZToolkit } from "./utils/ztoolkit";
import { MessageHelper } from "zotero-plugin-toolkit/dist/helpers/message";
import type { handlers as parsingHandlers } from "./extras/parsingWorker";
import type { handlers as relationHandlers } from "./extras/relationWorker";

class Addon {
  public data: {
    uid: string;
    alive: boolean;
    env: "development" | "production" | "test";
    ztoolkit: ZToolkit;
    // ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
    };
    export: {
      pdf: { promise?: _ZoteroTypes.PromiseObject };
    };
    sync: {
      data?: LargePrefHelper;
      lock: boolean;
      manager: {
        window?: Window;
        tableHelper?: VirtualizedTableHelper;
        data: SyncDataType[];
        columnIndex: number;
        columnAscending: boolean;
      };
      diff: {
        window?: Window;
      };
    };
    notify: Array<Parameters<_ZoteroTypes.Notifier.Notify>>;
    workspace: {
      instances: Record<string, WeakRef<HTMLElement>>;
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
    template: {
      data?: LargePrefHelper;
      editor: {
        window?: Window;
        tableHelper?: VirtualizedTableHelper;
        editor?: any;
        monaco?: any;
        templates: string[];
      };
      picker: {
        mode: "insert" | "create" | "export";
        data: Record<string, any>;
      };
    };
    relation: {
      worker?: Worker;
      server?: MessageHelper<typeof relationHandlers>;
    };
    parsing: {
      server?: MessageHelper<typeof parsingHandlers>;
    };
    imageCache: Record<number, string>;
    hint: {
      silent: boolean;
    };
  } = {
    uid: Zotero.Utilities.randomString(8),
    alive: true,
    env: __env__,
    ztoolkit: createZToolkit(),
    // ztoolkit: new ZoteroToolkit(),
    export: {
      pdf: { promise: undefined },
    },
    sync: {
      lock: false,
      manager: {
        data: [],
        columnAscending: true,
        columnIndex: 0,
      },
      diff: {},
    },
    notify: [],
    workspace: {
      instances: {},
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
    template: {
      editor: {
        window: undefined,
        tableHelper: undefined,
        templates: [],
      },
      picker: {
        mode: "insert",
        data: {},
      },
    },
    relation: {},
    parsing: {},
    imageCache: {},
    hint: {
      silent: false,
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

export default Addon;
