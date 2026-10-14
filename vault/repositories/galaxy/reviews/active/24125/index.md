# Galaxy PR #24125 — Replace BFormCheckbox in upload, file browsers and libraries

- PR: https://github.com/galaxyproject/galaxy/pull/24125
- Latest review: 2026-10-14
- Reviewed commit: `1e48062ab46211e028af3b6a94787ae61391928c` (latest head rechecked after validation).
- Base: `dev`; dependency [#24123](../../archived/24123/index.md) is now merged and its shared checkbox styling is already in the base.
- Delivery: **UNPOSTED** — approval draft prepared; nothing submitted to GitHub.
- Recommendation: **Approve**.
- Findings: no actionable defects found.
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24125` (clean after validation).
- Supporting checks: [temporary migration interaction probes](migration-interactions.test.ts).

## Review

Reviewed all 17 files in the current merge-base diff, surrounding checkbox/group implementations, upload option bindings and bulk-operation semantics, file/browser selection models and row click handlers, library filtering and import-request construction, collection source-option synchronization, workbook configuration, navigation selectors, existing tests, and PR discussion. No conversation comments, inline comments, or reviews were present when checked.

The migration correctly distinguishes `GCheckbox`'s boolean `update:modelValue` from its native-event `change`. Handlers that consume a boolean use the model update; the retained header/selection `change` handlers ignore the event payload and toggle their existing state. Explicit library-filter model bindings preserve controlled checkbox state. Selection inputs retain click propagation stops, including their enclosing labels, preventing a checkbox click from also toggling its row. The shared checkbox tests exercise root listener placement and native event emission.

The directory import group retains the existing string option values and binds the complete selection array. Its named fieldset and switch inputs preserve accessible grouping, and the scoped deep selector targets the group's inner options container to retain the two-column grid. Checking and unchecking the actual import switches was verified through to the emitted import request. Collection source-option and workbook handlers preserve their existing parent event contracts and boolean values. New browser checkbox names, native focusable inputs, switch roles, preserved focus styling, and updated Selenium selectors are consistent with the shared component's attribute routing.

## Validation

Installed locked client dependencies from the local cache with `pnpm install --frozen-lockfile --ignore-scripts --offline`, then ran from `client/`:

```sh
NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run \
  packages/ui/src/components/GCheckbox.test.ts \
  packages/ui/src/components/GCheckboxGroup.test.ts \
  src/components/Panels/Upload/UploadMethodView.test.ts \
  src/components/Panels/Upload/UploadMethodViewInline.test.ts \
  src/components/Panels/Upload/shared/UploadTableOptionsCell.test.ts \
  src/components/Panels/Upload/methods/PasteLinksUpload.test.ts \
  src/components/Collections/ListCollectionCreator.test.ts \
  src/components/Collections/PairCollectionCreator.test.ts \
  src/components/Collections/PairedOrUnpairedListCollectionCreator.test.ts \
  src/pr24125-review.test.ts
```

**65 tests passed in 10 files**: 61 existing tests and four temporary actual-component interaction probes. For reproduction, copy the linked probe file to `client/src/pr24125-review.test.ts`, run the command, then remove that copy. The probes check collection source-switch updates and external synchronization, workbook boolean changes in both directions, a single bulk-toggle event from an indeterminate header, and directory-group switch values reaching the final import payload after checking and unchecking options. The temporary test was removed from the worktree after validation; no production code or existing test changed.

The first run without the Node option had 55 passing tests and six `UploadMethodView` failures caused by Node v25.6.1's experimental global webstorage (`window.localStorage.getItem is not a function`). Disabling that Node feature allows Happy DOM's storage implementation to operate; all six tests then pass. No source workaround was applied. Existing Vite config/compatibility warnings were emitted.

`pnpm exec prettier --check` passed for all 17 changed files, and `git diff --check origin/dev...HEAD` passed. Worktree status is clean.

All **27 reported CI checks succeeded** at the final head check, including client unit tests/linting, Playwright, Integration Selenium, CodeQL, startup, and tool-form harness checks. The PR remained open, ready, and mergeable.

### Visual evidence and limits

Inspected all five author-provided before/after images: [upload options](https://github.com/user-attachments/assets/75b5b7fd-79a6-42a1-80a2-44f26fcf840a), [remote file selection](https://github.com/user-attachments/assets/352ab2cf-7dc4-4bf6-ae6a-c5cd406f8e2f), [workbook configuration](https://github.com/user-attachments/assets/d0259d33-c233-4352-9fdd-a7b60e909a92), [collection source options](https://github.com/user-attachments/assets/72455c3b-57e7-40e5-9db5-69ed40e8471b), and [directory import](https://github.com/user-attachments/assets/36286820-99a9-4f5f-b1fb-f2997b6b56c3). They show preserved layout, the expected native navy checkbox styling and partial selection state, a centered workbook checkbox, and retained import-option columns.

The images identify an earlier head (`3ef55bc8c055`), so they are supporting visual evidence rather than independent captures of the reviewed head. A fresh interactive browser check was unavailable: the browser runtime reported no browser available, and its documented discovery returned an empty list. Keyboard activation, current-head layout, and browser/theme-specific rendering were therefore assessed through source, component interactions, supplied images, and CI rather than a fresh manual browser session.

## Risks

Risks are low — this is a two-way door: a reversible migration to existing checkbox components with no new API, workflow/tool contract, persistent format, or destructive behavior. The main practical risk is UI regression across the several migrated upload and library surfaces, especially native rendering and label spacing in different browsers/themes. Boolean event handling, selection propagation, partial states, and import-option payloads were specifically checked; the existing end-to-end CI is green.

## Review draft

The migration looks consistent with `GCheckbox`'s controlled-state and event semantics. Boolean consumers use `update:modelValue`; the remaining `change` handlers toggle existing state without depending on the payload. The explicit library filter bindings and import-group option values preserve the existing behavior, and the new accessible names improve the file selection controls.

All 65 focused checks passed locally, including four additional interaction probes for source/workbook switches, the indeterminate bulk header, and directory import payloads. Formatting and diff checks pass, and all 27 reported CI checks are green. I inspected the supplied before/after images; a fresh interactive browser check was unavailable here. No blocking findings.

Risk is low: this is a reversible component migration with no new API or persistent data contract.
