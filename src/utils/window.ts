import { getString } from "./locale";

export { isWindowAlive, localeWindow };

function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

function localeWindow(win: Window) {
  Array.from(win.document.querySelectorAll("*[locale-target]")).forEach(
    (elem) => {
      const errorInfo = "Locale Error";
      const locales = elem.getAttribute("locale-target")?.split(",");
      locales?.forEach((key) => {
        const isProp = key in elem;
        try {
          const localeString = getString(
            (isProp ? (elem as any)[key] : elem.getAttribute(key)).trim() || ""
          );
          isProp
            ? ((elem as any)[key] = localeString)
            : elem.setAttribute(key, localeString);
        } catch (error) {
          isProp
            ? ((elem as any)[key] = errorInfo)
            : elem.setAttribute(key, errorInfo);
        }
      });
    }
  );
}
