import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { findLatexMath } from "../shared/latexMath";

/** Convert a completed LaTeX formula in the same transaction as its closing key. */
export function handleLatexInput(
  view: EditorView,
  from: number,
  to: number,
  text: string,
) {
  if (view.composing || !/[)\]}]$/.test(text)) return false;
  const { state } = view;
  const $from = state.doc.resolve(from);
  const $to = state.doc.resolve(to);
  if (!$from.sameParent($to) || $from.parent.type.name !== "paragraph")
    return false;
  if (
    (state.storedMarks || $from.marks()).some(
      (mark) => mark.type.name === "code" || mark.type.name === "link",
    )
  )
    return false;
  // A one-character placeholder keeps document positions aligned across inline atoms.
  const leafText = (node: any) =>
    node.type.name === "hardBreak" ? "\n" : "\ufffc";
  let prefix =
    $from.parent.textBetween(0, $from.parentOffset, "\n", leafText) + text;
  const parts = [
    { pos: $from.before(), node: $from.parent, length: prefix.length },
  ];
  // Display environments often span paragraphs when Enter is used in a note.
  let previous = $from.before();
  while (prefix.length < 50000) {
    const node = state.doc.resolve(previous).nodeBefore;
    if (!node || node.type.name !== "paragraph") break;
    previous -= node.nodeSize;
    const value = node.textBetween(0, node.content.size, "\n", leafText);
    parts.unshift({ pos: previous, node, length: value.length + 1 });
    prefix = value + "\n" + prefix;
  }
  const math = findLatexMath(prefix).find(
    (match) => match.to === prefix.length,
  );
  if (!math) return false;
  let offset = math.from;
  let first = parts[0];
  for (const part of parts) {
    if (offset < part.length) {
      first = part;
      break;
    }
    offset -= part.length;
  }
  if (!math.display && first.pos !== $from.before()) return false;
  const start = first.pos + 1 + offset;
  let protectedContent = false;
  state.doc.nodesBetween(start, to, (node) => {
    if (
      (node.isInline && !node.isText && node.type.name !== "hardBreak") ||
      node.marks.some(
        (mark) => mark.type.name === "code" || mark.type.name === "link",
      )
    )
      protectedContent = true;
  });
  if (protectedContent) return false;
  const type =
    state.schema.nodes[math.display ? "math_display" : "math_inline"];
  if (!type) return false;
  const formula = type.create(null, state.schema.text(math.tex));
  const tr = state.tr;
  if (math.display) {
    const paragraph = first.node;
    const before = paragraph.content.cut(0, offset);
    const after = $to.parent.content.cut($to.parentOffset);
    const nodes = [];
    if (before.size) nodes.push(paragraph.copy(before));
    nodes.push(formula);
    // Leave an editable paragraph after the display formula.
    nodes.push($to.parent.copy(after));
    tr.replaceWith(first.pos, $from.after(), nodes);
    const cursor =
      first.pos + (before.size ? before.size + 2 : 0) + formula.nodeSize + 1;
    const Selection = state.selection.constructor as typeof TextSelection;
    tr.setSelection(Selection.near(tr.doc.resolve(cursor)));
  } else {
    tr.replaceWith(start, to, formula);
    const Selection = state.selection.constructor as typeof TextSelection;
    tr.setSelection(Selection.near(tr.doc.resolve(start + formula.nodeSize)));
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

export function initLatexInputPlugin(plugins: readonly Plugin[]) {
  const plugin = new Plugin({
    key: new PluginKey("betterNotesLatexInput"),
    props: { handleTextInput: handleLatexInput },
  });
  (plugin.spec as any).betterNotes = "latexInput";
  // Run before built-in input handlers.
  return [plugin, ...plugins];
}
