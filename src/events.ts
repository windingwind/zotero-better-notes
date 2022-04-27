import { AddonBase } from "./base";

class AddonEvents extends AddonBase {
  constructor(parent: Notero) {
    super(parent);
  }

  public async onInit() {
    Zotero.debug("Notero: init called");

    this.resetState();
  }

  private resetState(): void {
    // Reset preferrence state.
  }
}

export default AddonEvents;
