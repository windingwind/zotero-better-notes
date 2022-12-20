/*
 * This file contains template window related code.
 */

import Knowledge4Zotero from "../addon";
import { NoteTemplate } from "../utils";
import AddonBase from "../module";

class TemplateWindow extends AddonBase {
  private _window: Window;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
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

  getSelectedTemplateName(): string {
    const listbox = this._window.document.getElementById(
      "template-list"
    ) as XUL.ListItem;
    const selectedItem = listbox.selectedItem;
    if (selectedItem) {
      const name = selectedItem.getAttribute("id");
      return name;
    }
    return "";
  }

  updateTemplateView() {
    const templates = this._Addon.TemplateController.getTemplateKeys();
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
      if (
        this._Addon.TemplateController._systemTemplateNames.includes(
          template.name
        )
      ) {
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
    const templateText = this._Addon.TemplateController.getTemplateText(name);

    const header = this._window.document.getElementById(
      "editor-name"
    ) as XUL.Textbox;
    const text = this._window.document.getElementById(
      "editor-textbox"
    ) as XUL.Textbox;
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
      if (!this._Addon.TemplateController._systemTemplateNames.includes(name)) {
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
    this._Addon.TemplateController.setTemplate(template);
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

    const ids = io.dataOut as number[];
    const note: Zotero.Item = Zotero.Items.get(ids).filter(
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
    this._Addon.TemplateController.setTemplate(template);
    this.updateTemplateView();
  }

  saveSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    const header = this._window.document.getElementById(
      "editor-name"
    ) as XUL.Textbox;
    const text = this._window.document.getElementById(
      "editor-textbox"
    ) as XUL.Textbox;

    if (
      this._Addon.TemplateController._systemTemplateNames.includes(name) &&
      header.value !== name
    ) {
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `Template ${name} is a system template. Modifying template name is not allowed.`
      );
      return;
    }

    const template = this._Addon.TemplateController.getTemplateKey(name);
    template.name = header.value;
    template.text = text.value;
    this._Addon.TemplateController.setTemplate(template);
    if (name !== template.name) {
      this._Addon.TemplateController.removeTemplate(name);
    }
    this._Addon.ZoteroViews.showProgressWindow(
      "Better Notes",
      `Template ${template.name} saved.`
    );

    this.updateTemplateView();
  }

  deleteSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    if (this._Addon.TemplateController._systemTemplateNames.includes(name)) {
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `Template ${name} is a system template. Removing system template is note allowed.`
      );
      return;
    }
    this._Addon.TemplateController.removeTemplate(name);
    this.updateTemplateView();
  }

  resetSelectedTemplate() {
    const name = this.getSelectedTemplateName();
    if (this._Addon.TemplateController._systemTemplateNames.includes(name)) {
      const text = this._window.document.getElementById(
        "editor-textbox"
      ) as XUL.Textbox;
      text.value = this._Addon.TemplateController._defaultTemplates.find(
        (t) => t.name === name
      ).text;
      this._Addon.ZoteroViews.showProgressWindow(
        "Better Notes",
        `Template ${name} is reset. Please save before leaving.`
      );
    }
  }
}

export default TemplateWindow;
