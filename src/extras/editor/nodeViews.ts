import { TableView } from "prosemirror-tables";
import { EditorView } from "prosemirror-view";

export function initNodeViews(view: EditorView) {
  // @ts-ignore
  const tableNodeViewProto = Object.getPrototypeOf(view.nodeViews.table());

  tableNodeViewProto.update = TableView.prototype.update;
  tableNodeViewProto.ignoreMutation = TableView.prototype.ignoreMutation;
  tableNodeViewProto.constructor = TableView;
}
