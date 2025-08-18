import { promises as fs } from "fs";
import path from "path";

async function readDir(dir, files = []) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.join(dir, dirent.name);
    // console.log(res);
    if (dirent.isDirectory()) {
      await readDir(res, files);
    } else {
      files.push(res);
    }
  }
  return files;
}

async function bundle() {
  const dir = "node_modules/zotero-types";
  const files = await readDir(dir);
  const dtsFiles = files.filter((file) => file.endsWith(".d.ts"));
  // Add the ztypes.d.ts file
  dtsFiles.push("scripts/types/templates.d.ts");
  const fileContents = await Promise.all(
    dtsFiles.map((file) => fs.readFile(file, "utf-8")),
  );
  let content = fileContents.join("\n");
  // Remove all lines starts with `/// `
  content = content.replace(/^\/\/\/ .*\n/gm, "");
  // Remove all `export {};` lines, which breaks the language server
  content = content.replace(/export .*\n/g, "");
  // Read and compare if the content is different
  let existingContent = "";
  try {
    existingContent = await fs.readFile(
      "addon/chrome/content/lib/js/ztypes.d.ts",
      "utf-8",
    );
  } catch (e) {
    // File does not exist, we will create it
  }
  if (existingContent === content) {
    console.log("No changes in ztypes.d.ts, skipping write.");
    return;
  }

  await fs.writeFile("addon/chrome/content/lib/js/ztypes.d.ts", content);
}

export { bundle as default, bundle as bundleTypes };
