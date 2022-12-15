/*
 * This file realizes the template feature.
 */

import Knowledge4Zotero from "../addon";
import { NoteTemplate } from "../utils";
import AddonBase from "../module";

class TemplateController extends AddonBase {
  _systemTemplateNames: string[];
  _defaultTemplates: NoteTemplate[];
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this._systemTemplateNames = [
      "[QuickInsert]",
      "[QuickBackLink]",
      "[QuickImport]",
      "[QuickNoteV4]",
      "[ExportMDFileName]",
      "[ExportMDFileHeader]",
    ];
    this._defaultTemplates = [
      {
        name: "[QuickInsert]",
        text: '<p><a href="${link}" rel="noopener noreferrer nofollow">${subNoteItem.getNoteTitle().trim() ? subNoteItem.getNoteTitle().trim() : link}</a></p>',
        disabled: false,
      },
      {
        name: "[QuickBackLink]",
        text: '<p>Referred in <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)}?ignore=1&line=${lineIndex}" rel="noopener noreferrer nofollow">${noteItem.getNoteTitle().trim() ? noteItem.getNoteTitle().trim() : "Main Note"}${sectionName?`/${sectionName}`:""}</a></p>',
        disabled: false,
      },
      {
        name: "[QuickImport]",
        text: '<blockquote>\n<p><strong>Linked Note:</strong></p>\n${subNoteLines.join("")}\n</blockquote>',
        disabled: false,
      },
      {
        name: "[QuickNoteV4]",
        text: '${await new Promise(async (r) => {\nlet res = ""\nif(annotationItem.annotationComment){\nres += await Zotero.Knowledge4Zotero.NoteParse.parseMDToHTML(annotationItem.annotationComment);\n}\nres += await Zotero.Knowledge4Zotero.NoteParse.parseAnnotationHTML(noteItem, [annotationItem], true);\nr(res);})}',
        disabled: false,
      },
      {
        name: "[ExportMDFileName]",
        text: '${(noteItem.getNoteTitle ? noteItem.getNoteTitle().replace(/[/\\\\?%*:|"<> ]/g, "-") + "-" : "")}${noteItem.key}.md',
        disabled: false,
      },
      {
        name: "[ExportMDFileHeader]",
        text: '${await new Promise(async (r) => {\n  let header = {};\n  header.tags = noteItem.getTags().map((_t) => _t.tag);\n  header.parent = noteItem.parentItem? noteItem.parentItem.getField("title") : "";\n  header.collections = (\n    await Zotero.Collections.getCollectionsContainingItems([\n      (noteItem.parentItem || noteItem).id,\n    ])\n  ).map((c) => c.name);\n  r(JSON.stringify(header));\n})}\n',
        disabled: false,
      },
      {
        name: "[Item] item-notes with metadata",
        text: '<h1>${topItem.getField("title")}</h1>\n<h2 style="color:red; background-color: #efe3da;">💡 Meta Data</h2>\n<table>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Title </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'title\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Journal </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'publicationTitle\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">1<sup>st</sup> Author </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'firstCreator\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Authors </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Pub. date </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'date\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">DOI </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            <a href="https://doi.org/${topItem.getField(\'DOI\')}">${topItem.getField(\'DOI\')}</a>\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Archive </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'archive\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Archive Location </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'archiveLocation\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Call No. </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'callNumber\')}\n        </td>\n    </tr>\n</table>\n${itemNotes.map((noteItem)=>{\nconst noteLine = `<h2  style="color:red; background-color: #efe3da;">📜 Note:  <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)}" rel="noopener noreferrer nofollow">${noteItem.key}</a></h2>\n<blockquote>\n    ${noteItem.getNote()}\n    <p style="background-color: pink;"><strong>Merge Date: </strong> ${new Date().toISOString().substr(0,10)+" "+ new Date().toTimeString()}</p>\n</blockquote>\n<p style="color:red; background-color: #efe3da;"><strong>📝 Comments</strong></p>\n<blockquote>\n    <p>Make your comments</p>\n    <p></p>\n</blockquote>`;\ncopyNoteImage(noteItem);\nreturn noteLine;\n}).join("\\n")}\n',
        disabled: false,
      },
      {
        name: "[Item] collect annotations by color",
        text: '${await new Promise(async (r) => {\n  async function getAnnotation(item) {\n    try {\n      if (!item || !item.isAnnotation()) {\n        return null;\n      }\n      let json = await Zotero.Annotations.toJSON(item);\n      json.id = item.key;\n      delete json.key;\n      for (let key in json) {\n        json[key] = json[key] || "";\n      }\n      json.tags = json.tags || [];\n      return json;\n    } catch (e) {\n      Zotero.logError(e);\n      return null;\n    }\n  }\n\n  async function getAnnotationsByColor(_item, colorFilter) {\n    const annots = _item.getAnnotations().filter(colorFilter);\n    if (annots.length === 0) {\n      return {\n        html: "",\n      };\n    }\n    let annotations = [];\n    for (let annot of annots) {\n      const annotJson = await getAnnotation(annot);\n      annotJson.attachmentItemID = _item.id;\n      annotations.push(annotJson);\n    }\n\n    if (!editor) {\n      alert("No active note editor detected. Please open workspace.");\n      return r("");\n    }\n    await editor.importImages(annotations);\n    return Zotero.EditorInstanceUtilities.serializeAnnotations(annotations);\n  }\n\n  const attachments = Zotero.Items.get(topItem.getAttachments()).filter((i) =>\n    i.isPDFAttachment()\n  );\n  let res = "";\n  const colors = ["#ffd400", "#ff6666", "#5fb236", "#2ea8e5", "#a28ae5"];\n  const colorNames = ["Yellow", "Red", "Green", "Blue", "Purple"];\n  for (let attachment of attachments) {\n    res += `<h1>${attachment.getFilename()}</h1>`;\n    for (let i in colors) {\n      const renderedAnnotations = (\n        await getAnnotationsByColor(\n          attachment,\n          (_annot) => _annot.annotationColor === colors[i]\n        )\n      ).html;\n      if (renderedAnnotations) {\n        res += `<h2><p style="background-color:${colors[i]};">${colorNames[i]} Annotations</p></h2>\n${renderedAnnotations}`;\n      }\n    }\n    const renderedAnnotations = (\n      await getAnnotationsByColor(\n        attachment,\n        (_annot) => !colors.includes(_annot.annotationColor)\n      )\n    ).html;\n    if (renderedAnnotations) {\n      res += `<h2><p>Other Annotations</p></h2>\n${renderedAnnotations}`;\n    }\n  }\n  r(res);\n})}',
        disabled: false,
      },
      {
        name: "[Item] collect annotations by tag",
        text: '// @beforeloop-begin\n${(()=>{\nsharedObj.tagRaw = prompt("Please input tags. Split with \'\',:", "");\nreturn "";\n})()}\n// @beforeloop-end\n// @default-begin\n${await new Promise(async (r) => {\n  async function getAnnotation(item) {\n    try {\n      if (!item || !item.isAnnotation()) {\n        return null;\n      }\n      let json = await Zotero.Annotations.toJSON(item);\n      json.id = item.key;\n      delete json.key;\n      for (let key in json) {\n        json[key] = json[key] || "";\n      }\n      json.tags = json.tags || [];\n      return json;\n    } catch (e) {\n      Zotero.logError(e);\n      return null;\n    }\n  }\n\n  async function getAnnotationsByTag(_item, tag) {\n    let annots = _item.getAnnotations();\n    annots = tag.length? \n      annots.filter((_annot) => _annot.getTags().map(_t=>_t.tag).includes(tag)) :\n      annots;\n    let annotations = [];\n    for (let annot of annots) {\n      const annotJson = await getAnnotation(annot);\n      annotJson.attachmentItemID = _item.id;\n      annotations.push(annotJson);\n    }\n    if (!editor) {\n      alert("No active note editor detected. Please open workspace.");\n      return r("");\n    }\n    await editor.importImages(annotations);\n      return Zotero.EditorInstanceUtilities.serializeAnnotations(annotations);\n    }\n  const attachments = Zotero.Items.get(topItem.getAttachments()).filter((i) =>\n    i.isPDFAttachment()\n  );\n  let res = "";\n  if(!sharedObj.tagRaw){\n    return;\n  }\n  res += `<h1>${topItem.getField("title")}</h1>`;\n  for (let attachment of attachments) {\n    res += `<h2>${attachment.getFilename()}</h2>`;\n    for(tag of sharedObj.tagRaw.split(",").filter(t=>t.length)){\n      res += `<h3>Tag: ${tag}</h3>`;\n      const tags = (await getAnnotationsByTag(attachment, tag)).html\n      res += tags ? tags : "<p>No result</p>";\n  }\n  }\n  r(res);\n})}\n// @default-end',
        disabled: false,
      },
      {
        name: "[Item] note links",
        text: '<p><a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(topItem)}">${topItem.getNoteTitle().trim() ? topItem.getNoteTitle().trim() : Zotero.Knowledge4Zotero.knowledge.getNoteLink(topItem)}</a></p>',
        disabled: false,
      },
      {
        name: "[Text] table",
        text: '${(() => {\nconst size = prompt("Table Size(row*column):", "4*3");\nif (!size) {\nreturn "";\n}\nconst row = Number(size.split("*")[0]);\nconst col = Number(size.split("*")[1]);\nif (!row || !col) {\nreturn "";\n}\nconst makeHeadCell = () => "<th>\n</th>";\nconst makeHead = () =>\n`<tr>${[...Array(col).keys()].map(makeHeadCell).join("\n")}</tr>`;\nconst makeCell = () => "<td>\n</td>";\nconst makeRow = () =>\n`<tr>${[...Array(col).keys()].map(makeCell).join("\n")}</tr>`;\nreturn `<table><thead>${makeHead()}</thead>\n${\nrow > 1\n? "<tbody>" +\n[...Array(row - 1).keys()].map(makeRow).join("\n") +\n"</tbody>"\n: ""\n}\n</table>`;\n})()}',
        disabled: false,
      },
    ];
  }

  async renderTemplateAsync(
    key: string,
    argString: string = "",
    argList: any[] = [],
    useDefault: boolean = true,
    stage: string = "default"
  ) {
    Zotero.debug(`renderTemplateAsync: ${key}`);
    let templateText = this.getTemplateText(key);
    if (useDefault && !templateText) {
      templateText = this._defaultTemplates.find((t) => t.name === key).text;
      if (!templateText) {
        return "";
      }
    }

    const templateLines = templateText.split("\n");
    let startIndex = templateLines.indexOf(`// @${stage}-begin`),
      endIndex = templateLines.indexOf(`// @${stage}-end`);
    if (startIndex < 0 && endIndex < 0 && stage !== "default") {
      // Skip this stage
      return "";
    }
    if (startIndex < 0) {
      // We skip the flag line later
      startIndex = -1;
    }
    if (endIndex < 0) {
      endIndex = templateLines.length;
    }
    // Skip the flag lines
    templateText = templateLines.slice(startIndex + 1, endIndex).join("\n");

    let _newLine: string = "";
    try {
      const AsyncFunction = Object.getPrototypeOf(
        async function () {}
      ).constructor;
      const _ = new AsyncFunction(argString, "return `" + templateText + "`");
      console.log(_);
      _newLine = await _(...argList);
    } catch (e) {
      alert(`Template ${key} Error: ${e}`);
      console.log(e);
      return "";
    }
    return _newLine;
  }

  getTemplateKeys(): NoteTemplate[] {
    let templateKeys = Zotero.Prefs.get(
      "Knowledge4Zotero.templateKeys"
    ) as string;
    return templateKeys ? JSON.parse(templateKeys) : [];
  }

  getTemplateKey(keyName: string): NoteTemplate {
    return this.getTemplateKeys().filter((t) => t.name === keyName)[0];
  }

  setTemplateKeys(templateKeys: NoteTemplate[]): void {
    Zotero.Prefs.set(
      "Knowledge4Zotero.templateKeys",
      JSON.stringify(templateKeys)
    );
  }

  addTemplateKey(key: NoteTemplate): boolean {
    const templateKeys = this.getTemplateKeys();
    if (templateKeys.map((t) => t.name).includes(key.name)) {
      return false;
    }
    templateKeys.push(key);
    this.setTemplateKeys(templateKeys);
    return true;
  }

  removeTemplateKey(keyName: string): boolean {
    const templateKeys = this.getTemplateKeys();
    if (!templateKeys.map((t) => t.name).includes(keyName)) {
      return false;
    }
    templateKeys.splice(templateKeys.map((t) => t.name).indexOf(keyName), 1);
    this.setTemplateKeys(templateKeys);
    return true;
  }

  getTemplateText(keyName: string): string {
    let template = Zotero.Prefs.get(
      `Knowledge4Zotero.template.${keyName}`
    ) as string;
    if (!template) {
      template = "";
      Zotero.Prefs.set(`Knowledge4Zotero.template.${keyName}`, template);
    }
    return template;
  }

  setTemplate(key: NoteTemplate, template: string = ""): void {
    let _key = JSON.parse(JSON.stringify(key));
    if (_key.text) {
      template = _key.text;
      delete _key.text;
    }
    this.addTemplateKey(_key);
    Zotero.Prefs.set(`Knowledge4Zotero.template.${_key.name}`, template);
  }

  removeTemplate(keyName: string): void {
    this.removeTemplateKey(keyName);
    Zotero.Prefs.clear(`Knowledge4Zotero.template.${keyName}`);
  }

  resetTemplates() {
    let oldTemplatesRaw: string = Zotero.Prefs.get(
      "Knowledge4Zotero.noteTemplate"
    ) as string;
    // Convert old version
    if (oldTemplatesRaw) {
      const templates: NoteTemplate[] = JSON.parse(oldTemplatesRaw);
      for (const template of templates) {
        this._Addon.TemplateController.setTemplate(template);
      }
      Zotero.Prefs.clear("Knowledge4Zotero.noteTemplate");
    }
    // Convert buggy template
    if (
      !this._Addon.TemplateController.getTemplateText(
        "[QuickBackLink]"
      ).includes("ignore=1")
    ) {
      this._Addon.TemplateController.setTemplate(
        this._Addon.TemplateController._defaultTemplates.find(
          (t) => t.name === "[QuickBackLink]"
        )
      );
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        "The [QuickBackLink] is reset because of missing ignore=1 in link."
      );
    }
    let templateKeys = this._Addon.TemplateController.getTemplateKeys();
    const currentNames = templateKeys.map((t) => t.name);
    for (const defaultTemplate of this._Addon.TemplateController
      ._defaultTemplates) {
      if (!currentNames.includes(defaultTemplate.name)) {
        this._Addon.TemplateController.setTemplate(defaultTemplate);
      }
    }
  }

  getCitationStyle(): {
    mode: string;
    contentType: string;
    id: string;
    locale: string;
  } {
    let format = Zotero.Prefs.get("Knowledge4Zotero.citeFormat") as string;
    try {
      if (format) {
        format = JSON.parse(format);
      } else {
        throw Error("format not initialized");
      }
    } catch (e) {
      format = Zotero.QuickCopy.getFormatFromURL(
        Zotero.QuickCopy.lastActiveURL
      );
      format = Zotero.QuickCopy.unserializeSetting(format);
      Zotero.Prefs.set("Knowledge4Zotero.citeFormat", JSON.stringify(format));
    }
    return format as any;
  }
}

/*
 * This part is for the template usage only
 * to keep API consistency
 */
class TemplateAPI extends AddonBase {
  constructor(parent: Knowledge4Zotero) {
    super(parent);
  }

  public getNoteLink(
    note: Zotero.Item,
    options: {
      ignore?: boolean;
      withLine?: boolean;
    } = { ignore: false, withLine: false }
  ) {
    return this._Addon.NoteUtils.getNoteLink(note, options);
  }

  public async getWorkspaceEditorInstance(
    type: "main" | "preview" = "main",
    wait: boolean = true
  ) {
    return await this._Addon.WorkspaceWindow.getWorkspaceEditorInstance(
      type,
      wait
    );
  }
}

export { TemplateController, TemplateAPI };
