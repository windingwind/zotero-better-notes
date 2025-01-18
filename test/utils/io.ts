export async function getTempDirectory() {
  let path = "";
  let attempts = 3;
  const zoteroTmpDirPath = Zotero.getTempDirectory().path;
  while (attempts--) {
    path = PathUtils.join(zoteroTmpDirPath, Zotero.Utilities.randomString());
    try {
      await IOUtils.makeDirectory(path, { ignoreExisting: false });
      break;
    } catch (e) {
      if (!attempts) throw e; // Throw on last attempt
    }
  }

  return path;
}
