## Tracking ended — 2026-10-13

PR **merged** at `2026-10-13T18:05:04Z`; final GitHub head `18f8a9ce419a092b8df5b6abf8b28edecccb486e`. Removed from the review queue and archived. The clean worktree was removed after verifying no unpublished commits, or that its head was included in the merged PR. Historical reviews and delivery states below retain their original dates and commits.

# Galaxy #24091 — Add GSelect and use it in place of BFormSelect

[PR #24091](https://github.com/galaxyproject/galaxy/pull/24091) · Status: active; initial review complete. Recommendation: approve; non-blocking notes, settle wrapper-path convention before follow-up swaps. Delivery: **unposted**. Open, not draft, by itisAliRH; GitHub checked 2026-10-13, all 25 checks green.

Reviewed HEAD: `18f8a9ce419a092b8df5b6abf8b28edecccb486e`, base `dev` (merge-base `91d93c238c0c65362cfd6502f6e7ef15336fea6e`).
Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24091/`; source clean (client `node_modules` installed, gitignored).

- [Review, validation, and risks](review-2026-10-13.md)
- [Unposted review draft](draft-review.md)
- Parent tracking issue: [#23812](https://github.com/galaxyproject/galaxy/issues/23812); sibling [#24090](https://github.com/galaxyproject/galaxy/pull/24090) (GRadio/GRadioGroup)

Adds a native `<select>` `GSelect` to `@galaxyproject/galaxy-ui` (generic `T`, `options` of `{text, value, disabled}` plus slot `<option>`s, `size`, `state`, `disabled`, compat v-model opt-out) and swaps 7 of the 10 `BFormSelect` sites. No existing native-select component to reuse; `FormSelect` is the vue-multiselect tool-form control, a different job. Each call-site swap checked: values, null placeholders, object values and Selenium/Playwright selectors all preserve behavior. No bugs found. Notes: wrapper lives at `BaseComponents/GSelect.vue` while the package file is under `Form/` (siblings mirror into `BaseComponents/Form/`); `state` prop has no consumer; `change` now carries the native Event (BFormSelect sent the value); spec doesn't compile a template `v-model`; `handlesMappingJobs` duplicates the new `SelectOption` type.
