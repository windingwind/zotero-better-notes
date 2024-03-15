import { ContextPane } from "../elements/context";
import { NoteDetails } from "../elements/detailsPane";
import { OutlinePane } from "../elements/outlinePane";
import { Workspace } from "../elements/workspace";

const elements = {
  "bn-context": ContextPane,
  "bn-outline": OutlinePane,
  "bn-details": NoteDetails as unknown as CustomElementConstructor,
  "bn-workspace": Workspace,
};

for (const [key, constructor] of Object.entries(elements)) {
  if (!customElements.get(key)) {
    customElements.define(key, constructor);
  }
}
