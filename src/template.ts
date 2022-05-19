import { AddonBase, EditorMessage, NoteTemplate } from "./base";

class AddonTemplate extends AddonBase {
  private _window: Window;
  _templates: NoteTemplate[];
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this._templates = this.getTemplates();
  }

  initTemplates(_window: Window) {
    this._window = _window;
    this.updateTemplateView();
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
    const templates = this._templates;
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
      listitem.append(name);
      listbox.append(listitem);
    }
    this.updateEditorView();
  }

  updateEditorView() {
    Zotero.debug("update editor");
    console.log("update editor");
    const name = this.getSelectedTemplateName();
    const template = this.getTemplateByName(name);

    const header: XUL.Textbox =
      this._window.document.getElementById("editor-name");
    const text: XUL.Textbox =
      this._window.document.getElementById("editor-textbox");
    const saveTemplate = this._window.document.getElementById("save-template");
    const deleteTemplate =
      this._window.document.getElementById("delete-template");
    if (!template) {
      header.value = "";
      header.setAttribute("disabled", "true");
      text.value = "";
      text.setAttribute("disabled", "true");
      saveTemplate.setAttribute("disabled", "true");
      deleteTemplate.setAttribute("disabled", "true");
    } else {
      header.value = template.name;
      header.removeAttribute("disabled");
      text.value = template.text;
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
    this.saveTemplate(template);
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

    (window as unknown as XULWindow).openDialog(
      "chrome://zotero/content/selectItemsDialog.xul",
      "",
      "chrome,dialog=no,centerscreen,resizable=yes",
      io
    );
    await io.deferred.promise;

    const ids = io.dataOut;
    const note: ZoteroItem = Zotero.Items.get(ids).filter((item: ZoteroItem) =>
      item.isNote()
    )[0];
    if (!note) {
      return;
    }
    const template: NoteTemplate = {
      name: `Template from ${note.getNoteTitle()}: ${new Date().getTime()}`,
      text: note.getNote(),
      disabled: false,
    };
    this.saveTemplate(template);
    this.updateTemplateView();
  }

  saveSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    const template = this.getTemplateByName(name);
    const header: XUL.Textbox =
      this._window.document.getElementById("editor-name");
    const text: XUL.Textbox =
      this._window.document.getElementById("editor-textbox");
    if (!template) {
      this.updateEditorView();
    } else {
      const oldName = template.name;
      template.name = header.value;
      template.text = text.value;
      this.replaceTemplate(template, oldName);
      this._Addon.views.showProgressWindow(
        "Better Notes",
        `Template ${template.name} saved.`
      );
    }
    this.updateTemplateView();
  }

  deleteSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    this.removeTemplate(name);
    this.updateTemplateView();
  }

  getTemplates() {
    let templatesRaw: string = Zotero.Prefs.get(
      "Knowledge4Zotero.noteTemplate"
    );
    let templates: NoteTemplate[] = [];
    if (templatesRaw) {
      templates = JSON.parse(templatesRaw);
    }
    Zotero.debug(templates);
    console.log(templates);
    return templates;
  }

  getTemplateByName(
    name: string,
    templates: NoteTemplate[] = []
  ): NoteTemplate {
    templates = templates.length ? templates : this._templates;
    return templates.filter((e) => e.name === name)[0];
  }

  getTemplateIdByName(name: string, templates: NoteTemplate[] = []): number {
    templates = templates || this._templates;
    return templates.findIndex((e) => e.name === name);
  }

  setTemplates(templates: NoteTemplate[]) {
    this._templates = templates;
    Zotero.Prefs.set(
      "Knowledge4Zotero.noteTemplate",
      JSON.stringify(templates)
    );
  }

  saveTemplate(template: NoteTemplate) {
    const templates = this._templates;
    const idx = this.getTemplateIdByName(template.name, templates);
    if (idx !== -1) {
      templates[idx] = template;
      this.setTemplates(templates);
      return;
    }
    templates.push(template);
    this.setTemplates(templates);
  }

  replaceTemplate(template: NoteTemplate, oldName: string) {
    const templates = this.getTemplates();
    const idx = this.getTemplateIdByName(oldName, templates);
    if (idx !== -1) {
      templates.splice(idx, 1, template);
      this.setTemplates(templates);
    }
  }

  removeTemplate(name: string): boolean {
    const templates = this._templates;
    const idx = this.getTemplateIdByName(name, templates);
    if (idx !== -1) {
      templates.splice(idx, 1);
      this.setTemplates(templates);
      return true;
    }
    return false;
  }
}

export default AddonTemplate;
