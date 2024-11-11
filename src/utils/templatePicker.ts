import { config } from "../../package.json";

export async function openTemplatePicker(
  options: {
    multiSelect?: boolean;
  } = {},
) {
  const { multiSelect = false } = options;
  const templates = addon.api.template
    .getTemplateKeys()
    .filter(
      (template) =>
        !addon.api.template.SYSTEM_TEMPLATE_NAMES.includes(template),
    );
  const args = {
    templates,
    multiSelect,
    selected: [] as string[],
    _initPromise: Zotero.Promise.defer(),
  };
  // @ts-ignore
  // args.wrappedJSObject = args;
  Services.ww.openWindow(
    // @ts-ignore
    null,
    `chrome://${config.addonRef}/content/templatePicker.xhtml`,
    "_blank",
    "chrome,modal,centerscreen,resizable=yes",
    args,
  );
  await args._initPromise.promise;
  return args.selected;
}
