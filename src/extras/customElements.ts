import { ContextPane } from "../elements/workspace/contextPane";
import { DetailsPane } from "../elements/workspace/detailsPane";
import { OutlinePicker } from "../elements/linkCreator/outlinePicker";
import { NotePicker } from "../elements/linkCreator/notePicker";
import { NotePreview } from "../elements/linkCreator/notePreview";
import { OutlinePane } from "../elements/workspace/outlinePane";
import { NoteRelatedBox } from "../elements/workspace/related";
import { Workspace } from "../elements/workspace/workspace";
import { InboundCreator } from "../elements/linkCreator/inboundCreator";
import { OutboundCreator } from "../elements/linkCreator/outboundCreator";

const elements = {
  "bn-context": ContextPane,
  "bn-outline": OutlinePane,
  "bn-details": DetailsPane as unknown as CustomElementConstructor,
  "bn-workspace": Workspace,
  "bn-note-picker": NotePicker,
  "bn-note-outline": OutlinePicker,
  "bn-note-preview": NotePreview,
  "bn-inbound-creator": InboundCreator,
  "bn-outbound-creator": OutboundCreator,
  "bn-related-box": NoteRelatedBox,
};

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
