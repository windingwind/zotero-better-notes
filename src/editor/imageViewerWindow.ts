/*
 * This file contains image viewer for note editor.
 */

import BetterNotes from "../addon";
import AddonBase from "../module";

class EditorImageViewer extends AddonBase {
  _window: Window;
  scaling: number;
  srcList: string[];
  idx: number;
  title: string;
  pined: boolean;
  anchorPosition: {
    left: number;
    top: number;
  };
  icons: any;
  constructor(parent: BetterNotes) {
    super(parent);
    this.scaling = 1;
    this.title = "Note";
    this.pined = false;
    this.icons = {
      pin: `<svg t="1668685819555" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1445" width="18" height="18"><path d="M631.637333 178.432a64 64 0 0 1 19.84 13.504l167.616 167.786667a64 64 0 0 1-19.370666 103.744l-59.392 26.304-111.424 111.552-8.832 122.709333a64 64 0 0 1-109.098667 40.64l-108.202667-108.309333-184.384 185.237333-45.354666-45.162667 184.490666-185.344-111.936-112.021333a64 64 0 0 1 40.512-109.056l126.208-9.429333 109.44-109.568 25.706667-59.306667a64 64 0 0 1 84.181333-33.28z m-25.450666 58.730667l-30.549334 70.464-134.826666 135.04-149.973334 11.157333 265.408 265.6 10.538667-146.474667 136.704-136.874666 70.336-31.146667-167.637333-167.765333z" p-id="1446"></path></svg>`,
      pined: `<svg t="1668685864340" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1624" width="18" height="18"><path d="M631.637333 178.432a64 64 0 0 1 19.84 13.504l167.616 167.786667a64 64 0 0 1-19.370666 103.744l-59.392 26.304-111.424 111.552-8.832 122.709333a64 64 0 0 1-109.098667 40.64l-108.202667-108.309333-184.384 185.237333-45.354666-45.162667 184.490666-185.344-111.936-112.021333a64 64 0 0 1 40.512-109.056l126.208-9.429333 109.44-109.568 25.706667-59.306667a64 64 0 0 1 84.181333-33.28z" p-id="1625"></path></svg>`,
    };
  }

  async onInit(srcs: string[], idx: number, title: string, pined: boolean) {
    if (!this._window || this._window.closed) {
      this._window = window.open(
        "chrome://Knowledge4Zotero/content/imageViewer.html",
        "betternotes-note-imagepreview",
        `chrome,centerscreen,resizable,status,width=500,height=550${
          pined ? ",alwaysRaised=yes" : ""
        }`
      );
      let t = 0;
      // Wait for window
      while (t < 500 && this._window.document.readyState !== "complete") {
        await Zotero.Promise.delay(10);
        t += 1;
      }
      const container = this._window.document.querySelector(
        ".container"
      ) as HTMLDivElement;
      const img = this._window.document.querySelector(
        "#image"
      ) as HTMLImageElement;

      this._window.document
        .querySelector("#left")
        .addEventListener("click", (e) => {
          this.setIndex("left");
        });
      this._window.document
        .querySelector("#bigger")
        .addEventListener("click", (e) => {
          this.anchorPosition = {
            left: img.scrollWidth / 2 - container.scrollLeft / 2,
            top: img.scrollHeight / 2 - container.scrollLeft / 2,
          };
          this.setScale(this.scaling * 1.1);
        });
      this._window.document
        .querySelector("#smaller")
        .addEventListener("click", (e) => {
          this.anchorPosition = {
            left: img.scrollWidth / 2 - container.scrollLeft / 2,
            top: img.scrollHeight / 2 - container.scrollLeft / 2,
          };
          this.setScale(this.scaling / 1.1);
        });
      this._window.document
        .querySelector("#resetwidth")
        .addEventListener("click", (e) => {
          this.setScale(1);
        });
      this._window.document
        .querySelector("#right")
        .addEventListener("click", (e) => {
          this.setIndex("right");
        });
      this._window.document
        .querySelector("#copy")
        .addEventListener("click", (e) => {
          this._Addon.toolkit.Tool.getCopyHelper()
            .addImage(this.srcList[this.idx])
            .copy();
          this._Addon.ZoteroViews.showProgressWindow(
            "Better Notes",
            "Image Copied."
          );
        });
      this._window.document
        .querySelector("#save")
        .addEventListener("click", async (e) => {
          let parts = this.srcList[this.idx].split(",");
          if (!parts[0].includes("base64")) {
            return;
          }
          let mime = parts[0].match(/:(.*?);/)[1];
          let bstr = atob(parts[1]);
          let n = bstr.length;
          let u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          let ext = Zotero.MIME.getPrimaryExtension(mime, "");
          const filename = await this._Addon.toolkit.Tool.openFilePicker(
            Zotero.getString("noteEditor.saveImageAs"),
            "save",
            [[`Image(*.${ext})`, `*.${ext}`]],
            `${Zotero.getString("fileTypes.image").toLowerCase()}.${ext}`
          );
          if (filename) {
            await OS.File.writeAtomic(
              this._Addon.NoteUtils.formatPath(filename),
              u8arr
            );
          }
          this._Addon.ZoteroViews.showProgressWindow(
            "Better Notes",
            `Image Saved to ${filename}`
          );
        });
      this._window.document.querySelector("#pin").innerHTML =
        this.icons[pined ? "pined" : "pin"];
      this._window.document.querySelector("#pin-tooltip").innerHTML = pined
        ? "Unpin"
        : "Pin";
      this._window.document
        .querySelector("#pin")
        .addEventListener("click", (e) => {
          this.setPin();
        });
      this._window.addEventListener("keydown", (e) => {
        // ctrl+w or esc
        if ((e.key === "w" && e.ctrlKey) || e.keyCode === 27) {
          this._window.close();
        }
        this.anchorPosition = {
          left: img.scrollWidth / 2 - container.scrollLeft / 2,
          top: img.scrollHeight / 2 - container.scrollLeft / 2,
        };
        if (e.keyCode === 37 || e.keyCode === 40) {
          this.setIndex("left");
        }
        if (e.keyCode === 38 || e.keyCode === 39) {
          this.setIndex("right");
        }
        if (e.key === "0") {
          this.setScale(1);
        } else if (e.keyCode === 107 || e.keyCode === 187 || e.key === "=") {
          this.setScale(this.scaling * 1.1);
        } else if (e.key === "-") {
          this.setScale(this.scaling / 1.1);
        }
      });
      this._window.addEventListener("wheel", async (e) => {
        this.anchorPosition = {
          left: e.pageX - container.offsetLeft,
          top: e.pageY - container.offsetTop,
        };
        function normalizeWheelEventDirection(evt) {
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
          this.setScale(
            this.scaling *
              Math.pow(delta > 0 ? 1.1 : 1 / 1.1, Math.round(Math.abs(delta)))
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
        // if (this.scaling <= 1) {
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

    this.srcList = srcs;
    this.idx = idx;
    this.title = title || "Note";
    this.pined = pined;
    this.setImage();
    this.setScale(1);
    this._window.focus();
  }

  private setImage() {
    (this._window.document.querySelector("#image") as HTMLImageElement).src =
      this.srcList[this.idx];
    this.setTitle();
    (
      this._window.document.querySelector(
        "#left-container"
      ) as HTMLButtonElement
    ).style.opacity = this.idx === 0 ? "0.5" : "1";
    (
      this._window.document.querySelector(
        "#right-container"
      ) as HTMLButtonElement
    ).style.opacity = this.idx === this.srcList.length - 1 ? "0.5" : "1";
  }

  private setIndex(type: "left" | "right") {
    if (type === "left") {
      this.idx > 0 ? (this.idx -= 1) : undefined;
    }
    if (type === "right") {
      this.idx < this.srcList.length - 1 ? (this.idx += 1) : undefined;
    }
    this.setImage();
  }

  private setScale(scaling: number) {
    const oldScale = this.scaling;
    this.scaling = scaling;
    if (this.scaling > 10) {
      this.scaling = 10;
    }
    if (this.scaling < 0.1) {
      this.scaling = 0.1;
    }
    const container = this._window.document.querySelector(
      ".container"
    ) as HTMLDivElement;
    (
      this._window.document.querySelector("#image") as HTMLImageElement
    ).style.width = `calc(100% * ${this.scaling})`;
    if (this.scaling > 1) {
      container.scrollLeft +=
        this.anchorPosition.left * (this.scaling - oldScale);
      container.scrollTop +=
        this.anchorPosition.top * (this.scaling - oldScale);
    }
    (
      this._window.document.querySelector(
        "#bigger-container"
      ) as HTMLButtonElement
    ).style.opacity = this.scaling === 10 ? "0.5" : "1";
    (
      this._window.document.querySelector(
        "#smaller-container"
      ) as HTMLButtonElement
    ).style.opacity = this.scaling === 0.1 ? "0.5" : "1";
    // (
    //   this._window.document.querySelector("#image") as HTMLImageElement
    // ).style.cursor = this.scaling <= 1 ? "default" : "move";
  }

  private setTitle() {
    this._window.document.querySelector("title").innerText = `${this.idx + 1}/${
      this.srcList.length
    }:${this.title}`;
  }

  private setPin() {
    this._window.close();
    this.onInit(this.srcList, this.idx, this.title, !this.pined);
  }
}

export default EditorImageViewer;
