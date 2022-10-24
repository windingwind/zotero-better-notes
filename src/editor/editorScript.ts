// TODO: Move this somewhere else
const { Fragment, Slice } = require("prosemirror-model");
const { Step, StepResult } = require("prosemirror-transform");

class SetAttrsStep extends Step {
  // :: (number, Object | null)
  constructor(pos, attrs) {
    super();
    this.pos = pos;
    this.attrs = attrs;
  }

  apply(doc) {
    let target = doc.nodeAt(this.pos);
    if (!target) return StepResult.fail("No node at given position");
    let newNode = target.type.create(this.attrs, Fragment.emtpy, target.marks);
    let slice = new Slice(Fragment.from(newNode), 0, target.isLeaf ? 0 : 1);
    return StepResult.fromReplace(doc, this.pos, this.pos + 1, slice);
  }

  invert(doc) {
    let target = doc.nodeAt(this.pos);
    return new SetAttrsStep(this.pos, target ? target.attrs : null);
  }

  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deleted ? null : new SetAttrsStep(pos.pos, this.attrs);
  }

  toJSON() {
    return { stepType: "setAttrs", pos: this.pos, attrs: this.attrs };
  }

  static fromJSON(schema, json) {
    if (
      typeof json.pos != "number" ||
      (json.attrs != null && typeof json.attrs != "object")
    )
      throw new RangeError("Invalid input for SetAttrsStep.fromJSON");
    return new SetAttrsStep(json.pos, json.attrs);
  }
}

// @ts-ignore
window.SetAttrsStep = SetAttrsStep;

// @ts-ignore
window.updateImageDimensions = function (
  nodeID,
  width,
  height,
  state,
  dispatch
) {
  let { tr } = state;
  console.log(nodeID, width, height, state, dispatch);
  state.doc.descendants((node, pos) => {
    if (node.type.name === "image" && node.attrs.nodeID === nodeID) {
      tr.step(new SetAttrsStep(pos, { ...node.attrs, width, height }));
      tr.setMeta("addToHistory", false);
      tr.setMeta("system", true);
      dispatch(tr);
      return false;
    }
  });
};

window.addEventListener(
  "message",
  async (e) => {
    if (e.data.type === "exportPDF") {
      console.log("exportPDF");
      const container = document.getElementById(
        "editor-container"
      ) as HTMLElement;
      container.style.display = "none";

      const fullPageStyle = document.createElement("style");
      fullPageStyle.innerHTML =
        "@page { margin: 0; } @media print{ body { height : auto; -webkit-print-color-adjust: exact; color-adjust: exact; }}";
      document.body.append(fullPageStyle);

      let t = 0;
      let imageFlag = false;
      while (!imageFlag && t < 500) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 10);
        });
        imageFlag = !Array.prototype.find.call(
          document.querySelectorAll("img"),
          (e) => !e.getAttribute("src") || e.style.display === "none"
        );
        t += 1;
      }

      const editNode = document.querySelector(".primary-editor") as HTMLElement;
      const printNode = editNode.cloneNode(true) as HTMLElement;
      printNode.style.padding = "20px";
      document.body.append(printNode);

      let printFlag = false;
      window.onafterprint = (e) => {
        console.log("Print Dialog Closed..");
        printFlag = true;
        document.title = "Printed";
      };
      window.onmouseover = (e) => {
        if (printFlag) {
          document.title = "Printed";
          printNode.remove();
          container.style.removeProperty("display");
        }
      };
      document.title = (printNode?.firstChild as HTMLElement).innerText;
      console.log(document.title);
      window.print();
    } else if (e.data.type === "resizeImage") {
      console.log("resizeImage");
      // @ts-ignore
      window.updateImageDimensions(
        // @ts-ignore
        _currentEditorInstance._editorCore.view.state.selection.node.attrs
          .nodeID,
        e.data.width,
        undefined,
        // @ts-ignore
        _currentEditorInstance._editorCore.view.state,
        // @ts-ignore
        _currentEditorInstance._editorCore.view.dispatch
      );
    }
  },
  false
);
