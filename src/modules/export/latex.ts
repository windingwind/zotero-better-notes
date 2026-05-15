import { showHintWithLink } from "../../utils/hint";
import { getPref } from "../../utils/prefs";
import { formatPath, jointPath } from "../../utils/str";

export async function saveLatex(
  filePath: string,
  noteId: number,
  options: {
    keepNoteLink?: boolean;
  } = {},
) {
  const noteItem = Zotero.Items.get(noteId);
  const filename = PathUtils.split(filePath).pop()
  const dir = jointPath(...PathUtils.split(formatPath(filePath)).slice(0, -1));
  await IOUtils.makeDirectory(dir);
  const [latexContent, bibString] = await addon.api.convert.note2latex(
    noteItem,
    dir,
    {...options, filename: filename},
  );
  await Zotero.File.putContentsAsync(filePath, latexContent);

  showHintWithLink(`Note Saved to ${filePath}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filePath);
  });

  if (bibString && bibString.length > 0) {
    const raw = await new ztoolkit.FilePicker(
      `${Zotero.getString("fileInterface.export")} Bibtex File`,
      "save",
      [["Bibtex File(*.bib)", "*.bib"]],
      `references.bib`,
    ).open();
    if (!raw) {
      ztoolkit.log("[Bib Export] Bib file export canceled.");
      return;
    }
    const bibFilename = formatPath(raw, ".bib");
    await Zotero.File.putContentsAsync(bibFilename, bibString);
    showHintWithLink(
      `Bibliographic Saved to ${bibFilename}`,
      "Show in Folder",
      (ev) => {
        Zotero.File.reveal(bibFilename);
      },
    );
  }
}

export async function saveMergedLatex(filePath: string, noteIds: number[]) {
  const noteItems = noteIds.map((noteId) => Zotero.Items.get(noteId));
  const filename = PathUtils.split(filePath).pop()
  const dir = jointPath(...PathUtils.split(formatPath(filePath)).slice(0, -1));
  await IOUtils.makeDirectory(dir);
  
  let latexContent = "";
  let bibString = "";
  const separatedString = "\n\n";
  for (const noteItem of noteItems) {
    const [latexContent_, bibString_] = await addon.api.convert.note2latex(
      noteItem,
      dir,
      {filename: filename},
    );
    latexContent += latexContent_;
    latexContent += separatedString;
    if (bibString_.length > 0) {
      bibString += bibString_;
      bibString += separatedString;
    }
  }

  await Zotero.File.putContentsAsync(filePath, latexContent);

  showHintWithLink(`Note Saved to ${filePath}`, "Show in Folder", (ev) => {
    Zotero.File.reveal(filePath);
  });

  if (bibString.length > 0) {
    const raw = await new ztoolkit.FilePicker(
      `${Zotero.getString("fileInterface.export")} Bibtex File`,
      "save",
      [["Bibtex File(*.bib)", "*.bib"]],
      `references.bib`,
    ).open();
    if (!raw) {
      ztoolkit.log("[Bib Export] Bib file export canceled.");
      return;
    }
    const bibFilename = formatPath(raw, ".bib");
    await Zotero.File.putContentsAsync(bibFilename, bibString);
    showHintWithLink(
      `Bibliographic Saved to ${bibFilename}`,
      "Show in Folder",
      (ev) => {
        Zotero.File.reveal(bibFilename);
      },
    );
  }
}
