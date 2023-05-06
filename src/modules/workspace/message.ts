import {
  getEditorInstance,
  moveHeading,
  scroll,
  updateHeadingTextAtLine,
} from "../../utils/editor";
import { showHintWithLink } from "../../utils/hint";
import { getNoteLinkParams } from "../../utils/link";
import { getNoteTree, getNoteTreeNodeById } from "../../utils/note";
import { formatPath } from "../../utils/str";

export async function messageHandler(ev: MessageEvent) {
  switch (ev.data.type) {
    case "jumpNode": {
      const editor = addon.api.workspace.getWorkspaceEditor(
        ev.data.workspaceType,
        "main"
      );
      if (!editor) {
        return;
      }
      scroll(editor, ev.data.lineIndex);
      return;
    }
    case "openNote": {
      const linkParams = getNoteLinkParams(ev.data.link);
      if (!linkParams.noteItem) {
        return;
      }
      addon.hooks.onOpenNote(linkParams.noteItem.id, "preview", {
        lineIndex: linkParams.lineIndex || undefined,
      });
      return;
    }
    case "moveNode": {
      const noteItem = Zotero.Items.get(addon.data.workspace.mainId);
      let tree = getNoteTree(noteItem);
      let fromNode = getNoteTreeNodeById(noteItem, ev.data.fromID, tree);
      let toNode = getNoteTreeNodeById(noteItem, ev.data.toID, tree);
      moveHeading(
        getEditorInstance(noteItem.id),
        fromNode!,
        toNode!,
        ev.data.moveType
      );
      return;
    }
    case "editNode": {
      const editor = addon.api.workspace.getWorkspaceEditor(
        ev.data.workspaceType,
        "main"
      );
      if (!editor) {
        return;
      }
      updateHeadingTextAtLine(
        editor,
        ev.data.lineIndex,
        ev.data.text.replace(/[\r\n]/g, "")
      );
      return;
    }
    case "saveSVGReturn": {
      const filename = await new ztoolkit.FilePicker(
        `${Zotero.getString("fileInterface.export")} SVG Image`,
        "save",
        [["SVG File(*.svg)", "*.svg"]],
        `${Zotero.Items.get(addon.data.workspace.mainId).getNoteTitle()}.svg`
      ).open();
      if (filename) {
        await Zotero.File.putContentsAsync(formatPath(filename), ev.data.image);
        showHintWithLink(
          `Image Saved to ${filename}`,
          "Show in Folder",
          (ev) => {
            Zotero.File.reveal(filename);
          }
        );
      }
      return;
    }
    default:
      return;
  }
}
