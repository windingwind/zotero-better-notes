import { build } from "esbuild";
import path from "path";

const buildDir = "build";

export async function main() {
  await build({
    entryPoints: ["./src/extras/*.*"],
    outdir: path.join(buildDir, "addon/chrome/content/scripts"),
    bundle: true,
    target: ["firefox115"],
  }).catch(() => exit(1));
}
