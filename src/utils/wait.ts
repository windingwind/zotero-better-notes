export function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000
) {
  const start = Date.now();
  const intervalId = ztoolkit.getGlobal("setInterval")(() => {
    if (condition()) {
      ztoolkit.getGlobal("clearInterval")(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      ztoolkit.getGlobal("clearInterval")(intervalId);
    }
  }, interval);
}

export function waitUtilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const intervalId = ztoolkit.getGlobal("setInterval")(() => {
      if (condition()) {
        ztoolkit.getGlobal("clearInterval")(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        ztoolkit.getGlobal("clearInterval")(intervalId);
        reject();
      }
    }, interval);
  });
}
