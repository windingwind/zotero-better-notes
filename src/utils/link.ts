export function getNoteLinkParams(link: string) {
  try {
    const url = new (ztoolkit.getGlobal("URL"))(link);
    const pathList = url.pathname.split("/").filter((s) => s);
    const noteKey = pathList.pop();
    const id = pathList.pop();
    let libraryID: number;
    if (id === "u") {
      libraryID = Zotero.Libraries.userLibraryID;
    } else {
      libraryID = Zotero.Groups.getLibraryIDFromGroupID(id);
    }
    const line = url.searchParams.get("line");
    return {
      link,
      libraryID,
      noteKey,
      noteItem: Zotero.Items.getByLibraryAndKey(libraryID, noteKey || "") as
        | Zotero.Item
        | false,
      ignore: Boolean(url.searchParams.get("ignore")),
      lineIndex: typeof line === "string" ? parseInt(line) : null,
    };
  } catch (e: unknown) {
    return {
      link,
      libraryID: -1,
      noteKey: undefined,
      noteItem: false as const,
      ignore: null,
      lineIndex: null,
    };
  }
}

export function getNoteLink(
  noteItem: Zotero.Item,
  options: {
    ignore?: boolean | null;
    lineIndex?: number | null;
  } = {},
) {
  const libraryID = noteItem.libraryID;
  const library = Zotero.Libraries.get(libraryID);
  if (!library) {
    return;
  }
  let groupID: string;
  if (library.libraryType === "user") {
    groupID = "u";
  } else if (library.libraryType === "group") {
    groupID = `${library.id}`;
  } else {
    return "";
  }
  const noteKey = noteItem.key;
  let link = `zotero://note/${groupID}/${noteKey}/`;
  const addParam = (link: string, param: string): string => {
    const lastChar = link[link.length - 1];
    if (lastChar === "/") {
      link += "?";
    } else if (lastChar !== "?" && lastChar !== "&") {
      link += "&";
    }
    return `${link}${param}`;
  };
  if (Object.keys(options).length) {
    if (options.ignore) {
      link = addParam(link, "ignore=1");
    }
    if (options.lineIndex) {
      link = addParam(link, `line=${options.lineIndex}`);
    }
  }
  return link;
}

export function getLinkedNotesRecursively(
  link: string,
  ignoreIds: number[] = [],
) {
  const linkParams = getNoteLinkParams(link);
  if (!linkParams.noteItem) return [];
  const noteItem = linkParams.noteItem;
  if (ignoreIds.includes(noteItem.id)) {
    return [];
  }
  const doc = ztoolkit
    .getDOMParser()
    .parseFromString(noteItem.getNote(), "text/html");
  const links = Array.from(doc.querySelectorAll("a"));
  return links.reduce(
    (acc, link) => {
      const linkParams = getNoteLinkParams(link.href);
      if (linkParams.noteItem) {
        acc.push(linkParams.noteItem.id);
        acc.push(...getLinkedNotesRecursively(link.href, acc));
      }
      return acc;
    },
    [linkParams.noteItem.id] as number[],
  );
}
