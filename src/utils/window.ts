export { isWindowAlive, getFocusedWindow, isElementVisible };

function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}

function getFocusedWindow() {
  const wins = Services.wm.getEnumerator("") as unknown as Window[];
  for (const win of wins) {
    if (win.document?.hasFocus()) {
      return win;
    }
  }
}

function isElementVisible(el: Element | null): boolean {
  if (!el || !el.ownerDocument) return false;

  const rect = el.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const elementAtCenter = el.ownerDocument.elementFromPoint(centerX, centerY);

  // Check if the element at the center point is the element or one of its descendants
  return el.contains(elementAtCenter);
}
