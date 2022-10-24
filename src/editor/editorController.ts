/*
 * This file realizes editor watch.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class EditorController extends AddonBase {
  editorHistory: Array<{
    instance: Zotero.EditorInstance;
    time: number;
  }>;
  editorPromise: ZoteroPromise;
  activeEditor: Zotero.EditorInstance;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.editorHistory = [];
  }

  startWaiting() {
    this.editorPromise = Zotero.Promise.defer();
  }

  async waitForEditor() {
    await this.editorPromise.promise;
  }

  injectScripts(_window: Window) {
    if (!_window.document.getElementById("betternotes-script")) {
      const messageScript = _window.document.createElement("script");
      messageScript.id = "betternotes-script";
      messageScript.innerHTML = `__placeholder:editorScript.js__`;
      _window.document.head.append(messageScript);
    }
  }

  recordEditor(instance: Zotero.EditorInstance) {
    this.editorHistory.push({
      instance: instance,
      time: new Date().getTime(),
    });
    const aliveInstances = Zotero.Notes._editorInstances.map(
      (_i) => _i.instanceID
    );
    this.editorHistory = this.editorHistory.filter((obj) =>
      aliveInstances.includes(obj.instance.instanceID)
    );

    if (this.editorPromise) {
      this.editorPromise.resolve();
    }
  }
}

export default EditorController;
