const TRANSLATOR_ID_BETTER_MARKDOWN = "1412e9e2-51e1-42ec-aa35-e036a895534c";

const configs = {};

configs[TRANSLATOR_ID_BETTER_MARKDOWN] = {
  translatorID: TRANSLATOR_ID_BETTER_MARKDOWN,
  label: "Better Note Markdown",
  creator: "Martynas Bagdonas; Winding",
  target: "md",
  minVersion: "5.0.97",
  maxVersion: "",
  priority: 50,
  configOptions: {
    noteTranslator: true,
  },
  displayOptions: {
    includeAppLinks: true,
  },
  inRepository: true,
  translatorType: 2,
  lastUpdated: "2022-06-01 23:26:46",
  _codePath:
    "chrome://Knowledge4Zotero/content/translators/Better Note Markdown.js",
};

async function loadTranslator(id) {
  const config = configs[id];
  const code = (await Zotero.File.getContentsAsync(config._codePath)).response;
  Zotero.debug(code);
  await Zotero.Translators.save(config, code);
  await Zotero.Translators.reinit();
}

export { TRANSLATOR_ID_BETTER_MARKDOWN, loadTranslator };
