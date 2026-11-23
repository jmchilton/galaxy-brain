### P2 1: Move the mixin default to `--color-ring` now that #23964 has merged (implementation verified)

The description defers this "once #23964 lands". #23964 merged on 2026-11-04, and `dev` has `--color-ring: var(--color-blue-600)` in `theme.css` and the generated `tokens.css`, which both the client and the Tool Shed load. If this merges as is, the semantic token and the shared ring are two separate sources for one colour, and the follow-up has no tracked owner.

<details><summary>Evidence</summary>

- Compiled every galaxy-ui SFC style block through `@vue/compiler-sfc` with sass 1.101.0, at `b26614f7c11` and on the review branch, each also merged with `dev` (`78816c01d93`). The only change in `:focus-visible` rules from this finding is the colour expression, in the nine `outline` declarations the mixin emits.
- `git merge-tree` against `dev` reports no conflicts, and in the merged tree `--color-ring` is in the `:root, .reset-theme-variables` block with `--background-color`.

</details>

Change the default to `var(--color-ring, var(--color-blue-600, #25537b))`, update the README's description of the ring, and drop the follow-up from the PR description. The author doesn't need to merge `dev` for this: without `--color-ring` the ring falls back to `--color-blue-600` as it does today, so the colour is the same on this branch and after merge. The ring only reads the token once the PR is merged with `dev`, either at merge time or by merging `dev` first.

<details><summary>Details</summary>

The nested fallback matters on this branch, which predates the token. A literal `var(--color-ring, #25537b)` would stop following `--color-blue-600` here until `dev` is merged. Done in `15c378d11e5`.

</details>

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

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>

### P3 2: The mixin's `$color` parameter has no caller (implementation verified)

No `@include focus-ring` passes `$color`, yet the README snippet advertises it. The stated `GFormInput` and `GSelect` fields tint by overriding `outline-color` after the include, which is the narrower form: passing `$color` would repeat the offset and halo in each state rule. Nothing else needs it either: the `GAlert` close button stays outside the mixin because of its `-2px` offset and no halo, #24584's `GBadge` copies the default untinted ring, and #24771 doesn't use the mixin.

<details><summary>Evidence</summary>

After removing the parameter, every `@include` compiles to the same rules, and the four state `outline-color` rules are unchanged.

</details>

Remove the parameter and the README mention, and use `$focus-ring-color` directly. Done in `97306db4bd0`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at medium effort. Verified via Claude Opus 5.5 at medium effort.

</details>
