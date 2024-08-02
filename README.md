# Better Notes for Zotero

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)
[![telegram group](https://img.shields.io/badge/Join%20Community-@bnzotero-blue?style=flat-square&logo=telegram)](https://t.me/bnzotero)

<div align=center><img src="./docs/res/teaser.png" width="800px"></img></div>

Everything about note management. All in Zotero.

Better Notes Handbook (outdated, for version<=0.8.9): [中文 (provide translation)](https://zotero.yuque.com/staff-gkhviy/better-notes/biigg4?)

Join the community on Telegram: @bnzotero

## 🧩 Outline

[🧐 What is this?](#-what-is-this)

[🤔 What can it do?](#-what-can-it-do)

[👋 Install](#-install)

[😎 Quick start](#-quick-start)

<details style="text-indent: 2em">
<summary>More</summary>

[Getting Started with the _Workspace_](#getting-started-with-the-workspace)

[Note Editor](#note-editor)

[Note Link](#note-link)

[Note Template](#note-template)

[Syncing: Note 🔄️ Markdown](#syncing-note-%EF%B8%8F-markdown)

[Note Export](#note-export)

[GPT Integration](#gpt-integration)

[Action Workflow](#action-workflow)

[Other Features](#other-features)

</details>

[🧲 API](#-api)

[🔧 Development](#-development)

[🔔 Disclaimer](#-disclaimer)

[🔎 My Zotero Plugins](#-my-zotero-plugins)

[🫶 Sponsors](#-sponsors)

[🤗 Contributors](#-contributors)

## 🧐 What is this?

Better Notes (BN) is a plugin for [Zotero](https://zotero.org).

BN streamlines your workflows of:

- paper reading
- annotating
- note taking
- metadata analyzing
- knowledge exporting
- AI writing assistant

and:

- works out of the box
- highly customizable
- all in Zotero

## 🤔 What can it do?

🖇️ Connect knowledge fragments with _note link_. With one click. [Learn more →](#note-link)

🗂️ Simplify and automate knowledge analysis with extensive _note templates_. With one click. [Learn more →](#note-template)

🔄️ Keep in sync with your Markdown files. Two-way, automatically. [Learn more →](#syncing-note-%EF%B8%8F-markdown)

🖨️ Export notes to different formats: Markdown, Docx, PDF, and mind map. [Learn more →](#note-export)

📝 Enhancements for Zotero's note editor with outline, link relation, view images.... Open as much note tabs/windows as you like!

## 👋 Install

- Download the plugin (.xpi file) from below. For Zotero 7 beta, please always use the latest beta version.

  - [Latest Version: 1.1.4-beta.111](https://github.com/windingwind/zotero-better-notes/releases/download/v1.1.4-beta.111/better-notes-for-zotero.xpi)
  - [Latest Stable](https://github.com/windingwind/zotero-better-notes/releases/latest)
  - [v1.0.4](https://github.com/windingwind/zotero-better-notes/releases/tag/1.0.4) (last for Zotero 6)
  - [v0.8.9](https://github.com/windingwind/zotero-better-notes/releases/tag/0.8.9) (last with auto-insert, tag-insert, math-ocr, for Zotero 6)
  - [All Releases](https://github.com/windingwind/zotero-better-notes/releases) (including beta plugin for Zotero 7 beta)

  _Note_: If you're using Firefox as your browser, right-click the `.xpi` and select "Save As.."

- In Zotero click `Tools` in the top menu bar and then click `Plugins`
- Go to the Extensions page and then click the gear icon in the top right.
- Select `Install Add-on from file`.
- Browse to where you downloaded the `.xpi` file and select it.
- Finish!

## 😎 Quick start

BN offers a range of features that can be combined like Lego blocks to build your own note-taking workflow.

Start taking notes in Zotero with BN in **5 minutes**!

### Getting Started with the _Workspace_

> 💡 This section is outdated and will be removed. For the latest beta version, the workspace is no longer a thing. You can open unlimited number of note tab/window, which is what we call `workspace` in the past.

The _workspace_ serves as the **central hub** where input flows (papers and annotations) converge with output flows (summaries and comparisons).

To open the _workspace_, click the <img src="addon/chrome/content/icons/favicon.png" alt="icon" width="20px"> button in the tabs bar.

<div align=center><img src="https://user-images.githubusercontent.com/33902321/236622132-5ed9bd23-3c0e-4775-b273-745824cc4b51.gif" width="800px"></img></div>

The _workspace_ contains a default note called the _workspace note_. You can create a new note as the _workspace note_ if prompted on opening _workspace_.

> 💡 How to set an existing note as the _workspace note_?
>
> 1. In the library: select a note item and right-click
> 2. In the note editor: click on the Tools button
>
> You can change the _workspace note_ at any time.

The _workspace_ allows you to take notes and write, just like you would in MS Word or a markdown editor (e.g., Obsidian).

> **Explore the _Workspace_!**  
> 💡 The layout from left to right is:
>
> - Outline
> - _Workspace note_ editor (main editor)
> - Note link preview (hidden by default)
> - Reader notes pane (hidden by default)
>
> 💡 To toggle these panes, hover the _workspace_ tab and click corresponding buttons.  
> 💡 To open the _workspace_ in a new window, drag the _workspace_ tab.

### Note Editor

The _workspace_ includes the note editor for the _workspace note_. You can use it to take notes and write summaries.

> 💡 How to open note editor?
>
> - In the library: click to open a note editor and double-click to open note editor in a standalone window.
> - In the PDF reader: right-side bar
>
> 💡 How to create a new note?  
> Click the note icon in the library tools bar (the row under the tabs bar).

<div align=center><img src="https://user-images.githubusercontent.com/33902321/236622355-2b8b2c00-a640-41fa-bb82-372fa10ecc64.png" width="400px"></img></div>

### Note Link

To create a _note link_ between current note and the _workspace note_, simply click the <img src="addon/chrome/content/icons/favicon.png" width="20px"></img> button in the title bar of current note editor.

<div align=center><img src="https://user-images.githubusercontent.com/33902321/236622693-f7c7c82f-7434-4dbf-baf3-d03a72eb51c5.png" width="800px"></img></div>

### Note Template

Still spending a lot of time writing summaries or doing copy-pasting while taking notes? Say hello to _Note Template_!

_Note Template_ is designed for tasks like:

- Summarize metadata and annotations from multiple papers, with customized filters
- Compare papers across sections
- Generate content programmatically

> 💡 Need help or looking for community templates? [See here →](https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates)
>
> 💡 Want to write/share your own templates?
>
> [How to write →](docs/about-note-template.md#write-note-template)
>
> [How to share →](docs/about-note-template.md#share-your-template)

<div align=center><img src="https://user-images.githubusercontent.com/33902321/236623159-8f67064b-1fab-4cf1-abf4-0c8243370a14.gif" width="800px"></img></div>

### Syncing: Note 🔄️ Markdown

With BN, you can integrate your note-taking into your existing workflow seamlessly. If you use markdown editors like Obsidian, you can keep your notes in sync with external Markdown files easily.

To set up auto-sync, click `Set Auto-Sync` the first time you export your note. There is no need for any third-party tools or complicated setups!

<div align=center><img src="https://user-images.githubusercontent.com/33902321/236622955-9ca54590-d6f8-433a-8622-33b35fc7b79d.png" width="800px"></img></div>

Any changes made to your note or its corresponding Markdown file will be automatically synced. This feature makes it easy to keep all of your notes up to date and in one place.

> 💡 Note: The note being edited will be synced after the editor is closed.

### Note Export

BN offers various options to export your notes, giving you the flexibility to choose the format that suits your needs.

You can export your note to the following formats:

- A new note in Zotero
- Markdown file (embedded or linked, with images)
- MS Word document (.docx)
- PDF document (.pdf)
- FreeMind file (.mm)

Simply click on the corresponding export button in the toolbar and follow the prompts.

### GPT Integration

The [Zotero-GPT](https://github.com/MuiseDestiny/zotero-gpt) plugin provides GPT Integration. If you also have Better Notes installed, you can wake up GPT pane in the _workspace_ note editor with `space` key.

You can:

- Ask GPT questions about current note
- Summarize/fix spelling and grammar/translate/polish the selection
- Accept suggestions/modifications from GPT with `enter` key.

### Action Workflow

The [Actions & Tags](https://github.com/windingwind/zotero-actions-tags) plugin provides a powerful workflow engine for Zotero. If you also have Better Notes installed, you can use the following actions to automate note generation/editing/syncing/etc.:

- [Auto-generate note from template when opening an item](https://github.com/windingwind/zotero-actions-tags/discussions/108)
- [Auto-sync note when opening/creating an item](https://github.com/windingwind/zotero-actions-tags/discussions/140)
- [More...](https://github.com/windingwind/zotero-actions-tags/discussions/categories/action-scripts)

### Other Features

- Quick Note: convert annotation to note with one click.
- Resize images with right-click menu.
- Preview images with double-click/ctrl-click.

## 🧲 API

BN provides APIs for other plugin developers in `Zotero.BetterNotes.api.${API_MODULE}`. See [`api.ts`](src/api.ts).

- `workspace`: Workspace APIs
- `sync`: Syncing APIs
- `convert`: Lossless conversion between note, HTML, Markdown, note link, and annotation
- `template`: Manipulate note templates
- `$export`: Export note
- `$import`: Import note
- `editor`: Note editor APIs. Give your script the full control of contents in the note editor.

## 🔧 Development

This plugin is built based on the [Zotero Plugin Template](https://github.com/windingwind/zotero-plugin-template). See the setup and debug details there.

To startup, run

```bash
git clone https://github.com/windingwind/zotero-better-notes.git
cd zotero-better-notes
npm install
npm run build
```

The plugin is built to `./builds/*.xpi`.

## 🔔 Disclaimer

Use this code under AGPL. No warranties are provided. Keep the laws of your locality in mind!

## 🔎 My Zotero Plugins

- [Translate for Zotero](https://github.com/windingwind/zotero-pdf-translate): PDF translation for Zotero
- [zotero-pdf-preview](https://github.com/windingwind/zotero-tag): PDF preview for Zotero
- [zotero-tag](https://github.com/windingwind/zotero-tag): Automatically tag items/Batch tagging

## 🙌 Sponsors

Thanks
[peachgirl100](https://github.com/peachgirl100), [Juan Gimenez](),
and other anonymous sponsors!

If you want to leave your name here, please email me or leave a message with the donation.

## 🤗 Contributors

<a href="https://github.com/windingwind/zotero-better-notes/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=windingwind/zotero-better-notes" />
</a>
