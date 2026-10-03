# galaxy#23880 - Add simple borders to tables rendered in Markdown documents

- PR: https://github.com/galaxyproject/galaxy/pull/23880 (scottcain, +23/-1)
- Head reviewed: `73073da31d5f23a5254caef65e9e6a2b79a75647` (single commit on top of current `origin/dev`)
- Worktree: `~/projects/worktrees/galaxy/pr/23880`
- CI: 28/28 green
- Verdict: **approve**; two non-blocking suggestions (use `$border-default`, trim comment). PDF parity is optional follow-up.

## What it does

Adds a `class="markdown-rendered-content"` to the `v-sanitize-html:markdown` div in
`client/src/components/Markdown/Sections/MarkdownDefault.vue` plus a `<style scoped>` block:

- `.markdown-rendered-content :deep(table)` -> `border-collapse: collapse`
- `.markdown-rendered-content :deep(table th|td)` -> `1px solid $border-color`, `0.375rem 0.75rem` padding

## Blast radius

**Does the rule apply at all?** Yes. Content is injected via `v-sanitize-html` (innerHTML), so children
get no `data-v-*` attribute; a plain scoped `table {}` would miss them. `:deep()` compiles to
`.markdown-rendered-content[data-v-x] table th`, which does hit them. Correct use.

**Which DOM it reaches:** only `<table>`s that markdown-it emits from GFM pipe tables inside a
`markdown` section of a Galaxy Markdown document. Nothing else is a descendant of that div:

- `MarkdownDefault` has exactly one consumer: `Sections/SectionWrapper.vue` (`name === 'markdown'`).
- `SectionWrapper` is used by `Markdown/Markdown.vue` (-> `PageView`, `PageRevisionView`,
  `PageDisplayOnly`, `Workflow/InvocationReport`, `Tool/ToolReport`) and
  `Markdown/Editor/CellWrapper.vue` (editor cell preview). So: Pages (view + revisions + display-only),
  invocation reports, tool reports, and the Markdown editor preview. Not tool help, not
  history/dataset annotations, not GalaxyAI/Wizard/notifications (those use galaxy-ui `useMarkdown`
  or other renderers and are untouched).
- `MarkdownHelpPopovers` is a sibling of the div (and popovers teleport), so help-term popover content
  is not hit.
- markdown-it is created with defaults (`html: false`), so authors cannot inject raw `<table>` HTML
  either; only pipe tables.
- KaTeX output is spans + MathML (`mtable`), never `<table>`; unaffected.
- Inline directives (`resolveInlineDirectives`) only rewrite to image references; no tables.

## Conflict with Galaxy's custom markdown tables?

None. Every ```` ```galaxy ```` directive renders in `MarkdownGalaxy.vue`, a **sibling** section
component chosen by `SectionWrapper`, not a descendant of `.markdown-rendered-content`. The
table-ish directives (`history_dataset_as_table`, `history_dataset_display` -> `GTable`;
`job_parameters`, `job_metrics`, `invocation_inputs/outputs`, `workflow_display`, `tool_stdout/stderr`,
`history_dataset_peek`/details) are therefore out of reach. Same for `vega`, `visualization`,
`vitessce` sections. Dataset peek styling (`dataset.scss` `pre.peek table`) is likewise untouched.

## Reuse / consistency

- Bootstrap `.table`/`.table-bordered` via a `md.renderer.rules.table_open` override is *not* a better
  fit: `theme/blue.scss` sets `$table-border-color: transparent`, so `.table-bordered` renders no
  borders, and `.table` would also pull in width/margins/striping. The author's reasoning here holds.
- The repo already styles markdown-rendered tables ad hoc in two places, both with `:deep(table)`:
  `GalaxyAI/ChatMessageCell.vue` (uses `border: $border-default`) and
  `Tool/AuthoringHelpPanel.vue` (`1px solid $border-color`). This PR is a third copy. A shared
  partial would be nicer but is out of scope for a 23-line fix; worth mentioning only as a direction.
- Small nit: `$border-default` (`1px solid $border-color`, `blue.scss:151`) is the existing token for
  exactly this; `ChatMessageCell` is the closer precedent than `WorkflowEmbed.vue` (an iframe-embed
  dialog, unrelated to markdown). The 5-line comment could shrink to one.
- Theming: Galaxy themes (`themes_conf.yml`) only change the masthead; no dark mode. Compile-time
  SCSS variable from `blue.scss` is the norm (137 components import it). No issue.

## PDF / server-side export

Client CSS does not reach weasyprint. `lib/galaxy/managers/markdown_util.py::to_pdf_raw` uses
`markdown_export_base.css` (no table rules) plus optional admin `markdown_export_css*`. Server export
also expands `job_parameters`/`job_metrics` etc. into plain markdown pipe tables, so PDFs stay
borderless for both user and directive tables. The PR therefore makes on-screen and PDF diverge a
little more. Optional follow-up: add an equivalent `table { border-collapse } th, td { border; padding }`
to `markdown_export_base.css`. Not blocking.

## Tests

`MarkdownDefault.test.ts` asserts on `.text-justify a`; `text-justify` is kept, so it passes. No
Selenium/Playwright selectors or screenshots depend on this div. No new test is warranted for a
pure-CSS change (jsdom does not compute styles). A real render screenshot in the PR would close the
author's own stated verification gap.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

(Visual-only change to existing user content: Pages/reports with pipe tables gain borders. Authors who
relied on borderless pipe tables for layout will see borders; trivially reverted.)

## Draft review comment

> _Posted by Claude (AI assistant) on behalf of jmchilton._
>
> Checked the blast radius since you asked about side effects. It's narrow:
>
> - `MarkdownDefault` is only used by `SectionWrapper` for plain `markdown` sections, so this hits pipe
>   tables in Pages, invocation reports, tool reports and the Markdown editor preview. Nothing else.
> - Galaxy directives (` ```galaxy ` blocks like `history_dataset_as_table`, `job_parameters`,
>   `job_metrics`) render in the sibling `MarkdownGalaxy` component, so their tables aren't touched.
>   Same for vega/visualization/vitessce sections. markdown-it runs with `html: false`, so pipe tables
>   are the only `<table>`s that can show up here.
> - `:deep()` is needed because the content goes in through `v-sanitize-html`, and it's used correctly.
> - Agree on not using `.table-bordered`/`$table-border-color`: that's transparent in `blue.scss`.
>
> One small, optional suggestion: `$border-default` is the existing token for `1px solid $border-color`,
> and `GalaxyAI/ChatMessageCell.vue` already styles markdown tables with it. That's a closer precedent
> than `WorkflowEmbed.vue`, and it lets the comment shrink:
>
> ```scss
> // markdown-it emits bare <table>s; $table-border-color is transparent in this theme.
> .markdown-rendered-content :deep(table) {
>     border-collapse: collapse;
> }
>
> .markdown-rendered-content :deep(th),
> .markdown-rendered-content :deep(td) {
>     border: $border-default;
>     padding: 0.375rem 0.75rem;
> }
> ```
>
> Also, PDF export (weasyprint) doesn't use client CSS. It uses `lib/galaxy/managers/markdown_export_base.css`,
> which has no table rules, so exported PDFs will still have borderless tables. Not blocking. If you
> want screen and PDF to match, the same few rules could go in that file. Looks good to me otherwise.
