# Zotero Better Notes

![teaser](./image/README/teaser.png)

Everything about note management. All in Zotero.

Better Notes Handbook: [EN](https://github.com/windingwind/zotero-better-notes/wiki) | [中文 (provide translation)](https://zotero.yuque.com/staff-gkhviy/better-notes/biigg4?)

User Guide: [EN](./UserGuide.md) | [中文](./UserGuideCN.md)

## Introduction

Better Notes is a plugin for [Zotero](https://zotero.org).

It streamlines your unordered workflows of metadata analyzing, paper reading, annotating, and note-taking into a closed loop in Zotero.

Works out of the box and is highly customizable.

## Contents

- [Quick start](#quick-start)
- [Install](#install)
- [Note workspace](#note-workspace)
- Connect notes with the [bi-directional links](#bi-directional-link-support)
- Automate note generation with the [note templates](#note-templates)
- [Export notes](#export) to different formats
- Integrate with 3rd-party MarkDown editors seamlessly with [note<->markdown syncing](#syncing-note-markdown)
- [Other features](#other-features)

## Quick Start

> See [Handbook:Quick Start](https://zotero.yuque.com/staff-gkhviy/better-notes/gw5d7v) for more details.

New to note-taking? Install and start now!

Already an Obsidian/Logseq/... user? Forget those complicated integration tools and keep them in sync with MarkDown files with just one click.

## Install

- Download the latest release (.xpi file) from the [Releases Page](https://github.com/windingwind/zotero-better-notes/releases)_Note_ If you're using Firefox as your browser, right-click the `.xpi` and select "Save As.."
- In Zotero click `Tools` in the top menu bar and then click `Addons`
- Go to the Extensions page and then click the gear icon in the top right.
- Select `Install Add-on from file`.
- Browse to where you downloaded the `.xpi` file and select it.
- Restart Zotero, by clicking `restart now` in the extensions list where the plugin is now listed.

## Note Workspace

> See [Handbook:Workspace](https://zotero.yuque.com/staff-gkhviy/better-notes/yul2qm) for more details.

The workspace allows you to focus on the note, as shown in the teaser on top of the README.

- Note outline(tree view, mindmap, and bubble map)
- Note links Preview

## Bi-directional Link

> See [Handbook:Bi-directional Link](https://zotero.yuque.com/staff-gkhviy/better-notes/yxpiew) for more details.

The bi-directional link note(双链笔记) is supported. Link your notes inside Zotero with just one click.

Export with its' linked sub-notes to Obsidian:
![Obsidian example](./image/README/markdown-ob.png)

## Note Templates

> See [Handbook:Note Templates](https://zotero.yuque.com/staff-gkhviy/better-notes/un54wc) for more details.

Use customized templates to import data from items/notes!
![template](./image/README/template.gif)

[How to Use Templates](./TemplateUsage.md)

[How to Write Your Own Template](./TemplateDoc)

See what templates can do and find templates contributed by the community here: [Note Templates from Community](https://github.com/windingwind/zotero-better-notes/discussions/categories/note-templates)

## Export

> See [Handbook:Export](https://zotero.yuque.com/staff-gkhviy/better-notes/nxlngg) for more details.

- To new note in Zotero
- To MarkDown file(embed or link, with images)
- To MS Word document(.docx)
- To PDF document(.pdf)
- To FreeMind file(.mm)

## Syncing: Note<->MarkDown

> See [Handbook:Sycn](https://zotero.yuque.com/staff-gkhviy/better-notes/aid2c3) for more details.

It's painless to Better Notes into your current workflow if you are using software like Obsidian. Keep your notes in sync with external MD files with one click.

Click 'Auto Sync to Export Path' the first time you export your note. Do not require any third-party tools or complicated setups!

Any modification in the note or its corresponding MarkDown file will be automatically synced.

![syncing](./image/README/sync.png)

## Other Features

> See [Handbook:Other Features](https://zotero.yuque.com/staff-gkhviy/better-notes/sh4v2y) for more details.

- Quick Note: annotation to note with one click. Support MarkDown comments.
  <img src="./image/README/markdowncomment.png" width="400px"></img>
- Auto-insert new annotations to note. Disabled by default.
- Format MarkDown/AsciiDoc in the clipboard.
- Quick Cite: cite items in the note with the given cite format.
- Image annotation math OCR.
- Resize images (right-click on images).
- Preview images (double-click/ctrl-click on images).
- Customize link actions.
- Note editor enhancements.
  - Quick switch main note.
  - Copy note link.
  - Import from MarkDown.
  - Quick Cite.
- ...

## Development & Contributing

This addon is built based on the [Zotero Addon Template](https://github.com/windingwind/zotero-addon-template).

### Build

```shell
# A release-it command: version increase, npm run build, git push, and GitHub release
# You need to set the environment variable GITHUB_TOKEN https://github.com/settings/tokens
# release-it: https://github.com/release-it/release-it
npm run release
```

Alternatively, build it directly using build.js: `npm run build`

### Debug

1. Copy the Zotero command line config file. Modify the commands.

```sh
cp zotero-cmd-default.json zotero-cmd.json
```

2. Initialize the addon development environment following this [link](https://www.zotero.org/support/dev/client_coding/plugin_development#setting_up_a_plugin_development_environment).

3. Build the addon and restart Zotero with this npm command.

```sh
npm run restart
```

You can also debug code in these ways:

- Test code segments in Tools->Developer->Run Javascript;
- Debug output with `Zotero.debug()`. Find the outputs in Help->Debug Output Logging->View Output;
- UI debug. Zotero is built on the Firefox XUL framework. Debug XUL UI with software like [XUL Explorer](https://udn.realityripple.com/docs/Archive/Mozilla/XUL_Explorer).
  > XUL Documents:  
  > https://www.xul.fr/tutorial/  
  > http://www.xulplanet.com/

## Disclaimer

Use this code under AGPL (open source required). No warranties are provided. Keep the laws of your locality in mind!

Part of the code of this repo refers to other open-source projects within the allowed scope.

- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)

## My Other Zotero Addons

- [zotero-pdf-preview](https://github.com/windingwind/zotero-pdf-preview) PDF preview for Zotero
- [zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate) PDF translation for Zotero 6
- [zotero-tag](https://github.com/windingwind/zotero-tag) Automatically tag items/Batch tagging

## Sponsor Me

I'm windingwind, an active Zotero(https://www.zotero.org) plugin developer. Devoting to making reading papers easier.

Sponsor me to buy a cup of coffee. I spend more than 24 hours every week coding, debugging, and replying to issues in my plugin repositories. The plugins are open-source and totally free.

If you sponsor more than $10 a month, you can list your name/logo here and have priority for feature requests/bug fixes!
