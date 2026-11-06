

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24696_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24696_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24696_review_0) sits on the reviewed commit [`b26614f7c11`](https://github.com/jmchilton/galaxy/commit/b26614f7c1159ccf6d7cf1934afb2919160ae498) and finishes the shared focus ring without changing how any control looks. The mixin default reads the `--color-ring` token from #23964 and falls back to `--color-blue-600` until the branch is merged with `dev`, the dropdown items' inset ring moves into a second mixin in the same partial, and the unused `$color` parameter goes away.

- [`15c378d11e5`](https://github.com/jmchilton/galaxy/commit/15c378d11e57a2d89b47fcd573eb78c0f79bd246) Default the focus-ring mixin to --color-ring: changes `$focus-ring-color` to a nested `var()` and updates the README description of the ring (P2 1).
- [`7c49eef4208`](https://github.com/jmchilton/galaxy/commit/7c49eef42087b6f3673f104be2b96cd80b6adc96) Share the inset focus ring through a mixin: adds `focus-ring-inset` and uses it from `GDropdownItem` and `GDropdownItemButton`, which become `lang="scss"` (P3 1).
- [`97306db4bd0`](https://github.com/jmchilton/galaxy/commit/97306db4bd018e4a6c9b988ce96b258c54a1f206) Drop the focus-ring mixin's unused $color parameter: removes the parameter and its README mention (P3 2).

</details>

</details>

### P2 1: Move the mixin default to `--color-ring` now that #23964 has merged (implementation verified)

The description defers this "once #23964 lands". #23964 merged on 2026-11-04, and `dev` has `--color-ring: var(--color-blue-600)` in `theme.css` and the generated `tokens.css`, which both the client and the Tool Shed load. If this merges as is, the semantic token and the shared ring are two separate sources for one colour, and the follow-up has no tracked owner.

<details><summary>Evidence</summary>

- Compiled every galaxy-ui SFC style block through `@vue/compiler-sfc` with sass 1.101.0, at `b26614f7c11` and on the review branch, each also merged with `dev` (`78816c01d93`). The only change in `:focus-visible` rules from this finding is the colour expression, in the nine `outline` declarations the mixin emits.
- `git merge-tree` against `dev` reports no conflicts, and in the merged tree `--color-ring` is in the `:root, .reset-theme-variables` block with `--background-color`.

</details>

Change the default to `var(--color-ring, var(--color-blue-600, #25537b))`, update the README's description of the ring, and drop the follow-up from the PR description. The author doesn't need to merge `dev` for this: without `--color-ring` the ring falls back to `--color-blue-600` as it does today, so the colour is the same on this branch and after merge. The ring only reads the token once the PR is merged with `dev`, either at merge time or by merging `dev` first.

<details><summary>Details</summary>

The nested fallback matters on this branch, which predates the token. A literal `var(--color-ring, #25537b)` would stop following `--color-blue-600` here until `dev` is merged.

</details>

Fixed on the review branch in [`15c378d11e5`](https://github.com/jmchilton/galaxy/commit/15c378d11e57a2d89b47fcd573eb78c0f79bd246).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 1: The inset ring stays duplicated outside the partial and won't follow P2 1 (implementation verified)

`GDropdownItem.vue` and `GDropdownItemButton.vue` carry the same three-declaration inset ring, with `--color-blue-600` hard-coded. Keeping the inset shape is a decision the PR explains, and this doesn't question it. The PR doesn't touch these two files, but moving the default to `--color-ring` makes them the only blue galaxy-ui rings that don't read the token.

<details><summary>Evidence</summary>

- On the review branch both items compile to the same declarations as before, apart from the colour: a 2px grey-100 outline, `-4px` offset, and `inset 0 0 0 2px var(--color-ring, var(--color-blue-600, #25537b))`.
- Tool Shed `vite build` from an archive of the branch succeeds and emits both scoped rules. `GDropdownItemButton` is used by the Tool Shed's `RepositoryActions.vue`.

</details>

Add a `focus-ring-inset` mixin to the partial using `$focus-ring-color`, include it from both items, and add `lang="scss"` to both `<style scoped>` blocks. The review branch does this in `7c49eef4208` and moves their shared comment into the partial.

Fixed on the review branch in [`7c49eef4208`](https://github.com/jmchilton/galaxy/commit/7c49eef42087b6f3673f104be2b96cd80b6adc96).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The mixin's `$color` parameter has no caller (implementation verified)

No `@include focus-ring` passes `$color`, yet the README snippet advertises it. The stated `GFormInput` and `GSelect` fields tint by overriding `outline-color` after the include, which is the narrower form: passing `$color` would repeat the offset and halo in each state rule. Nothing else needs it either: the `GAlert` close button stays outside the mixin because of its `-2px` offset and no halo, #24584's `GBadge` copies the default untinted ring, and #24771 doesn't use the mixin.

<details><summary>Evidence</summary>

After removing the parameter, every `@include` compiles to the same rules, and the four state `outline-color` rules are unchanged.

</details>

Remove the parameter and the README mention, and use `$focus-ring-color` directly. Done in `97306db4bd0`.

Fixed on the review branch in [`97306db4bd0`](https://github.com/jmchilton/galaxy/commit/97306db4bd018e4a6c9b988ce96b258c54a1f206).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
