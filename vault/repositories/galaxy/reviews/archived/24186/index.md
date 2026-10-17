# Galaxy PR #24186 — Replace BFormCheckbox in sharing, history, dataset and account screens

**Latest status — 2026-10-17:** Merged on 2026-10-16 at 15:53:01 UTC; tracking ended and record archived. Initial review approved with no actionable defects; draft was never posted. Clean worktree removed after confirming HEAD matched the merged PR head.

- PR: https://github.com/galaxyproject/galaxy/pull/24186
- Reviewed head: `4113217c88e8077db12a5a705c24316ec2390439` (unchanged at completion).
- [Review draft](review-draft.md)
- [Additional interaction probes](migration-interactions.test.ts)
- Worktree: `/Users/jxc755/projects/worktrees/galaxy/pr/24186` (clean after validation).
- GitHub at initial review: open, ready, mergeable. CI: **24 successful checks, 1 skipped**, none failed or pending.
- Declared dependency: [#24184](https://github.com/galaxyproject/galaxy/pull/24184), now merged upstream. Its final head `f809d6636163c8b58251e6eb04104e762c49eec5` is not an ancestor of this PR's launch head. Local tests below used the exact PR head; supplied screenshots include local merges of the dependency.

## Review

Read all 21 changed files, surrounding implementations and consumers, the shared `GCheckbox` component and tests, and current PR description/discussion. No conversation comments, inline comments, or reviews were present.

The migration consistently uses boolean `update:modelValue` for sharing, publishing, dataset permission changes and target-history resets. Plain `v-model` uses retain boolean state in registration, external login, confirmation, archive/delete dialogs, embeds and notification preferences. Dataset copy selections continue using per-item boolean maps; updated navigation hooks target actual input elements. There are no enclosing row click toggles requiring added propagation stops in these migrated surfaces.

Sharing and page embed settings retain explicit stacking where BootstrapVue's former block wrapper supplied it; workflow embed settings already have a column flex layout. The object-sharing indicator distinguishes pending/error/boolean states, receives an accessible name, emits one request before displaying its spinner, and becomes checked and disabled after parent confirmation. Its warning/success colour overrides target the new markup. The notification channel's localization directive now acts on its text span, preserving the input. The registration option starts with an explicit false boolean and still reaches the registration payload.

The archive and delete tests render the real checkbox and exercise deletion confirmation/purge behavior, improving on the previous stub-driven delete test. New permissions/notification tests also use actual inputs. Additional review probes cover both directions of sharing endpoint selection and server responses, workflow/page embed output, pending object sharing, and permission-switch synchronization with parent props.

## Validation

Installed locked dependencies from the cache with `pnpm install --frozen-lockfile --ignore-scripts --offline`. From `client/`, ran:

```sh
NODE_OPTIONS=--no-experimental-webstorage pnpm exec vitest run \
  packages/ui/src/components/GCheckbox.test.ts \
  src/components/Dataset/DatasetCopy.test.js \
  src/components/Dataset/DatasetPermissionsForm.test.ts \
  src/components/History/Archiving/HistoryArchiveExportSelector.test.ts \
  src/components/History/HistoryOptions.test.ts \
  src/components/Login/NewUserConfirmation.test.ts \
  src/components/Register/RegisterForm.test.ts \
  src/components/User/ExternalIdentities/ExternalRegistration.test.ts \
  src/components/User/Notifications/NotificationsCategorySettings.test.ts \
  src/components/Sharing/UserSharing.test.ts \
  src/pr24186-review.test.ts
```

**87 tests passed across 11 files**, including five additional probes. To reproduce those probes, copy the linked test to `client/src/pr24186-review.test.ts`, execute the command, then remove that copy. The temporary copy was removed after validation; no production files or existing tests changed. The Node option prevents the known Node v25 experimental-webstorage conflict with Happy DOM. Existing Vite configuration and Vue compatibility warnings were emitted.

Prettier checks passed for all 21 changed files. `git diff --check origin/dev...HEAD` passed. Final `git status --short` was empty.

### Visual evidence and limits

Inspected all ten author-provided before/after images in the [PR description](https://github.com/galaxyproject/galaxy/pull/24186): published/private sharing, workflow embed settings, object-permissions modal, dataset copy, notification preferences, dataset permissions, registration unchecked/checked and delete-history modal. The screenshots show retained layouts and label content, expected native checkbox rendering, appropriately sized dialog inputs, and the preserved warning/success indicator colours. Long copy-target names wrap without losing their label association; notification switches remain aligned with their labels.

Those images identify this PR head combined locally with versions of #24184; they are supporting author evidence, not new independent captures. The Browser skill runtime returned “No browser is available,” and its documented discovery returned an empty list. Fresh manual keyboard interactions, browser/theme rendering and a full live-server Selenium run were unavailable. Source inspection, real-component tests, supplied visual evidence and green CI provide coverage within those limits. The author's reported 17 local Selenium tests were read as claims, not rerun or counted among the 87 local tests.

## Risks

Risks are low — this is a two-way door: a reversible migration to the existing checkbox component, with no new API, persistent data format, workflow/tool contract or destructive action. Existing sharing and deletion actions are sensitive to UI regressions, so their boolean event payloads and confirmation/purge state received particular attention. The remaining practical risk is rendering across browsers/themes and integration with the now-merged sizing/synchronization dependency; no fresh interactive browser was available locally.
