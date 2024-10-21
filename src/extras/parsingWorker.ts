import { MessageHelper } from "zotero-plugin-toolkit";

export { handlers };

function parseHTMLLines(html: string): string[] {
  const randomString: string = `${Math.random()}`;
  console.time(`parseHTMLLines-${randomString}`);

  // Remove container with one of the attrs named data-schema-version if exists
  if (html.includes("data-schema-version")) {
    html = html.replace(/<div[^>]*data-schema-version[^>]*>/, "");
    html = html.replace(/<\/div>/, "");
  }
  const noteLines = html.split("\n").filter((e) => e);

  // A cache for temporarily stored lines
  let previousLineCache = [];
  let nextLineCache = [];

  const forceInline = ["table", "blockquote", "pre", "ol", "ul"];
  const selfInline: string[] = [];
  const forceInlineStack = [];
  let forceInlineFlag = false;
  let selfInlineFlag = false;

  const parsedLines = [];
  for (const line of noteLines) {
    // restore self inline flag
    selfInlineFlag = false;

    // For force inline tags, set flag to append lines to current line
    for (const tag of forceInline) {
      const startReg = `<${tag}`;
      const isStart = line.includes(startReg);
      const endReg = `</${tag}>`;
      const isEnd = line.includes(endReg);
      if (isStart && !isEnd) {
        forceInlineStack.push(tag);
        // console.log("push", tag, line, forceInlineStack);
        forceInlineFlag = true;
        break;
      }
      if (isEnd && !isStart) {
        forceInlineStack.pop();
        // console.log("pop", tag, line, forceInlineStack);
        // Exit force inline mode if the stack is empty
        if (forceInlineStack.length === 0) {
          forceInlineFlag = false;
        }
        break;
      }
    }

    if (forceInlineFlag) {
      nextLineCache.push(line);
    } else {
      // For self inline tags, cache start as previous line and end as next line
      for (const tag of selfInline) {
        const isStart = line.includes(`<${tag}`);
        const isEnd = line.includes(`</${tag}>`);
        if (isStart && !isEnd) {
          selfInlineFlag = true;
          nextLineCache.push(line);
          break;
        }
        if (!isStart && isEnd) {
          selfInlineFlag = true;
          previousLineCache.push(line);
          break;
        }
      }

      if (!selfInlineFlag) {
        // Append cache to previous line
        if (previousLineCache.length) {
          parsedLines[parsedLines.length - 1] += `\n${previousLineCache.join(
            "\n",
          )}`;
          previousLineCache = [];
        }
        let nextLine = "";
        // Append cache to next line
        if (nextLineCache.length) {
          nextLine = nextLineCache.join("\n");
          nextLineCache = [];
        }
        if (nextLine) {
          nextLine += "\n";
        }
        nextLine += `${line}`;
        parsedLines.push(nextLine);
      }
    }
  }
  console.timeEnd(`parseHTMLLines-${randomString}`);

  return parsedLines;
}

const funcs = {
  parseHTMLLines,
};

const handlers = MessageHelper.wrapHandlers(funcs);

const messageServer = new MessageHelper({
  canBeDestroyed: true,
  dev: true,
  name: "parsingWorker",
  target: self,
  handlers,
});

messageServer.start();
