import { importImageToNote } from "./note";

declare type CustomAnnotationJSON =
  Partial<_ZoteroTypes.Annotations.AnnotationJson> & {
    id?: string;
    attachmentItemID?: number;
    text?: string;
    tags: any;
    imageAttachmentKey?: string | undefined;
  };

async function parseAnnotationJSON(annotationItem: Zotero.Item) {
  try {
    if (!annotationItem || !annotationItem.isAnnotation()) {
      return null;
    }
    const annotationJSON = await Zotero.Annotations.toJSON(annotationItem);
    const annotationObj = Object.assign(
      {},
      annotationJSON
    ) as CustomAnnotationJSON;
    annotationObj.id = annotationItem.key;
    annotationObj.attachmentItemID = annotationItem.parentItem?.id;
    delete annotationObj.key;
    for (const key in annotationObj) {
      annotationObj[key as keyof typeof annotationObj] =
        annotationObj[key as keyof typeof annotationObj] || ("" as any);
    }
    annotationObj.tags = annotationObj.tags || [];
    return annotationObj as Required<CustomAnnotationJSON>;
  } catch (e: unknown) {
    Zotero.logError(e as Error);
    return null;
  }
}

// Zotero.EditorInstanceUtilities.serializeAnnotations
function serializeAnnotations(
  annotations: Required<CustomAnnotationJSON>[],
  skipEmbeddingItemData: boolean = false,
  skipCitation: boolean = false
) {
  let storedCitationItems = [];
  let html = "";
  for (let annotation of annotations) {
    let attachmentItem = Zotero.Items.get(annotation.attachmentItemID);
    if (!attachmentItem) {
      continue;
    }

    if (
      (!annotation.text &&
        !annotation.comment &&
        !annotation.imageAttachmentKey &&
        !annotation.image) ||
      annotation.type === "ink"
    ) {
      continue;
    }

    let citationHTML = "";
    let imageHTML = "";
    let highlightHTML = "";
    let quotedHighlightHTML = "";
    let commentHTML = "";

    let storedAnnotation: any = {
      attachmentURI: Zotero.URI.getItemURI(attachmentItem),
      annotationKey: annotation.id,
      color: annotation.color,
      pageLabel: annotation.pageLabel,
      position: annotation.position,
    };

    // Citation
    let parentItem = skipCitation
      ? undefined
      : attachmentItem.parentID && Zotero.Items.get(attachmentItem.parentID);
    if (parentItem) {
      let uris = [Zotero.URI.getItemURI(parentItem)];
      let citationItem: any = {
        uris,
        locator: annotation.pageLabel,
      };

      // Note: integration.js` uses `Zotero.Cite.System.prototype.retrieveItem`,
      // which produces a little bit different CSL JSON
      // @ts-ignore
      let itemData = Zotero.Utilities.Item.itemToCSLJSON(parentItem);
      if (!skipEmbeddingItemData) {
        citationItem.itemData = itemData;
      }

      let item = storedCitationItems.find((item) =>
        item.uris.some((uri) => uris.includes(uri))
      );
      if (!item) {
        storedCitationItems.push({ uris, itemData });
      }

      storedAnnotation.citationItem = citationItem;
      let citation = {
        citationItems: [citationItem],
        properties: {},
      };

      let citationWithData = JSON.parse(JSON.stringify(citation));
      citationWithData.citationItems[0].itemData = itemData;
      let formatted =
        Zotero.EditorInstanceUtilities.formatCitation(citationWithData);
      citationHTML = `<span class="citation" data-citation="${encodeURIComponent(
        JSON.stringify(citation)
      )}">${formatted}</span>`;
    }

    // Image
    if (annotation.imageAttachmentKey) {
      // Normalize image dimensions to 1.25 of the print size
      let rect = annotation.position.rects[0];
      let rectWidth = rect[2] - rect[0];
      let rectHeight = rect[3] - rect[1];
      // Constants from pdf.js
      const CSS_UNITS = 96.0 / 72.0;
      const PDFJS_DEFAULT_SCALE = 1.25;
      let width = Math.round(rectWidth * CSS_UNITS * PDFJS_DEFAULT_SCALE);
      let height = Math.round((rectHeight * width) / rectWidth);
      imageHTML = `<img data-attachment-key="${
        annotation.imageAttachmentKey
      }" width="${width}" height="${height}" data-annotation="${encodeURIComponent(
        JSON.stringify(storedAnnotation)
      )}"/>`;
    }

    // Image in b64
    if (annotation.image) {
      imageHTML = `<img src="${annotation.image}"/>`;
    }

    // Text
    if (annotation.text) {
      let text = Zotero.EditorInstanceUtilities._transformTextToHTML.call(
        Zotero.EditorInstanceUtilities,
        annotation.text.trim()
      );
      highlightHTML = `<span class="highlight" data-annotation="${encodeURIComponent(
        JSON.stringify(storedAnnotation)
      )}">${text}</span>`;
      quotedHighlightHTML = `<span class="highlight" data-annotation="${encodeURIComponent(
        JSON.stringify(storedAnnotation)
      )}">${Zotero.getString(
        "punctuation.openingQMark"
      )}${text}${Zotero.getString("punctuation.closingQMark")}</span>`;
    }

    // Note
    if (annotation.comment) {
      commentHTML = Zotero.EditorInstanceUtilities._transformTextToHTML.call(
        Zotero.EditorInstanceUtilities,
        annotation.comment.trim()
      );
    }

    let template: string = "";
    if (annotation.type === "highlight") {
      template = Zotero.Prefs.get(
        "annotations.noteTemplates.highlight"
      ) as string;
    } else if (annotation.type === "note") {
      template = Zotero.Prefs.get("annotations.noteTemplates.note") as string;
    } else if (annotation.type === "image") {
      template = "<p>{{image}}<br/>{{citation}} {{comment}}</p>";
    }

    ztoolkit.log("Using note template:");
    ztoolkit.log(template);

    template = template.replace(
      /(<blockquote>[^<>]*?)({{highlight}})([\s\S]*?<\/blockquote>)/g,
      (match, p1, p2, p3) => p1 + "{{highlight quotes='false'}}" + p3
    );

    let vars = {
      color: annotation.color || "",
      // Include quotation marks by default, but allow to disable with `quotes='false'`
      highlight: (attrs: any) =>
        attrs.quotes === "false" ? highlightHTML : quotedHighlightHTML,
      comment: commentHTML,
      citation: citationHTML,
      image: imageHTML,
      tags: (attrs: any) =>
        (
          (annotation.tags && annotation.tags.map((tag: any) => tag.name)) ||
          []
        ).join(attrs.join || " "),
    };

    let templateHTML = Zotero.Utilities.Internal.generateHTMLFromTemplate(
      template,
      vars
    );
    // Remove some spaces at the end of paragraph
    templateHTML = templateHTML.replace(/([\s]*)(<\/p)/g, "$2");
    // Remove multiple spaces
    templateHTML = templateHTML.replace(/\s\s+/g, " ");
    html += templateHTML;
  }
  return { html, citationItems: storedCitationItems };
}

export async function importAnnotationImagesToNote(
  note: Zotero.Item | undefined,
  annotations: CustomAnnotationJSON[]
) {
  for (let annotation of annotations) {
    if (annotation.image && note) {
      annotation.imageAttachmentKey =
        (await importImageToNote(note, annotation.image)) || "";
      delete annotation.image;
    }
  }
}

export async function parseAnnotationHTML(
  annotations: Zotero.Item[],
  options: {
    noteItem?: Zotero.Item; // If you are sure there are no image annotations, note is not required.
    ignoreComment?: boolean;
    skipCitation?: boolean;
  } = {}
) {
  let annotationJSONList: CustomAnnotationJSON[] = [];
  for (const annot of annotations) {
    const annotJson = await parseAnnotationJSON(annot);
    if (options.ignoreComment && annotJson?.comment) {
      annotJson.comment = "";
    }
    annotationJSONList.push(annotJson!);
  }

  await importAnnotationImagesToNote(options.noteItem, annotationJSONList);
  const html = serializeAnnotations(
    annotationJSONList as Required<CustomAnnotationJSON>[],
    false,
    options.skipCitation
  ).html;
  return html;
}
