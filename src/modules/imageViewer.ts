import { config } from "../../package.json";
import { ICONS } from "../utils/config";
import { showHint, showHintWithLink } from "../utils/hint";
import { formatPath } from "../utils/str";
import { waitUtilAsync } from "../utils/wait";

export async function showImageViewer(
  srcList: string[],
  idx: number,
  title: string,
) {
  if (
    !addon.data.imageViewer.window ||
    Components.utils.isDeadWrapper(addon.data.imageViewer.window) ||
    addon.data.imageViewer.window.closed
  ) {
    addon.data.imageViewer.window = window.openDialog(
      `chrome://${config.addonRef}/content/imageViewer.html`,
      `${config.addonRef}-imageViewer`,
      `chrome,centerscreen,resizable,status,width=500,height=550,dialog=no${
        addon.data.imageViewer.pined ? ",alwaysRaised=yes" : ""
      }`,
    )!;
    await waitUtilAsync(
      () => addon.data.imageViewer.window?.document.readyState === "complete",
    );
    const container = addon.data.imageViewer.window.document.querySelector(
      ".container",
    ) as HTMLDivElement;
    const img = addon.data.imageViewer.window.document.querySelector(
      "#image",
    ) as HTMLImageElement;

    addon.data.imageViewer.window.document
      .querySelector("#left")
      ?.addEventListener("click", (e) => {
        setIndex("left");
      });
    addon.data.imageViewer.window.document
      .querySelector("#bigger")
      ?.addEventListener("click", (e) => {
        addon.data.imageViewer.anchorPosition = {
          left: img.scrollWidth / 2 - container.scrollLeft / 2,
          top: img.scrollHeight / 2 - container.scrollLeft / 2,
        };
        setScale(addon.data.imageViewer.scaling * 1.1);
      });
    addon.data.imageViewer.window.document
      .querySelector("#smaller")
      ?.addEventListener("click", (e) => {
        addon.data.imageViewer.anchorPosition = {
          left: img.scrollWidth / 2 - container.scrollLeft / 2,
          top: img.scrollHeight / 2 - container.scrollLeft / 2,
        };
        setScale(addon.data.imageViewer.scaling / 1.1);
      });
    addon.data.imageViewer.window.document
      .querySelector("#resetwidth")
      ?.addEventListener("click", (e) => {
        setScale(1);
      });
    addon.data.imageViewer.window.document
      .querySelector("#right")
      ?.addEventListener("click", (e) => {
        setIndex("right");
      });
    addon.data.imageViewer.window.document
      .querySelector("#copy")
      ?.addEventListener("click", (e) => {
        new ztoolkit.Clipboard()
          .addImage(addon.data.imageViewer.srcList[addon.data.imageViewer.idx])
          .copy();
        showHint("Image Copied.");
      });
    addon.data.imageViewer.window.document
      .querySelector("#save")
      ?.addEventListener("click", async (e) => {
        const parts =
          addon.data.imageViewer.srcList[addon.data.imageViewer.idx].split(",");
        if (!parts[0].includes("base64")) {
          return;
        }
        const mime = parts[0].match(/:(.*?);/)![1];
        const bstr = ztoolkit.getGlobal("atob")(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const ext = Zotero.MIME.getPrimaryExtension(mime, "");
        const filename = await new ztoolkit.FilePicker(
          Zotero.getString("noteEditor.saveImageAs"),
          "save",
          [[`Image(*.${ext})`, `*.${ext}`]],
          `${Zotero.getString("fileTypes.image").toLowerCase()}.${ext}`,
          addon.data.imageViewer.window,
          "images",
        ).open();
        if (filename) {
          await OS.File.writeAtomic(formatPath(filename), u8arr);
          showHintWithLink(
            `Image Saved to ${filename}`,
            "Show in Folder",
            (ev) => {
              Zotero.File.reveal(filename);
            },
          );
        }
      });
    addon.data.imageViewer.window.document.querySelector("#pin")!.innerHTML =
      addon.data.imageViewer.pined
        ? ICONS.imageViewerPined
        : ICONS.imageViewerPin;
    addon.data.imageViewer.window.document.querySelector(
      "#pin-tooltip",
    )!.innerHTML = addon.data.imageViewer.pined ? "Unpin" : "Pin";
    addon.data.imageViewer.window.document
      .querySelector("#pin")
      ?.addEventListener("click", (e) => {
        setPin();
      });
    addon.data.imageViewer.window.addEventListener("keydown", (e) => {
      // ctrl+w or esc
      if ((e.key === "w" && e.ctrlKey) || e.keyCode === 27) {
        addon.data.imageViewer.window?.close();
      }
      addon.data.imageViewer.anchorPosition = {
        left: img.scrollWidth / 2 - container.scrollLeft / 2,
        top: img.scrollHeight / 2 - container.scrollLeft / 2,
      };
      if (e.keyCode === 37 || e.keyCode === 40) {
        setIndex("left");
      }
      if (e.keyCode === 38 || e.keyCode === 39) {
        setIndex("right");
      }
      if (e.key === "0") {
        setScale(1);
      } else if (e.keyCode === 107 || e.keyCode === 187 || e.key === "=") {
        setScale(addon.data.imageViewer.scaling * 1.1);
      } else if (e.key === "-") {
        setScale(addon.data.imageViewer.scaling / 1.1);
      }
    });
    addon.data.imageViewer.window.addEventListener("wheel", async (e) => {
      addon.data.imageViewer.anchorPosition = {
        left: e.pageX - container.offsetLeft,
        top: e.pageY - container.offsetTop,
      };
      function normalizeWheelEventDirection(evt: WheelEvent) {
        let delta = Math.hypot(evt.deltaX, evt.deltaY);
        const angle = Math.atan2(evt.deltaY, evt.deltaX);
        if (-0.25 * Math.PI < angle && angle < 0.75 * Math.PI) {
          // All that is left-up oriented has to change the sign.
          delta = -delta;
        }
        return delta;
      }
      const delta = normalizeWheelEventDirection(e);
      if (e.ctrlKey) {
        setScale(
          addon.data.imageViewer.scaling *
            Math.pow(delta > 0 ? 1.1 : 1 / 1.1, Math.round(Math.abs(delta))),
        );
      } else if (e.shiftKey) {
        container.scrollLeft -= delta * 10;
      } else {
        container.scrollLeft += e.deltaX * 10;
        container.scrollTop += e.deltaY * 10;
      }
    });
    img.addEventListener("mousedown", (e) => {
      e.preventDefault();
      // if (addon.data.imageViewer.scaling <= 1) {
      //   return;
      // }
      img.onmousemove = (e) => {
        e.preventDefault();
        container.scrollLeft -= e.movementX;
        container.scrollTop -= e.movementY;
      };
      img.onmouseleave = () => {
        img.onmousemove = null;
        img.onmouseup = null;
      };
      img.onmouseup = () => {
        img.onmousemove = null;
        img.onmouseup = null;
      };
    });
  }

  addon.data.imageViewer.srcList = srcList;
  addon.data.imageViewer.idx = idx;
  addon.data.imageViewer.title = title || "Note";
  setImage();
  setScale(1);
  addon.data.imageViewer.window.focus();
}

function setImage() {
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#image",
    ) as HTMLImageElement
  ).src = addon.data.imageViewer.srcList[addon.data.imageViewer.idx];
  setTitle();
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#left-container",
    ) as HTMLButtonElement
  ).style.opacity = addon.data.imageViewer.idx === 0 ? "0.5" : "1";
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#right-container",
    ) as HTMLButtonElement
  ).style.opacity =
    addon.data.imageViewer.idx === addon.data.imageViewer.srcList.length - 1
      ? "0.5"
      : "1";
}

function setIndex(type: "left" | "right") {
  if (type === "left") {
    addon.data.imageViewer.idx > 0
      ? (addon.data.imageViewer.idx -= 1)
      : undefined;
  }
  if (type === "right") {
    addon.data.imageViewer.idx < addon.data.imageViewer.srcList.length - 1
      ? (addon.data.imageViewer.idx += 1)
      : undefined;
  }
  setImage();
}

function setScale(scaling: number) {
  const oldScale = addon.data.imageViewer.scaling;
  addon.data.imageViewer.scaling = scaling;
  if (addon.data.imageViewer.scaling > 10) {
    addon.data.imageViewer.scaling = 10;
  }
  if (addon.data.imageViewer.scaling < 0.1) {
    addon.data.imageViewer.scaling = 0.1;
  }
  const container = addon.data.imageViewer.window?.document.querySelector(
    ".container",
  ) as HTMLDivElement;
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#image",
    ) as HTMLImageElement
  ).style.width = `calc(100% * ${addon.data.imageViewer.scaling})`;
  if (addon.data.imageViewer.scaling > 1) {
    container.scrollLeft +=
      addon.data.imageViewer.anchorPosition!.left *
      (addon.data.imageViewer.scaling - oldScale);
    container.scrollTop +=
      addon.data.imageViewer.anchorPosition!.top *
      (addon.data.imageViewer.scaling - oldScale);
  }
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#bigger-container",
    ) as HTMLButtonElement
  ).style.opacity = addon.data.imageViewer.scaling === 10 ? "0.5" : "1";
  (
    addon.data.imageViewer.window?.document.querySelector(
      "#smaller-container",
    ) as HTMLButtonElement
  ).style.opacity = addon.data.imageViewer.scaling === 0.1 ? "0.5" : "1";
  // (
  //   addon.data.imageViewer.window.document.querySelector("#image") as HTMLImageElement
  // ).style.cursor = addon.data.imageViewer.scaling <= 1 ? "default" : "move";
}

function setTitle() {
  addon.data.imageViewer.window!.document.querySelector(
    "title",
  )!.innerText! = `${addon.data.imageViewer.idx + 1}/${
    addon.data.imageViewer.srcList.length
  }:${addon.data.imageViewer.title}`;
}

function setPin() {
  addon.data.imageViewer.window?.close();
  addon.data.imageViewer.pined = !addon.data.imageViewer.pined;
  showImageViewer(
    addon.data.imageViewer.srcList,
    addon.data.imageViewer.idx,
    addon.data.imageViewer.title,
  );
}
