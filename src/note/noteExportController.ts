/*
 * This file realizes note export.
 */

import BetterNotes from "../addon";
import AddonBase from "../module";

class NoteExport extends AddonBase {
  _exportPath: string;
  _exportFileInfo: Array<{
    link: string;
    id: number;
    note: Zotero.Item;
    filename: string;
  }>;
  _pdfPrintPromise: _ZoteroPromiseObject;
  _docxPromise: _ZoteroPromiseObject;
  _docxBlob: Blob;

  constructor(parent: BetterNotes) {
    super(parent);
    this._exportFileInfo = [];
  }

  async exportNote(
    note: Zotero.Item,
    options: {
      embedLink?: boolean;
      exportNote?: boolean;
      exportMD?: boolean;
      exportSubMD?: boolean;
      exportAutoSync?: boolean;
      exportYAMLHeader?: boolean;
      exportDocx?: boolean;
      exportPDF?: boolean;
      exportFreeMind?: boolean;
    } = {
      embedLink: true,
      exportNote: false,
      exportMD: true,
      exportSubMD: false,
      exportAutoSync: false,
      exportYAMLHeader: true,
      exportDocx: false,
      exportPDF: false,
      exportFreeMind: false,
    }
  ) {
    // Trick: options containing 'export' all false? return
    if (
      !Object.keys(options)
        .filter((k) => k.includes("export"))
        .find((k) => options[k])
    ) {
      this._Addon.toolkit.Tool.log("options containing 'export' all false");
      return;
    }
    this._exportFileInfo = [];

    let newNote: Zotero.Item;
    if (options.embedLink || options.exportNote) {
      const noteID = await ZoteroPane.newNote();
      newNote = Zotero.Items.get(noteID) as Zotero.Item;
      const rootNoteIds = [note.id];

      const convertResult = await this._Addon.NoteUtils.convertNoteLines(
        note,
        rootNoteIds,
        options.embedLink
      );

      await this._Addon.NoteUtils.setLinesToNote(newNote, convertResult.lines);

      await Zotero.DB.executeTransaction(async () => {
        await Zotero.Notes.copyEmbeddedImages(note, newNote);
        for (const subNote of convertResult.subNotes) {
          await Zotero.Notes.copyEmbeddedImages(subNote, newNote);
        }
      });
    } else {
      newNote = note;
    }

    if (options.exportMD) {
      const filename = await this._Addon.toolkit.Tool.openFilePicker(
        `${Zotero.getString("fileInterface.export")} MarkDown Document`,
        "save",
        [["MarkDown File(*.md)", "*.md"]],
        `${newNote.getNoteTitle()}.md`
      );
      if (filename) {
        this._exportPath = this._Addon.NoteUtils.formatPath(
          Zotero.File.pathToFile(filename).parent.path + "/attachments"
        );
        await this._exportMD(
          newNote,
          filename,
          false,
          options.exportYAMLHeader
        );
      }
    }
    if (options.exportDocx) {
      const instance: Zotero.EditorInstance =
        this._Addon.WorkspaceWindow.getEditorInstance(newNote);
      this._docxPromise = Zotero.Promise.defer();
      instance._iframeWindow.postMessage({ type: "exportDocx" }, "*");
      await this._docxPromise.promise;
      const filename = await this._Addon.toolkit.Tool.openFilePicker(
        `${Zotero.getString("fileInterface.export")} MS Word Document`,
        "save",
        [["MS Word Document(*.docx)", "*.docx"]],
        `${newNote.getNoteTitle()}.docx`
      );
      if (filename) {
        await this._exportDocx(filename);
      }
    }
    if (options.exportPDF) {
      this._Addon.toolkit.Tool.log(newNote);
      let _w: Window;
      let t = 0;
      ZoteroPane.selectItem(note.id);
      do {
        ZoteroPane.openNoteWindow(newNote.id);
        _w = ZoteroPane.findNoteWindow(newNote.id);
        await Zotero.Promise.delay(10);
        t += 1;
      } while (!_w && t < 500);
      ZoteroPane.selectItem(note.id);
      _w.resizeTo(900, 650);
      const editor: any = _w.document.querySelector("#zotero-note-editor");
      t = 0;
      while (
        !(
          editor.getCurrentInstance &&
          editor.getCurrentInstance() &&
          editor
            .getCurrentInstance()
            ._iframeWindow.document.body.getAttribute("betternotes-status") !==
            "initialized"
        ) &&
        t < 500
      ) {
        t += 1;
        await Zotero.Promise.delay(10);
      }
      const instance: Zotero.EditorInstance = editor.getCurrentInstance();
      instance._iframeWindow.document.querySelector("#bn-headings")?.remove();
      this._pdfPrintPromise = Zotero.Promise.defer();
      instance._iframeWindow.postMessage({ type: "exportPDF" }, "*");
      await this._pdfPrintPromise.promise;
      this._Addon.toolkit.Tool.log("print finish detected");
      const closeFlag = _w.confirm(
        "Printing finished. Do you want to close the preview window?"
      );
      if (closeFlag) {
        _w.close();
      }
    }
    if (options.exportFreeMind) {
      const filename = await this._Addon.toolkit.Tool.openFilePicker(
        `${Zotero.getString("fileInterface.export")} FreeMind`,
        "save",
        [["FreeMind(*.mm)", "*.mm"]],
        `${newNote.getNoteTitle()}.mm`
      );
      if (filename) {
        await this._exportFreeMind(newNote, filename);
      }
    }
    if (!options.exportNote) {
      if (newNote.id !== note.id) {
        const _w: Window = ZoteroPane.findNoteWindow(newNote.id);
        if (_w) {
          _w.close();
        }
        await Zotero.Items.erase(newNote.id);
      }
    } else {
      ZoteroPane.openNoteWindow(newNote.id);
    }
  }

  async exportNotesToMDFiles(
    notes: Zotero.Item[],
    options: {
      useEmbed?: boolean;
      useSync?: boolean;
      filedir?: string;
      withMeta?: boolean;
    } = {}
  ) {
    Components.utils.import("resource://gre/modules/osfile.jsm");
    this._exportFileInfo = [];
    let filedir =
      options.filedir ||
      (await this._Addon.toolkit.Tool.openFilePicker(
        Zotero.getString(
          options.useSync ? "sync.sync" : "fileInterface.export"
        ) + " MarkDown",
        "folder"
      ));

    filedir = Zotero.File.normalizeToUnix(filedir);

    if (!filedir) {
      this._Addon.toolkit.Tool.log("export, filepath invalid");
      return;
    }

    this._exportPath = this._Addon.NoteUtils.formatPath(
      OS.Path.join(filedir, "attachments")
    );

    notes = notes.filter((n) => n && n.getNote);

    if (options.useEmbed) {
      for (const note of notes) {
        let newNote: Zotero.Item;
        if (this._Addon.NoteParse.parseLinkInText(note.getNote())) {
          const noteID = await ZoteroPane.newNote();
          newNote = Zotero.Items.get(noteID) as Zotero.Item;
          const rootNoteIds = [note.id];

          const convertResult = await this._Addon.NoteUtils.convertNoteLines(
            note,
            rootNoteIds,
            true
          );

          await this._Addon.NoteUtils.setLinesToNote(
            newNote,
            convertResult.lines
          );

          await Zotero.DB.executeTransaction(async () => {
            await Zotero.Notes.copyEmbeddedImages(note, newNote);
            for (const subNote of convertResult.subNotes) {
              await Zotero.Notes.copyEmbeddedImages(subNote, newNote);
            }
          });
        } else {
          newNote = note;
        }

        let filename = OS.Path.join(filedir, await this._getFileName(note));
        filename = filename.replace(/\\/g, "/");

        await this._exportMD(
          newNote,
          filename,
          newNote.id !== note.id,
          options.withMeta
        );
      }
    } else {
      // Export every linked note as a markdown file
      // Find all linked notes that need to be exported
      const inputIds = notes.map((n) => n.id);
      let allNoteIds: number[] = notes.map((n) => n.id);
      for (const note of notes) {
        const linkMatches = note
          .getNote()
          .match(/zotero:\/\/note\/\w+\/\w+\//g);
        if (!linkMatches) {
          continue;
        }
        const subNoteIds = (
          await Promise.all(
            linkMatches.map(async (link) =>
              this._Addon.NoteUtils.getNoteFromLink(link)
            )
          )
        )
          .filter((res) => res.item)
          .map((res) => res.item.id);
        allNoteIds = allNoteIds.concat(subNoteIds);
      }
      allNoteIds = Array.from(new Set(allNoteIds));
      const allNoteItems: Zotero.Item[] = Zotero.Items.get(
        allNoteIds
      ) as Zotero.Item[];
      const noteLinkDict = [];
      for (const _note of allNoteItems) {
        noteLinkDict.push({
          link: this._Addon.NoteUtils.getNoteLink(_note),
          id: _note.id,
          note: _note,
          filename: await this._getFileName(_note, filedir),
        });
      }
      this._exportFileInfo = noteLinkDict;

      for (const noteInfo of noteLinkDict) {
        let exportPath = OS.Path.join(filedir, noteInfo.filename);
        if (
          options.useSync &&
          !inputIds.includes(noteInfo.id) &&
          (await OS.File.exists(exportPath))
        ) {
          // Avoid overwrite existing notes that are waiting to be synced.
          continue;
        }
        const content = await this._exportMD(
          noteInfo.note,
          exportPath,
          false,
          options.withMeta
        );
        if (options.useSync) {
          this._Addon.SyncController.updateNoteSyncStatus(noteInfo.note, {
            path: filedir,
            filename: noteInfo.filename,
            md5: Zotero.Utilities.Internal.md5(
              this._Addon.SyncUtils.getMDStatusFromContent(content).content,
              false
            ),
            noteMd5: Zotero.Utilities.Internal.md5(
              noteInfo.note.getNote(),
              false
            ),
            lastsync: new Date().getTime(),
            itemID: noteInfo.id,
          });
        }
      }
    }
  }

  private async _exportDocx(filename: string) {
    await Zotero.File.putContentsAsync(filename, this._docxBlob);
    const progress = this._Addon.ZoteroViews.showProgressWindow(
      "Better Notes",
      `Note Saved to ${filename}`
    );
    // Just a placeholder
    progress.addDescription('<a href="https://zotero.org">Open Folder</a>');
    (await this._Addon.ZoteroViews.getProgressDocument(progress))
      .querySelector("label[href]")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await Zotero.File.reveal(filename);
      });
    progress.progress.setProgress(100);
  }

  private async _exportMD(
    note: Zotero.Item,
    filename: string,
    deleteAfterExport: boolean,
    withMeta: boolean
  ) {
    const hasImage = note.getNote().includes("<img");
    if (hasImage) {
      await Zotero.File.createDirectoryIfMissingAsync(this._exportPath);
    }

    filename = this._Addon.NoteUtils.formatPath(filename);
    const content: string = await this._Addon.NoteParse.parseNoteToMD(note, {
      withMeta: withMeta,
    });
    this._Addon.toolkit.Tool.log(
      `Exporting MD file: ${filename}, content length: ${content.length}`
    );
    await Zotero.File.putContentsAsync(filename, content);
    const progress = this._Addon.ZoteroViews.showProgressWindow(
      "Better Notes",
      `Note Saved to ${filename}`
    );
    // Just a placeholder
    progress.addDescription('<a href="https://zotero.org">Open Folder</a>');
    (await this._Addon.ZoteroViews.getProgressDocument(progress))
      .querySelector("label[href]")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await Zotero.File.reveal(filename);
      });
    progress.progress.setProgress(100);
    if (deleteAfterExport) {
      const _w: Window = ZoteroPane.findNoteWindow(note.id);
      if (_w) {
        _w.close();
      }
      await Zotero.Items.erase(note.id);
    }
    return content;
  }

  private async _exportFreeMind(noteItem: Zotero.Item, filename: string) {
    filename = this._Addon.NoteUtils.formatPath(filename);
    await Zotero.File.putContentsAsync(
      filename,
      this._Addon.NoteParse.parseNoteToFreemind(noteItem)
    );
    const progress = this._Addon.ZoteroViews.showProgressWindow(
      "Better Notes",
      `Note Saved to ${filename}`
    );
    // Just a placeholder
    progress.addDescription('<a href="https://zotero.org">Open Folder</a>');
    (await this._Addon.ZoteroViews.getProgressDocument(progress))
      .querySelector("label[href]")
      .addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await Zotero.File.reveal(filename);
      });
    progress.progress.setProgress(100);
  }

  private async _getFileName(
    noteItem: Zotero.Item,
    filedir: string = undefined
  ) {
    if (filedir !== undefined && (await OS.File.exists(filedir))) {
      const mdRegex = /\.(md|MD|Md|mD)$/;
      let matchedFileName = null;
      let matchedDate = new Date(0);
      await Zotero.File.iterateDirectory(
        filedir,
        async (entry: OS.File.Entry) => {
          if (entry.isDir) return;
          if (mdRegex.test(entry.name)) {
            if (
              entry.name.split(".").shift().split("-").pop() === noteItem.key
            ) {
              const stat = await OS.File.stat(entry.path);
              if (stat.lastModificationDate > matchedDate) {
                matchedFileName = entry.name;
                matchedDate = stat.lastModificationDate;
              }
            }
          }
        }
      );
      if (matchedFileName) {
        return matchedFileName;
      }
    }
    return (
      (await this._Addon.TemplateController.renderTemplateAsync(
        "[ExportMDFileName]",
        "noteItem",
        [noteItem]
      )) as string
    ).replace(/\\/g, "-");
  }
}

export default NoteExport;
