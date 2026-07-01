export function waitUntil(
  condition: () => boolean,
  callback: () => void,
  interval = 100,
  timeout = 10000,
) {
  const start = Date.now();
  const intervalId = setInterval(() => {
    if (condition()) {
      clearInterval(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      clearInterval(intervalId);
    }
  }, interval);
}

export function waitUtilAsync(
  condition: () => boolean,
  interval = 100,
  timeout = 10000,
) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    // Only log a throwing condition once per wait. Conditions that touch a
    // (possibly dead) editor iframe can throw on every tick, and logging each
    // one — with a stack trace — floods the console during startup/teardown.
    let logged = false;
    const _condition = () => {
      try {
        return condition();
      } catch (e) {
        if (!logged) {
          logged = true;
          ztoolkit.log(e);
        }
        return false;
      }
    };
    const intervalId = setInterval(() => {
      if (_condition()) {
        clearInterval(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(intervalId);
        reject();
      }
    }, interval);
  });
}
