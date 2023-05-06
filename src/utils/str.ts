import seedrandom = require("seedrandom");

export function slice(str: string, len: number) {
  return str.length > len ? `${str.slice(0, len - 3)}...` : str;
}

export function fill(
  str: string,
  len: number,
  options: { char: string; position: "start" | "end" } = {
    char: " ",
    position: "end",
  }
) {
  if (str.length >= len) {
    return str;
  }
  return str[options.position === "start" ? "padStart" : "padEnd"](
    len - str.length,
    options.char
  );
}

export function formatPath(path: string, suffix: string = "") {
  path = Zotero.File.normalizeToUnix(path);
  if (Zotero.isWin) {
    path = path.replace(/\\/g, "/");
    path = OS.Path.join(...path.split(/\//));
  }
  if (Zotero.isMac && path.charAt(0) !== "/") {
    path = "/" + path;
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
  const random: Function = seedrandom(seed);
  for (let i = 0; i < len; i++) {
    const rnum = Math.floor(random() * chars.length);
    str += chars.substring(rnum, rnum + 1);
  }
  return str;
}

function arrayBufferToBase64(buffer: ArrayBufferLike) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return ztoolkit.getGlobal("btoa")(binary);
}

export async function getItemDataURL(item: Zotero.Item) {
  let path = (await item.getFilePathAsync()) as string;
  let buf = new Uint8Array((await OS.File.read(path, {})) as Uint8Array).buffer;
  return (
    "data:" + item.attachmentContentType + ";base64," + arrayBufferToBase64(buf)
  );
}
