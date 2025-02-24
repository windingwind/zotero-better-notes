import { Plugin } from "prosemirror-state";

export function tableSize() {
  return new Plugin({
    view(editorView) {
      // Helper to update a single element’s classes based on its scroll state.
      const updateShadow = (target: HTMLElement) => {
        console.log("updateShadow tableSize");
        if (
          target &&
          target.classList &&
          target.classList.contains("tableWrapper")
        ) {
          if (target.scrollLeft > 0) {
            target.classList.add("scrolled-x");
          } else {
            target.classList.remove("scrolled-x");
          }
          if (target.scrollTop > 0) {
            target.classList.add("scrolled-y");
          } else {
            target.classList.remove("scrolled-y");
          }
        }
      };

      // Check all tableWrapper elements in the editor DOM.
      const updateAllShadows = () => {
        const wrappers = editorView.dom.querySelectorAll(".tableWrapper");
        wrappers.forEach((wrapper) => {
          updateShadow(wrapper as HTMLElement);
        });
      };

      // Capture scroll events from any descendant using capture mode.
      const onScroll = (event: Event) => {
        updateShadow(event.target as HTMLElement);
      };

      // Attach the scroll listener on the editor's DOM element.
      editorView.dom.addEventListener("scroll", onScroll, true);

      return {
        update(view, prevState) {
          console.log("update tableSize");

          // On every state update, recheck all tableWrapper scroll positions.
          updateAllShadows();
        },
        destroy() {
          editorView.dom.removeEventListener("scroll", onScroll, true);
        },
      };
    },
  });
}
