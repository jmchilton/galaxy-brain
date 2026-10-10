# `GModal` dialogs have no accessible name, and neither does their close button

Every `GModal` opens as an unnamed dialog, because its `<dialog>` is never linked to its title heading, so screen readers announce just "dialog". Its icon-only × button has no name either.

Using the "Request Tool Installation" modal from `WorkflowMissingToolsRequest.vue` on current `dev` (20f365a2654):

| | What bootstrap-vue `BModal` gives the same modal | `GModal` on dev |
| --- | --- | --- |
| Dialog's accessible name | `Request Tool Installation` (`aria-labelledby` → title) ✅ | `""` ❌ |
| Close × button's name | `Close` (`aria-label`) ✅ | `""` ❌ |
| Testing Library `findByRole("dialog", { name: "Request Tool Installation" })` | finds it ✅ | no match ❌ |

This hits all 62 components that use `GModal`, among them the confirm dialog, the tool form and workflow editor modals, history and user preference dialogs, and the selection dialogs.

<details><summary>Why</summary>

`GModal.vue` (`client/packages/ui/src/components/GModal.vue`) renders `<dialog :id="currentId">` and, inside its header, `<GHeading v-if="props.title" h2>`. The heading gets no `id`, and the dialog gets no `aria-labelledby` or `aria-label`. A dialog never takes its name from its content, so it ends up unnamed.

The close button is a separate miss in the same header: a `GButton icon-only` that holds only a FontAwesome icon, with no `title` or `aria-label`.

bootstrap-vue's `BModal`, which the migrated modals used before, handled both. When a title was shown it set `aria-labelledby` to the title element's id, unless an `aria-label` prop was given, and its close button got `aria-label="Close"` (`bootstrap-vue/src/components/modal/modal.js`, `computedModalAttrs` and `headerCloseLabel`). `GModal` has done neither since #20168 added it, so each migration (#20375, #22114, #23023) dropped both names without anyone noticing. Modals written on `GModal` from the start, like this one, never had them.

`GPopover` in the same package already names its dialogs. `dialogName()` points `aria-labelledby` at the title's id when there is a title (#23731).

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Save as `client/src/components/BaseComponents/GModalAccessibleName.test.ts`, then run `pnpm exec vitest run` on it under the node version in `client/.node_version`. Both tests fail on dev, with an accessible name of `""`. `toHaveAccessibleName` is jest-dom's matcher, already loaded in `tests/vitest/setup.ts`. It computes the name the way assistive technology does.

```ts
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { expect, it } from "vitest";

import GModal from "./GModal.vue";

async function mountModal() {
    const wrapper = mount(GModal as object, {
        global: getLocalVue(),
        props: { show: true, title: "Request Tool Installation" },
        attachTo: document.body,
    });
    await flushPromises();
    return wrapper;
}

it("names the dialog after its title", async () => {
    const wrapper = await mountModal();
    expect(wrapper.find("dialog").element).toHaveAccessibleName("Request Tool Installation"); // fails on dev
    wrapper.unmount();
});

it("names the close button", async () => {
    const wrapper = await mountModal();
    expect(wrapper.find(".g-modal-close-button").element).toHaveAccessibleName("Close"); // fails on dev
    wrapper.unmount();
});
```

</details>

## Context

Bug found while converting the `WorkflowMissingToolsRequest` tests to Storybook play functions on 🌿 [`vitest_story_play`](https://github.com/jmchilton/galaxy/tree/vitest_story_play). The play can't find the modal with `findByRole("dialog", { name })`, so it takes the only dialog and checks the heading inside it. For migrated modals this is a regression from the `BModal` → `GModal` migration (🎯 #21976, 🔀 #20375, 🔀 #22114, 🔀 #23023). 🔀 #20168 added `GModal` without the names `BModal` provided.

## Proposed Approach

Fix both in `GModal`, in one PR. Give the title heading an id derived from the dialog's id, and point the dialog's `aria-labelledby` at it whenever `title` is set, as `GPopover` does. Give the close button `title="Close"`. The five untitled callers pass a plain `aria-label`, which already lands on `<dialog>`, and `GModal`'s doc comment says so.

<details><summary>Approach details</summary>

- In `GModal.vue`, add a `titleId` computed as `${currentId}-title`, put `:id="titleId"` on the title `GHeading`, and set `:aria-labelledby="props.title ? titleId : undefined"` on the `<dialog>`. Deriving the id from `currentId` keeps it unique per modal and follows an `id` the caller passes.
- With `size="large"`, the heading sits inside `GHeading`'s separator wrapper, and the id lands on that wrapper. The wrapper's text is still only the title, so the name stays `Request Tool Installation`.
- No new prop is needed for the untitled case. `<dialog>` is `GModal`'s root element and `inheritAttrs` is left on, so a caller's `aria-label` already reaches it (checked: the dialog gets the name `Upload` from `aria-label="Upload"` on dev). `GPopover` needs its `ariaLabel` prop because its dialog isn't its root (the root is a hidden host `<span>`). If a caller passes both, `aria-labelledby` wins, as in `GPopover`.
- Close button: `GButton` passes `title` through as the native `title` attribute, which names the button and gives a hover hint. `aria-label="Close"` would work too, which is how `GToast` names its dismiss button.
- Untitled callers that need an `aria-label`: `JobStepJobs.vue`, `SelectionDialog.vue`, `UploadMethodModal.vue` and `ReviewCleanupDialog.vue` build their title in the `header` slot, and `JobError.vue` has neither a title nor a header. `PageEditorView.vue` and `WorkflowCardList.vue` use the slot for extra content next to a `title`, so the title names them.
- Sanity check: adding the id, `aria-labelledby` and `title="Close"` (four lines) turns both tests green at medium and large size, and with a caller-supplied `id`. The existing `GModal.test.ts` still passes.
- Tests, red first: the two tests above, moved into `GModal.test.ts`. Add a guard test that a header-slot modal with `aria-label` is named by it. Once the fix is merged, the `WorkflowMissingToolsRequest` play can find the modal with `findByRole("dialog", { name: "Request Tool Installation" })`.

</details>

## Alternative Approaches

`GModal` could take its name from everything the header renders. It could also add an `ariaLabel` prop like `GPopover`'s, or leave naming to the callers. Naming from the whole header gives the wrong name wherever buttons or helper text sit next to the title. A new prop repeats what the `aria-label` attribute already does on `GModal`. Leaving it to callers makes every titled modal repeat its own title. Labelling from `title` inside the component names every titled modal at once, and it matches what `GPopover` and `BModal` do.

<details><summary>Alternatives In Detail</summary>

### Alternative: Label the dialog from the whole header

<details><summary>Description</summary>

#### Details

Put an id on the `<header>`, or on a wrapper around the `header` slot, and always point `aria-labelledby` at it. Header-slot callers would then be named without changes.

#### Why the proposed approach is preferred

The header also holds the close button, and some callers put more than a title in the slot. `PageEditorView.vue` adds "Click to select and view a revision in the editor", and `WorkflowCardList.vue` adds publish buttons. All of that would end up in the dialog's name. A one-line `aria-label` on each of the four header-only callers costs less than shipping a wrong name.

</details>

### Alternative: Add an `ariaLabel` prop, as `GPopover` has

<details><summary>Description</summary>

#### Details

Declare `ariaLabel` on `GModal` and bind it to the `<dialog>` when there is no `title`, mirroring `GPopover`'s `dialogName()`.

#### Why the proposed approach is preferred

On `GModal` the prop would duplicate the attribute. `GPopover` needs one because attributes fall through to its host `<span>`, not to the dialog. On `GModal`, a plain `aria-label` already lands on `<dialog>` today. A documented attribute keeps the component's API smaller and asks the five untitled callers for the same one-line change.

</details>

### Alternative: Have callers pass `aria-label`

<details><summary>Description</summary>

#### Details

Leave `GModal` alone and have each caller add `:aria-label="title"`.

#### Why the proposed approach is preferred

That means editing nearly every one of the 62 components to repeat its title, and nothing would catch the next modal that forgets to. `BModal` named titled modals itself, and so does `GPopover`, so the shared component is where this belongs.

</details>

</details>
