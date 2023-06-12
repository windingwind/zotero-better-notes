import { exit, argv } from "process";
import minimist from "minimist";
import { execSync } from "child_process";
import details from "../package.json" assert { type: "json" };
const { addonID, addonName } = details.config;
const version = details.version;
import cmd from "./zotero-cmd.json" assert { type: "json" };
const { exec } = cmd;

// Run node reload.js -h for help
const args = minimist(argv.slice(2));

const zoteroPath = exec[args.zotero || args.z || Object.keys(exec)[0]];
const profile = args.profile || args.p;
const startZotero = `${zoteroPath} --debugger --purgecaches ${
  profile ? `-p ${profile}` : ""
}`;

const script = `
(async () => {
  const { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
  const addon = await AddonManager.getAddonByID("${addonID}");
  addon.disable();
  await Zotero.Promise.delay(1000);
  addon.enable();
  const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
  progressWindow.changeHeadline("${addonName} Hot Reload");
  progressWindow.progress = new progressWindow.ItemProgress(
    "chrome://zotero/skin/tick.png",
    "VERSION=${version}, BUILD=${new Date().toLocaleString()}. By zotero-plugin-toolkit"
  );
  progressWindow.progress.setProgress(100);
  progressWindow.show();
  progressWindow.startCloseTimer(5000);
})()`;

const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(script)}`;

const command = `${startZotero} -url "${url}"`;

execSync(command);
exit(0);
