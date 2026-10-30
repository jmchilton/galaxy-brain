(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change adds new, not-yet-used GProgress/GProgressBar components and a `ProgressVariant` type export to galaxy-ui without changing existing components or callers, so it doesn't lock Galaxy into particular difficult to change choices (a two-way door). The only soft commitment is the public prop surface (bootstrap-vue-style `max`, `variant`, `striped`, `animated`, `showProgress`, `showValue`, `precision`, with `light` excluded from variants), which becomes harder to reshape once `b-progress` call sites migrate to it.

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24586_review_1) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

# Review branch [`pr_24586_review_1`](https://github.com/jmchilton/galaxy/tree/pr_24586_review_1)

Built on the PR head [`c889c700361`](https://github.com/jmchilton/galaxy/commit/c889c7003616e9f65b88ec88f79c35e703e51274). The branch makes GProgress check for stacked content on every render, so a conditional default slot updates the track's group role and label. It moves the track's default height into a zero-specificity `:where()` rule, so a consumer's height class wins whatever the stylesheet order. It also adds tests for prop and context reactivity. Commits are unchanged from `pr_24586_review_0`, minus the variant/stripe/height test commit, and the package's `vue-tsc --noEmit` passes.

- [`2426aa7ff6c`](https://github.com/jmchilton/galaxy/commit/2426aa7ff6c380cc7fc504e6930a5c9d340cc88d) Re-check GProgress's stacked slot on every render: replaces the `useSlots()` computed with `$slots.default` in the template, and adds a test that toggles a `<template v-if>` default slot (P3 1).
- [`0060c3d2cc0`](https://github.com/jmchilton/galaxy/commit/0060c3d2cc06cea37ec04b17676be24629f05d00) Let consumers' classes set GProgress's height: moves `height: 1rem` into a scoped `:where(.g-progress)` rule (P3 2).
- [`1f5ec4d1163`](https://github.com/jmchilton/galaxy/commit/1f5ec4d11634d88ca70761c413fa9c3b42c6c24b) Test that GProgress bars follow changing values and parent options: adds `setProps` and ref-driven tests for the value, the parent `max` and `show-progress` (P2 1).

</details>

</details>

### P2 1: No test that bars follow changing values or parent options (implementation verified)

Progress bars exist to update: every `BProgress` call site this replaces (quota meter, collection, dataset and job progress, storage operations) changes `value` while mounted, and stacked bars read `max` and the display options from the `ProgressContext` computeds. No test changes a prop after mount, so a regression that provided a plain value instead of a `ComputedRef`, or cached a bar's width, would pass the suite.

<details><summary>Evidence</summary>

The two added tests, which pass. Swapping the provided `showProgress` computed for a value snapshotted at setup makes the stacked test fail; no existing test caught that.

</details>

Add two tests: a single-bar `GProgress` that `setProps({ value: 60 })` and checks `aria-valuenow` and `width: 60%`, and a stacked mount bound to refs that changes the parent's `max` and `show-progress` and checks the child's `aria-valuemax`, width and text.

Fixed on the review branch in [`1f5ec4d1163`](https://github.com/jmchilton/galaxy/commit/1f5ec4d11634d88ca70761c413fa9c3b42c6c24b).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: `stacked` reads `useSlots()` inside a `computed`, which isn't reactive (implementation verified)

In `GProgress.vue`, `const stacked = computed(() => Boolean(slots.default))` caches its first answer, because the `slots` object isn't reactive. When a consumer's default slot comes and goes (`<template v-if="..." #default>`), the track keeps its old `role="group"` / `aria-label` decision.

<details><summary>Evidence</summary>

A new test that toggles a `<template v-if>` default slot. It fails at the PR head (the role stays unset after the bars appear) and passes once the template reads `$slots.default`.

</details>

GProgress re-renders whenever its slots change, so reading `$slots.default` in the template is enough and costs nothing.

Fixed on the review branch in [`2426aa7ff6c`](https://github.com/jmchilton/galaxy/commit/2426aa7ff6c380cc7fc504e6930a5c9d340cc88d).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: The track's default height ties in specificity with consumers' scoped height classes (implementation verified)

The default `height: 1rem` sits in a scoped `.g-progress[data-v-…]` rule, with specificity (0,2,0). `StorageOperationOutcomeProgress.vue` sets the height with a scoped class on the root (`.storage-operation-progress-sm { height: 0.6rem }`, via `:class="props.heightClass"`), which is also (0,2,0) once scoped. Today that class beats Bootstrap's global `.progress` at (0,1,0). After the swap, stylesheet order decides which rule wins, so the bar could silently go back to 1rem.

<details><summary>Evidence</summary>

`@vue/compiler-sfc`'s `compileStyle`: `.g-progress` and `.storage-operation-progress-sm` both compile to `.<class>[data-v-…]`, and `:where(.g-progress)` compiles to `:where(.g-progress[data-v-…])`, which has zero specificity. jsdom doesn't apply the cascade, so no vitest test covers this.

</details>

Put the default height in its own `:where(.g-progress)` rule, as `GDropdown.vue` does for its Bootstrap-free baseline. That drops its specificity to zero, so a consumer's class wins whatever the CSS order. The `height` prop's inline style still wins over both.

Fixed on the review branch in [`0060c3d2cc0`](https://github.com/jmchilton/galaxy/commit/0060c3d2cc06cea37ec04b17676be24629f05d00).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
