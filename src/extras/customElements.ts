import { ContextPane } from "../elements/context";
import { NoteDetails } from "../elements/detailsPane";
import { NotePicker } from "../elements/notePicker";
import { OutlinePane } from "../elements/outlinePane";
import { NoteRelatedBox } from "../elements/related";
import { Workspace } from "../elements/workspace";

const elements = {
  "bn-context": ContextPane,
  "bn-outline": OutlinePane,
  "bn-details": NoteDetails as unknown as CustomElementConstructor,
  "bn-workspace": Workspace,
  "bn-note-picker": NotePicker,
  "bn-related-box": NoteRelatedBox,
};

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
