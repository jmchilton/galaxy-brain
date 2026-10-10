Fix 🎯 #24031 - storage badge tooltips show the administrator's message as literal HTML.

Hovering a storage badge that has an admin `message` (the sample `object_store_conf.sample.yml` badges, for example):

| | Before | After |
| --- | --- | --- |
| What users see | `This storage has been marked as routinely purged by the Galaxy administrator.`<br>`<p>The data stored here is purged after a month.</p>` ❌ | A popover with the stock sentence, then the admin's message as its own paragraph, Markdown rendered ✅ |
| Links in the message | Literal `<a href="…">…</a>` text ❌ | Real links you can click, or Tab to from the badge ✅ |
| Screen readers | The whole string, tags included, as the badge's `aria-label` ❌ | The stock sentence names the badge; the message is the popover's content ✅ |

![The backed_up badge's popover on a dataset's details page, showing the admin message with an Archive Tier Storage link](screenshots/objectstore_badge_admin_message.png)

<details><summary>About this screenshot</summary>

It comes from the extended `test_objectstore_selection.py` E2E test: a real Galaxy configured with the MSI sample object stores, on a dataset's details page, with the `backed_up` badge hovered.

</details>

This affects every badge with an admin message: storage pickers, dataset relocation, the history storage wizard, storage descriptions, and object store template and instance lists.

***This brings back what badges did before 25.0.*** Until #19521 the badge showed a popover that rendered the message through `ConfigurationMarkdown`. That PR moved it to a plain-text tooltip, which is where the tags and dead links came from. The badge now uses `GPopover` with `ConfigurationMarkdown` again:

- ***Admin messages get the same `links` sanitizing as storage descriptions***, because they go through the same `ConfigurationMarkdown` component. Admins already author those descriptions in the same config file, so this doesn't give them anything new.
- **Keyboard users can reach the links.** The badge is now a `<button>` named by its stock sentence. Hovering or focusing it opens the popover, and Tab moves into it.
- ***Badges stay hover-only where a focusable popover can't work:*** inside dropdown options (the target storage pickers in the history storage wizard and selector) and inside other hover popovers (template summaries and the tool and workflow preferred-storage popovers). A new `interactive` prop on `ObjectStoreBadges` turns it off there.

<details><summary>The shared tooltip directive's screen-reader labels</summary>

#24031 also covers the label side: in `.html` mode `v-g-tooltip` copied the raw HTML string into `aria-label`. The badge no longer uses the directive, but JobInformation's metadata help still does, so the directive now builds the label from the sanitized DOM's text. It puts a space at paragraph, line-break, list and table boundaries so sentences don't run together. Plain-text tooltips are unchanged. JobInformation's `error_level` help now uses `<br>` instead of the invalid `</br>`.

The directive's unit tests stub DOMPurify with a pass-through, the way the global `sanitizeHtml` mock already works for other unit tests, because DOMPurify misbehaves under happy-dom. ***No new dependency: an earlier version of this branch added jsdom for these tests, and that is gone.***

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Regression from 🔀 #19521 (25.0). Found while writing Storybook play tests for `ObjectStoreBadges` on 🌿[vitest_story_play](https://github.com/jmchilton/galaxy/tree/vitest_story_play).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Evaluated the earlier tooltip version; the popover, `links` sanitizing and E2E test were added afterwards.</summary>

- It recommended fixing the badge and the shared directive's labels together, which this PR still does.
- A badge-only label workaround was rejected: it would duplicate label extraction and leave JobInformation's label with literal tags.
- It left full object store Selenium coverage and a stricter sanitizing policy for later. Both are now in this PR.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No blocking problems in the directive change; it predates the popover.</summary>

- The directive owns HTML label extraction.
- A general HTML-to-text utility and a recursive DOM walker were rejected as abstraction without a second owner. Cloning the sanitized DOM and spacing a fixed set of block boundaries is shorter and never touches the displayed tooltip.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>The earlier tests were meaningful and kept; the E2E gap it noted is now closed.</summary>

- Component tests mount the real badge and check the rendered DOM; directive tests go through a mounted component and never call the label helper.
- It noted `test_objectstore_selection.py` only checked that badges existed. That test now hovers the `backed_up` badge and checks the message and link.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Markup the `links` sanitizer strips just doesn't appear; the stock sentence always shows, so every badge keeps a popover and a name.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They hover the badge and check the rendered popover, its role and its ARIA wiring, not the component's internals.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests run</summary>

- `test_objectstore_selection.py::test_0_tools_to_default` passes locally on both the Playwright and Selenium backends.
- With dev's `vGTooltip.ts`, the four new directive label tests fail at their `aria-label` assertions.
- Client suites for ObjectStore, History, ConfigTemplates, Tool, Workflow/Run, JobInformation, DatasetStorage, FileSources and the directives: 585 tests pass on the pinned Node 22.20.0.
- eslint, prettier and `vue-tsc` are clean.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
