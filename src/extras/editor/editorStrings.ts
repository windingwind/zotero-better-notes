import { insert } from "../../utils/editor";

export { formatMessage };

function formatMessage(message: string, locale: string) {
  const stringObj = editorStrings[message as keyof typeof editorStrings];
  if (!stringObj) {
    return message;
  }

  return stringObj[locale as "en-US" | "zh-CN"] || message;
}

const editorStrings = {
  insertTemplate: {
    "en-US": "Insert Template",
    "zh-CN": "插入模板",
  },
  outboundLink: {
    "en-US": "Insert Outbound Link (Link to another note)",
    "zh-CN": "插入出链 (链接到另一个笔记)",
  },
  inboundLink: {
    "en-US": "Insert Inbound Link in another note (Link to this note)",
    "zh-CN": "插入入链到另一笔记 (链接到本笔记)",
  },
  insertCitation: {
    "en-US": "Insert Citation",
    "zh-CN": "插入引用",
  },
  openAttachment: {
    "en-US": "Open attachment of parent item",
    "zh-CN": "打开父条目的附件",
  },
  copySectionLink: {
    "en-US": "Copy Section Link",
    "zh-CN": "复制章节链接",
  },
  copyLineLink: {
    "en-US": "Copy Line Link",
    "zh-CN": "复制行链接",
  },
  heading1: {
    "en-US": "Heading 1",
    "zh-CN": "一级标题",
  },
  heading2: {
    "en-US": "Heading 2",
    "zh-CN": "二级标题",
  },
  heading3: {
    "en-US": "Heading 3",
    "zh-CN": "三级标题",
  },
  paragraph: {
    "en-US": "Paragraph",
    "zh-CN": "段落",
  },
  monospaced: {
    "en-US": "Monospaced",
    "zh-CN": "等宽",
  },
  bulletList: {
    "en-US": "Bullet List",
    "zh-CN": "无序列表",
  },
  orderedList: {
    "en-US": "Ordered List",
    "zh-CN": "有序列表",
  },
  blockquote: {
    "en-US": "Blockquote",
    "zh-CN": "引用",
  },
  mathBlock: {
    "en-US": "Math Block",
    "zh-CN": "数学",
  },
  clearFormatting: {
    "en-US": "Clear Format",
    "zh-CN": "清除格式",
  },
  table: {
    "en-US": "Table",
    "zh-CN": "表格",
  },
};
