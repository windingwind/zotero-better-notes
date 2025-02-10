import {
  md2note,
  note2md,
  note2noteDiff,
  note2link,
  link2note,
  link2html,
  md2html,
  html2md,
  annotations2html,
  note2html,
  link2params,
  note2latex,
} from "./utils/convert";
import { exportNotes } from "./modules/export/api";
import { saveDocx } from "./modules/export/docx";
import { saveFreeMind } from "./modules/export/freemind";
import { saveMD, syncMDBatch } from "./modules/export/markdown";
import { savePDF } from "./modules/export/pdf";
import { saveLatex } from "./modules/export/latex";
import { fromMD } from "./modules/import/markdown";
import {
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
  removeSyncNote,
  getSyncStatus,
  getNoteStatus,
  getMDStatus,
  getMDStatusFromContent,
  getMDFileName,
  findAllSyncedFiles,
} from "./modules/sync/api";
import {
  runTemplate,
  runTextTemplate,
  runItemTemplate,
  runQuickInsertTemplate,
} from "./modules/template/api";
import {
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
} from "./modules/template/controller";
import {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
} from "./modules/template/data";
import { renderTemplatePreview } from "./modules/template/preview";
import { parseCitationHTML } from "./utils/citation";
import {
  getEditorInstance,
  insert,
  del,
  scroll,
  scrollToSection,
  getTextBetweenLines,
  getLineAtCursor,
  getSectionAtCursor,
  getPositionAtLine,
  getTextBetween,
  getRangeAtCursor,
  move,
  replace,
  moveHeading,
  updateHeadingTextAtLine,
  getLineCount,
} from "./utils/editor";
import {
  addLineToNote,
  getNoteTree,
  getNoteTreeFlattened,
  getNoteTreeNodeById,
  getLinesInNote,
} from "./utils/note";
import {
  getAnnotationByLinkTarget,
  getLinkTargetByAnnotation,
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  linkAnnotationToTarget,
  updateNoteLinkRelation,
} from "./utils/relation";
import { getWorkspaceByTabID, getWorkspaceByUID } from "./utils/workspace";
import { getString } from "./utils/locale";
import { showRestartHint } from "./utils/hint";

const workspace = {
  getWorkspaceByTabID,
  getWorkspaceByUID,
};

const sync = {
  isSyncNote,
  getSyncNoteIds,
  addSyncNote,
  updateSyncStatus,
  removeSyncNote,
  getSyncStatus,
  getNoteStatus,
  getMDStatus,
  getMDStatusFromContent,
  getMDFileName,
  findAllSyncedFiles,
};

const convert = {
  md2note,
  note2md,
  note2noteDiff,
  note2link,
  link2note,
  link2params,
  link2html,
  md2html,
  html2md,
  annotations2html,
  note2html,
  item2citation: parseCitationHTML,
  note2latex,
};

const template = {
  SYSTEM_TEMPLATE_NAMES,
  DEFAULT_TEMPLATES,
  runTemplate,
  runTextTemplate,
  runItemTemplate,
  runQuickInsertTemplate,
  getTemplateKeys,
  getTemplateText,
  setTemplate,
  removeTemplate,
  renderTemplatePreview,
};

const $export = {
  exportNotes,
  saveMD,
  syncMDBatch,
  saveFreeMind,
  saveDocx,
  savePDF,
  saveLatex,
};

const $import = {
  fromMD,
};

const editor = {
  getEditorInstance,
  insert,
  del,
  move,
  replace,
  scroll,
  scrollToSection,
  getRangeAtCursor,
  getLineAtCursor,
  getSectionAtCursor,
  getPositionAtLine,
  getLineCount,
  getTextBetween,
  getTextBetweenLines,
  moveHeading,
  updateHeadingTextAtLine,
};

const note = {
  insert: addLineToNote,
  getLinesInNote,
  getNoteTree,
  getNoteTreeFlattened,
  getNoteTreeNodeById,
};

const relation = {
  getNoteLinkInboundRelation,
  getNoteLinkOutboundRelation,
  updateNoteLinkRelation,
  linkAnnotationToTarget,
  getLinkTargetByAnnotation,
  getAnnotationByLinkTarget,
};

const utils = {
  getString,
  requireRestart: showRestartHint,
};

export default {
  workspace,
  sync,
  convert,
  template,
  $export,
  $import,
  editor,
  note,
  relation,
  utils,
};
