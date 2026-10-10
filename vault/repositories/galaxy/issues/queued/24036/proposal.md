# Collapsible `Heading` toggle button has no accessible name or expanded state

A screen reader announces the collapse toggle on every collapsible heading as just "button", with no name and no hint whether the section is open.

On current `dev` (20f365a2654), for the "Show advanced settings" heading in the repository install dialog:

| | Toggle button on `dev` | Expected |
| --- | --- | --- |
| Accessible name | *(empty)* ❌ | "Show advanced settings" ✅ |
| `aria-expanded` | missing ❌ | `false`, then `true` once opened ✅ |
| Keyboard | tab stop on an unnamed button ❌ | tab stop on a named button that says whether it's open ✅ |
| Heading text | clickable by mouse only, not focusable | unchanged (still a mouse shortcut) |

Tests feel it too. A Storybook play for that dialog can't find the toggle by role and name, so it has to click the heading instead:

```ts
// no button has a name, so the play clicks the <h1> text
await userEvent.click(await canvas.findByRole("heading", { name: "Show advanced settings" }));
```

This affects every `<Heading>` that uses `collapse`, because the button comes from the shared `GHeading` in `@galaxyproject/galaxy-ui` (which `Common/Heading.vue` re-exports):

| Consumer | Heading |
| --- | --- |
| `Toolshed/RepositoryDetails/InstallationSettings.vue` | Show / Hide advanced settings |
| `Dataset/DatasetView.vue` | dataset header (hid, name, state) |
| `JobInformation/JobError.vue` | Job Standard Error |
| `JobMetrics/AwsEstimate.vue` | AWS estimate |
| `JobMetrics/CarbonEmissions/CarbonEmissions.vue` | Carbon Footprint |
| `JobMetrics/CarbonEmissions/CarbonEmissionsCalculations.vue` | Glossary |
| `Markdown/Sections/MarkdownGalaxy.vue` | collapsible Galaxy markdown blocks |

<details><summary>Why</summary>

`GHeading.vue` renders the toggle as `<GButton transparent size="small" icon-only inline>`. Its only child is a `FontAwesomeIcon`, which renders as `aria-hidden` SVG. The button gets no `title`, no `aria-label`, no `aria-labelledby` and no `aria-expanded`, so its computed name is empty. The `<h*>` next to it has its own `@click`, which is why clicking the text works, but the heading isn't focusable and has no button role. For keyboard and screen reader users, the unnamed button is the only way to toggle the section.

All seven in-repo consumers use the `separator` layout, where the button and the heading are siblings in a three-column grid. The non-separator layout, which nests the button inside the heading, has the same gap but no in-repo consumers. The Tool Shed frontend and `GModal` use `GHeading`, but never with `collapse`.

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Save as `client/packages/ui/src/components/GHeading.test.ts` and run `pnpm exec vitest run packages/ui/src/components/GHeading.test.ts` from `client/` under the node version in `client/.node_version`. Both cases fail on the name assertion. The name comes from jest-dom's `toHaveAccessibleName`, which is already loaded in the vitest setup and used by `GTable.test.ts`.

```ts
import { mount } from "@vue/test-utils";
import { expect, it } from "vitest";
import { h } from "vue";

import GHeading from "./GHeading.vue";

it.each([
    ["separator", true],
    ["plain", false],
])("%s collapse heading's toggle is a named disclosure button", (_label, separator) => {
    const wrapper = mount(GHeading as object, {
        props: { separator, collapse: "closed" },
        slots: { default: () => h("span", "Show advanced settings") },
        attachTo: document.body,
    });
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    const toggle = buttons[0]!.element;
    expect(toggle).toHaveAccessibleName(/advanced settings/); // fails on dev: name is ""
    expect(toggle).toHaveAttribute("aria-expanded", "false"); // fails on dev: no aria-expanded
    wrapper.unmount();
});
```

</details>

## Context

Bug found while converting the `InstallationSettings` tests to Storybook play functions on 🌿 [`vitest_story_play`](https://github.com/jmchilton/galaxy/tree/vitest_story_play). The icon-only toggle came in with collapsible headings in 🔀 #16983 (24.1), as a `b-button` with no title. 🔀 #19990 (25.0) swapped it for `GButton` and kept the gap.

## Proposed Approach

Fix it once in `GHeading.vue`. Give the heading element a page-unique id from galaxy-ui's existing `useUid` composable (already used by `GDropdown`, `GPopover`, `GModal` and `GTable`). Point the toggle's `aria-labelledby` at that id, and set `aria-expanded` from `collapse`. The button then takes its name from the heading text, whatever a consumer puts in the slot. No consumer has to change.

<details><summary>Approach details</summary>

- Apply this in both layouts: in the separator layout the button and the heading are siblings, and in the plain layout the heading wraps the button. A trial patch along these lines turns the vitest above green, and the consumers' existing tests (JobInformation, JobMetrics, Toolshed/RepositoryDetails, Markdown sections, Dataset) and `GModal`'s still pass.
- Only set the id when the heading is collapsible, so plain headings stay unchanged.
- In the plain layout the heading element is the component root, so an `id` passed by a consumer would replace the generated one. Use the consumer's id when it passes one.
- Don't add `aria-controls` by default. `GHeading` doesn't own the content it toggles: consumers use `GCollapse`, `v-if`, `v-show` or a `<transition>`. An optional `controls` prop could come later.
- Leave the heading text clickable. It's a convenience for mouse users, and the button is now a proper keyboard target.
- Optional consumer cleanup, not needed for the fix: JobError's "(click to expand)" text becomes part of the button's name, and InstallationSettings' Show/Hide wording repeats what `aria-expanded` now says.
- Tests, red first: the vitest above as `GHeading.test.ts`. Then the `InstallationSettings` play can use `findByRole("button", { name: /advanced settings/ })` instead of clicking the heading.

</details>

## Alternative Approaches

The other option is to make the heading a single disclosure control: put a button with `aria-expanded`, containing the icon and the slot text, inside the `<h*>`. This is the WAI-ARIA accordion pattern, and `AuthoringHelpPanel.vue` already does it with a `GButton`. It doesn't fit `GHeading`, though. Consumers pass block content (DatasetView puts `<div>`s and a state badge with its own tooltip into the slot), and a `<button>` only allows phrasing content. It would also restyle the heading text and break the separator's three-column grid. A hand-written `aria-label` prop would need every consumer to repeat its heading text.

<details><summary>Alternatives In Detail</summary>

### Alternative: Single button wrapping the heading text

<details><summary>Description</summary>

#### Details

Render `<h*><button aria-expanded>icon + slot</button></h*>`, remove the separate icon button and the heading's `@click`, and keep one control.

#### Why the proposed approach is preferred

Slot content isn't phrasing-only: DatasetView puts block `<div>`s inside it. Wrapping the slot in a button would be invalid HTML there and would change how the button's styles reach the heading text. In the separator layout, the toggle and the heading sit in separate grid columns, so the layout would need reworking. The proposed fix gets the same name, role and state with no visual change.

</details>

### Alternative: Add a `toggleLabel` / `aria-label` prop

<details><summary>Description</summary>

#### Details

Add a prop to `GHeading` that goes into the button's `aria-label` or `title`, and set it in each of the seven consumers.

#### Why the proposed approach is preferred

Every consumer would have to repeat its heading text, and a new consumer that forgets the prop is unnamed again. With `aria-labelledby`, the name follows the visible text, including state-dependent text like "Show" / "Hide advanced settings".

</details>

</details>
