### P2 1: No test that bars follow changing values or parent options (implementation verified)

Progress bars exist to update: every `BProgress` call site this replaces (quota meter, collection, dataset and job progress, storage operations) changes `value` while mounted, and stacked bars read `max` and the display options from the `ProgressContext` computeds. No test changes a prop after mount, so a regression that provided a plain value instead of a `ComputedRef`, or cached a bar's width, would pass the suite.

<details><summary>Evidence</summary>

The two added tests, which pass. Swapping the provided `showProgress` computed for a value snapshotted at setup makes the stacked test fail; no existing test caught that.

</details>

Add two tests: a single-bar `GProgress` that `setProps({ value: 60 })` and checks `aria-valuenow` and `width: 60%`, and a stacked mount bound to refs that changes the parent's `max` and `show-progress` and checks the child's `aria-valuemax`, width and text.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `stacked` reads `useSlots()` inside a `computed`, which isn't reactive (implementation verified)

In `GProgress.vue`, `const stacked = computed(() => Boolean(slots.default))` caches its first answer, because the `slots` object isn't reactive. When a consumer's default slot comes and goes (`<template v-if="..." #default>`), the track keeps its old `role="group"` / `aria-label` decision.

<details><summary>Evidence</summary>

A new test that toggles a `<template v-if>` default slot. It fails at the PR head (the role stays unset after the bars appear) and passes once the template reads `$slots.default`.

</details>

GProgress re-renders whenever its slots change, so reading `$slots.default` in the template is enough and costs nothing.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: The track's default height ties in specificity with consumers' scoped height classes (implementation verified)

The default `height: 1rem` sits in a scoped `.g-progress[data-v-…]` rule, with specificity (0,2,0). `StorageOperationOutcomeProgress.vue` sets the height with a scoped class on the root (`.storage-operation-progress-sm { height: 0.6rem }`, via `:class="props.heightClass"`), which is also (0,2,0) once scoped. Today that class beats Bootstrap's global `.progress` at (0,1,0). After the swap, stylesheet order decides which rule wins, so the bar could silently go back to 1rem.

<details><summary>Evidence</summary>

`@vue/compiler-sfc`'s `compileStyle`: `.g-progress` and `.storage-operation-progress-sm` both compile to `.<class>[data-v-…]`, and `:where(.g-progress)` compiles to `:where(.g-progress[data-v-…])`, which has zero specificity. jsdom doesn't apply the cascade, so no vitest test covers this.

</details>

Put the default height in its own `:where(.g-progress)` rule, as `GDropdown.vue` does for its Bootstrap-free baseline. That drops its specificity to zero, so a consumer's class wins whatever the CSS order. The `height` prop's inline style still wins over both.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: Tests skip the variant, stripe, height, content-priority and fallback paths (implementation verified)

`GProgress.test.ts` covers the value, range, labels, text, and `max` / `showProgress` inheritance well. It never checks these paths:

- A single-bar `GProgress` passing `variant` to its inner bar through the context. This is the `SelectionChangeWarning` / `QuotaMeter` path, where `variant` sits on the outer component.
- The `striped` / `animated` classes, including `animated` implying `striped`, and a bar's `:striped="false"` overriding an inherited `true`.
- The `height` prop reaching the track's style.
- `g-progress-bar-empty` on zero-width bars, which the seam rule depends on.
- The documented content priority: `label` over `showProgress`, and `showProgress` over `showValue`.
- The fallbacks: a stacked `GProgress` without `aria-label` / `aria-labelledby` staying ungrouped, a bar whose own `max` is `0` or not a number using the parent's, and a non-numeric `value` reading as 0.

<details><summary>Evidence</summary>

Seven added tests, which pass against the PR's implementation.

</details>

A few assertions in the existing mount-based style cover all of these.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
