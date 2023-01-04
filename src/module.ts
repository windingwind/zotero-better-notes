/*
 * This file defines the modules' base class.
 */


import BetterNotes from "./addon";

class AddonBase {
  protected _Addon: BetterNotes;
  constructor(parent: BetterNotes) {
    this._Addon = parent;
  }
}

export default AddonBase;
