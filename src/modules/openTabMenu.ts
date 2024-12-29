export function patchOpenTabMenu(win: _ZoteroTypes.MainWindow) {
  const Zotero_Tabs = win.Zotero_Tabs;
  const popupset = win.document.querySelector("popupset")!;
  const observer = new win.MutationObserver(async () => {
    await new Promise((resolve) =>
      requestIdleCallback(resolve, { timeout: 100 }),
    );
    // Find menupopup menuitem[label="${Zotero.getString('general.showInLibrary')}"]
    const menupopup = popupset.querySelector(
      `menupopup menuitem[label="${Zotero.getString("tabs.move")}"]`,
    )?.parentNode as XULPopupElement;
    ztoolkit.log("openTabMenu observer", popupset.children);
    if (menupopup && !menupopup.dataset.patched) {
      menupopup.dataset.patched = "true";
      const menuitem = menupopup.querySelector(
        `menuitem[label="${Zotero.getString("general.showInLibrary")}"]`,
      );
      ztoolkit.log("openTabMenu observer");

      menuitem?.addEventListener("command", () => {
        const { tab } = Zotero_Tabs._getTab(Zotero_Tabs.selectedID);
        if (tab && tab.type === "note") {
          let itemID = tab.data.itemID;
          const item = Zotero.Items.get(itemID);
          if (item && item.parentItemID) {
            itemID = item.parentItemID;
          }
          win.ZoteroPane.selectItem(itemID);
        }
      });
      //   observer.disconnect();
    }
  });
  observer.observe(popupset, { childList: true, subtree: true });
}

function openNoteTabMenu(
  x: number,
  y: number,
  id: string,
  win: _ZoteroTypes.MainWindow,
) {
  const Zotero_Tabs = win.Zotero_Tabs;
  const doc = win.document;
  const { tab, tabIndex } = Zotero_Tabs._getTab(id);
  let menuitem;
  const popup = doc.createXULElement("menupopup") as XULPopupElement;
  doc.querySelector("popupset")!.appendChild(popup);
  popup.addEventListener("popuphidden", function (event) {
    if (event.target === popup) {
      popup.remove();
    }
  });
  if (id !== "zotero-pane") {
    // Show in library
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("general.showInLibrary"));
    menuitem.addEventListener("command", () => {
      if (tab) {
        let itemID = tab.data.itemID;
        const item = Zotero.Items.get(itemID);
        if (item && item.parentItemID) {
          itemID = item.parentItemID;
        }
        ZoteroPane_Local.selectItem(itemID);
      }
    });
    popup.appendChild(menuitem);
    // Move tab
    const menu = doc.createXULElement("menu");
    menu.setAttribute("label", Zotero.getString("tabs.move"));
    const menupopup = doc.createXULElement("menupopup");
    menu.append(menupopup);
    popup.appendChild(menu);
    // Move to start
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("tabs.moveToStart"));
    menuitem.setAttribute("disabled", tabIndex == 1 ? "true" : "false");
    menuitem.addEventListener("command", () => {
      Zotero_Tabs.move(id, 1);
    });
    menupopup.appendChild(menuitem);
    // Move to end
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("tabs.moveToEnd"));
    menuitem.setAttribute(
      "disabled",
      tabIndex == Zotero_Tabs._tabs.length - 1 ? "true" : "false",
    );
    menuitem.addEventListener("command", () => {
      Zotero_Tabs.move(id, Zotero_Tabs._tabs.length);
    });
    menupopup.appendChild(menuitem);
    // Move to new window
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("tabs.moveToWindow"));
    menuitem.setAttribute("disabled", "false");
    menuitem.addEventListener("command", () => {
      const { tab } = Zotero_Tabs._getTab(id);
      Zotero_Tabs.close(id);
      const { itemID } = tab.data;
      addon.hooks.onOpenNote(itemID, "window", { forceTakeover: true });
    });
    menupopup.appendChild(menuitem);
    // Duplicate tab
    // menuitem = doc.createXULElement("menuitem");
    // menuitem.setAttribute("label", Zotero.getString("tabs.duplicate"));
    // menuitem.addEventListener("command", () => {
    //   if (tab.data.itemID) {
    //     const { secondViewState } = tab.data;
    //     Zotero.Reader.open(tab.data.itemID, null, {
    //       tabIndex: tabIndex + 1,
    //       allowDuplicate: true,
    //       secondViewState,
    //     });
    //   }
    // });
    // popup.appendChild(menuitem);
    // Separator
    popup.appendChild(doc.createXULElement("menuseparator"));
  }
  // Close
  if (id != "zotero-pane") {
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("general.close"));
    menuitem.addEventListener("command", () => {
      Zotero_Tabs.close(id);
    });
    popup.appendChild(menuitem);
  }
  // Close other tabs
  if (!(Zotero_Tabs._tabs.length == 2 && id != "zotero-pane")) {
    menuitem = doc.createXULElement("menuitem");
    menuitem.setAttribute("label", Zotero.getString("tabs.closeOther"));
    menuitem.addEventListener("command", () => {
      Zotero_Tabs.close(
        Zotero_Tabs._tabs
          .slice(1)
          .filter((x) => x.id != id)
          .map((x) => x.id),
      );
    });
    popup.appendChild(menuitem);
  }
  // Undo close
  menuitem = doc.createXULElement("menuitem");
  menuitem.setAttribute(
    "label",
    Zotero.getString(
      "tabs.undoClose",
      [],
      // If not disabled, show proper plural for tabs to reopen
      // @ts-ignore
      Zotero_Tabs._history.length
        ? // @ts-ignore
          Zotero_Tabs._history[Zotero_Tabs._history.length - 1].length
        : 1,
    ),
  );
  menuitem.setAttribute(
    "disabled",
    // @ts-ignore
    !Zotero_Tabs._history.length ? "true" : "false",
  );
  menuitem.addEventListener("command", () => {
    Zotero_Tabs.undoClose();
  });
  popup.appendChild(menuitem);
  popup.openPopupAtScreen(x, y, true);
}
