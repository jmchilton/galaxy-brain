# galaxy#23791 - [26.1] Render client markup through a v-safe-html directive

- PR: https://github.com/galaxyproject/galaxy/pull/23791 (dannon, draft, base `release_26.1`)
- Reviewed SHA: `fb677a09c7671de1278479747e7831a3af842d6e` (merge-base `dbf71d4df7e`)
- Size: 112 files, +1693/-237. 25 commits, one per area.
- Existing discussion: mvdbeek approved and suggested the name `v-sanitize-html` / `v-no-sanitize`, because `safe-html` and `trusted-html` read too alike.
- Worktree: `~/projects/worktrees/galaxy/pr/23791`

## Verdict

**Approve once undrafted.** Nothing blocks. The fixes below are small and mostly optional. The design is good:
- one `sanitizeHtml()` with three named profiles;
- a directive with `v-html`-compatible update and unbind semantics;
- a lint-flagged `v-trusted-html` escape hatch, where each use must say why;
- `vue/no-v-html` promoted to `error`.

The PR also closes real holes, not just lint noise:
- `LoginForm.vue:60,166` fed the `?message=` URL param straight into `v-html` (reflected XSS). It is now sanitized.
- `ToolHelpRst.vue:15` rendered third-party tool help with no sanitization at all.
- History names and annotations went through `v-html` via `TextSummary` in `DetailsLayout`. They are now text.
- Dataset peeks, tour text and workflow/TRS descriptions went through raw `v-html`.

## Verification done

- Completeness grep at head (whole `client/src`, not only the diff): zero `v-html` left outside comments. The only `v-trusted-html` uses are `App.vue:21` (`message_box_content`), `CitationsList.vue:189` (`citations_export_message_html`) and `RegisterForm.vue:114` (`registration_warning_message`). All three come from galaxy.yml config, and each has a reason comment. I checked that every caller of `registrationWarningMessage` passes config.
- The remaining `innerHTML` sinks are all safe:

  | Location | Why it is safe |
  |---|---|
  | `utils/modal.js:61-81` | Callers pass static templates or `escape()`d text. `RuleBasedCollectionCreatorModal.js:39` interpolates `options.historyName` raw, but nothing ever sets it (dead path). |
  | `RuleGrid.vue:56` | Headers are `escape()`d in `RuleCollectionBuilder.vue:1014`. |
  | `VisualizationFrame.vue:59` | `props.name` must already have resolved as a real plugin name. |
  | `formattedToolHelp.js:31`, `PageHtml.vue:45`, `ToolsList/utilities.ts:42` | Reads or rewrites inside inert DOMParser documents. |
  | `MarkdownComment.vue:52-55` | See finding 5. |
  | `libs/jquery/*` | Vendored. |

  There are no `insertAdjacentHTML` / `document.write` / jQuery `.html(` calls outside `libs/`.
- DOMPurify 3.4.0 in real Chromium: I loaded the dist file into a Playwright MCP page and replicated the three profiles.
  - `onerror`, `svg onload`, `ontoggle` and `onclick` are stripped.
  - `javascript:` hrefs are stripped, including `xlink:href` inside SVG, and so are `data:text/html` hrefs.
  - `iframe`, `embed` and `object` are stripped.
  - `data:image` img src is kept.
  - `target=_blank` gets `rel="noopener noreferrer"` in `links` and `markdown`, and `target` is dropped in `default`.
  - Peek tables keep `cellspacing`, `cellpadding`, `class` and `style`.
  - `gxhelp:`/`gxstatic:` survive only in `markdown`.
  - KaTeX MathML with `<semantics>`/`<annotation>` survives.
- happy-dom really is unreliable for DOMPurify. The same probe under vitest let `<embed>`/`<object>` through and emptied MathML, so mocking the sanitizer in unit tests is justified.
- `pnpm exec vitest run src/directives src/components/Tool src/components/Workflow/Editor/StateUpgradeModal.test.ts src/components/Libraries/LibraryEditField.test.js`: 37 files / 133 tests pass (node 22.20.0).

## Findings (ranked)

### 1. Medium: the `markdown` profile still allows `form`/`input`/`textarea`/`select`

`client/src/directives/sanitizeHtml.ts:33-40`. The profile sets only `FORBID_TAGS: ["style"]`, so that the copy `<button>`s in the authoring help survive. In Chromium, `<form action="https://evil"><input type="password"><button>` passes through unchanged.

Nothing reaches this today:
- `MarkdownDefault` uses `MarkdownIt()` with `html: false`.
- `ToolHelpMarkdown` and `FormElementHelpMarkdown` call `markup(..., false)`.

But the directive is meant to be the only safety layer. The fix is one line: `FORBID_TAGS: ["style", "form", "input", "textarea", "select"]`, keeping `button`. `sanitizeHtml.test.ts:72` pins `["style"]` and would need to change with it.

### 2. Medium: no test runs real DOMPurify against XSS vectors or preserved markup, apart from two Selenium cases

- `sanitizeHtml.test.ts` swaps `dompurify` for a stub and checks the config objects and the rel hook.
- The ~35 component tests check wiring ("called with X, profile Y") against the global pass-through spy (`tests/vitest/setup.ts`, `directives/__mocks__/sanitizeHtml.ts`).
- The only coverage of real behaviour is `lib/galaxy_test/selenium/test_rendered_markup.py`: library description, and KaTeX on a page.

Nothing checks that tool help (images, `/static` links, anchors), dataset peek tables or `rel` insertion survive in a browser. Nothing checks that `onerror`/`javascript:`/`svg` vectors die.

Suggestions:
- Cheapest on release: extend the Selenium test with one RST tool-help render (image, internal anchor, `target`/`rel`) and one tabular peek.
- For dev: a per-file `// @vitest-environment jsdom` spec with a table of vectors. jsdom is DOMPurify's own test environment, but it is not a client devDep yet.

### 3. Low-medium: DOMPurify's `SANITIZE_DOM` removes some `id`s tool help relies on for in-page anchors

This is DOMPurify's DOM-clobbering protection: an `id` or `name` whose value is a property of `document` or `HTMLFormElement` is removed. In Chromium:
- dropped: `id="method"`, `"title"`, `"images"`, `"links"`, `"action"`, `"length"`;
- kept: `"options"`, `"usage"`.

Docutils RST help produces `<div class="section" id="method">` for a "Method" heading. So `` `Method`_ `` references, or `.. contents::`, in tool help (`ToolHelpRst.vue:15`) or markdown help would stop scrolling. The reach is small, but it is a silent regression.

Fixing it properly (`SANITIZE_NAMED_PROPS` plus href rewriting) is dev work. For 26.1 it is enough to know about it and maybe cover it in the Selenium check from finding 2.

### 4. Low: reuse - several ad-hoc `purify.sanitize` configs remain beside the new "one place"

- `Form/FormElement.vue:254`: `{USE_PROFILES:{html:true}}`, then `linkify`.
- `Workflow/Editor/NodeInvocationText.vue:22`: `ALLOWED_TAGS:["b"]`, then also `v-safe-html`, so it is sanitized twice.
- `Workflow/Editor/Comments/TextComment.vue:49` and `FrameComment.vue:50`: `escapeAndSanitize` (`ALLOWED_TAGS:["br"]` / `[]`), then `v-safe-html`, again twice.
- `User/ExternalIdentities/ExternalIdentities.vue:158`.
- `directives/vGTooltip.ts:336`.

The profile map in `sanitizeHtml.ts` could absorb these as named profiles, e.g. a `text`/allowlist profile taking `ALLOWED_TAGS`. Then the double passes go away and there is really one sanitizer config table. This is follow-up material for dev, not for this PR.

### 5. Low: `MarkdownComment.vue:52-55` still parses in the live document

It still uses `document.createElement("div").innerHTML = renderedMarkdown`. The PR switched `formattedToolHelp.js:45` and `PageHtml.vue:34` to `DOMParser` for exactly this reason: an inert document means nothing loads before sanitizing. This one is safe today because `useMarkdown` has `html: false`, but switching it too would keep the pattern consistent.

### 6. Low: merge-forward note

`origin/dev` has two `v-html` uses that are not on release:
- `Workflow/List/CuratedWorkflowList.vue:250-251`;
- `History/Graph/HistoryGraphReport.vue:29-30` (its disable comment says "sanitised by useMarkdown", but `useMarkdown` does not sanitize; it just has `html: false`).

Both carry `eslint-disable-next-line vue/no-v-html`, so lint will not catch them after the merge. They need a small dev follow-up. Optionally, require a `-- reason` on `vue/no-v-html` disables too (e.g. `eslint-comments/require-description`), so the old escape hatch is as visible as `v-trusted-html`.

### 7. Low: the `default` profile drops `target`, so some links now open in the same tab

These default-profile call sites can carry authored `target="_blank"`:
- `TourStep.vue:77,79`;
- `ToolsListCard.vue:371`, where the summary is lifted from tool help;
- `CitationItem`;
- `LoginForm` server messages.

Those links will now navigate away from the page. For a tour, that ends the tour. If that matters, these call sites could move to `:links`. Otherwise, a sentence in the PR body would do.

### 8. Nit: tests

- `StateUpgradeModal.test.ts:89` calls `mockImplementation` on the shared spy without restoring it. `vitest.config.mts` has no `mockReset`/`restoreMocks`, so the wrapping leaks into later tests in that file. Use `mockImplementationOnce` or restore in `afterEach`.
- Several added component tests only assert the profile argument (`VaultSecret`, `ConfigurationMarkdown`, `ChatMessageCell`, `ToolHelpRst`). That is cheap regression protection for the profile choice, so it is acceptable. The ones that also assert rendered DOM (`HistoryDatasetDetails`, `DetailsLayout`, `LibraryEditField`) are more valuable.
- No tests were weakened. The one changed expectation (`DatasetInformation.test.ts`: file size now includes the unit inside `<strong>`) matches the intended display change in `81d467eebf5`.

### 9. Note, not blocking: `style` attributes are allowed in every profile

A full-page `position:fixed` overlay survives `default`. This is not a regression, because the old per-site `purify.sanitize()` calls kept `style` too, and peeks and `useMarkdown({noMargin})` emit inline style. It is worth knowing for user-authored library descriptions and tours.

## Release-branch scope

It is broad (112 files), but nearly every change is a one-line `v-html` to `v-safe-html` swap. The behavioural side-fixes are tied to removing raw HTML:
- `bytesToString` no longer uses its HTML variant;
- `TextSummary` renders text by default again, with `isHtml` as an opt-in;
- `HistoryDatasetDetails` misc info is now text;
- RO-Crate descriptions use `textValue`;
- nested state-upgrade messages are flattened, which fixes `[object Object]`.

Deleting `ReportHelp.vue` (dead code) and the lint escalation are dev-flavoured but harmless. Given the reflected XSS in LoginForm and the unsanitized tool help, 26.1 is the right target. I would not split it.

Directive mechanics:
- It updates only when `binding.value !== binding.oldValue`, which mirrors `v-html`. Decorations like the gx URI popovers survive unrelated re-renders.
- It clears on element reuse and keeps markup during a leave transition.
- The rel hook lives on a separate lazily created instance, so other `purify` callers are unaffected.
- There are no SSR concerns, since the Galaxy client is not SSR.
- Performance: sanitizing runs once per content change. Peeks are small, and tool help is a single DOMPurify pass after one DOMParser pass. That is fine.

On naming, I agree with the existing comment: `v-sanitize-html` / `v-trusted-html` (or `v-unsafe-html`) would make the pair harder to confuse. This is the author's call.

## Draft GitHub review comment

```markdown
*Posted by Claude (AI assistant) on behalf of jmchilton - not personally authored.*

This looks good. One sanitizer with named profiles, a directive with the same update and unbind behaviour as `v-html`, a lint-flagged escape hatch, and `vue/no-v-html` as an error. It also closes real holes: the login `?message=` param was going into `v-html`, and RST tool help was never sanitized. I'd approve once it's out of draft. A few suggestions, none of them blocking:

1. **`markdown` profile allows form controls** (`directives/sanitizeHtml.ts:35`). The profile only forbids `style`, so `<form action=...><input type=password>` survives (checked with DOMPurify 3.4.0 in Chromium). Nothing produces raw HTML there today, because every markdown renderer has `html: false`. Still, forbidding `form`/`input`/`textarea`/`select` while keeping `button` costs one line and keeps the directive a real safety layer.
2. **Real-sanitizer coverage.** The unit tests stub DOMPurify, which is fair: happy-dom mangles it (in my probe it let `<embed>`/`<object>` through and emptied MathML). That leaves the two Selenium cases as the only real-browser checks. Could `test_rendered_markup.py` also render one RST tool help (image, `/static` link, in-page anchor, `target`/`rel`) and one tabular peek? A jsdom-environment vitest spec with an XSS-vector table could follow on dev.
3. **Clobbering protection strips some tool-help ids.** `SANITIZE_DOM` drops `id`s such as `method`, `title`, `links` and `images`, while `options` and `usage` are kept. So an RST "Method" section's anchor stops working. The reach is small; mostly flagging it so it's a known trade-off.
4. **Default profile drops `target`.** Tour steps, the tool-list summary and citations will now open links in the same tab, which ends a running tour. Maybe use `:links` for tours?
5. **Leftovers, fine for a follow-up:** `MarkdownComment.vue:52` still parses via `document.createElement("div").innerHTML`, while tool help and `PageHtml` moved to `DOMParser`. Several ad-hoc `purify.sanitize` configs remain (`FormElement`, `NodeInvocationText`, the Text/Frame comments, where content is now sanitized twice, `ExternalIdentities`, `vGTooltip`) and could become named profiles. On dev, `CuratedWorkflowList.vue` and `HistoryGraphReport.vue` have `eslint-disable`d `v-html` that the merge-forward won't catch.
6. Nit: `StateUpgradeModal.test.ts:89` sets `mockImplementation` on the shared spy without restoring it. There's no `mockReset` in the vitest config, so it leaks into later tests in that file.

+1 to the earlier naming suggestion. `v-sanitize-html` would be harder to confuse with `v-trusted-html`.
```
