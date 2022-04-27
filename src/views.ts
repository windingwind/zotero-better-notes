import { AddonBase } from "./base";

class AddonViews extends AddonBase {
  progressWindowIcon: object;

  constructor(parent: Notero) {
    super(parent);
    this.progressWindowIcon = {
      success: "chrome://zotero/skin/tick.png",
      fail: "chrome://zotero/skin/cross.png",
      default: "chrome://notero/skin/favicon.png",
    };
  }

  showProgressWindow(
    header: string,
    context: string,
    type: string = "default",
    t: number = 5000
  ) {
    let progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
    progressWindow.changeHeadline(header);
    progressWindow.progress = new progressWindow.ItemProgress(
      this.progressWindowIcon[type],
      context
    );
    progressWindow.show();
    if (t > 0) {
      progressWindow.startCloseTimer(t);
    }
  }
}

export default AddonViews;
