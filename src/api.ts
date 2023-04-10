// workspace
import {
  getWorkspaceEditor,
  initWorkspace,
  toggleNotesPane,
  toggleOutlinePane,
  togglePreviewPane,
} from "./modules/workspace/content";

const workspace = {
  getWorkspaceEditor,
  initWorkspace,
  toggleNotesPane,
  toggleOutlinePane,
  togglePreviewPane,
};

// sync
import sync = require("./modules/sync/api");

// convert
import convert = require("./modules/convert/api");

// template
import { runTemplate, runItemTemplate } from "./modules/template/api";
import {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
} from "./modules/template/data";
import {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  initTemplates,
  removeTemplate,
} from "./modules/template/controller";
import { renderTemplatePreview } from "./modules/template/preview";
import {
  showTemplatePicker,
  updateTemplatePicker,
} from "./modules/template/picker";

const template = {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
  runTemplate,
  runItemTemplate,
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  initTemplates,
  removeTemplate,
  renderTemplatePreview,
  updateTemplatePicker,
};

// export
import { exportNotes } from "./modules/export/api";
import { saveMD, syncMDBatch } from "./modules/export/markdown";
import { saveDocx } from "./modules/export/docx";
import { saveFreeMind } from "./modules/export/freemind";

const _export = {
  exportNotes,
  saveMD,
  syncMDBatch,
  saveFreeMind,
  saveDocx,
  savePDF,
};

// import
import { fromMD } from "./modules/import/markdown";

const _import = {
  fromMD,
};

// window
import { showImageViewer } from "./modules/imageViewer";
import { showSyncInfo } from "./modules/sync/infoWindow";
import { showExportNoteOptions } from "./modules/export/exportWindow";
import { showTemplateEditor } from "./modules/template/editorWindow";
import { showSyncManager } from "./modules/sync/managerWindow";
import { showSyncDiff } from "./modules/sync/diffWindow";
import { savePDF } from "./modules/export/pdf";

const window = {
  showImageViewer,
  showExportNoteOptions,
  showSyncInfo,
  showSyncManager,
  showSyncDiff,
  showTemplateEditor,
  showTemplatePicker,
};

export default {
  workspace,
  _export,
  _import,
  window,
  sync,
  convert,
  template,
};
