const TreeModel = require("./treemodel");

class Knowledge {
  _note: ZoteroItem;
  constructor(noteItem: ZoteroItem) {
    this._note = noteItem;
    // this.createKnowledgeItem();
  }
  //   createKnowledgeItem() {
  //     return;
  //   }

  addNoteLink(noteItem: ZoteroItem) {}

  getOutline(): Node {
    let parser = Components.classes[
      "@mozilla.org/xmlextras/domparser;1"
    ].createInstance(Components.interfaces.nsIDOMParser);
    let doc = parser.parseFromString(this._note.getNote(), "text/html");

    let metadataContainer: Element = doc.querySelector(
      "body > div[data-schema-version]"
    );

    let tree = new TreeModel();
    /*
    tree-model/index.js: line 40
    TreeModel.prototype.parse = function (model) {
    var i, childCount, node;
    Annotate the line 40 of:

    // if (!(model instanceof Object)) {
    //   throw new TypeError('Model must be of type object.');
    // }
    */
    let root = tree.parse({
      rank: 0,
      lineIndex: -1,
    });
    let currentNode = root;
    for (let i = 0; i < metadataContainer.children.length; i++) {
      let currentRank = 7;
      let lineElement = metadataContainer.children[i];
      if (lineElement.tagName[0] === "H" && lineElement.tagName.length === 2) {
        let _rank = parseInt(lineElement.tagName[1]);
        if (_rank >= 1 && _rank <= 6) {
          currentRank = _rank;
        }
        while (currentNode.model.rank >= currentRank) {
          currentNode = currentNode.parent;
        }
        currentNode.addChild(
          tree.parse({
            rank: currentRank,
            lineIndex: i,
          })
        );
      }
    }
    return root;
  }

  jumpToNote(noteLinke: string) {}

  export() {}
}

export { Knowledge };
