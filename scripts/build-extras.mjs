import { build } from "esbuild";
import path from "path";

const buildDir = "build";

export async function main() {
  await build({
    entryPoints: ["./src/extras/*.ts"],
    outdir: path.join(buildDir, "addon/chrome/content/scripts"),
    bundle: true,
    target: ["firefox102"],
  }).catch(() => exit(1));
}
