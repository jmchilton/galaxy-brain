Fix 🎯 #24031 - storage badge tooltips show the administrator's message as literal HTML.

Hovering a storage badge that has an admin `message` (the sample `object_store_conf.sample.yml` badges, for example):

| | Before | After |
| --- | --- | --- |
| Tooltip | `This storage has been marked as routinely purged by the Galaxy administrator.`<br>`<p>The data stored here is purged after a month.</p>` ❌ | The stock sentence, then the message as its own paragraph, with Markdown bold and link styling rendered ✅ |
| `aria-label` (screen readers) | The same string, tags included ❌ | `This storage has been marked as routinely purged by the Galaxy administrator. The data stored here is purged after a month.` ✅ |

![Storage badge tooltip rendering an admin Markdown message with bold text and a link](screenshots/badge-markdown.png)

***These captures come from a small Vite page that mounts this branch's real `ObjectStoreBadge.vue` and `v-g-tooltip` with Galaxy's CSS. The page heading and storage names around the badges are made up; it isn't a full Galaxy page.***

<details><summary>More captures</summary>

Stock message only, no admin message:

![Storage badge tooltip with only the stock sentence](screenshots/badge-stock.png)

An admin message with several paragraphs and a line break:

![Storage badge tooltip with separate paragraphs and a line break](screenshots/badge-html-paragraphs.png)

</details>

This affects every badge with an admin message, wherever badges appear: storage pickers, dataset relocation, the history storage wizard, storage descriptions, and object store template and instance lists. The links in the message are styled but not clickable, as before this change, because the tooltip doesn't take pointer events.

The fix has two parts:

- **The badge** renders its tooltip as HTML. The stock sentence is escaped into its own `<p>`, and the admin's message is appended as the Markdown it already rendered. ***This doesn't give admins anything new: `markup()` already let a badge message carry raw HTML on dev, and dev just showed it as text. The HTML now goes through the directive's existing DOMPurify sanitizing for `.html` tooltips, so it can't inject script.***
- **The shared `v-g-tooltip` directive**, in `.html` mode, now builds `aria-label` from the sanitized DOM's text instead of the raw HTML string, with a space at paragraph, line-break, list and table boundaries so sentences don't run together. ***Plain-text tooltips are unchanged; only 2 of about 290 `v-g-tooltip` uses are `.html`. The other is JobInformation's metadata help, where only the `error_level` text has markup, and its label loses its literal `</br>` tags the same way.***

***`jsdom` is a test-only addition, used per file by the two changed test files because the global `sanitizeHtml` stub doesn't reach this code: the directive calls DOMPurify directly.*** Under happy-dom, DOMPurify drops the first `<p>` and keeps `<script>`, and happy-dom's own parser drops `</br>`, so these tests can't run there. jsdom 28.1.0 was already in the lockfile, and `packages/api-client`'s tests already run under it; the root `package.json` now declares it. The global vitest environment stays happy-dom.

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Regression from 🔀 #19521 (25.0), which swapped the badge's popover, which rendered the message through `ConfigurationMarkdown`, for a plain-text tooltip. Found while writing Storybook play tests for `ObjectStoreBadges` on 🌿[vitest_story_play](https://github.com/jmchilton/galaxy/tree/vitest_story_play).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope: fix the badge and the shared directive's HTML labels together.</summary>

- Plain-text badge messages were rejected. They drop the Markdown bold and links the sample config uses, and leave the directive's HTML labels broken.
- A badge-only label workaround was rejected. It duplicates label extraction outside the directive and leaves JobInformation's label with literal tags.
- A general HTML-to-accessible-text policy plus full object-store Selenium coverage was left for separate work. It adds infrastructure for behaviour the component and directive tests already exercise.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blocking structural or maintainability problems.</summary>

- The directive owns HTML label extraction; the badge just opts into the existing `.html` mode.
- A general HTML-to-text utility and a recursive DOM walker were both considered and rejected as abstraction without a second owner. Cloning the sanitized DOM and spacing a fixed set of block boundaries is shorter and easier to audit, and never touches the displayed tooltip.
- Production changes are 18 lines added and 4 removed across two files.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>All added tests are meaningful; none removed or weakened.</summary>

- The badge tests mount the real component with the real directive and sanitizer, hover, and check the rendered tooltip DOM and exact `aria-label`.
- The directive tests go through a mounted component and never call the label helper directly. They cover paragraphs, line breaks, lists, entities, reactive updates, empty content and unchanged text mode.
- Stubbing the directive would reproduce the blind spot that let this bug through, so `mount` is justified.
- Extending `test_objectstore_selection.py` to hover a custom badge was considered. It needs a built client and integration server for a component-level rendering bug, so it wasn't added.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Admin markup that DOMPurify strips simply doesn't appear; the escaped stock sentence always remains, so the badge still has a tooltip and a name.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They assert the rendered tooltip DOM and the exact `aria-label`, never the label helper's boundary logic.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- With dev's `ObjectStoreBadge.vue` and `vGTooltip.ts`, 6 of the 8 new tests fail at the bug's assertions (raw tags in `aria-label`, message not rendered as HTML). The other two guard behaviour that was already right: the stock-only badge test (it fails on dev only because it expects the new `<p>` wrapper) and the text-mode directive test (passes on dev).
- `ObjectStoreBadge`, `ObjectStoreBadges`, `vGTooltip` and `configurationMarkdown` suites: 30 tests pass on the pinned Node 22.20.0.
- eslint, prettier and the shared UI package type-check are clean.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
