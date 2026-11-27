async function waitUtilAsync(condition: () => boolean, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (condition()) return;
    } catch {
      // iframe may not be ready yet
    }
    await Zotero.Promise.delay(100);
  }
  throw new Error("waitUtilAsync timed out");
}

describe("Outline - Tree view", function () {
  let iframe: any;

  function makeNodes(names: string[]) {
    const root: any = { model: { id: -1 }, children: [] };
    return names.map((name, i) => {
      const node: any = {
        model: { id: i, name, level: 1, lineIndex: i, endIndex: i },
        children: [],
        parent: root,
      };
      root.children.push(node);
      return node;
    });
  }

  this.beforeEach(async function () {
    const doc = Zotero.getMainWindow().document;
    iframe = doc.createXULElement("iframe");
    iframe.style.height = "400px";
    doc.documentElement.append(iframe);
    iframe.setAttribute("src", "chrome://BetterNotes/content/treeView.html");
    await waitUtilAsync(
      () =>
        iframe.contentDocument?.readyState === "complete" &&
        !!iframe.contentWindow?.DevExpress,
    );
  });

  this.afterEach(function () {
    iframe?.remove();
  });

  async function setData(names: string[]) {
    iframe.contentWindow.postMessage(
      { type: "setMindMapData", nodes: makeNodes(names), expandLevel: 6 },
      "*",
    );
    const doc = iframe.contentDocument as Document;
    await waitUtilAsync(() => {
      const texts = Array.from(
        doc.querySelectorAll("#treeview .dx-treeview-item"),
      ).map((e) => e.textContent);
      return JSON.stringify(texts) === JSON.stringify(names);
    });
  }

  it("renders and updates headings", async function () {
    await setData(["Intro", "Methods"]);
    await setData(["Intro", "Methods", "Results"]);
    const doc = iframe.contentDocument as Document;
    assert.equal(doc.querySelectorAll("#treeview .dx-treeview-node").length, 3);
  });

  it("posts jumpNode when a heading is clicked", async function () {
    await setData(["Intro", "Methods"]);
    const win = iframe.contentWindow;
    const received = new Promise<any>((resolve) => {
      win.addEventListener("message", (e: MessageEvent) => {
        if (e.data?.type === "jumpNode") resolve(e.data);
      });
    });
    const items = iframe.contentDocument.querySelectorAll(
      "#treeview .dx-treeview-item",
    );
    (items[1] as HTMLElement).click();
    const data = await received;
    assert.equal(data.lineIndex, 1);
  });
});
