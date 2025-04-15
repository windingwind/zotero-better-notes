import { MessageHelper } from "zotero-plugin-toolkit";

import {
  note2rehype,
  rehype2remark,
  rehype2note,
  remark2rehype,
  remark2md,
  remark2latex,
  md2remark,
  content2diff,
  md2html,
} from "../convert";

export { handlers };

const handlers = {
  note2rehype,
  rehype2remark,
  rehype2note,
  remark2rehype,
  remark2md,
  remark2latex,
  md2remark,
  content2diff,
  md2html,
};

const messageServer = new MessageHelper({
  canBeDestroyed: true,
  dev: true,
  name: "convertWorker",
  target: self,
  handlers,
});

messageServer.start();
