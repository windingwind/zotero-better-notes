import {
  BasicTool,
  UITool,
  MenuManager,
  ClipboardHelper,
  FilePickerHelper,
  ProgressWindowHelper,
  VirtualizedTableHelper,
  DialogHelper,
  LargePrefHelper,
  GuideHelper,
  unregister,
} from "zotero-plugin-toolkit";
import { config } from "../../package.json";

export { createZToolkit };

function createZToolkit() {
  const _ztoolkit = new MyToolkit();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  // const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
  const env = __env__;
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = env === "development";
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = env === "development";
  _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
    env === "development";
  _ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );
}

class MyToolkit extends BasicTool {
  UI: UITool;
  Menu: MenuManager;
  Clipboard: typeof ClipboardHelper;
  FilePicker: typeof FilePickerHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  VirtualizedTable: typeof VirtualizedTableHelper;
  Dialog: typeof DialogHelper;
  LargePref: typeof LargePrefHelper;
  Guide: typeof GuideHelper;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.Menu = new MenuManager(this);
    this.Clipboard = ClipboardHelper;
    this.FilePicker = FilePickerHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.VirtualizedTable = VirtualizedTableHelper;
    this.Dialog = DialogHelper;
    this.LargePref = LargePrefHelper;
    this.Guide = GuideHelper;
  }

  unregisterAll() {
    unregister(this);
  }
}
