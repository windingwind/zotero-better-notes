# Better Notes for Zotero - Modified Version

基于 [windingwind/zotero-better-notes](https://github.com/windingwind/zotero-better-notes) v3.3.3 的修改版本。

## 新增功能

### 1. 从 Markdown 导入为笔记（右键菜单）

在文献库中右键点击任意条目，选择 **"从 Markdown 导入为笔记"**，即可将本地 Markdown 文件导入为该条目的子笔记。

**功能特点：**
- 支持多选 `.md` 文件批量导入
- 每个选中的文件创建一个独立的子笔记，关联到目标条目
- 可选是否同步导入的笔记（保持与本地 Markdown 文件的同步）

### 2. 智能默认目录

打开文件选择器时，**自动定位到该条目 PDF 附件所在的文件夹**，无需手动导航到目标目录。

**逻辑：**
- 自动查找条目的 PDF 附件
- 获取 PDF 文件所在路径
- 文件选择器默认打开该路径

## 安装方法

1. 从 [Releases](https://github.com/caipio/zotero-better-notes/releases) 页面下载最新的 `.xpi` 文件
2. 关闭 Zotero
3. 在 Zotero 中依次点击 Tools > Add-ons
4. 点击右上角齿轮图标 > Install Add-on From File...
5. 选择下载的 `.xpi` 文件
6. 重启 Zotero

## 修改的文件

| 文件 | 说明 |
|------|------|
| `src/modules/createNote.ts` | 添加 `importMDToItem` 函数（含智能默认目录逻辑） |
| `src/modules/menu.ts` | 添加右键菜单项 "从 Markdown 导入为笔记" |
| `src/hooks.ts` | 注册 `onImportMDToItem` 钩子函数 |
| `addon/locale/en-US/mainWindow.ftl` | 添加英文翻译 |
| `addon/locale/zh-CN/mainWindow.ftl` | 添加中文翻译 |
| `typings/i10n.d.ts` | 添加翻译类型定义 |

## 原项目

- 原项目：https://github.com/windingwind/zotero-better-notes
- 原版本：v3.3.3
