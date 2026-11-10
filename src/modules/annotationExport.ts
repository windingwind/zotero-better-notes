import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";

const commentPref = "annotationExport.includeComment";

export function registerAnnotationExportMenu() {
  Zotero.Reader.registerEventListener(
    "createAnnotationContextMenu",
    onAnnotationContextMenu,
    config.addonID,
  );
}

export function unregisterAnnotationExportMenu() {
  Zotero.Reader.unregisterEventListener(
    "createAnnotationContextMenu",
    onAnnotationContextMenu,
  );
}

const onAnnotationContextMenu: _ZoteroTypes.Reader.EventHandler<
  "createAnnotationContextMenu"
> = ({ reader, params, append }) => {
  if (reader._item.attachmentContentType !== "application/pdf") return;
  // Reader arrays belong to an unprivileged compartment; keep Zotero items here.
  const annotations = Array.from(params.ids, (key) =>
    Zotero.Items.getByLibraryAndKey(reader._item.libraryID, key),
  );
  if (
    !annotations.length ||
    !annotations.every(
      (item) =>
        item &&
        item.isAnnotation() &&
        ["highlight", "underline"].includes(item.annotationType),
    )
  )
    return;

  const copyOption = {
    label: getString("annotationExport-copy"),
    onCommand: () => {
      try {
        const output = (annotations as Zotero.Item[]).map((item) =>
          formatAnnotationExport(item, Boolean(getPref(commentPref))),
        );
        new ztoolkit.Clipboard()
          .addText(output.map((item) => item.text).join("\n\n"), "text/plain")
          .addText(output.map((item) => item.html).join("\n"), "text/html")
          .copy();
      } catch (error) {
        Zotero.logError(error as Error);
        reader._internalReader.setErrorMessage(
          getString("annotationExport-failed"),
        );
      }
    },
  };
  const commentOption = {
    label: getString("annotationExport-includeComment"),
    checked: Boolean(getPref(commentPref)),
    onCommand: () => setPref(commentPref, !getPref(commentPref)),
  };
  // @ts-expect-error Reader accepts multiple items as one group; typings are singular.
  append(copyOption, commentOption);
};

export function formatAnnotationExport(
  annotation: Zotero.Item,
  includeComment: boolean,
) {
  const attachment = annotation.parentItem;
  if (!attachment || attachment.attachmentContentType !== "application/pdf") {
    throw new Error("Annotation has no PDF attachment");
  }
  const position = JSON.parse(annotation.annotationPosition);
  if (!Number.isInteger(position.pageIndex) || position.pageIndex < 0) {
    throw new Error("Annotation has no valid PDF page index");
  }
  const library = Zotero.Libraries.get(attachment.libraryID);
  if (!library) throw new Error("Annotation library not found");
  const libraryPath =
    library.libraryType === "user"
      ? "library"
      : library.libraryType === "group"
        ? `groups/${Zotero.Groups.getGroupIDFromLibraryID(attachment.libraryID)}`
        : undefined;
  if (!libraryPath) throw new Error("Unsupported annotation library");

  const doc = new DOMParser().parseFromString("", "text/html");
  const container = doc.createElement("div");
  const paragraph = doc.createElement("p");
  container.append(paragraph);
  const plainText = (value: string) => {
    const node = doc.createElement("div");
    node.innerHTML = Zotero.EditorInstanceUtilities._transformTextToHTML(value);
    node.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    return node.textContent || "";
  };
  const escapeMarkdown = (value: string) =>
    value.replace(/([\\`*_{}[\]<>#!|~])/g, "\\$1");
  const quote = `“${plainText(annotation.annotationText.trim())}”`;
  paragraph.append(quote);
  let text = escapeMarkdown(quote);
  const addLink = (label: string, href: string) => {
    const link = doc.createElement("a");
    link.textContent = label;
    link.setAttribute("href", href);
    paragraph.append(" (", link, ")");
    text += ` ([${escapeMarkdown(label)}](${href}))`;
  };
  const parent = attachment.parentItem;
  if (parent) {
    const citation = Zotero.EditorInstanceUtilities.formatCitation({
      citationItems: [
        {
          uris: [Zotero.URI.getItemURI(parent)],
          itemData: Zotero.Utilities.Item.itemToCSLJSON(parent),
          locator: annotation.annotationPageLabel,
        },
      ],
      properties: {},
    });
    const node = doc.createElement("div");
    node.innerHTML = citation;
    const label = (node.textContent || "").replace(/^\(([\s\S]*)\)$/, "$1");
    addLink(label, `zotero://select/${libraryPath}/items/${parent.key}`);
  }
  addLink(
    "pdf",
    `zotero://open-pdf/${libraryPath}/items/${attachment.key}?page=${position.pageIndex + 1}&annotation=${annotation.key}`,
  );
  if (includeComment && annotation.annotationComment.trim()) {
    const comment = `${getString("annotationExport-comment")}${plainText(annotation.annotationComment.trim())}`;
    const node = doc.createElement("p");
    node.style.whiteSpace = "pre-wrap";
    node.textContent = comment;
    container.append(node);
    text += `\n\n${escapeMarkdown(comment)}`;
  }
  return { text, html: container.innerHTML };
}
