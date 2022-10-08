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
