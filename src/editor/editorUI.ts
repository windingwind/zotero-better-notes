/*
 * This file contains note editor UI code.
 */

import Knowledge4Zotero from "../addon";
import { CopyHelper, EditorMessage } from "../utils";
import AddonBase from "../module";

class EditorViews extends AddonBase {
  icons: object;

  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.icons = {
      addToNoteEnd: `<svg t="1651124422933" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3269" width="24" height="24"><path d="M896.00324 352c70.7 0 128-57.3 128-128 0-70.6-57.4-128-128-128-70.7 0-128 57.3-128 128 0 18.8 4.1 36.7 11.3 52.8 2.7 6 1.4 13.1-3.3 17.8l-24.2 24.2c-5.7 5.7-14.9 6.3-21.2 1.2-38.1-30.1-86.3-48-138.6-48-18.8 0-37.1 2.3-54.6 6.7-6.9 1.7-14.1-1.4-17.7-7.5l-6.6-11.4c-3.4-5.8-2.7-13.1 1.6-18.3 18.6-22.6 29.7-51.6 29.3-83.2C543.10324 89 486.30324 32.6 417.00324 32c-70.6-0.6-128.1 56.1-129 126.3-0.9 69.5 56.5 128.6 126 129.6 9.4 0.1 18.5-0.7 27.4-2.5 6.8-1.4 13.6 1.7 17.1 7.7l2.2 3.8c4 7 2.2 15.9-4.2 20.7-42.4 32.3-73 79.4-84 133.6-1.5 7.4-8.1 12.7-15.7 12.7h-94.1c-6.6 0-12.6-4-14.9-10.2-18.1-48-64.3-82.2-118.5-82.8C58.70324 370.3 0.50324 427.6 0.00324 498.1-0.49676 569.2 57.00324 627 128.00324 627c56.7 0 104.8-36.9 121.6-87.9 2.2-6.6 8.3-11.1 15.2-11.1h92c7.6 0 14.2 5.4 15.7 12.9 9.5 46.7 33.5 88 67 119.2 5.4 5 6.6 13.2 2.9 19.6l-21.7 37.6c-3.7 6.3-11.1 9.4-18.2 7.4-11.1-3.1-22.7-4.7-34.8-4.7-69.7 0.1-127 56.8-127.8 126.6-0.8 71.7 57.4 130 129.1 129.4 69.5-0.6 126.3-57.3 126.9-126.8 0.3-28-8.5-53.9-23.5-75.1-3.6-5.1-3.9-11.8-0.8-17.2l24.9-43.1c3.9-6.7 12-9.7 19.3-7 23.7 8.6 49.3 13.2 76 13.2 34.9 0 67.9-8 97.3-22.2 7.6-3.7 16.7-0.9 20.9 6.4l37 64c-26.3 23.5-43 57.7-43 95.8 0 70.9 58 128.5 128.9 128 69.7-0.5 126.2-56.7 127.1-126.3 0.9-70.1-57-129.3-127.1-129.7-6.2 0-12.3 0.4-18.3 1.2-6.5 0.9-12.8-2.2-16.1-7.8l-39.2-67.9c-3.4-5.9-2.7-13.3 1.7-18.4 34.2-39.3 54.9-90.7 54.9-147 0-38.9-9.9-75.5-27.4-107.4-3.4-6.2-2.2-13.9 2.8-18.9l28.4-28.4c4.9-4.9 12.4-6 18.7-2.9 17.4 8.6 36.9 13.5 57.6 13.5z m0-192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM128.00324 563c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m240 349c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m464-112c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM416.00324 224c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z m289.1 385.1C674.90324 639.4 634.70324 656 592.00324 656s-82.9-16.6-113.1-46.9C448.60324 578.9 432.00324 538.7 432.00324 496s16.6-82.9 46.9-113.1C509.10324 352.6 549.30324 336 592.00324 336s82.9 16.6 113.1 46.9C735.40324 413.1 752.00324 453.3 752.00324 496s-16.6 82.9-46.9 113.1z" p-id="3270" fill="currentColor"></path></svg>`,
      addCitation: `<svg t="1652702140873" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2080" width="24" height="24"><path d="M479.615429 372.021945l0 155.216107c-8.769734 78.782298-47.084365 113.813139-114.89068 124.738979L364.724749 599.455841c21.849634-2.15406 36.108383-18.566868 42.673915-49.239448l0-22.978341-72.204485 0L335.194178 372.021945 479.615429 372.021945zM688.806845 372.021945l0 155.216107c-8.769734 76.628238-47.084365 111.608937-114.891703 124.738979L573.915142 599.455841c8.720615-2.15406 17.49035-8.719592 26.261107-19.695574 8.720615-10.92584 14.207583-20.773116 16.412808-29.543873l0-22.978341-71.120804 0L545.468253 372.021945 688.806845 372.021945z" p-id="2081" fill="currentColor"></path></svg>`,
      notMainKnowledge: `<svg t="1651124314636" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1689" width="24" height="24"><path d="M877.44 383.786667L624.426667 117.333333C594.986667 86.186667 554.88 69.12 512 69.12s-82.986667 17.066667-112.426667 48.213333L146.56 383.786667a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V485.973333c0-38.186667-14.506667-74.453333-40.96-102.186666z m-44.373333 404.266666c0 38.826667-31.573333 70.186667-70.186667 70.186667H261.333333c-38.826667 0-70.186667-31.573333-70.186666-70.186667V485.973333c0-16.213333 6.186667-31.786667 17.28-43.52L461.44 176c13.226667-13.866667 31.146667-21.546667 50.56-21.546667s37.333333 7.68 50.56 21.76l253.013333 266.453334c11.306667 11.733333 17.28 27.306667 17.28 43.52v301.866666z" p-id="1690" fill="currentColor"></path><path d="M608 687.786667h-192c-23.466667 0-42.666667 19.2-42.666667 42.666666s19.2 42.666667 42.666667 42.666667h192c23.466667 0 42.666667-19.2 42.666667-42.666667s-19.2-42.666667-42.666667-42.666666z" p-id="1691" fill="currentColor"></path></svg>`,
      isMainKnowledge: `<svg t="1651124352868" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1850" width="24" height="24"><path d="M877.44 388.053333L624.426667 121.813333C594.986667 90.666667 554.88 73.386667 512 73.386667s-82.986667 17.066667-112.426667 48.213333L146.56 388.053333a148.266667 148.266667 0 0 0-40.746667 102.4v302.08c0 85.76 69.76 155.52 155.52 155.52h501.546667c85.76 0 155.52-69.76 155.52-155.52V490.453333c0-38.4-14.506667-74.666667-40.96-102.4zM608 777.386667h-192c-23.466667 0-42.666667-19.2-42.666667-42.666667s19.2-42.666667 42.666667-42.666667h192c23.466667 0 42.666667 19.2 42.666667 42.666667s-19.2 42.666667-42.666667 42.666667z" p-id="1851" fill="currentColor"></path></svg>`,
      openAttachment: `<svg t="1651595553273" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7641" width="24" height="24"><path d="M950.857143 537.892571a293.924571 293.924571 0 0 0-73.142857-59.904V292.571429l-146.285715-146.285715H146.285714v731.428572h331.702857c15.945143 27.538286 36.205714 52.224 59.904 73.142857H146.285714a73.142857 73.142857 0 0 1-73.142857-73.142857V146.285714a73.142857 73.142857 0 0 1 73.142857-73.142857h621.714286l182.857143 182.857143v281.892571z m-93.549714 266.166858l82.505142 82.541714a37.668571 37.668571 0 0 1-53.211428 53.211428l-82.541714-82.505142a188.233143 188.233143 0 1 1 53.248-53.248z m-47.213715-101.449143a109.714286 109.714286 0 1 0-219.428571 0 109.714286 109.714286 0 0 0 219.428571 0zM202.605714 286.354286h49.371429v24.137143h0.731428c6.326857-10.24 14.372571-17.664 24.137143-22.308572s20.48-6.948571 32.182857-6.948571c14.884571 0 27.684571 2.816 38.4 8.411428 10.715429 5.595429 19.638857 13.056 26.697143 22.308572 7.058286 9.252571 12.324571 20.041143 15.725715 32.365714 3.401143 12.324571 5.12 25.161143 5.12 38.582857 0 12.690286-1.718857 24.868571-5.12 36.571429-3.401143 11.702857-8.594286 22.052571-15.542858 31.085714s-15.616 16.201143-25.965714 21.577143c-10.349714 5.376-22.491429 8.045714-36.388571 8.045714-11.702857 0-22.491429-2.377143-32.365715-7.131428a61.257143 61.257143 0 0 1-24.32-21.028572h-0.731428v89.6H202.605714V286.354286z m358.4 164.937143h-0.731428c-6.107429 10.24-14.08 17.627429-23.954286 22.125714s-21.028571 6.765714-33.462857 6.765714a80.822857 80.822857 0 0 1-37.302857-8.228571 74.898286 74.898286 0 0 1-26.514286-22.308572 101.229714 101.229714 0 0 1-15.725714-32.365714 135.862857 135.862857 0 0 1-5.302857-38.034286c0-12.690286 1.755429-24.941714 5.302857-36.754285 3.547429-11.812571 8.777143-22.235429 15.725714-31.268572s15.652571-16.274286 26.148571-21.76c10.496-5.485714 22.674286-8.228571 36.571429-8.228571 11.227429 0 21.869714 2.377143 32 7.131428s18.102857 11.776 23.954286 21.028572h0.731428v-95.085715h51.931429V475.428571h-49.371429v-24.137142z m99.84-130.194286h-31.085714v-34.742857h31.085714v-14.628572c0-16.822857 5.229714-30.610286 15.725715-41.325714 10.496-10.715429 26.331429-16.091429 47.542857-16.091429 4.644571 0 9.252571 0.182857 13.897143 0.548572 4.644571 0.365714 9.142857 0.658286 13.531428 0.914286v38.765714c-6.107429-0.731429-12.434286-1.097143-19.017143-1.097143-7.058286 0-12.141714 1.645714-15.177143 4.937143-3.035429 3.291429-4.571429 8.850286-4.571428 16.64v11.337143h35.84v34.742857h-35.84V475.428571h-51.931429V321.097143z m-362.788571 120.32c8.521143 0 15.652571-1.718857 21.394286-5.12 5.741714-3.401143 10.349714-7.862857 13.897142-13.348572 3.547429-5.485714 6.034286-11.885714 7.497143-19.2 1.462857-7.314286 2.194286-14.738286 2.194286-22.308571 0-7.570286-0.804571-14.994286-2.377143-22.308571a59.392 59.392 0 0 0-7.862857-19.565715 43.812571 43.812571 0 0 0-14.08-13.897143 39.314286 39.314286 0 0 0-21.028571-5.302857c-8.521143 0-15.652571 1.755429-21.394286 5.302857a42.678857 42.678857 0 0 0-13.897143 13.714286c-3.547429 5.595429-6.034286 12.068571-7.497143 19.382857-1.462857 7.314286-2.194286 14.884571-2.194286 22.674286 0 7.570286 0.804571 14.994286 2.377143 22.308571 1.572571 7.314286 4.132571 13.714286 7.68 19.2 3.547429 5.485714 8.228571 9.947429 14.08 13.348572 5.851429 3.401143 12.909714 5.12 21.211429 5.12z m262.217143-61.074286c0-7.789714-0.731429-15.286857-2.194286-22.491428a54.966857 54.966857 0 0 0-7.497143-19.017143 42.203429 42.203429 0 0 0-13.714286-13.348572 40.228571 40.228571 0 0 0-21.211428-5.12c-8.521143 0-15.725714 1.718857-21.577143 5.12-5.851429 3.401143-10.532571 7.936-14.08 13.531429a59.794286 59.794286 0 0 0-7.68 19.2 104.228571 104.228571 0 0 0-2.377143 22.491428c0 7.314286 0.841143 14.628571 2.56 21.942858 1.718857 7.314286 4.461714 13.824 8.228572 19.565714 3.766857 5.741714 8.521143 10.349714 14.262857 13.897143 5.741714 3.547429 12.617143 5.302857 20.662857 5.302857 8.521143 0 15.652571-1.718857 21.394286-5.12 5.741714-3.401143 10.313143-7.972571 13.714285-13.714286a61.44 61.44 0 0 0 7.314286-19.565714c1.462857-7.314286 2.194286-14.884571 2.194286-22.674286z" p-id="7642" fill="currentColor"></path></svg>`,
      switchEditor: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><style>.cls-1{fill:currentColor;}.cls-2{filter:invert(100%)}</style></defs><rect class="cls-1" width="24" height="24"/><path class="cls-2" d="M9,7.1H2.33L2.14,9.56H2.4c.15-1.77.32-2.14,2-2.14a3.39,3.39,0,0,1,.59,0c.23,0,.23.16.23.41v5.77c0,.37,0,.53-1.15.53H3.61v.34c.45,0,1.56,0,2.06,0s1.64,0,2.09,0v-.34H7.32c-1.15,0-1.15-.16-1.15-.53V7.86c0-.22,0-.37.19-.41a3.9,3.9,0,0,1,.63,0c1.65,0,1.81.37,2,2.14h.27L9,7.1Z"/><path class="cls-2" d="M14.91,14.15h-.27c-.28,1.68-.53,2.48-2.41,2.48H10.78c-.52,0-.54-.08-.54-.44V13.27h1c1.06,0,1.19.35,1.19,1.28h.27v-2.9h-.27c0,.94-.13,1.28-1.19,1.28h-1V10.3c0-.36,0-.44.54-.44h1.41c1.68,0,2,.61,2.14,2.13h.27l-.3-2.46H8.14v.33H8.4c.84,0,.86.12.86.52v5.73c0,.4,0,.52-.86.52H8.14V17h6.31Z"/><path class="cls-2" d="M18.22,10.27l1.5-2.2a1.67,1.67,0,0,1,1.58-.71V7H18.69v.33c.44,0,.68.25.68.5a.37.37,0,0,1-.1.26L18,10,16.61,7.85a.46.46,0,0,1-.07-.16c0-.13.24-.32.7-.33V7c-.37,0-1.18,0-1.59,0s-1,0-1.43,0v.33h.21c.6,0,.81.08,1,.38l2,3-1.79,2.64a1.67,1.67,0,0,1-1.58.73v.34H16.7v-.34c-.5,0-.69-.31-.69-.51s0-.14.11-.26l1.55-2.3,1.73,2.62s.06.09.06.12-.24.32-.72.33v.34c.39,0,1.19,0,1.6,0s1,0,1.42,0v-.34h-.2c-.58,0-.81-.06-1-.4l-2.3-3.49Z"/></svg>`,
      export: `<svg t="1651322116327" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11894" width="24" height="24"><path d="M849.2 599v217H178.5V599c-0.7-23.7-20.1-42.7-44-42.7s-43.3 19-44 42.7v252.5c0 28.9 23.6 52.5 52.5 52.5h741.7c28.9 0 52.5-23.6 52.5-52.5V599c-0.7-23.7-20.1-42.7-44-42.7s-43.3 19-44 42.7z" fill="currentColor" p-id="11895"></path><path d="M482.7 135.4l-164 164c-17.1 17.1-17.1 45.1 0 62.2s45.1 17.1 62.2 0l85.7-85.7v314.8c0 26 21.3 47.2 47.2 47.2 26 0 47.2-21.3 47.2-47.2V276l85.7 85.7c17.1 17.1 45.1 17.1 62.2 0s17.1-45.1 0-62.2l-164-164c-17.1-17.2-45.1-17.2-62.2-0.1z" fill="currentColor" p-id="11896"></path></svg>`,
      close: `<svg t="1651331457107" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="12754" width="24" height="24"><path d="M557.311759 513.248864l265.280473-263.904314c12.54369-12.480043 12.607338-32.704421 0.127295-45.248112-12.512727-12.576374-32.704421-12.607338-45.248112-0.127295L512.127295 467.904421 249.088241 204.063755c-12.447359-12.480043-32.704421-12.54369-45.248112-0.063647-12.512727 12.480043-12.54369 32.735385-0.063647 45.280796l262.975407 263.775299-265.151458 263.744335c-12.54369 12.480043-12.607338 32.704421-0.127295 45.248112 6.239161 6.271845 14.463432 9.440452 22.687703 9.440452 8.160624 0 16.319527-3.103239 22.560409-9.311437l265.216826-263.807983 265.440452 266.240344c6.239161 6.271845 14.432469 9.407768 22.65674 9.407768 8.191587 0 16.352211-3.135923 22.591372-9.34412 12.512727-12.480043 12.54369-32.704421 0.063647-45.248112L557.311759 513.248864z" fill="currentColor" p-id="12755"></path></svg>`,
    };
  }

  public async initEditor(instance: Zotero.EditorInstance) {
    const noteItem = instance._item;
    const mainNote = this._Addon.WorkspaceWindow.getWorkspaceNote();

    const isMainNote = noteItem.id === mainNote.id;
    const isPreviewNote =
      noteItem.id === this._Addon.WorkspaceWindow.previewItemID;
    const isPrint = this._Addon.NoteExport._pdfNoteId === noteItem.id;

    const _window = instance._iframeWindow;

    const setMainNoteDropDown: Element = await this.addEditorButton(
      instance,
      "knowledge-start",
      isMainNote
        ? "isMainKnowledge"
        : isPreviewNote
        ? "openAttachment"
        : "notMainKnowledge",
      isMainNote
        ? "Edit the Main Note in Workspace"
        : isPreviewNote
        ? "Open Note Attachments"
        : "Open Workspace",
      isPreviewNote ? "openAttachment" : "openWorkspace",
      "start"
    );

    if (setMainNoteDropDown && !isPreviewNote) {
      setMainNoteDropDown.classList.add("more-dropdown");
      setMainNoteDropDown.addEventListener("mouseover", async (e) => {
        if (setMainNoteDropDown.getElementsByClassName("popup").length > 0) {
          return;
        }
        const recentIds = (
          Zotero.Prefs.get("Knowledge4Zotero.recentMainNoteIds") as string
        ).split(",");
        // Add current note
        recentIds.splice(0, 0, String(noteItem.id));
        // Remove main note and duplicate notes
        const recentMainNotes = Zotero.Items.get(
          new Array(
            ...new Set(
              recentIds.filter(
                (id) =>
                  Number(id) !==
                  parseInt(
                    Zotero.Prefs.get(
                      "Knowledge4Zotero.mainKnowledgeID"
                    ) as string
                  )
              )
            )
          )
        ) as Zotero.Item[];
        const buttons = recentMainNotes.map((item) => {
          return {
            id: `knowledge-setmainnote-popup-${item.id}`,
            rank: 0,
            text: item.getNoteTitle(),
            eventType: "setRecentMainNote",
          };
        });
        const popup: Element = await this.addEditorPopup(
          instance,
          "knowledge-setmainnote-popup",
          buttons,
          setMainNoteDropDown,
          "left"
        );
        const titleNode = _window.document.createElement("div");
        titleNode.innerHTML = "Set Recent Main Notes";
        titleNode.title = "Click item to set it main note";
        titleNode.style.textAlign = "center";
        popup.childNodes[0].before(
          titleNode,
          _window.document.createElement("hr")
        );
        setMainNoteDropDown.addEventListener("mouseleave", (e) => {
          popup.remove();
        });
        setMainNoteDropDown.addEventListener("click", (e) => {
          popup.remove();
        });
      });
    }
    const addLinkDropDown: Element = await this.addEditorButton(
      instance,
      "knowledge-addlink",
      "addToNoteEnd",
      "Add Link of Current Note to Main Note",
      "addToNoteEnd",
      "middle"
    );
    if (addLinkDropDown) {
      addLinkDropDown.classList.add("more-dropdown");
      // If the editor initialization fails, the addLinkDropDown does not exist
      if (isMainNote) {
        // This is a main knowledge, hide all buttons except the export button and add title
        addLinkDropDown.innerHTML = "";
        const header = _window.document.createElement("div");
        header.setAttribute("title", "This is a Main Note");
        header.innerHTML = "Main Note";
        header.setAttribute("style", "font-size: medium");
        addLinkDropDown.append(header);
      } else {
        const normalHintText =
          "Insert at the end of section.\nHold shift to insert before section.";
        const shiftHintText =
          "Insert before section.\nRelease shift to insert at the end of section.";
        addLinkDropDown.addEventListener(
          "mouseover",
          async (e: KeyboardEvent) => {
            if (addLinkDropDown.getElementsByClassName("popup").length > 0) {
              return;
            }
            let isShift = e.shiftKey;
            const hintWindow = this._Addon.ZoteroViews.showProgressWindow(
              "Bi-directional Link",
              isShift ? shiftHintText : normalHintText,
              "default",
              // Disable auto close
              -1
            );

            const getButtonParams = () => {
              const buttonParam: any[] = [];
              for (let node of nodes) {
                buttonParam.push({
                  id: `knowledge-addlink-popup-${
                    isShift ? node.model.lineIndex - 1 : node.model.endIndex
                  }`,
                  text: node.model.name,
                  rank: node.model.rank,
                  eventType: "addToNote",
                });
              }
              return buttonParam;
            };

            const nodes = this._Addon.NoteUtils.getNoteTreeAsList(
              this._Addon.WorkspaceWindow.getWorkspaceNote()
            );
            const buttonParam = getButtonParams();
            const popup: HTMLElement = await this.addEditorPopup(
              instance,
              "knowledge-addlink-popup",
              // [{ id: ''; icon: string; eventType: string }],
              buttonParam,
              addLinkDropDown
            );
            popup.style.backgroundColor = isShift ? "#f0f9fe" : "";
            const leaveAction = (e?) => {
              ob?.disconnect();
              popup?.remove();
              hintWindow?.close();
              addLinkDropDown?.removeEventListener("mouseleave", leaveAction);
              addLinkDropDown?.removeEventListener("click", leaveAction);
              _window.document?.removeEventListener("keydown", keyAction);
              _window.document?.removeEventListener("keyup", keyAction);
            };
            addLinkDropDown.addEventListener("mouseleave", leaveAction);
            addLinkDropDown.addEventListener("click", leaveAction);
            // Observe the popup remove triggered by button click
            const ob = new MutationObserver((e) => {
              console.log(e);
              if (e[0].removedNodes) {
                leaveAction();
              }
            });
            ob.observe(addLinkDropDown, { childList: true });
            const keyAction = (e: KeyboardEvent) => {
              if (isShift === e.shiftKey) {
                return;
              }
              isShift = e.shiftKey;
              console.log(hintWindow);
              popup.style.backgroundColor = isShift ? "#f0f9fe" : "";
              this._Addon.ZoteroViews.changeProgressWindowDescription(
                hintWindow,
                isShift ? shiftHintText : normalHintText
              );
              const buttonParam = getButtonParams();
              for (const i in popup.children) {
                popup.children[i].id = buttonParam[i].id;
              }
            };
            _window.document.addEventListener("keydown", keyAction);
            _window.document.addEventListener("keyup", keyAction);
          }
        );
      }
    }

    const addCitationButton = await this.addEditorButton(
      instance,
      "knowledge-addcitation",
      "addCitation",
      "Insert Citations",
      "addCitation",
      "middle",
      "builtin"
    );

    let topItem = noteItem.parentItem;
    while (topItem && !topItem.isRegularItem()) {
      topItem = topItem.parentItem;
    }
    if (addCitationButton) {
      addCitationButton.classList.add("more-dropdown");
      if (topItem) {
        addCitationButton.addEventListener("mouseover", async (e) => {
          if (addCitationButton.getElementsByClassName("popup").length > 0) {
            return;
          }
          const popup: Element = await this.addEditorPopup(
            instance,
            "knowledge-addcitation-popup",
            [
              {
                id: `knowledge-addcitation-popup-${topItem.id}`,
                rank: 0,
                text: topItem.getField("title"),
                eventType: "insertCitation",
              },
            ],
            addCitationButton
          );
          addCitationButton.addEventListener("mouseleave", (e) => {
            popup.remove();
          });
          addCitationButton.addEventListener("click", (e) => {
            popup.remove();
          });
        });
      }

      addCitationButton.addEventListener("click", async (e) => {
        this._Addon.events.onEditorEvent(
          new EditorMessage("insertCitation", {
            params: {
              noteItem: noteItem,
            },
          })
        );
      });
    }

    await this.addEditorButton(
      instance,
      "knowledge-end",
      isPreviewNote ? "close" : "export",
      isPreviewNote ? "Close Preview" : "Export with linked notes",
      isPreviewNote ? "closePreview" : "export",
      "end"
    );

    // Title style only for normal window
    if (!isPrint) {
      const style = _window.document.createElement("style");
      style.innerHTML = `
          .primary-editor h1::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Ctitle%3E%E6%9C%AA%E6%A0%87%E9%A2%98-1%3C%2Ftitle%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M12.29%2C16.8H11.14V12.33H6.07V16.8H4.92V7H6.07v4.3h5.07V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M18.05%2C16.8H16.93V8.41a4%2C4%2C0%2C0%2C1-.9.53%2C6.52%2C6.52%2C0%2C0%2C1-1.14.44l-.32-1a8.2%2C8.2%2C0%2C0%2C0%2C1.67-.67%2C6.31%2C6.31%2C0%2C0%2C0%2C1.39-1h.42Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h2::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22a%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22a%22%20d%3D%22M14.14%2C16.8v-.48a4.1%2C4.1%2C0%2C0%2C1%2C.14-1.11%2C2.86%2C2.86%2C0%2C0%2C1%2C.45-.91%2C5.49%2C5.49%2C0%2C0%2C1%2C.83-.86c.33-.29.75-.61%2C1.24-1a7.43%2C7.43%2C0%2C0%2C0%2C.9-.73%2C3.9%2C3.9%2C0%2C0%2C0%2C.57-.7%2C2.22%2C2.22%2C0%2C0%2C0%2C.3-.66%2C2.87%2C2.87%2C0%2C0%2C0%2C.11-.77%2C1.89%2C1.89%2C0%2C0%2C0-.47-1.32%2C1.66%2C1.66%2C0%2C0%2C0-1.28-.5A3.17%2C3.17%2C0%2C0%2C0%2C15.7%2C8a3.49%2C3.49%2C0%2C0%2C0-1.08.76l-.68-.65a4.26%2C4.26%2C0%2C0%2C1%2C1.39-1A4%2C4%2C0%2C0%2C1%2C17%2C6.84a2.62%2C2.62%2C0%2C0%2C1%2C2.83%2C2.67%2C3.58%2C3.58%2C0%2C0%2C1-.15%2C1%2C3.09%2C3.09%2C0%2C0%2C1-.41.9%2C5.53%2C5.53%2C0%2C0%2C1-.67.81%2C9%2C9%2C0%2C0%2C1-.95.79c-.46.32-.84.59-1.13.82a4.68%2C4.68%2C0%2C0%2C0-.71.64%2C2%2C2%2C0%2C0%2C0-.38.6%2C2.08%2C2.08%2C0%2C0%2C0-.11.69h4.88v1Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22a%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h3::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M14%2C16.14l.51-.8a4.75%2C4.75%2C0%2C0%2C0%2C1.1.52%2C4.27%2C4.27%2C0%2C0%2C0%2C1.12.16%2C2.29%2C2.29%2C0%2C0%2C0%2C1.64-.52A1.77%2C1.77%2C0%2C0%2C0%2C19%2C14.17a1.7%2C1.7%2C0%2C0%2C0-.68-1.48%2C3.6%2C3.6%2C0%2C0%2C0-2.06-.48H15.4v-1h.77A3%2C3%2C0%2C0%2C0%2C18%2C10.81a1.65%2C1.65%2C0%2C0%2C0%2C.6-1.41%2C1.47%2C1.47%2C0%2C0%2C0-.47-1.19A1.67%2C1.67%2C0%2C0%2C0%2C17%2C7.79a3.33%2C3.33%2C0%2C0%2C0-2.08.73l-.59-.75a4.4%2C4.4%2C0%2C0%2C1%2C1.28-.71A4.35%2C4.35%2C0%2C0%2C1%2C17%2C6.84a2.84%2C2.84%2C0%2C0%2C1%2C2%2C.65%2C2.21%2C2.21%2C0%2C0%2C1%2C.74%2C1.78%2C2.35%2C2.35%2C0%2C0%2C1-.49%2C1.5%2C2.7%2C2.7%2C0%2C0%2C1-1.46.89v0a2.74%2C2.74%2C0%2C0%2C1%2C1.65.74%2C2.15%2C2.15%2C0%2C0%2C1%2C.66%2C1.65%2C2.64%2C2.64%2C0%2C0%2C1-.9%2C2.12%2C3.44%2C3.44%2C0%2C0%2C1-2.34.78%2C5.3%2C5.3%2C0%2C0%2C1-1.48-.2A5%2C5%2C0%2C0%2C1%2C14%2C16.14Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h4::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M19.43%2C6.92v6.59h1.05v1.05H19.43V16.9H18.31V14.56H13.66v-1c.43-.49.87-1%2C1.31-1.57s.87-1.13%2C1.27-1.7S17%2C9.14%2C17.36%2C8.57a16.51%2C16.51%2C0%2C0%2C0%2C.86-1.65Zm-4.49%2C6.59h3.37V8.63c-.34.61-.67%2C1.15-1%2C1.63s-.6.91-.87%2C1.3-.56.74-.81%2C1Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h5::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M14%2C16l.58-.76a3.67%2C3.67%2C0%2C0%2C0%2C1%2C.58A3.44%2C3.44%2C0%2C0%2C0%2C16.8%2C16a2.17%2C2.17%2C0%2C0%2C0%2C1.58-.6A2%2C2%2C0%2C0%2C0%2C19%2C13.88a1.85%2C1.85%2C0%2C0%2C0-.64-1.5%2C2.83%2C2.83%2C0%2C0%2C0-1.86-.54c-.27%2C0-.55%2C0-.86%2C0s-.58%2C0-.81.06L15.17%2C7H19.7V8H16.14l-.2%2C2.88.47%2C0h.43a3.5%2C3.5%2C0%2C0%2C1%2C2.43.79%2C2.74%2C2.74%2C0%2C0%2C1%2C.88%2C2.16%2C3%2C3%2C0%2C0%2C1-.94%2C2.3%2C3.41%2C3.41%2C0%2C0%2C1-2.4.87%2C4.45%2C4.45%2C0%2C0%2C1-1.5-.24A4.81%2C4.81%2C0%2C0%2C1%2C14%2C16Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor h6::before {
            margin-left: -64px !important;
            padding-left: 40px !important;
            content: url("data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20width%3D%2218px%22%20height%3D%2218px%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2015.56%22%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill%3A%23666%3B%7D%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M11.17%2C16.8H10V12.33H5V16.8H3.8V7H5v4.3H10V7h1.15Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M20.18%2C13.7a3.24%2C3.24%2C0%2C0%2C1-.88%2C2.38%2C2.94%2C2.94%2C0%2C0%2C1-2.2.9%2C2.69%2C2.69%2C0%2C0%2C1-2.31-1.17A5.59%2C5.59%2C0%2C0%2C1%2C14%2C12.49a12.18%2C12.18%2C0%2C0%2C1%2C.2-2.14%2C5.16%2C5.16%2C0%2C0%2C1%2C.84-2A3.65%2C3.65%2C0%2C0%2C1%2C16.27%2C7.2%2C3.71%2C3.71%2C0%2C0%2C1%2C18%2C6.84%2C3.14%2C3.14%2C0%2C0%2C1%2C19%2C7a3.59%2C3.59%2C0%2C0%2C1%2C1%2C.5l-.56.77a2.3%2C2.3%2C0%2C0%2C0-1.49-.48A2.3%2C2.3%2C0%2C0%2C0%2C16.79%2C8a3%2C3%2C0%2C0%2C0-.92.85%2C3.79%2C3.79%2C0%2C0%2C0-.56%2C1.25%2C6.56%2C6.56%2C0%2C0%2C0-.19%2C1.65h0a2.61%2C2.61%2C0%2C0%2C1%2C1-.84%2C2.91%2C2.91%2C0%2C0%2C1%2C1.23-.28%2C2.63%2C2.63%2C0%2C0%2C1%2C2%2C.85A3.09%2C3.09%2C0%2C0%2C1%2C20.18%2C13.7ZM19%2C13.78a2.28%2C2.28%2C0%2C0%2C0-.5-1.62%2C1.67%2C1.67%2C0%2C0%2C0-1.29-.54%2C2%2C2%2C0%2C0%2C0-1.5.58%2C2%2C2%2C0%2C0%2C0-.56%2C1.4%2C2.65%2C2.65%2C0%2C0%2C0%2C.55%2C1.74%2C1.85%2C1.85%2C0%2C0%2C0%2C2.78.1A2.38%2C2.38%2C0%2C0%2C0%2C19%2C13.78Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3Cpath%20class%3D%22cls-1%22%20d%3D%22M21%2C5a2.25%2C2.25%2C0%2C0%2C1%2C2.25%2C2.25v9.56A2.25%2C2.25%2C0%2C0%2C1%2C21%2C19H3A2.25%2C2.25%2C0%2C0%2C1%2C.75%2C16.78V7.22A2.25%2C2.25%2C0%2C0%2C1%2C3%2C5H21m0-.75H3a3%2C3%2C0%2C0%2C0-3%2C3v9.56a3%2C3%2C0%2C0%2C0%2C3%2C3H21a3%2C3%2C0%2C0%2C0%2C3-3V7.22a3%2C3%2C0%2C0%2C0-3-3Z%22%20transform%3D%22translate(0%20-4.22)%22%2F%3E%3C%2Fsvg%3E") !important;
          }
          .primary-editor > p, .primary-editor h1, .primary-editor h2, .primary-editor h3, .primary-editor h4, .primary-editor h5, .primary-editor h6, .primary-editor pre, .primary-editor blockquote, .primary-editor table, .primary-editor ul, .primary-editor ol, .primary-editor hr{
            max-width: unset
          }
        `;
      _window.document.body.append(style);
    }

    if (!_window.document.getElementById("betternotes-script")) {
      const messageScript = _window.document.createElement("script");
      messageScript.id = "betternotes-script";
      messageScript.innerHTML = `
          window.addEventListener('message', async (e)=>{
            if(e.data.type === "exportPDF"){
              console.log("exportPDF");
              const container = document.getElementById("editor-container");
              container.style.display = "none";

              const fullPageStyle = document.createElement("style");
              fullPageStyle.innerHTML =
                "@page { margin: 0; } @media print{ body { height : auto; -webkit-print-color-adjust: exact; color-adjust: exact; }}";
              document.body.append(fullPageStyle);

              let t = 0;
              let imageFlag = false;
              while(!imageFlag && t < 500){
                await new Promise(function (resolve) {
                  setTimeout(resolve, 10);
                });
                imageFlag = !Array.prototype.find.call(document.querySelectorAll('img'), e=>(!e.getAttribute('src') || e.style.display === 'none'));
                t += 1;
              }

              const editNode = document.querySelector(".primary-editor");
              const printNode = editNode.cloneNode(true);
              printNode.style.padding = "20px";
              document.body.append(printNode);

              let printFlag = false;
              window.onafterprint = (e) => {
                console.log('Print Dialog Closed..');
                printFlag = true;
                document.title = "Printed";
              };
              window.onmouseover = (e) => {
                if (printFlag) {
                  document.title = "Printed";
                  printNode.remove();
                  container.style.removeProperty('display');
                }
              };
              document.title = printNode.firstChild.innerText;
              console.log(document.title);
              window.print();
            }
          }, false)
        `;
      _window.document.head.append(messageScript);
    }

    const moreDropdown: HTMLElement = Array.prototype.filter.call(
      _window.document.querySelectorAll(".more-dropdown"),
      (e) => !e.id.includes("knowledge")
    )[0];
    if (!moreDropdown.getAttribute("ob")) {
      moreDropdown.setAttribute("ob", "true");
      const dropdownOb = new MutationObserver((e) => {
        if (
          e[0].addedNodes.length &&
          (e[0].addedNodes[0] as HTMLElement).classList.contains("popup")
        ) {
          const dropdownPopup = moreDropdown.querySelector(".popup");
          if (dropdownPopup) {
            const refreshButton = _window.document.createElement("button");
            refreshButton.classList.add("option");
            refreshButton.innerText = "Refresh Editor";
            refreshButton.addEventListener("click", (e) => {
              instance.init({
                item: instance._item,
                viewMode: instance._viewMode,
                readOnly: instance._readOnly,
                disableUI: instance._disableUI,
                onReturn: instance._onReturn,
                iframeWindow: instance._iframeWindow,
                popup: instance._popup,
                state: instance._state,
              });
            });
            const previewButton = _window.document.createElement("button");
            previewButton.classList.add("option");
            previewButton.innerText = "Preview in Workspace";
            previewButton.addEventListener("click", (e) => {
              this._Addon.WorkspaceWindow.setWorkspaceNote(
                "preview",
                instance._item
              );
            });
            const copyLinkButton = _window.document.createElement("button");
            copyLinkButton.classList.add("option");
            copyLinkButton.innerText = "Copy Note Link";
            copyLinkButton.addEventListener("click", (e) => {
              const link = this._Addon.NoteUtils.getNoteLink(noteItem);
              const linkTemplate =
                this._Addon.TemplateController.renderTemplate(
                  "[QuickInsert]",
                  "link, subNoteItem, noteItem",
                  [link, noteItem, noteItem]
                );
              new CopyHelper()
                .addText(link, "text/unicode")
                .addText(linkTemplate, "text/html")
                .copy();
              this._Addon.ZoteroViews.showProgressWindow(
                "Better Notes",
                "Note Link Copied"
              );
            });

            const copyLinkAtLineButton =
              _window.document.createElement("button");
            copyLinkAtLineButton.classList.add("option");
            copyLinkAtLineButton.innerText = "Copy Note Link of Current Line";
            copyLinkAtLineButton.addEventListener("click", (e) => {
              const link = this._Addon.NoteUtils.getNoteLink(noteItem, {
                withLine: true,
              });
              const linkTemplate =
                this._Addon.TemplateController.renderTemplate(
                  "[QuickInsert]",
                  "link, subNoteItem, noteItem",
                  [link, noteItem, noteItem]
                );
              new CopyHelper()
                .addText(link, "text/unicode")
                .addText(linkTemplate, "text/html")
                .copy();
              this._Addon.ZoteroViews.showProgressWindow(
                "Better Notes",
                `Note Link of Line ${
                  this._Addon.NoteUtils.currentLine[noteItem.id] + 1
                } Copied`
              );
            });
            dropdownPopup.append(
              previewButton,
              refreshButton,
              copyLinkButton,
              copyLinkAtLineButton
            );
          }
        }
      });
      dropdownOb.observe(moreDropdown, { childList: true });
    }
  }

  public getEditorElement(_document: Document): Element {
    let editor = Array.prototype.find.call(
      _document.querySelectorAll(".primary-editor"),
      (e) => e.id !== "note-link-preview"
    );
    return editor;
  }

  public async addEditorToolBar(editorInstances: Zotero.EditorInstance) {
    await editorInstances._initPromise;

    await new Promise<void>((resolve, reject) => {
      const _document = editorInstances._iframeWindow.document;
      const knowledgeToolBar = _document.createElement("div");
      knowledgeToolBar.setAttribute("id", "knowledge-tools");
      knowledgeToolBar.setAttribute("class", "toolbar");
      const start = _document.createElement("div");
      start.setAttribute("id", "knowledge-tools-start");
      start.setAttribute("class", "start");
      const middle = _document.createElement("div");
      middle.setAttribute("id", "knowledge-tools-middle");
      middle.setAttribute("class", "middle");
      const end = _document.createElement("div");
      end.setAttribute("id", "knowledge-tools-end");
      end.setAttribute("class", "end");
      knowledgeToolBar.append(start, middle, end);
      _document
        .getElementsByClassName("editor")[0]
        .childNodes[0].before(knowledgeToolBar);
      resolve();
    });
  }

  public async addEditorButton(
    editorInstances: Zotero.EditorInstance,
    id: string,
    icon: string,
    title: string,
    eventType: string,
    position: "start" | "middle" | "end",
    target: "knowledge" | "builtin" = "knowledge"
  ) {
    // Use Zotero.Notes._editorInstances to find current opened note editor
    await editorInstances._initPromise;

    const _document = editorInstances._iframeWindow.document;
    if (_document.getElementById(id)) {
      return;
    }
    let knowledgeToolBar = _document.getElementById("knowledge-tools");
    if (!knowledgeToolBar) {
      await this.addEditorToolBar(editorInstances);
    }
    let toolbar: HTMLElement;
    if (target === "knowledge") {
      toolbar = _document.getElementById(`knowledge-tools-${position}`);
    } else {
      toolbar = Array.prototype.find.call(
        _document.getElementsByClassName(position),
        (e) => e.getAttribute("id") !== `knowledge-tools-${position}`
      );
    }
    const dropdown = _document.createElement("div");
    dropdown.setAttribute("class", "dropdown");
    dropdown.setAttribute("id", id);
    const button = _document.createElement("button");
    button.setAttribute("class", "toolbar-button");
    button.setAttribute("title", title);
    button.setAttribute("eventType", eventType);
    button.innerHTML = this.icons[icon];
    dropdown.append(button);
    toolbar.append(dropdown);
    const message = new EditorMessage("", {
      itemID: editorInstances._item.id,
      editorInstances: editorInstances,
    });
    dropdown.addEventListener("click", (e: XUL.XULEvent) => {
      message.type = e.target.getAttribute("eventType");
      message.content.event = e as XUL.XULEvent;
      message.content.editorInstance = editorInstances;
      this._Addon.events.onEditorEvent(message);
    });
    return dropdown;
  }

  public async addEditorPopup(
    editorInstances: Zotero.EditorInstance,
    id: string,
    buttons: { id: string; text: string; rank: number; eventType: string }[],
    parentDropDown: Element,
    align: "center" | "left" | "right" = "center"
  ) {
    // Use Zotero.Notes._editorInstances to find current opened note editor
    await editorInstances._initPromise;

    const _document = editorInstances._iframeWindow.document;
    let knowledgeToolBar = _document.getElementById("knowledge-tools");
    if (!knowledgeToolBar) {
      await this.addEditorToolBar(editorInstances);
    }
    const popup = _document.createElement("div");
    popup.setAttribute("class", "popup");
    popup.setAttribute("id", id);
    for (let buttonParam of buttons) {
      const button = _document.createElement("button");
      button.setAttribute("class", "option");
      button.setAttribute(
        "style",
        `text-indent: ${(buttonParam.rank - 1) * 5}px;`
      );
      button.setAttribute("id", buttonParam.id);
      button.setAttribute("eventType", buttonParam.eventType);
      button.innerHTML =
        buttonParam.text.length > 30
          ? `${buttonParam.text.slice(0, 30)}...`
          : buttonParam.text;
      popup.append(button);
      const message = new EditorMessage("", {
        itemID: editorInstances._item.id,
        editorInstances: editorInstances,
      });
      button.addEventListener("click", (e: XUL.XULEvent) => {
        message.type = e.target.getAttribute("eventType");
        message.content.event = e as XUL.XULEvent;
        message.content.editorInstance = editorInstances;
        this._Addon.events.onEditorEvent(message);
        e.stopPropagation();
        popup.remove();
      });
    }
    parentDropDown.append(popup);
    Zotero.debug(popup.offsetWidth);
    let style: string = "";
    if (align === "center") {
      style = `right: -${popup.offsetWidth / 2 - 15}px;`;
    } else if (align === "left") {
      style = "left: 0; right: auto;";
    } else if (align === "right") {
      style = "right: 0;";
    }
    popup.setAttribute("style", style);
    return popup;
  }

  public async updateEditorPopupButtons(_window: Window, link: string) {
    const note: Zotero.Item = link
      ? (await this._Addon.NoteUtils.getNoteFromLink(link)).item
      : undefined;
    const mainNote = this._Addon.WorkspaceWindow.getWorkspaceNote();
    // If the note is invalid, we remove the buttons
    if (note && note.id === mainNote.id) {
      let insertButton = _window.document.getElementById("insert-note-link");
      if (insertButton) {
        insertButton.remove();
      }
      insertButton = _window.document.createElement("button");
      insertButton.setAttribute("id", "insert-note-link");
      insertButton.setAttribute(
        "title",
        `Import Linked Note: ${note.getNoteTitle()}`
      );
      insertButton.innerHTML = `<svg t="1652008007954" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10521" width="16" height="16"><path d="M574.3 896H159.7c-17.6 0-31.9-14.3-31.9-32V160c0-17.7 14.3-32 31.9-32h382.7v160c0 35.3 28.6 64 63.8 64h159.5v192c0 17.7 14.3 32 31.9 32 17.6 0 31.9-14.3 31.9-32V270.2c0-8.5-3.3-16.6-9.3-22.6L647.4 73.4c-6-6-14.1-9.4-22.6-9.4h-497C92.6 64 64 92.7 64 128v768c0 35.3 28.6 64 63.8 64h446.5c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM638.1 288c-17.6 0-31.9-14.3-31.9-32V128l159.5 160H638.1z" p-id="10522"></path><path d="M418.8 673H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32h193.3c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM608.2 481H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32h382.7c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32zM225.5 353h191.4c17.6 0 31.9-14.3 31.9-32s-14.3-32-31.9-32H225.5c-17.6 0-31.9 14.3-31.9 32s14.3 32 31.9 32zM862.7 959.4c-23.6 0-47-8.8-64.8-26.6l-24.4-24.4c-12.5-12.5-12.5-32.8 0-45.3s32.7-12.5 45.1 0l24.4 24.4c11.3 11.4 30.7 10.4 43.2-2.1 12.5-12.5 13.4-31.9 2.1-43.3L749.2 702.6c-11.3-11.4-30.7-10.4-43.2 2.1-6.2 6.3-9.8 14.4-10 22.8-0.2 7.9 2.6 15.1 7.9 20.4 12.5 12.5 12.5 32.8 0 45.3s-32.7 12.5-45.1 0c-36.2-36.3-35.2-96.3 2.1-133.8 37.4-37.5 97.2-38.4 133.4-2.1l139.1 139.5c36.2 36.3 35.2 96.3-2.1 133.8-19 19.2-43.9 28.8-68.6 28.8z" p-id="10523"></path><path d="M696.3 883.1c-23.6 0-47-8.8-64.8-26.6l-139-139.6c-17.7-17.8-27.2-41.7-26.6-67.2 0.6-25 10.8-48.6 28.7-66.6 17.9-17.9 41.5-28.2 66.4-28.8 25.5-0.6 49.3 8.9 67 26.6l24.4 24.4c12.5 12.5 12.5 32.8 0 45.3s-32.7 12.5-45.1 0l-24.4-24.4c-5.3-5.3-12.5-8.1-20.4-7.9-8.4 0.2-16.5 3.8-22.8 10-6.2 6.3-9.8 14.4-10 22.8-0.2 7.9 2.6 15.1 7.9 20.4L676.7 811c11.3 11.4 30.7 10.4 43.2-2.1 12.5-12.5 13.4-31.9 2.1-43.3-12.5-12.5-12.5-32.8 0-45.3s32.7-12.5 45.1 0c36.2 36.3 35.3 96.3-2.1 133.8-19.1 19.3-44 29-68.7 29z" p-id="10524"></path></svg>`;
      insertButton.addEventListener("click", async (e) => {
        let newLines = [];
        const convertResult = await this._Addon.NoteUtils.convertNoteLines(
          note,
          [],
          true
        );
        const subNoteLines = convertResult.lines;
        // Prevent note to be too long
        if (subNoteLines.join("\n").length > 100000) {
          this._Addon.ZoteroViews.showProgressWindow(
            "Better Notes",
            "The linked note is too long. Import ignored."
          );
          return;
        }
        const templateText =
          await this._Addon.TemplateController.renderTemplateAsync(
            "[QuickImport]",
            "subNoteLines, subNoteItem, noteItem",
            [subNoteLines, note, mainNote]
          );
        newLines.push(templateText);
        const newLineString = newLines.join("\n");
        const notifyFlag: ZoteroPromise = Zotero.Promise.defer();
        const notifierName = "insertLinkWait";
        this._Addon.events.addNotifyListener(
          notifierName,
          (
            event: string,
            type: string,
            ids: Array<number>,
            extraData: object
          ) => {
            if (
              event === "modify" &&
              type === "item" &&
              ids.includes(mainNote.id)
            ) {
              notifyFlag.resolve();
              this._Addon.events.removeNotifyListener(notifierName);
            }
          }
        );
        await this._Addon.NoteUtils.modifyLineInNote(
          mainNote,
          (oldLine: string) => {
            Zotero.debug(oldLine);
            const params = this._Addon.NoteParse.parseParamsFromLink(link);
            const newLink = !params.ignore
              ? link + (link.includes("?") ? "&ignore=1" : "?ignore=1")
              : link;
            const linkIndex =
              this._Addon.NoteParse.parseLinkIndexInText(oldLine);
            Zotero.debug(linkIndex);
            return `${oldLine.slice(0, linkIndex[0])}${newLink}${oldLine.slice(
              linkIndex[1]
            )}\n${newLineString}`;
          },
          this._Addon.NoteUtils.currentLine[mainNote.id],
          true
        );
        // wait the first modify finish
        await notifyFlag.promise;
        let hasAttachemnts = false;
        for (const _n of [note, ...convertResult.subNotes]) {
          if ((Zotero.Items.get(_n.getAttachments()) as Zotero.Item[]).length) {
            hasAttachemnts = true;
            break;
          }
        }
        if (hasAttachemnts) {
          await Zotero.DB.executeTransaction(async () => {
            await Zotero.Notes.copyEmbeddedImages(note, mainNote);
            for (const subNote of convertResult.subNotes) {
              await Zotero.Notes.copyEmbeddedImages(subNote, mainNote);
            }
          });
          await this._Addon.NoteUtils.scrollWithRefresh(
            this._Addon.NoteUtils.currentLine[mainNote.id]
          );
        }
      });

      let updateButton = _window.document.getElementById("update-note-link");
      if (updateButton) {
        updateButton.remove();
      }
      updateButton = _window.document.createElement("button");
      updateButton.setAttribute("id", "update-note-link");
      updateButton.setAttribute(
        "title",
        `Update Link Text: ${note.getNoteTitle()}`
      );
      updateButton.innerHTML = `<svg t="1652685521153" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7063" width="16" height="16"><path d="M271.914667 837.418667C182.314667 756.522667 128 637.653333 128 508.714667 128 304.896 263.338667 129.834667 450.986667 85.333333L469.333333 170.026667c-150.016 35.584-258.304 175.658667-258.304 338.688 0 106.069333 45.866667 203.562667 121.258667 268.373333L426.666667 682.666667v256H170.666667l101.248-101.248zM727.082667 168.917333C831.530667 249.045333 896 377.088 896 517.077333c0 202.922667-135.338667 377.258667-322.986667 421.589334L554.666667 854.357333c150.016-35.456 258.304-174.933333 258.304-337.322666 0-117.12-56.405333-223.786667-146.901334-287.146667L554.666667 341.333333V85.333333h256l-83.584 83.584z" p-id="7064"></path></svg>`;
      updateButton.addEventListener("click", async (e) => {
        Zotero.debug("ZBN: Update Link Text");
        const noteLines = this._Addon.NoteUtils.getLinesInNote(mainNote);
        let line = noteLines[this._Addon.NoteUtils.currentLine[mainNote.id]];
        Zotero.debug(line);

        let linkStart = line.search(/<a /g);
        let linkEnd = line.search(/<\/a>/g) + 4;
        let beforeLink = line.slice(0, linkStart);
        let afterLink = line.slice(linkEnd);
        let linkPart = line.slice(linkStart, linkEnd);
        let link = this._Addon.NoteParse.parseLinkInText(linkPart);
        let currentNote: Zotero.Item;
        if (link) {
          currentNote = (await this._Addon.NoteUtils.getNoteFromLink(link))
            .item;
        }

        while (
          linkPart &&
          (!link || !currentNote || currentNote.id !== note.id)
        ) {
          line = afterLink;
          beforeLink = beforeLink + linkPart;
          line = afterLink;

          linkStart = line.search(/<a /g);
          linkEnd = line.search(/<\/a>/g) + 4;
          beforeLink = beforeLink + line.slice(0, linkStart);
          afterLink = line.slice(linkEnd);
          linkPart = line.slice(linkStart, linkEnd);
          link = this._Addon.NoteParse.parseLinkInText(linkPart);
          if (link) {
            currentNote = (await this._Addon.NoteUtils.getNoteFromLink(link))
              .item;
          }
        }
        if (!linkPart) {
          return;
        }
        beforeLink = beforeLink + linkPart.slice(0, linkPart.search(/>/) + 1);
        afterLink = "</a>" + afterLink;
        const newLine = `${beforeLink}${currentNote.getNoteTitle()}${afterLink}`;
        Zotero.debug(newLine);
        noteLines[this._Addon.NoteUtils.currentLine[mainNote.id]] = newLine;

        await this._Addon.NoteUtils.setLinesToNote(mainNote, noteLines);
        this._Addon.NoteUtils.scrollWithRefresh(
          this._Addon.NoteUtils.currentLine[mainNote.id]
        );
      });

      const linkPopup = _window.document.querySelector(
        ".link-popup"
      ) as HTMLElement;

      let previewContainer =
        _window.document.getElementById("note-link-preview");
      if (previewContainer) {
        previewContainer.remove();
      }
      previewContainer = _window.document.createElementNS(
        "http://www.w3.org/1999/xhtml",
        "div"
      );
      previewContainer.id = "note-link-preview";
      previewContainer.className = "ProseMirror primary-editor";
      previewContainer.innerHTML =
        await this._Addon.NoteParse.parseNoteStyleHTML(note);
      previewContainer.addEventListener("click", (e) => {
        this._Addon.WorkspaceWindow.setWorkspaceNote("preview", note);
      });
      if (linkPopup) {
        linkPopup.append(insertButton, updateButton, previewContainer);
        previewContainer.setAttribute(
          "style",
          `width: 98%;height: ${
            linkPopup ? Math.min(linkPopup.offsetTop, 300) : 300
          }px;position: absolute;background: white;bottom: 36px;overflow: hidden;box-shadow: 0 0 5px 5px rgba(0,0,0,0.2);border-radius: 5px;cursor: pointer;opacity: 0.9;`
        );
        previewContainer
          .querySelector("div[data-schema-version]")
          .childNodes.forEach((node) => {
            if ((node as Element).setAttribute) {
              (node as Element).setAttribute("style", "margin: 0");
            } else {
              node.remove();
            }
          });
      }
    } else {
      const insertLink = _window.document.querySelector("#insert-note-link");
      if (insertLink) {
        insertLink.remove();
      }

      const updateLink = _window.document.querySelector("#update-note-link");
      if (updateLink) {
        updateLink.remove();
      }

      const previewContainer =
        _window.document.querySelector("#note-link-preview");
      if (previewContainer) {
        previewContainer.remove();
      }
    }
  }

  public async scrollToLine(
    instance: Zotero.EditorInstance,
    lineIndex: number
  ) {
    await instance._initPromise;
    let editorElement = this.getEditorElement(instance._iframeWindow.document);
    const eleList = [];
    const diveTagNames = ["OL", "UL", "LI"];

    const nodes = Array.from(editorElement.children);
    for (let i in nodes) {
      const ele = nodes[i];
      if (diveTagNames.includes(ele.tagName)) {
        this._Addon.NoteParse.parseListElements(
          ele as HTMLElement,
          eleList,
          diveTagNames
        );
      } else {
        eleList.push(ele);
      }
    }
    console.log(eleList, lineIndex);
    if (lineIndex >= eleList.length) {
      lineIndex = eleList.length - 1;
    } else if (lineIndex < 0) {
      lineIndex = 0;
    }

    // @ts-ignore
    const scrollNum = eleList[lineIndex].offsetTop;
    (editorElement.parentNode as HTMLElement).scrollTo(0, scrollNum);
  }

  public scrollToPosition(instance: Zotero.EditorInstance, offset: number) {
    let editorElement = this.getEditorElement(instance._iframeWindow.document);
    // @ts-ignore
    (editorElement.parentNode as HTMLElement).scrollTo(0, offset);
  }
}

export default EditorViews;
