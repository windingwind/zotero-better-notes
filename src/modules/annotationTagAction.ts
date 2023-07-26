import { addLineToNote, getNoteTreeFlattened } from "../utils/note";

export { annotationTagAction };

async function annotationTagAction(
  ids: Array<number | string>,
  extraData: Record<string, any>,
) {
  const workspaceNote = Zotero.Items.get(addon.data.workspace.mainId);
  if (!workspaceNote || !workspaceNote.isNote()) {
    return;
  }
  const nodes = getNoteTreeFlattened(workspaceNote);
  const headings: string[] = nodes.map((node) => node.model.name);

  for (const tagId of ids.filter((t) =>
    (extraData[t].tag as string).startsWith("@"),
  )) {
    const tagName = (extraData[tagId].tag as string).slice(1).trim();
    if (headings.includes(tagName) || tagName === "@") {
      let lineIndex: number;
      if (tagName === "@") {
        lineIndex = -1;
      } else {
        const targetNode = nodes.find((node) => node.model.name === tagName);
        lineIndex = targetNode?.model.endIndex;
      }

      const annotationItem = Zotero.Items.get((tagId as string).split("-")[0]);
      if (!annotationItem.isAnnotation()) {
        continue;
      }
      await addLineToNote(
        workspaceNote,
        await addon.api.convert.annotations2html([annotationItem], {
          noteItem: workspaceNote,
        }),
        lineIndex,
      );
    }
  }
}
