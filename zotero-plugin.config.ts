import pkg from "./package.json";
import { defineConfig } from "zotero-plugin-scaffold";
import { replaceInFile } from "replace-in-file";

const TEST_PREFS = {};
// Disable user guide, keep in sync with src/modules/userGuide.ts
TEST_PREFS[`${pkg.config.prefsPrefix}.latestTourVersion`] = 1;

export default defineConfig({
  source: ["src", "addon"],
  dist: "build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  server: {
    asProxy: false,
  },

  build: {
    assets: ["addon/**/*.*"],
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    esbuildOptions: [
      {
        entryPoints: ["src/index.ts"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        bundle: true,
        target: "firefox115",
        outfile: `build/addon/chrome/content/scripts/${pkg.config.addonRef}.js`,
      },
      {
        entryPoints: ["src/extras/*.*"],
        define: {
          __env__: `"${process.env.NODE_ENV}"`,
        },
        outdir: "build/addon/chrome/content/scripts",
        bundle: true,
        target: ["firefox115"],
      },
    ],
    prefs: {
      prefix: pkg.config.prefsPrefix,
    },
    hooks: {
      "build:bundle": (ctx) => {
        return replaceInFile({
          files: ["README.md"],
          from: /^ {2}- \[Latest Version.*/gm,
          to: `  - [Latest Version: ${ctx.version}](${ctx.xpiDownloadLink})`,
        }) as Promise<any>;
      },
    },
  },
  release: {
    bumpp: {
      execute: "npm run build",
      all: true,
    },
  },
  test: {
    entries: ["test/"],
    prefs: TEST_PREFS,
    abortOnFail: true,
    exitOnFinish: false,
    hooks: {},
    waitForPlugin: `() => Zotero.${pkg.config.addonRef}.data.initialized`,
  },

  // If you need to see a more detailed build log, uncomment the following line:
  // logLevel: "trace",
});
