import { AddonBase, EditorMessage } from "./base";

class AddonWizard extends AddonBase {
  enableSetup: boolean;
  enableCollection: boolean;
  collectionName: string;
  enableNote: boolean;
  template: string;
  templateCN: string;
  private _document: Document;
  constructor(parent: Knowledge4Zotero) {
    super(parent);
    this.enableSetup = true;
    this.enableCollection = true;
    this.collectionName = "";
    this.enableNote = true;
    this.template = `<div data-schema-version="8"><h1>Knowledge for Zotero User Guide: Workflow</h1>\n<p>Welcome to <strong>Knowledge for Zotero</strong> !</p>\n<p>This note helps you quickly learn how to use this addon in 3 min!</p>\n<p>Let's start now.</p>\n<p> </p>\n<h2>1 What is Knowledge</h2>\n<p>Knowledge is an extension of Zotero's built-in note function.</p>\n<p>Zotero's note is much like a markdown/rich-text editor. You can edit the format with the tools above⬆️.</p>\n<h3>1.1 Workspace Window</h3>\n<p>The knowledge workspace window contains an outline area(left side⬅️), the main note area, and the preview area(right side➡️).</p>\n<p><span style="color: rgb(51, 51, 51)">|---------------||----------------||----------------|</span></p>\n<p><span style="color: rgb(51, 51, 51)">| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;|| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; |</span></p>\n<p><span style="color: rgb(51, 51, 51)">| &nbsp; &nbsp;Outline &nbsp;&nbsp; || &nbsp;Main Note &nbsp;|| &nbsp; Preview &nbsp;&nbsp; |</span></p>\n<p><span style="color: rgb(51, 51, 51)">| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; |</span></p>\n<p><span style="color: rgb(51, 51, 51)">|------------ --||---------------||----------------|</span></p>\n<p>Open workspace by clicking the 'Open Workspace' line above the 'My Library' line in Zotero main window. Alternatively, open it with the <span style="background-color: #ffd40080">'🏠home' button</span> on the top-left of note editors.</p>\n<p></p>\n<h3>1.2 Main note</h3>\n<p>This addon uses a Zotero note item as the main note. It will show up on the main area of the workspace window.</p>\n<p>All links will be added to the main note.</p>\n<p>Change the main note with the <span style="background-color: #ffd40080">'📂folder' button</span> on the bottom of the outline area(left side⬅️).</p>\n<p></p>\n<h2>2 Gather Ideas to Main Note</h2>\n<h3>2.1 From Note</h3>\n<p>Select a note outside the workspace window(in Zotero items view or PDF viewer), you may realize a <span style="background-color: #ffd40080">button with the addon's icon</span> on the top of the note editor toolbar.</p>\n<p>Click it, the current note link will be inserted into the main note's cursor position;</p>\n<p>Select a heading, the note's link will be inserted into the end of this heading.</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Open a PDF and open/create a note(in the right side bar of PDF viewer). Add a link below.</p>\n</blockquote>\n<p></p>\n<h4>2.1.1 INSERT HERE</h4>\n<p>You can insert the link here.</p>\n<p></p>\n<h3>2.2 From Annotation</h3>\n<p>You can find a <span style="background-color: #ffd40080">button with the addon's icon</span> on every annotation(in the left sidebar of PDF viewer).</p>\n<p>Click it, and a new note with this annotation will be created under the PDF item. You can also add the link to the main note in the note editor.</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Open a PDF and open/create an annotation(in the left sidebar of PDF viewer). Add a link.</p>\n</blockquote>\n<p></p>\n<h2>3 Check Linked Notes in Workspace Window</h2>\n<h3>3.1 View Linked Notes</h3>\n<p>Suppose you have added a lot of links to the main note. Now, it's time to view what you've got.</p>\n<p>Go back to the workspace window.</p>\n<p>Click links, the linked note will show up in the preview area(right side➡️).</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Open a note link.</p>\n</blockquote>\n<h3>3.2 View Linked Note's PDF</h3>\n<p>Click the <span style="background-color: #ffd40080">'📄PDF' button</span> on the top-left of the preview area.</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Open a linked note's PDF.</p>\n</blockquote>\n<p></p>\n<h2>4 Outline Mode</h2>\n<p>Switch the outline mode with the <span style="background-color: #ffd40080">'📊mode' button</span> on the bottom of the outline area.</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Try different outline modes.</p>\n</blockquote>\n<p></p>\n<h2>5 Export</h2>\n<p>Click the<span style="background-color: #ffd40080"> '⬆️export' button</span> on the top-right of the main note area. Choose a format to export, e.g. MarkDown.</p>\n<p>If you are using MS Word/OneNote, export to clipboard and paste there.</p>\n<blockquote>\n<p><strong>💡 Try it now!</strong></p>\n<p>Export this main note!</p>\n</blockquote>\n<p></p>\n<h2>6 Start a New Job</h2>\n<p>After the export, you may want to start a new job with a new empty main note.</p>\n<p>Create a note and right-click to set it as the main note, or just create a new main note.</p>\n<p>Switch between different main notes with the <span style="background-color: #ffd40080">'📂folder' button</span> on the bottom of the outline area.</p>\n<blockquote>\n<p><strong>✨ Hint</strong></p>\n<p>Create a new collection and save all main notes there is the best way to manage them.</p>\n<p>The user guide should have done this for you.</p>\n</blockquote>\n<p></p>\n<p>Congratulations!</p>\n<p>You can select a new main note and start working with <strong>Knowledge for Zotero</strong> now. Have fun!</p>\n<p></p>\n<p></p>\n</div>`;
    this.templateCN = `<div data-schema-version=\"8\"><h1>Knowledge for Zotero 用户指引：工作流</h1>\n<p>欢迎使用 <strong>Knowledge for Zotero</strong> !</p>\n<p>本笔记帮助您在3分钟内快速学习如何使用此插件！</p>\n<p>现在开始吧。</p>\n<p></p>\n<h2>1 认识 Knowledge</h2>\n<p>Knowledge是Zotero内置note功能的扩展。</p>\n<p>Zotero的note很像一个标记/富文本编辑器。您可以使用上方工具编辑格式⬆️。</p>\n<h3>1.1 工作区窗口</h3>\n<p>知识工作区窗口包含一个大纲区域（左侧⬅️），主笔记区域和预览区域（右侧➡️）。</p>\n<p><span style=\"color: rgb(51, 51, 51)\">|---------------||----------------||----------------|</span></p>\n<p><span style=\"color: rgb(51, 51, 51)\">| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;|| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; |</span></p>\n<p><span style=\"color: rgb(51, 51, 51)\">| &nbsp; &nbsp; &nbsp;大纲 &nbsp;&nbsp;&nbsp; || &nbsp; &nbsp;主笔记 &nbsp; &nbsp;&nbsp;|| &nbsp; &nbsp;&nbsp; 预览 &nbsp; &nbsp;&nbsp; |</span></p>\n<p><span style=\"color: rgb(51, 51, 51)\">| &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; || &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; |</span></p>\n<p><span style=\"color: rgb(51, 51, 51)\">|------------ --||---------------||----------------|</span></p>\n<p>在Zotero主窗口中单击“我的文库”上方的<span style=\"background-color: #ffd40080\">“Open Workspace”</span>来打开工作区。或者，用笔记编辑器左上角的<span style=\"background-color: #ffd40080\">“🏠主页”按钮</span>.</p>\n<p></p>\n<h3>1.2 主笔记</h3>\n<p>这个插件使用某一个Zotero note作为主笔记。它将显示在工作区窗口的主笔记区域。</p>\n<p>所有链接都将添加到主笔记中。</p>\n<p>点击位于大纲区域左下方的<span style=\"background-color: #ffd40080\">📂“文件夹”按钮</span> 来选择不同的note作为主笔记。</p>\n<p></p>\n<h2>2 在主笔记中收集想法</h2>\n<h3>2.1 从Note</h3>\n<p>在工作区窗口外选择一个note（在Zotero 条目视图或PDF阅读器中），您会在笔记编辑器工具栏顶部看到一个<span style=\"background-color: #ffd40080\">带有本插件图标的按钮</span>。</p>\n<p>点击它，当前笔记的链接将插入主笔记的光标位置；</p>\n<p>选择一个标题层级，笔记的链接将插入该标题的末尾。</p>\n<blockquote>\n<p><strong>💡 尝试一下!</strong></p>\n<p>打开PDF并打开/创建笔记（在PDF 阅读器的右侧栏中）。用上面的方法在这条主笔记添加一个链接。</p>\n</blockquote>\n<p></p>\n<h4>2.1.1 用来插入链接的位置</h4>\n<p>你可以在这里插入链接。</p>\n<p></p>\n<h3>2.2 从Annotation（批注高亮）</h3>\n<p>你可以在每个批注上找到一个<span style=\"background-color: #ffd40080\">带有插件图标的按钮</span>（在PDF 阅读器的左侧栏中）。</p>\n<p>单击它，PDF项目下将创建一个带有此批注的新笔记。也可以在打开的笔记编辑器中将链接添加到主笔记。</p>\n<blockquote>\n<p><strong>💡 尝试一下!</strong></p>\n<p>打开PDF并打开/创建批注高亮（在PDF 阅读器的左侧栏中）。用上面的方法在这条主笔记添加一个链接。</p>\n</blockquote>\n<p></p>\n<h2>3 查看工作区窗口中的链接笔记</h2>\n<h3>3.1 查看链接笔记</h3>\n<p>假设你已经在主笔记添加了很多的链接。现在，是时候看看你的结果了。</p>\n<p>返回工作区窗口。</p>\n<p>单击链接，链接的笔记将显示在预览区域（右侧➡️）。</p>\n<blockquote>\n<p><strong>💡 尝试一下!</strong></p>\n<p>在工作区窗口打开一个笔记链接。</p>\n</blockquote>\n<h3>3.2 查看链接笔记的 PDF</h3>\n<p>在上一步打开的预览笔记中，点击预览区左上角的<span style=\"background-color: #ffd40080\">“📄PDF”按钮</span>。</p>\n<blockquote>\n<p><strong>💡尝试一下!</strong></p>\n<p>打开一个链接笔记的 PDF。</p>\n</blockquote>\n<p></p>\n<h2>4 大纲视图</h2>\n<p>点击大纲区域左下角的 <span style=\"background-color: #ffd40080\">‘📊大纲模式‘ 按钮</span> 来切换大纲视图模式。</p>\n<blockquote>\n<p><strong>💡 尝试一下!</strong></p>\n<p>尝试不同的大纲模式（思维导图）</p>\n</blockquote>\n<p></p>\n<h2>5 导出</h2>\n<p>点击主笔记区域右上角的<span style=\"background-color: #ffd40080\">“⬆️导出”按钮</span>。选择要导出的格式，比如MarkDown。</p>\n<p>如果您使用的是MS Word/OneNote，请导出到剪贴板并粘贴到那里。</p>\n<blockquote>\n<p><strong>💡 尝试一下!</strong></p>\n<p>导出这个主笔记！</p>\n</blockquote>\n<p></p>\n<h2>6 开始新的任务</h2>\n<p>导出后，您可能希望使用新的空主笔记开始新任务。</p>\n<p>创建一个note笔记，然后右键单击将其设置为主笔记；或者直接创建一个新的主笔记。</p>\n<p>使用大纲区域底部的<span style=\"background-color: #ffd40080\">“📂文件夹”按钮</span>切换不同的主笔记。</p>\n<blockquote>\n<p><strong>✨ 提示</strong></p>\n<p>创建一个新的文件夹并在其中专门保存所有的主笔记——这是管理主笔记的最佳方法。</p>\n<p>用户指引应该已经为您做到了这一点。</p>\n</blockquote>\n<p></p>\n<p>恭喜!</p>\n<p>你现在可以选择或新建一个主笔记，然后开始使用 <strong>Knowledge for Zotero</strong>了。用的开心！</p>\n<p></p>\n<p></p>\n</div>`;
  }
  init(_document: Document) {
    this._document = _document;
    Zotero.debug("Knowledge4Zotero: Initialize AddonWizard.");
    this.updateCollectionSetup();
  }
  changeSetup() {
    this.enableSetup = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-enable"
      ) as XUL.Checkbox
    ).checked;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionenable"
      ) as XUL.Checkbox
    ).disabled = !this.enableSetup;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).disabled = !(this.enableSetup && this.enableCollection);
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-noteenable"
      ) as XUL.Checkbox
    ).disabled = !this.enableSetup;
  }
  updateCollectionSetup() {
    this.enableCollection = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionenable"
      ) as XUL.Checkbox
    ).checked;
    this.collectionName = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).value;
    (
      this._document.getElementById(
        "Knowledge4Zotero-setup-collectionname"
      ) as XUL.Textbox
    ).disabled = !(this.enableSetup && this.enableCollection);
  }
  updateNoteSetup() {
    this.enableNote = (
      this._document.getElementById(
        "Knowledge4Zotero-setup-noteenable"
      ) as XUL.Checkbox
    ).checked;
  }
  async setup() {
    if (this.enableSetup) {
      if (this.enableCollection && this.collectionName.trim().length > 0) {
        const collection = new Zotero.Collection();
        collection.name = this.collectionName;
        await collection.saveTx();
      }
      if (this.enableNote) {
        const noteID = await ZoteroPane_Local.newNote();
        Zotero.Items.get(noteID).setNote(
          Zotero.locale === "zh-CN" ? this.templateCN : this.template
        );
        await this._Addon.events.onEditorEvent(
          new EditorMessage("setMainKnowledge", {
            params: { itemID: noteID, enableConfirm: false },
          })
        );
      }
    }
  }
}

export default AddonWizard;
