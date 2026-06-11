declare interface MagicKeyCommandOptions {
  /**
   * Unique command ID. Use a prefix to avoid conflicts with other plugins,
   * e.g. `myPlugin.insertChart`.
   */
  id: string;
  /**
   * Title displayed in the command palette. Localize it before registering.
   */
  title: string;
  /**
   * HTML string of the icon displayed before the title.
   */
  icon?: string;
  /**
   * Strings the user input is matched against, e.g. `["ich", "insertChart"]`.
   * The first one is displayed as the command key. Defaults to `[id]`.
   */
  searchParts?: string[];
  /**
   * Called in the main context when the command is executed.
   */
  handler: (editor: Zotero.EditorInstance) => void | Promise<void>;
  /**
   * Whether the command is shown in the palette. Defaults to always shown.
   */
  enabled?: (editor: Zotero.EditorInstance) => boolean;
}
