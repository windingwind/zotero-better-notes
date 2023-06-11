const { execSync } = require("child_process");
const { killZoteroWindows, killZoteroUnix } = require("./zotero-cmd.json");

const MAX_WAIT_TIME = 10000;

const startTime = new Date().getTime();

try {
  if (process.platform === "win32") {
    execSync(killZoteroWindows);

    // wait until zotero.exe is fully stopped. maximum wait for 10 seconds
    while (new Date().getTime() - startTime <= MAX_WAIT_TIME) {
      try {
        execSync('tasklist | find /i "zotero.exe"');
      } catch (e) {
        break;
      }
    }
  } else {
    execSync(killZoteroUnix);

    // wait until zotero is fully stopped. maximum wait for 10 seconds
    while (new Date().getTime() - startTime <= MAX_WAIT_TIME) {
      try {
        execSync("ps aux | grep -i zotero");
      } catch (e) {
        break;
      }
    }
  }
} catch (e) {}
