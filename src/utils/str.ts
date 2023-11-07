import seedrandom = require("seedrandom");
import pathHelper = require("path-browserify");

export function slice(str: string, len: number) {
  return str.length > len ? `${str.slice(0, len - 3)}...` : str;
}

export function fill(
  str: string,
  len: number,
  options: { char: string; position: "start" | "end" } = {
    char: " ",
    position: "end",
  },
) {
  if (str.length >= len) {
    return str;
  }
  return str[options.position === "start" ? "padStart" : "padEnd"](
    len - str.length,
    options.char,
  );
}

export function formatPath(path: string, suffix: string = "") {
  path = Zotero.File.normalizeToUnix(path);
  if (Zotero.isWin) {
    path = path.replace(/\//g, "\\");
  }
  if (suffix && !path.endsWith(suffix)) {
    path += suffix;
  }
  return path;
}

export async function getFileContent(path: string) {
  const contentOrXHR = await Zotero.File.getContentsAsync(path);
  const content =
    typeof contentOrXHR === "string"
      ? contentOrXHR
      : (contentOrXHR as any as XMLHttpRequest).response;
  return content;
}

export function randomString(len: number, seed?: string, chars?: string) {
  if (!chars) {
    chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  }
  if (!len) {
    len = 8;
  }
  let str = "";
  const random = seedrandom(seed);
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(random() * chars.length);
    str += chars.substring(rnum, rnum + 1);
  }
  return str;
}

function arrayBufferToBase64(buffer: ArrayBufferLike) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return ztoolkit.getGlobal("btoa")(binary);
}

export async function getItemDataURL(item: Zotero.Item) {
  const path = (await item.getFilePathAsync()) as string;
  const buf = (await IOUtils.read(path)).buffer;
  return (
    "data:" + item.attachmentContentType + ";base64," + arrayBufferToBase64(buf)
  );
}

export async function fileExists(path: string): Promise<boolean> {
  if (!path) {
    return false;
  }
  try {
    // IOUtils.exists() will throw error if path is not valid
    return await IOUtils.exists(formatPath(path));
  } catch (e) {
    ztoolkit.log("[fileExists]", e);
    return false;
  }
}

export function jointPath(...paths: string[]) {
  try {
    return formatPath(
      pathHelper.join(...paths.map((p) => p.replaceAll("\\", "/"))),
    );
  } catch (e) {
    ztoolkit.log("[jointPath]", e);
    return "";
  }
}
