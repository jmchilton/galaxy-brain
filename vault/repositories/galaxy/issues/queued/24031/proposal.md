# Storage badge tooltips show the admin's message as literal `<p>…</p>` HTML

When a Galaxy admin adds a `message` to an object store badge, its tooltip and its accessible name show the rendered markdown's raw HTML tags, not the text.

Using the badge from `lib/galaxy/config/sample/object_store_conf.sample.yml`:

```yaml
badges:
  - type: short_term
    message: The data stored here is purged after a month.
```

Hovering that badge on current `dev` (df3932ed4ba):

| | What users get |
| --- | --- |
| Tooltip | `This storage has been marked as routinely purged by the Galaxy administrator.`<br>`<p>The data stored here is purged after a month.</p>` ❌ |
| `aria-label` (screen readers) | same string, tags included ❌ |
| Sample's `backed_up` message, which has a markdown link | `…on our <a href="https://www.msi.umn.edu/content/archive-tier-storage">Archive Tier Storage</a> page.</p>` ❌ |
| Expected | the stock sentence, then the admin's message as text, with no tags ✅ |

Every badge with an admin message is affected, wherever a badge row appears: the storage pickers, dataset relocation, the history storage wizard, storage descriptions, and object store template and instance lists.

<details><summary>Why</summary>

`ObjectStoreBadge.vue` builds its tooltip as `stockMessage + "\n\n" + markup(message, true)`. `markup()` (`ObjectStore/configurationMarkdown.ts`) renders the markdown to HTML, so a plain sentence comes back as `<p>…</p>\n`. The badge binds the result with `v-g-tooltip.hover="title"` and leaves out `.html`, so the directive puts it in the tooltip as text, and copies the same string into `aria-label`.

This has been broken since 25.0, not since the `v-g-tooltip` migration. Until #19521 (commit `8a00081c3ca`), the badge showed a `b-popover` that rendered the message through `ConfigurationMarkdown`. That PR replaced the popover with `v-b-tooltip.hover.noninteractive="title"`, which also had no `.html`, and `v-g-tooltip` kept the behaviour.

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Save as `client/src/components/ObjectStore/ObjectStoreBadgeTooltip.test.ts` and run it with `pnpm exec vitest run` under the node version in `client/.node_version`. The first `not.toContain` fails on dev.

```ts
import { getLocalVue } from "@tests/vitest/helpers";
import { advanceTooltipHoverDelay } from "@tests/vitest/tooltipTestUtils";
import { mount } from "@vue/test-utils";
import { expect, it, vi } from "vitest";

import { vGTooltip } from "@/directives/vGTooltip";
import { DEFAULT_TOOLTIP_HOVER_DELAY_MS } from "@/utils/tooltipTiming";

import ObjectStoreBadge from "./ObjectStoreBadge.vue";

it("admin badge message is not shown as literal HTML", async () => {
    vi.useFakeTimers();
    const localVue = getLocalVue(true);
    const wrapper = mount(ObjectStoreBadge as object, {
        props: { badge: { type: "short_term", message: "The data stored here is purged after a month." } },
        global: { ...localVue, directives: { ...localVue.directives, "g-tooltip": vGTooltip } },
        attachTo: document.body,
    });
    const badge = wrapper.find(".object-store-badge-wrapper").element as HTMLElement;
    badge.dispatchEvent(new Event("mouseenter"));
    await advanceTooltipHoverDelay(DEFAULT_TOOLTIP_HOVER_DELAY_MS);

    const tooltipText = document.querySelector(".g-tooltip-d-inner")?.textContent;
    expect(tooltipText).toContain("purged after a month");
    expect(tooltipText).not.toContain("<p>"); // fails on dev
    expect(badge.getAttribute("aria-label")).not.toContain("<p>"); // fails on dev, and still fails with only `.html` added
});
```

</details>

## Context

Bug found while converting the ObjectStore badge tests to Storybook play functions on 🌿 [`vitest_story_play`](https://github.com/jmchilton/galaxy/tree/vitest_story_play), where the play's tooltip regex currently tolerates the tags. A regression from 🔀 #19521, which swapped the badge's markdown popover for a text tooltip.

## Proposed Approach

Fix it in two layers. In `ObjectStoreBadge.vue`, switch to `v-g-tooltip.hover.html` and build the title as HTML: the stock message escaped in its own `<p>`, followed by the `markup()` output. Joining them with `"\n\n"` won't work, because the newlines collapse in HTML mode and the two parts run together. In the `v-g-tooltip` directive (`client/packages/ui/src/directives/vGTooltip.ts`), take the `aria-label` from the text of the sanitized content in `.html` mode, not from the raw string.

<details><summary>Approach details</summary>

- Adding `.html` alone fixes the visible tooltip but not `aria-label`. `updateContent` writes the raw `content` string to `aria-label` in both modes, so screen readers still hear the tags. The only other `.html` tooltip, `error_level` in `JobInformation.vue`, has the same problem: its label reads `NO_ERROR = 0</br>LOG = 1</br>…`. That is why the fix belongs in the directive and not in the badge.
- Plain `textContent` runs block and line-break content together (`<p>a</p><p>b</p>` gives `ab`, `0</br>LOG` gives `0LOG`). The label text should put a space at `<p>` and `<br>` boundaries and collapse whitespace.
- Text-mode tooltips are untouched: the label change applies only under `.html`.
- The directive already runs `.html` content through DOMPurify. `markup(message, true)` also allows raw HTML from the admin config, and the sanitizer covers that.
- Tests, red first: the vitest above, plus a directive unit test in `vGTooltip.test.ts` asserting that a `.html` tooltip's `aria-label` contains no tags.

</details>

## Alternative Approaches

The badge could show plain text by stripping the markdown, or it could skip `markup()` altogether. Both throw away the markdown that the sample config writes in `message` and that the badge rendered before #19521. Fixing the directive's label also repairs the other `.html` tooltip.

<details><summary>Alternatives In Detail</summary>

### Alternative: Render the message as plain text

<details><summary>Description</summary>

#### Details

Pass the raw `message`, or the `textContent` of `markup()`'s output, into a text tooltip, and leave the directive alone.

#### Why the proposed approach is preferred

Admins lose the paragraphs, emphasis and link styling that their markdown `message` asks for. (Links can't be clicked in either case, because the tooltip is non-interactive.) The `aria-label` bug stays in place for `JobInformation.vue` and any future `.html` tooltip.

</details>

### Alternative: Fix only the badge

<details><summary>Description</summary>

#### Details

Add `.html` to the badge, and set the badge's `aria-label` explicitly to the text version.

#### Why the proposed approach is preferred

This works around a directive bug at a single call site. The next `.html` tooltip would hit the same problem.

</details>

</details>
