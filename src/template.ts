import Knowledge4Zotero from "./addon";
import { NoteTemplate } from "./base";
import AddonBase from "./module";

class AddonTemplate extends AddonBase {
  private _window: Window;
  _systemTemplateNames: string[];
  _defaultTemplates: NoteTemplate[];
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this._systemTemplateNames = [
      "[QuickInsert]",
      "[QuickBackLink]",
      "[QuickImport]",
      "[QuickNoteV2]",
      "[ExportMDFileName]",
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
        name: "[QuickNoteV2]",
        text: '${await new Promise(async (r) => {\nlet res = ""\nif(annotationItem.annotationComment){\nres += Zotero.Knowledge4Zotero.parse.parseMDToHTML(annotationItem.annotationComment);\n}\nres += await Zotero.Knowledge4Zotero.parse.parseAnnotationHTML(noteItem, [annotationItem], true);\nr(res);})}',
        disabled: false,
      },
      {
        name: "[ExportMDFileName]",
        text: '${(noteItem.getNoteTitle ? noteItem.getNoteTitle().replace(/[/\\\\?%*:|"<> ]/g, "-") + "-" : "")}${noteItem.key}.md',
        disabled: false,
      },
      {
        name: "[Item] item-notes with metadata",
        text: '<h1>${topItem.getField("title")}</h1>\n<h2 style="color:red; background-color: #efe3da;">💡 Meta Data</h2>\n<table>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Title </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'title\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Journal </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'publicationTitle\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">1<sup>st</sup> Author </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'firstCreator\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Authors </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getCreators().map((v)=>v.firstName+" "+v.lastName).join("; ")}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Pub. date </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'date\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">DOI </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            <a href="https://doi.org/${topItem.getField(\'DOI\')}">${topItem.getField(\'DOI\')}</a>\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Archive </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'archive\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#f3faf4;">\n            <p style="text-align: right">Archive Location </p>\n        </th>\n        <td style="background-color:#f3faf4;">\n            ${topItem.getField(\'archiveLocation\')}\n        </td>\n    </tr>\n    <tr>\n        <th style="background-color:#dbeedd;">\n            <p style="text-align: right">Call No. </p>\n        </th>\n        <td style="background-color:#dbeedd;">\n            ${topItem.getField(\'callNumber\')}\n        </td>\n    </tr>\n</table>\n${itemNotes.map((noteItem)=>{\nconst noteLine = `<h2  style="color:red; background-color: #efe3da;">📜 Note:  <a href="${Zotero.Knowledge4Zotero.knowledge.getNoteLink(noteItem)}" rel="noopener noreferrer nofollow">${noteItem.key}</a></h2>\n<blockquote>\n    ${noteItem.getNote()}\n    <p style="background-color: pink;"><strong>Merge Date: </strong> ${new Date().toISOString().substr(0,10)+" "+ new Date().toTimeString()}</p>\n</blockquote>\n<p style="color:red; background-color: #efe3da;"><strong>📝 Comments</strong></p>\n<blockquote>\n    <p>Make your comments</p>\n    <p></p>\n</blockquote>`;\ncopyNoteImage(noteItem);\nreturn noteLine;\n}).join("\\n")}\n',
        disabled: false,
      },
      {
        name: "[Item] collect annotations by color",
        text: '${await new Promise(async (r) => {\n  async function getAnnotation(item) {\n    try {\n      if (!item || !item.isAnnotation()) {\n        return null;\n      }\n      let json = await Zotero.Annotations.toJSON(item);\n      json.id = item.key;\n      delete json.key;\n      for (let key in json) {\n        json[key] = json[key] || "";\n      }\n      json.tags = json.tags || [];\n      return json;\n    } catch (e) {\n      Zotero.logError(e);\n      return null;\n    }\n  }\n\n  async function getAnnotationsByColor(_item, color) {\n    const annots = _item\n      .getAnnotations()\n      .filter((_annot) => _annot.annotationColor === color);\n    let annotations = [];\n    for (let annot of annots) {\n      const annotJson = await getAnnotation(annot);\n      annotJson.attachmentItemID = _item.id;\n      annotations.push(annotJson);\n    }\n\n    const editor =\n      await Zotero.Knowledge4Zotero.knowledge.getWorkspaceEditorInstance();\n    await editor.importImages(annotations);\n    return Zotero.EditorInstanceUtilities.serializeAnnotations(annotations);\n  }\n\n  const attachments = Zotero.Items.get(topItem.getAttachments()).filter((i) =>\n    i.isPDFAttachment()\n  );\n  let res = "";\n  let colorYellow = "#ffd400";\n  let colorRed = "#ff6666";\n  let colorGreen = "#5fb236";\n  let colorBlue = "#2ea8e5";\n  let colorPerple = "#a28ae5";\n  for (let attachment of attachments) {\n    res += `<h2><p style="background-color:${colorYellow};">Yellow Heading</p></h2>\n    ${(await getAnnotationsByColor(attachment, colorYellow)).html}\n    `;\n    res += `<h2><p style="background-color:${colorRed };">Red Heading</p></h2>\n    ${(await getAnnotationsByColor(attachment, colorRed )).html}\n    `;\n    res += `<h2><p style="background-color:${colorGreen };">Green Heading</p></h2>\n    ${(await getAnnotationsByColor(attachment, colorGreen )).html}\n    `;\n    res += `<h2><p style="background-color:${colorBlue };">Blue Heading</p></h2>\n    ${(await getAnnotationsByColor(attachment, colorBlue )).html}\n    `;\n    res += `<h2><p style="background-color:${colorPerple };">Perple Heading</p></h2>\n    ${(await getAnnotationsByColor(attachment, colorPerple )).html}\n    `;\n  }\n  r(res);\n})}',
        disabled: false,
      },
      {
        name: "[Item] collect annotations by tag",
        text: '// @beforeloop-begin\n${(()=>{\nsharedObj.tagRaw = prompt("Please input tags. Split with \'\',:", "");\nreturn "";\n})()}\n// @beforeloop-end\n// @default-begin\n${await new Promise(async (r) => {\n  async function getAnnotation(item) {\n    try {\n      if (!item || !item.isAnnotation()) {\n        return null;\n      }\n      let json = await Zotero.Annotations.toJSON(item);\n      json.id = item.key;\n      delete json.key;\n      for (let key in json) {\n        json[key] = json[key] || "";\n      }\n      json.tags = json.tags || [];\n      return json;\n    } catch (e) {\n      Zotero.logError(e);\n      return null;\n    }\n  }\n\n  async function getAnnotationsByTag(_item, tag) {\n    let annots = _item.getAnnotations();\n    annots = tag.length? \n      annots.filter((_annot) => _annot.getTags().map(_t=>_t.tag).includes(tag)) :\n      annots;\n    let annotations = [];\n    for (let annot of annots) {\n      const annotJson = await getAnnotation(annot);\n      annotJson.attachmentItemID = _item.id;\n      annotations.push(annotJson);\n    }\n    const editor =\n      await Zotero.Knowledge4Zotero.knowledge.getWorkspaceEditorInstance();\n      await editor.importImages(annotations);\n      return Zotero.EditorInstanceUtilities.serializeAnnotations(annotations);\n    }\n  const attachments = Zotero.Items.get(topItem.getAttachments()).filter((i) =>\n    i.isPDFAttachment()\n  );\n  let res = "";\n  if(!sharedObj.tagRaw){\n    return;\n  }\n  res += `<h1>${topItem.getField("title")}</h1>`;\n  for (let attachment of attachments) {\n    res += `<h2>${attachment.getFilename()}</h2>`;\n    for(tag of sharedObj.tagRaw.split(",").filter(t=>t.length)){\n      res += `<h3>Tag: ${tag}</h3>`;\n      const tags = (await getAnnotationsByTag(attachment, tag)).html\n      res += tags ? tags : "<p>No result</p>";\n  }\n  }\n  r(res);\n})}\n// @default-end',
        disabled: false,
      },
      {
        name: "[Note] with metadata",
        text: "<p><span style=\"background-color: #ffd40080\">Note: ${link}</span></p>\n${topItem?`<p>Title: ${topItem.getField('title')}</p>\\n<p>Author: ${topItem.getField('firstCreator')}</p>\\n<p>Date: ${topItem.getField('date')}</p>`:''}",
        disabled: false,
      },
      {
        name: "[Text] table",
        text: '${(()=>{\nconst size = prompt("Table Size(row*column):", "4*3");\nif(!size){\nreturn "";\n}\nconst row = Number(size.split("*")[0]);\nconst col = Number(size.split("*")[1]);\nif(!row || !col){\nreturn "";\n}\nconst makeCell = ()=>"<td>\\n</td>";\nconst makeRow = ()=>`<tr>${[...Array(col).keys()].map(makeCell).join("\\n")}</tr>`;\nreturn `<table>\n${[...Array(row).keys()].map(makeRow).join("\\n")}\n</table>`;\n})()}',
        disabled: false,
      },
    ];
  }

  openEditor() {
    if (this._window && !this._window.closed) {
      this._window.focus();
    } else {
      window.open(
        "chrome://Knowledge4Zotero/content/template.xul",
        "_blank",
        "chrome,extrachrome,centerscreen,width=800,height=400,resizable=yes"
      );
    }
  }

  initTemplates(_window: Window) {
    this._window = _window;
    this.updateTemplateView();
  }

  resetTemplates() {
    let oldTemplatesRaw: string = Zotero.Prefs.get(
      "Knowledge4Zotero.noteTemplate"
    ) as string;
    // Convert old version
    if (oldTemplatesRaw) {
      const templates: NoteTemplate[] = JSON.parse(oldTemplatesRaw);
      for (const template of templates) {
        this.setTemplate(template);
      }
      Zotero.Prefs.clear("Knowledge4Zotero.noteTemplate");
    }
    // Convert buggy template
    if (!this.getTemplateText("[QuickBackLink]").includes("ignore=1")) {
      this.setTemplate(
        this._defaultTemplates.find((t) => t.name === "[QuickBackLink]")
      );
      this._Addon.views.showProgressWindow(
        "Better Notes",
        "The [QuickBackLink] is reset because of missing ignore=1 in link."
      );
    }
    let templateKeys = this.getTemplateKeys();
    const currentNames = templateKeys.map((t) => t.name);
    for (const defaultTemplate of this._defaultTemplates) {
      if (!currentNames.includes(defaultTemplate.name)) {
        this.setTemplate(defaultTemplate);
      }
    }
  }

  getCitationStyle(): Object {
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
    return format;
  }

  getSelectedTemplateName(): string {
    const listbox: XUL.ListItem =
      this._window.document.getElementById("template-list");
    const selectedItem = listbox.selectedItem;
    if (selectedItem) {
      const name = selectedItem.getAttribute("id");
      return name;
    }
    return "";
  }

  updateTemplateView() {
    const templates = this.getTemplateKeys();
    const listbox = this._window.document.getElementById("template-list");
    let e,
      es = this._window.document.getElementsByTagName("listitem");
    while (es.length > 0) {
      e = es[0];
      e.parentElement.removeChild(e);
    }
    for (const template of templates) {
      const listitem = this._window.document.createElement("listitem");
      listitem.setAttribute("id", template.name);
      const name = this._window.document.createElement("listcell");
      name.setAttribute("label", template.name);
      if (this._systemTemplateNames.includes(template.name)) {
        listitem.style.color = "#f2ac46";
      }
      listitem.append(name);
      listbox.append(listitem);
    }
    this.updateEditorView();
  }

  updateEditorView() {
    Zotero.debug("update editor");
    console.log("update editor");
    const name = this.getSelectedTemplateName();
    const templateText = this.getTemplateText(name);

    const header: XUL.Textbox =
      this._window.document.getElementById("editor-name");
    const text: XUL.Textbox =
      this._window.document.getElementById("editor-textbox");
    const saveTemplate = this._window.document.getElementById("save-template");
    const deleteTemplate =
      this._window.document.getElementById("delete-template");
    const resetTemplate =
      this._window.document.getElementById("reset-template");
    if (!name) {
      header.value = "";
      header.setAttribute("disabled", "true");
      text.value = "";
      text.setAttribute("disabled", "true");
      saveTemplate.setAttribute("disabled", "true");
      deleteTemplate.setAttribute("disabled", "true");
      deleteTemplate.hidden = false;
      resetTemplate.hidden = true;
    } else {
      header.value = name;
      if (!this._systemTemplateNames.includes(name)) {
        header.removeAttribute("disabled");
        deleteTemplate.hidden = false;
        resetTemplate.hidden = true;
      } else {
        header.setAttribute("disabled", "true");
        deleteTemplate.setAttribute("disabled", "true");
        deleteTemplate.hidden = true;
        resetTemplate.hidden = false;
      }
      text.value = templateText;
      text.removeAttribute("disabled");
      saveTemplate.removeAttribute("disabled");
      deleteTemplate.removeAttribute("disabled");
    }
  }

  createTemplate() {
    const template: NoteTemplate = {
      name: `New Template: ${new Date().getTime()}`,
      text: "",
      disabled: false,
    };
    this.setTemplate(template);
    this.updateTemplateView();
  }

  async importNoteTemplate() {
    const io = {
      // Not working
      singleSelection: true,
      dataIn: null,
      dataOut: null,
      deferred: Zotero.Promise.defer(),
    };

    (window as unknown as XUL.XULWindow).openDialog(
      "chrome://zotero/content/selectItemsDialog.xul",
      "",
      "chrome,dialog=no,centerscreen,resizable=yes",
      io
    );
    await io.deferred.promise;

    const ids = io.dataOut;
    const note: Zotero.Item = (Zotero.Items.get(ids) as Zotero.Item[]).filter(
      (item: Zotero.Item) => item.isNote()
    )[0];
    if (!note) {
      return;
    }
    const template: NoteTemplate = {
      name: `Template from ${note.getNoteTitle()}: ${new Date().getTime()}`,
      text: note.getNote(),
      disabled: false,
    };
    this.setTemplate(template);
    this.updateTemplateView();
  }

  saveSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    const header: XUL.Textbox =
      this._window.document.getElementById("editor-name");
    const text: XUL.Textbox =
      this._window.document.getElementById("editor-textbox");

    if (this._systemTemplateNames.includes(name) && header.value !== name) {
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `Template ${name} is a system template. Modifying template name is not allowed.`
      );
      return;
    }

    const template = this.getTemplateKey(name);
    template.name = header.value;
    template.text = text.value;
    this.setTemplate(template);
    if (name !== template.name) {
      this.removeTemplate(name);
    }
    this._Addon.views.showProgressWindow(
      "Better Notes",
      `Template ${template.name} saved.`
    );

    this.updateTemplateView();
  }

  deleteSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    if (this._systemTemplateNames.includes(name)) {
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `Template ${name} is a system template. Removing system template is note allowed.`
      );
      return;
    }
    this.removeTemplate(name);
    this.updateTemplateView();
  }

  resetSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    if (this._systemTemplateNames.includes(name)) {
      const text: XUL.Textbox =
        this._window.document.getElementById("editor-textbox");
      text.value = this._defaultTemplates.find((t) => t.name === name).text;
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `Template ${name} is reset. Please save before leaving.`
      );
    }
  }

  renderTemplate(
    key: string,
    argString: string = "",
    argList: any[] = [],
    useDefault: boolean = true,
    stage: string = "default"
  ) {
    Zotero.debug(`renderTemplate: ${key}`);
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
      _newLine = new Function(argString, "return `" + templateText + "`")(
        ...argList
      );
    } catch (e) {
      alert(`Template ${key} Error: ${e}`);
      return "";
    }
    return _newLine;
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
}

export default AddonTemplate;
