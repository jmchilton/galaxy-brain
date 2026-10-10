# `GButton` and `GLink` tooltips get read into the control's accessible name

A screen reader announces a `GButton` or `GLink` with a `tooltip` as its label followed by the tooltip text, and then reads the tooltip text again as the description.

The **Cancel Workflow** button in `WorkflowInvocationState.vue` (`tooltip`, `title="Cancel scheduling of workflow invocation"`) on current `dev` (20f365a2654):

| | On `dev` | Expected |
| --- | --- | --- |
| Accessible name | `Cancel Workflow Cancel scheduling of workflow invocation` ❌ | `Cancel Workflow` |
| Accessible description | `Cancel scheduling of workflow invocation` ✅ | same |
| Typical announcement (name, role, description) | "Cancel Workflow Cancel scheduling of workflow invocation, button, Cancel scheduling of workflow invocation" ❌ | "Cancel Workflow, button, Cancel scheduling of workflow invocation" |

`GLink` has the same problem. The tool-name link in `InteractiveTools.vue` is named `Jupyter Notebook Open Interactive Tool`. Voice-control users who say the visible label still match, because the label comes first. But every tooltip button or link with visible text is announced with its tooltip twice. A regex scan of `client/src` finds about 74 `GButton`/`GLink` call sites with both visible text and `tooltip`.

<details><summary>Why</summary>

`GButton.vue` and `GLink.vue` render `<GTooltip :reference="…" :text="currentTitle">` *inside* the `<button>`/`<a>`, under a `<!-- TODO: make tooltip a sibling in Vue 3 -->`. `GTooltip.vue` renders a `<div role="tooltip">` with the text. While the tooltip is hidden it carries `sr-only`, which hides it visually but leaves it in the accessibility tree. A button's name is computed from its content, so the tooltip's text joins the label. `GTooltip` also sets `aria-describedby` on the button to point at itself, so the same text comes back as the description.

```html
<button class="g-button" aria-describedby="g-tooltip0">
  Cancel Workflow
  <div id="g-tooltip0" role="tooltip" class="g-tooltip sr-only"> Cancel scheduling of workflow invocation </div>
</button>
```

The nesting came in with #19946: its commit `b15ed486e2b` dropped a wrapping `<span>` and moved the tooltip inside the button. `GLink` copied it in #20063. Back then the client was on Vue 2, where a component had to render a single root, which is what the TODO refers to. The client now runs Vue 3.5, so that constraint is gone.

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Save as `client/src/components/BaseComponents/GButtonTooltipName.test.ts` and run it with `pnpm exec vitest run` under the node version in `client/.node_version`. The two "keeps its visible label" cases fail on dev. The two icon-only cases pass, and a fix has to keep them passing (see below). `toHaveAccessibleName` comes from `@testing-library/jest-dom`, which the vitest setup already loads, and computes names with `dom-accessibility-api`.

```ts
import { faCaretUp, faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { h, nextTick } from "vue";

import GButton from "./GButton.vue";
import GLink from "./GLink.vue";

afterEach(() => {
    document.body.innerHTML = "";
});

describe("tooltip text and the accessible name", () => {
    // WorkflowInvocationState.vue's cancel button
    it("GButton keeps its visible label as its name", async () => {
        const wrapper = mount(GButton as object, {
            attachTo: document.body,
            props: { tooltip: true, title: "Cancel scheduling of workflow invocation" },
            slots: { default: () => "Cancel Workflow" },
        });
        await nextTick();
        await nextTick();
        const button = wrapper.get("button").element;

        expect(button).toHaveAccessibleName("Cancel Workflow"); // fails on dev
        expect(button).toHaveAccessibleDescription("Cancel scheduling of workflow invocation");
    });

    // InteractiveTools.vue's tool name link
    it("GLink keeps its visible label as its name", async () => {
        const wrapper = mount(GLink as object, {
            attachTo: document.body,
            props: { tooltip: true, title: "Open Interactive Tool" },
            slots: { default: () => "Jupyter Notebook" },
        });
        await nextTick();
        await nextTick();

        expect(wrapper.get("button").element).toHaveAccessibleName("Jupyter Notebook"); // fails on dev
    });

    // FormListElementOperations.vue's "move up" button: the title is its only name
    it("icon-only GButton still gets its name from the title", async () => {
        const wrapper = mount(GButton as object, {
            attachTo: document.body,
            props: { tooltip: true, title: "move up" },
            slots: { default: () => h(FontAwesomeIcon, { icon: faCaretUp }) },
        });
        await nextTick();
        await nextTick();

        expect(wrapper.get("button").element).toHaveAccessibleName("move up"); // passes on dev, must stay green
    });

    // InteractiveTools.vue's external link: the title is its only name
    it("icon-only GLink still gets its name from the title", async () => {
        const wrapper = mount(GLink as object, {
            attachTo: document.body,
            props: { tooltip: true, title: "Open in new tab", href: "https://example.org" },
            slots: { default: () => h(FontAwesomeIcon, { icon: faExternalLinkAlt }) },
        });
        await nextTick();
        await nextTick();

        expect(wrapper.get("a").element).toHaveAccessibleName("Open in new tab"); // passes on dev, must stay green
    });
});
```

</details>

## Context

Bug found while converting the `GButton` tests to Storybook play functions on 🌿 [`vitest_story_play`](https://github.com/jmchilton/galaxy/tree/vitest_story_play), where the story's `labelled()` name regex currently tolerates the doubled text. The nesting dates from 🔀 #19946 (`GButton`) and 🔀 #20063 (`GLink`). 🔀 #21959 already solved where a floating element should live for `GPopover`: in the trigger's closest `<dialog>`, else in `body`. Related to 🎯 #24031, where the `v-g-tooltip` directive copies a tooltip's raw HTML into `aria-label`; this one is the `GTooltip` component.

## Proposed Approach

Move the tooltip out of the control, the way `GPopover` already does. Pull `GPopover`'s `relocate()` (append to the trigger's closest `<dialog>`, else `document.body`) into a shared composable in `client/packages/ui` and use it from both `GPopover` and `GTooltip`, which fixes every component that nests a `GTooltip`. Once moved, a tooltip that isn't showing should also be `hidden`, so it doesn't become stray text at the end of the page. Icon-only buttons and links, whose only name today is the nested tooltip, need a small shared `aria-label` fallback from the current title in `GButton` and `GLink`.

<details><summary>Approach details</summary>

- **Why not `<Teleport to="body">`:** `GModal` opens a native modal `<dialog>`, which sits in the top layer. A tooltip appended to `body` would render behind it. That is the bug #21959 fixed for `GPopover` (commit `5b9014402b2`). `GTooltip` has to follow the same "closest dialog, else body" rule, so the rule belongs in one place.
- **Icon-only names:** set `aria-label` from the current title only when the control has a tooltip, no visible text, and no `aria-label`/`aria-labelledby` of its own. A regex scan finds about 90 tooltip `GButton`/`GLink` call sites with no visible text and no `aria-label`, and only about 20 of them pass `icon-only`. So the fallback can't be keyed on the `iconOnly` prop. It has to check the rendered text after the tooltip has moved out (on `nextTick`; checked on mount, it still sees the tooltip's text). `v-g-tooltip` already checks text this way for menu toggles (`namedToggle` in `vGTooltip.ts`).
- **`hidden` while not showing, once moved:** inside the control, `sr-only` text was at least next to its control. Moved to the end of `body`, it would become dozens of orphan strings ("move up", "Cancel scheduling…") that screen-reader users reach in browse mode. `GPopover` avoids this with `v-show`. A hidden element that `aria-describedby` points to still provides the description, so binding `hidden` while not showing keeps the description and drops the stray text.
- **Description:** keep `aria-describedby` → tooltip. For a text button that is the correct place for the tooltip. An icon-only button whose name now comes from the title will announce the same text as its description too. That matches today's behaviour, and a follow-up can drop the duplicate if wanted.
- **Remove both `TODO: make tooltip a sibling in Vue 3` comments.**
- **Sketch checked:** a rough version turns all four tests above green, along with the two guard tests below. It relocates in `GTooltip` from a hidden placeholder `<span>`, binds `hidden` while not showing (keeping the `sr-only` class), and inlines the `aria-label` fallback in both `GButton` and `GLink`. The vitest files under `BaseComponents`, `Form`, `Common`, `Dataset`, `TagsMultiselect`, `WorkflowInvocationState` and `InteractiveTools` still pass, with one exception below.
- **One existing test needs its lookup changed:** `GTooltip.test.ts`'s three tests read the tooltip's `style`/`class` from the mount wrapper's root, which is now the placeholder. Switching that lookup to the `role="tooltip"` element (about 5 lines, assertions untouched) makes all three pass again.
- **Tests, red first:**
  - the vitest above (two red cases; two icon-only guards that stay green)
  - a case where a tooltip `GButton` is mounted inside a `<dialog>`: the tooltip ends up in that dialog and outside the button
  - a case where a tooltip that isn't showing is `hidden` and not visible, and the button's description is still its text
  - `GPopover.test.ts`'s existing dialog test keeps passing after the extraction

</details>

## Alternative Approaches

`<Teleport to="body">` is a small change, but it hides tooltips behind modal dialogs, the problem #21959 had to fix for popovers. Making `GButton` and `GLink` fragments with the tooltip as a sibling changes their root element, which `useResolveElement` and parent `ref`s rely on. Marking the nested tooltip `aria-hidden` fixes the name with the smallest diff, but the tooltip stays inside the control, where the control's own `overflow: hidden` or a clipping ancestor can cut it off. Relocating like `GPopover` avoids all three problems and leaves one shared rule for where floating elements live.

<details><summary>Alternatives In Detail</summary>

### Alternative: `<Teleport to="body">` around the tooltip

<details><summary>Description</summary>

#### Details

Wrap the `GTooltip` in `GButton`/`GLink`, or the root of `GTooltip` itself, in `<Teleport to="body">`.

#### Why the proposed approach is preferred

A tooltip `GButton` inside a `GModal` would put its tooltip under the modal's top-layer `<dialog>`, where it is invisible. #21959 fixed exactly this for `GPopover` by relocating into the closest dialog.

</details>

### Alternative: Make the tooltip a sibling (multi-root component)

<details><summary>Description</summary>

#### Details

Do what the TODO says. Vue 3 allows fragments, so render `<component …/>` and `<GTooltip/>` side by side.

#### Why the proposed approach is preferred

A fragment's `$el` is a placeholder node, not the button. Callers that anchor to a `GButton`'s element would stop getting the button. `StatelessTags.vue` reads `moreButtonRef.value?.$el`, and `useResolveElement` resolves component refs through `$el` too. This also leaves the other components that nest a `GTooltip` unfixed.

</details>

### Alternative: Hide the nested tooltip from the accessibility tree

<details><summary>Description</summary>

#### Details

Leave the tooltip nested and add `aria-hidden="true"` to it. Hidden content drops out of the name, and `aria-describedby` still reads a hidden element it points to, so the description survives. Icon-only buttons would still need the same `aria-label` fallback.

#### Why the proposed approach is preferred

It is the smallest diff, and a reasonable stopgap. But it leaves the absolutely positioned tooltip inside the control, where `overflow: hidden` can clip it: `GButton` sets `position: relative; overflow: hidden` on itself inside Bootstrap input groups, e.g. `DelayedInput.vue`'s icon buttons. It also keeps the TODO, and leaves `GTooltip` with a different placement rule from `GPopover`.

</details>

</details>
