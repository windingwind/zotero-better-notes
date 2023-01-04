import AddonModule from "../module";
import { addonRef } from "../../package.json";

class AddonLocale extends AddonModule {
  private stringBundle: any;

  public initLocale() {
    this.stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle(`chrome://${addonRef}/locale/addon.properties`);
  }

  public getString(localString: string): string {
    return this.stringBundle.GetStringFromName(localString);
  }
}

export default AddonLocale;
