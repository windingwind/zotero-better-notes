/*
 * This file defines the modules' base class.
 */


import Knowledge4Zotero from "./addon";

class AddonBase {
  protected _Addon: Knowledge4Zotero;
  constructor(parent: Knowledge4Zotero) {
    this._Addon = parent;
  }
}

export default AddonBase;
