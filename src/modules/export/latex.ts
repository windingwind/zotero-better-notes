import { showHintWithLink } from "../../utils/hint";
import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";

export async function saveLatex(
  filename: string,
  noteId: number,
  options: {
    keepNoteLink?: boolean;
    withYAMLHeader?: boolean;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  const dir = jointPath(...PathUtils.split(formatPath(filename)).slice(0, -1));
  await IOUtils.makeDirectory(dir);
  const hasImage = noteItem.getNote().includes("<img");
  if (hasImage) {
    const attachmentsDir = jointPath(
      dir,
      getPref("syncAttachmentFolder") as string,
    );
    await IOUtils.makeDirectory(attachmentsDir);
  }
  const [latexContent, bibString] = await addon.api.convert.note2latex(
    noteItem,
    dir,
    options,
  );
  await Zotero.File.putContentsAsync(filename, latexContent);

  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });

  if (bibString && bibString.length > 0) {
    const raw = await new ztoolkit.FilePicker(
      `${Zotero.getString("fileInterface.export")} Bibtex File`,
      "save",
      [["Bibtex File(*.bib)", "*.bib"]],
      `notegeneration.bib`,
    ).open();
    if (!raw) {
      Zotero.debug("[Bib Export] Bib file export canceled.");
      return;
    }
    const bibfilename = formatPath(raw, ".bib");
    await Zotero.File.putContentsAsync(bibfilename, bibString);
    showHintWithLink(
      `Bibliographic Saved to ${bibfilename}`,
      "Show in Folder",
      (ev) => {
        Zotero.File.reveal(bibfilename);
      },
    );
  }
}

export async function saveMultipleLatex() {
  const inputItems = Zotero.getMainWindow().ZoteroPane.getSelectedItems();

  const noteIds = [];
  for (const item of inputItems) {
    if (item.isNote()) {
      noteIds.push(item.id);
    } else if (item.getNotes().length > 0) {
      item.getNotes().forEach((noteId) => noteIds.push(noteId));
    }
  }
  ztoolkit.log(noteIds);

  const raw = await new ztoolkit.FilePicker(
    `${Zotero.getString("fileInterface.export")} Latex File`,
    "save",
    [["Latex File(*.tex)", "*.tex"]],
    `export-multiple-notes-to-latex.tex`,
  ).open();
  if (!raw) return;
  const filename = formatPath(raw, ".tex");

  const noteItems = noteIds.map((id) => Zotero.Items.get(id));
  const dir = jointPath(...PathUtils.split(formatPath(filename)).slice(0, -1));
  await IOUtils.makeDirectory(dir);
  const hasImage = noteItems.some((item) => item.getNote().includes("<img"));
  if (hasImage) {
    const attachmentsDir = jointPath(
      dir,
      getPref("syncAttachmentFolder") as string,
    );
    await IOUtils.makeDirectory(attachmentsDir);
  }
  let latexContent = "";
  let bibString = "";
  const separatedString = "\n\n";
  for (const noteItem of noteItems) {
    const [latexContent_, bibString_] = await addon.api.convert.note2latex(
      noteItem,
      dir,
      {},
    );
    latexContent += latexContent_;
    latexContent += separatedString;
    if (bibString_.length > 0) {
      bibString += bibString_;
      bibString += separatedString;
    }
  }

  await Zotero.File.putContentsAsync(filename, latexContent);

  showHintWithLink(`Note Saved to ${filename}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filename);
  });

  if (bibString.length > 0) {
    const raw = await new ztoolkit.FilePicker(
      `${Zotero.getString("fileInterface.export")} Bibtex File`,
      "save",
      [["Bibtex File(*.bib)", "*.bib"]],
      `notegeneration.bib`,
    ).open();
    if (!raw) {
      Zotero.debug("[Bib Export] Bib file export canceled.");
      return;
    }
    const bibfilename = formatPath(raw, ".bib");
    await Zotero.File.putContentsAsync(bibfilename, bibString);
    showHintWithLink(
      `Bibliographic Saved to ${bibfilename}`,
      "Show in Folder",
      (ev) => {
        Zotero.File.reveal(bibfilename);
      },
    );
  }
}
