import { build } from "esbuild";
import path from "path";

const buildDir = "build";

export async function main() {
  await build({
    entryPoints: ["src/extras/editorScript.ts"],
    bundle: true,
    outfile: path.join(
      buildDir,
      "addon/chrome/content/scripts/editorScript.js",
    ),
    target: ["firefox102"],
  }).catch(() => exit(1));

  await build({
    entryPoints: ["src/extras/docxWorker.ts"],
    bundle: true,
    outfile: path.join(buildDir, "addon/chrome/content/scripts/docxWorker.js"),
    target: ["firefox102"],
  }).catch(() => exit(1));
}
