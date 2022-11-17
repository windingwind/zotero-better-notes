/*
 * This file contains image viewer for note editor.
 */

import Knowledge4Zotero from "../addon";
import AddonBase from "../module";

class EditorImageViewer extends AddonBase {
  _window: Window;
  scaling: number;
  srcList: string[];
  idx: number;
  title: string;
  anchorPosition: {
    left: number;
    top: number;
  };
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.scaling = 1;
    this.title = "Note";
  }

  async onInit(srcs: string[], idx: number, title: string) {
    if (!this._window || this._window.closed) {
      this._window = window.open(
        "chrome://Knowledge4Zotero/content/imageViewer.html",
        "",
        "chrome,centerscreen,resizable,status,width=400,height=450"
      );
      let t = 0;
      console.log(this._window.document?.readyState);
      // Wait for window
      while (t < 500 && this._window.document.readyState !== "complete") {
        console.log(this._window.document?.readyState);
        await Zotero.Promise.delay(10);
        t += 1;
      }

      this._window.document
        .querySelector("#left")
        .addEventListener("click", (e) => {
          this.setIndex("left");
        });
      this._window.document
        .querySelector("#right")
        .addEventListener("click", (e) => {
          this.setIndex("right");
        });
      const container = this._window.document.querySelector(
        ".container"
      ) as HTMLDivElement;
      const img = this._window.document.querySelector(
        "#image"
      ) as HTMLImageElement;
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
        if (e.ctrlKey) {
          const delta = normalizeWheelEventDirection(e);
          this.setScale(
            this.scaling *
              Math.pow(delta > 0 ? 1.1 : 1 / 1.1, Math.round(Math.abs(delta)))
          );
        }
      });
    }

    this.srcList = srcs;
    this.idx = idx;
    this.title = title || "Note";
    this.setImage();
    this.setScale(1);
    this._window.focus();
  }

  private setImage() {
    (this._window.document.querySelector("#image") as HTMLImageElement).src =
      this.srcList[this.idx];
    this.setTitle();
    (
      this._window.document.querySelector("#left-container") as HTMLButtonElement
    ).style.visibility = this.idx === 0 ? "hidden" : "visible";
    (
      this._window.document.querySelector("#right-container") as HTMLButtonElement
    ).style.visibility =
      this.idx === this.srcList.length - 1 ? "hidden" : "visible";
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
  }

  private setTitle() {
    this._window.document.querySelector("title").innerText = `${this.idx + 1}/${
      this.srcList.length
    }:${this.title}`;
  }
}

export default EditorImageViewer;
