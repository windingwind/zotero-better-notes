// Data
export { SYSTEM_TEMPLATE_NAMES, DEFAULT_TEMPLATES };

const SYSTEM_TEMPLATE_NAMES = [
  "[QuickInsertV3]",
  "[QuickImportV2]",
  "[QuickNoteV5]",
  "[ExportMDFileNameV2]",
  "[ExportMDFileHeaderV2]",
  "[ExportMDFileContent]",
  "[ExportLatexFileContent]",
];

// Non-system templates are removed from default templates
const DEFAULT_TEMPLATES = <NoteTemplate[]>[
  {
    name: "[QuickInsertV3]",
    text: `// @use-markdown
[\${linkText}](\${link})`,
  },
  {
    name: "[QuickImportV2]",
    text: `<blockquote>
\${{
  return await Zotero.BetterNotes.api.convert.link2html(link, {noteItem, dryRun: _env.dryRun});
}}$
</blockquote>`,
  },
  {
    name: "[QuickNoteV5]",
    text: `\${{
  let res = "";
  if (annotationItem.annotationComment) {
    res += await Zotero.BetterNotes.api.convert.md2html(
      annotationItem.annotationComment
    );
  }
  res += await Zotero.BetterNotes.api.convert.annotations2html([annotationItem], {noteItem, ignoreComment: true});
  return res;
}}$`,
  },
  {
    name: "[ExportMDFileNameV2]",
    text: '${(noteItem.getNoteTitle ? noteItem.getNoteTitle().replace(/[/\\\\?%*:|"<> ]/g, "-") + "-" : "")}${noteItem.key}.md',
  },
  {
    name: "[ExportMDFileHeaderV2]",
    text: `\${{
  let header = {};
  header.tags = noteItem.getTags().map((_t) => _t.tag);
  header.parent = noteItem.parentItem
    ? noteItem.parentItem.getField("title")
    : "";
  header.collections = (
    await Zotero.Collections.getCollectionsContainingItems([
      (noteItem.parentItem || noteItem).id,
    ])
  ).map((c) => c.name);
  return JSON.stringify(header);
}}$`,
  },
  {
    name: "[ExportMDFileContent]",
    text: `\${{
  return mdContent;
}}$`,
  },
  {
    name: "[ExportLatexFileContent]",
    text: `\${{
  return latexContent;
}}$`,
  },
  {
    name: "[Item] Quantitative Research Reading Note / 定量研究阅读笔记",
    text: `// @use-markdown
// @author Zotero Better Notes
// @link https://github.com/windingwind/zotero-better-notes

\${{
  /* ===== APA Narrative Citation 生成 ===== */
  const creators = topItem.getCreators();
  const year = topItem.getField("year") || "n.d.";
  let citation = "";
  if (creators.length === 0) {
    citation = "Unknown (" + year + ")";
  } else if (creators.length === 1) {
    citation = creators[0].lastName + " (" + year + ")";
  } else if (creators.length === 2) {
    citation = creators[0].lastName + " & " + creators[1].lastName + " (" + year + ")";
  } else {
    citation = creators[0].lastName + " et al. (" + year + ")";
  }

  let md = "";
  md += "# " + citation + "\\n\\n";
  md += "---\\n\\n";

  /* -- Executive Summary 论文概述 -- */
  md += "## Executive Summary / 论文概述\\n\\n";
  md += "### Narrative Summary / 文字概述\\n\\n";
  md += "<!-- 用一段话概括这篇论文的核心内容：研究了什么问题、怎么研究的、发现了什么 -->\\n\\n";
  md += " \\n\\n";
  md += "### Theoretical Model / 理论模型\\n\\n";
  md += "<!-- 记录论文的理论模型或研究框架 -->\\n\\n";
  md += " \\n\\n";

  /* -- My Reflections 我的迷思 -- */
  md += "## My Reflections / 我的迷思\\n\\n";
  md += "<!-- 记录你在阅读过程中的思考、疑问和灵感 -->\\n\\n";
  md += "- \\n\\n";

  /* -- Research Questions & Hypotheses 研究问题与假设 -- */
  md += "## Research Questions & Hypotheses / 研究问题与假设\\n\\n";
  md += "<!-- 记录核心研究问题和假设 -->\\n\\n";
  md += "### RQ\\n\\n";
  md += " \\n\\n";
  md += "### Hypotheses / 假设\\n\\n";
  md += "- H1: \\n";
  md += "- H2: \\n\\n";

  /* -- Theoretical Framework 理论框架 -- */
  md += "## Theoretical Framework / 理论框架\\n\\n";
  md += "<!-- 记录所使用的理论基础和概念模型 -->\\n\\n";
  md += "### Core Theory / 核心理论\\n\\n";
  md += " \\n\\n";
  md += "### Key Constructs / 关键构念\\n\\n";
  md += " \\n\\n";

  /* -- Methods & Data 研究方法与数据 -- */
  md += "## Methods & Data / 研究方法与数据\\n\\n";
  md += "| Aspect / 方面 | Description / 描述 |\\n";
  md += "| :--- | :--- |\\n";
  md += "| **Sample / 样本** |  |\\n";
  md += "| **Data Source / 数据来源** |  |\\n";
  md += "| **DV / 因变量** |  |\\n";
  md += "| **IV / 自变量** |  |\\n";
  md += "| **Moderator / 调节变量** |  |\\n";
  md += "| **Mediator / 中介变量** |  |\\n";
  md += "| **Controls / 控制变量** |  |\\n";
  md += "| **Analysis Method / 分析方法** |  |\\n";
  md += "\\n";

  /* -- Key Findings & Limitations 关键发现与局限 -- */
  md += "## Key Findings / 关键发现\\n\\n";
  md += "<!-- 假设验证结果 -->\\n\\n";
  md += "| Hypothesis / 假设 | Result / 结果 | Notes / 备注 |\\n";
  md += "| :--- | :---: | :--- |\\n";
  md += "| H1 | ✓/✗ |  |\\n";
  md += "| H2 | ✓/✗ |  |\\n";
  md += "\\n";

  md += "## Limitations & Future Research / 局限与未来方向\\n\\n";
  md += "### Limitations / 局限性\\n\\n";
  md += "- \\n\\n";
  md += "### Future Directions / 未来方向\\n\\n";
  md += "- \\n\\n";

  /* -- Key Quotes 可引用原文 -- */
  md += "## Key Quotes / 可引用原文\\n\\n";
  md += "<!-- 记录值得引用的原文段落 -->\\n\\n";
  md += "> \\"...\\" (" + citation + ", p. )\\n\\n";

  return md;
}}$`,
  },
  {
    name: "[Item] Meta-Analysis Reading Note / Meta分析阅读笔记",
    text: `// @use-markdown
// @author Zotero Better Notes
// @link https://github.com/windingwind/zotero-better-notes

\${{
  /* ===== APA Narrative Citation 生成 ===== */
  const creators = topItem.getCreators();
  const year = topItem.getField("year") || "n.d.";
  let citation = "";
  if (creators.length === 0) {
    citation = "Unknown (" + year + ")";
  } else if (creators.length === 1) {
    citation = creators[0].lastName + " (" + year + ")";
  } else if (creators.length === 2) {
    citation = creators[0].lastName + " & " + creators[1].lastName + " (" + year + ")";
  } else {
    citation = creators[0].lastName + " et al. (" + year + ")";
  }

  let md = "";
  md += "# " + citation + "\\n\\n";
  md += "---\\n\\n";

  /* -- Executive Summary 论文概述 -- */
  md += "## Executive Summary / 论文概述\\n\\n";
  md += "### Narrative Summary / 文字概述\\n\\n";
  md += "<!-- 用一段话概括这篇Meta分析的核心内容：研究了什么关系、纳入了多少研究、总体效应如何 -->\\n\\n";
  md += " \\n\\n";
  md += "### Theoretical Model / 理论模型\\n\\n";
  md += "<!-- 记录Meta分析的理论框架或整合模型 -->\\n\\n";
  md += " \\n\\n";

  /* -- My Reflections 我的迷思 -- */
  md += "## My Reflections / 我的迷思\\n\\n";
  md += "<!-- 记录你在阅读过程中的思考、疑问和灵感 -->\\n\\n";
  md += "- \\n\\n";

  /* -- Research Questions & Hypotheses 研究问题与假设 -- */
  md += "## Research Questions & Hypotheses / 研究问题与假设\\n\\n";
  md += "<!-- 记录核心研究问题和假设 -->\\n\\n";
  md += "### RQ\\n\\n";
  md += " \\n\\n";
  md += "### Hypotheses / 假设\\n\\n";
  md += "- H1: \\n";
  md += "- H2: \\n\\n";

  /* -- Theoretical Framework 理论框架 -- */
  md += "## Theoretical Framework / 理论框架\\n\\n";
  md += "<!-- 记录所使用的理论基础和整合逻辑 -->\\n\\n";
  md += "### Core Theory / 核心理论\\n\\n";
  md += " \\n\\n";
  md += "### Key Constructs / 关键构念\\n\\n";
  md += " \\n\\n";

  /* -- Search & Inclusion Strategy 检索与纳入策略 -- */
  md += "## Search & Inclusion Strategy / 检索与纳入策略\\n\\n";
  md += "| Aspect / 方面 | Description / 描述 |\\n";
  md += "| :--- | :--- |\\n";
  md += "| **Databases / 检索数据库** |  |\\n";
  md += "| **Search Terms / 检索词** |  |\\n";
  md += "| **Time Span / 检索时间范围** |  |\\n";
  md += "| **Inclusion Criteria / 纳入标准** |  |\\n";
  md += "| **Exclusion Criteria / 排除标准** |  |\\n";
  md += "| **PRISMA Flow / PRISMA流程** | Identified / 检索到:  → Screened / 筛选:  → Eligible / 合格:  → Included / 纳入:  |\\n";
  md += "| **Total Studies (k) / 纳入研究数** |  |\\n";
  md += "| **Total Sample (N) / 总样本量** |  |\\n";
  md += "| **Quality Assessment / 质量评估方法** |  |\\n";
  md += "\\n";

  /* -- Coding & Effect Sizes 编码与效应量 -- */
  md += "## Coding & Effect Sizes / 编码与效应量\\n\\n";
  md += "| Aspect / 方面 | Description / 描述 |\\n";
  md += "| :--- | :--- |\\n";
  md += "| **Effect Size Metric / 效应量指标** |  |\\n";
  md += "| **Analytic Model / 分析模型** |  |\\n";
  md += "| **Software / 分析软件** |  |\\n";
  md += "| **Coded Moderators / 编码的调节变量** |  |\\n";
  md += "\\n";
  md += "<!-- 效应量指标如：Cohen\\'s d / Hedges\\' g / r / OR / RR 等 -->\\n";
  md += "<!-- 分析模型如：固定效应 (Fixed-Effects) / 随机效应 (Random-Effects) / 多层次模型 等 -->\\n\\n";

  /* -- Overall Effects 总体效应 -- */
  md += "## Overall Effects / 总体效应\\n\\n";
  md += "| Relationship / 关系 | k | N | ES | 95% CI | p |\\n";
  md += "| :--- | :---: | :---: | :---: | :---: | :---: |\\n";
  md += "|  |  |  |  | [ , ] |  |\\n";
  md += "\\n";

  /* -- Heterogeneity 异质性检验 -- */
  md += "## Heterogeneity / 异质性检验\\n\\n";
  md += "| Index / 指标 | Value / 值 | Interpretation / 解读 |\\n";
  md += "| :--- | :---: | :--- |\\n";
  md += "| **Q** |  |  |\\n";
  md += "| **I\u00B2** |  |  |\\n";
  md += "| **\u03C4\u00B2** |  |  |\\n";
  md += "\\n";
  md += "<!-- I\u00B2 参考: 25% = low, 50% = moderate, 75% = high -->\\n\\n";

  /* -- Moderator Analysis 调节分析 -- */
  md += "## Moderator Analysis / 调节分析\\n\\n";
  md += "<!-- 记录显著的调节变量及其效应 -->\\n\\n";
  md += "| Moderator / 调节变量 | Levels / 水平 | ES | Q-between | p |\\n";
  md += "| :--- | :--- | :---: | :---: | :---: |\\n";
  md += "|  |  |  |  |  |\\n";
  md += "\\n";

  /* -- Publication Bias 发表偏倚 -- */
  md += "## Publication Bias / 发表偏倚\\n\\n";
  md += "| Test / 检验方法 | Result / 结果 | Notes / 备注 |\\n";
  md += "| :--- | :---: | :--- |\\n";
  md += "| **Funnel Plot / 漏斗图** |  |  |\\n";
  md += "| **Egger\\'s Test** |  |  |\\n";
  md += "| **Trim-and-Fill** |  |  |\\n";
  md += "| **Fail-safe N** |  |  |\\n";
  md += "\\n";

  /* -- Key Findings & Implications 关键发现与启示 -- */
  md += "## Key Findings / 关键发现\\n\\n";
  md += "<!-- 总结最重要的发现 -->\\n\\n";
  md += "1. \\n";
  md += "2. \\n";
  md += "3. \\n\\n";

  md += "## Contributions & Implications / 理论贡献与实践启示\\n\\n";
  md += "### Theoretical Contributions / 理论贡献\\n\\n";
  md += "- \\n\\n";
  md += "### Practical Implications / 实践启示\\n\\n";
  md += "- \\n\\n";

  md += "## Limitations & Future Research / 局限与未来方向\\n\\n";
  md += "### Limitations / 局限性\\n\\n";
  md += "- \\n\\n";
  md += "### Future Directions / 未来方向\\n\\n";
  md += "- \\n\\n";

  /* -- Key Quotes 可引用原文 -- */
  md += "## Key Quotes / 可引用原文\\n\\n";
  md += "<!-- 记录值得引用的原文段落 -->\\n\\n";
  md += "> \\"...\\" (" + citation + ", p. )\\n\\n";

  return md;
}}$`,
  },
  {
    name: "[Item] Qualitative Research Reading Note / 定性研究阅读笔记",
    text: `// @use-markdown
// @author Zotero Better Notes
// @link https://github.com/windingwind/zotero-better-notes

\${{
  /* ===== APA Narrative Citation 生成 ===== */
  const creators = topItem.getCreators();
  const year = topItem.getField("year") || "n.d.";
  let citation = "";
  if (creators.length === 0) {
    citation = "Unknown (" + year + ")";
  } else if (creators.length === 1) {
    citation = creators[0].lastName + " (" + year + ")";
  } else if (creators.length === 2) {
    citation = creators[0].lastName + " & " + creators[1].lastName + " (" + year + ")";
  } else {
    citation = creators[0].lastName + " et al. (" + year + ")";
  }

  let md = "";
  md += "# " + citation + "\\n\\n";
  md += "---\\n\\n";

  /* -- Executive Summary 论文概述 -- */
  md += "## Executive Summary / 论文概述\\n\\n";
  md += "### Narrative Summary / 文字概述\\n\\n";
  md += "<!-- 用一段话概括这篇论文的核心内容：研究了什么问题、怎么研究的、发现了什么 -->\\n\\n";
  md += " \\n\\n";
  md += "### Theoretical Model / 理论模型\\n\\n";
  md += "<!-- 记录论文的理论模型或研究框架 -->\\n\\n";
  md += " \\n\\n";

  /* -- My Reflections 我的迷思 -- */
  md += "## My Reflections / 我的迷思\\n\\n";
  md += "<!-- 记录你在阅读过程中的思考、疑问和灵感 -->\\n\\n";
  md += "- \\n\\n";

  /* -- Research Questions & Purpose 研究问题与目的 -- */
  md += "## Research Questions & Purpose / 研究问题与目的\\n\\n";
  md += "<!-- 记录核心研究问题和研究目的 -->\\n\\n";
  md += "### RQ\\n\\n";
  md += " \\n\\n";
  md += "### Purpose / 研究目的\\n\\n";
  md += " \\n\\n";

  /* -- Theoretical Lens 理论视角 -- */
  md += "## Theoretical Lens / 理论视角\\n\\n";
  md += "<!-- 记录理论视角或分析框架，如扎根理论、制度理论、意义建构等 -->\\n\\n";
  md += "### Theoretical Perspective / 理论视角\\n\\n";
  md += " \\n\\n";
  md += "### Key Concepts / 关键概念\\n\\n";
  md += " \\n\\n";

  /* -- Research Design & Methods 研究设计与方法 -- */
  md += "## Research Design & Methods / 研究设计与方法\\n\\n";
  md += "| Aspect / 方面 | Description / 描述 |\\n";
  md += "| :--- | :--- |\\n";
  md += "| **Strategy / 研究策略** |  |\\n";
  md += "| **Context & Site / 研究情境** |  |\\n";
  md += "| **Participants / 研究对象** |  |\\n";
  md += "| **Data Collection / 数据收集** |  |\\n";
  md += "| **Data Analysis / 数据分析** |  |\\n";
  md += "| **Data Structure / 数据结构** |  |\\n";
  md += "\\n";
  md += "<!-- 研究策略如：案例研究/民族志/叙事研究/扎根理论/行动研究等 -->\\n";
  md += "<!-- 数据收集如：半结构化访谈/参与观察/档案资料/焦点小组等 -->\\n";
  md += "<!-- 数据分析如：主题分析/编码/话语分析/内容分析等 -->\\n\\n";

  /* -- Core Findings & Contributions 核心发现与贡献 -- */
  md += "## Key Findings & Themes / 核心发现与主题\\n\\n";
  md += "<!-- 记录主要发现、涌现主题和核心命题 -->\\n\\n";
  md += "1. \\n";
  md += "2. \\n";
  md += "3. \\n\\n";

  md += "## Contributions & Implications / 理论贡献与实践启示\\n\\n";
  md += "### Theoretical Contributions / 理论贡献\\n\\n";
  md += "- \\n\\n";
  md += "### Practical Implications / 实践启示\\n\\n";
  md += "- \\n\\n";

  md += "## Limitations & Future Research / 局限与未来方向\\n\\n";
  md += "### Limitations / 局限性\\n\\n";
  md += "- \\n\\n";
  md += "### Future Directions / 未来方向\\n\\n";
  md += "- \\n\\n";

  /* -- Key Quotes 可引用原文 -- */
  md += "## Key Quotes / 可引用原文\\n\\n";
  md += "<!-- 记录值得引用的原文段落 -->\\n\\n";
  md += "> \\"...\\" (" + citation + ", p. )\\n\\n";

  return md;
}}$`,
  },
];
