# Implementation debrief: use_config_drop_fetch_once

STATUS: READY. Commit `6045fcb730d` on `jmchilton/use_config_drop_fetch_once`, based on dev `df3932ed4ba`. The original implementation was done by another session ([earlier draft](earlier_drafts/1/implementation_debrief.md), which cited the pre-amend hash `8e68951968c`). The review steps were recovered on 2026-10-09.

## Change

- `client/src/composables/config.ts`: removed the `fetchOnce` parameter and its guard.
  - The guard tested the `isConfigLoaded` ref, not `.value`, so `useConfig(true)` never loaded config on mount.
  - `onMounted` now always calls `store.loadConfig()`. That call is a no-op once the config is loaded or while a load is in flight.
- 21 callers changed to `useConfig()`: 20 used `useConfig(true)` and 1 used `useConfig(false)` (`Sharing/UserSharing.vue`).
- Behaviour change: after a failed initial `/api/configuration` request, the former `true` callers now retry on mount, matching the other ~39 callers. The store dedups requests while a load is in flight.

## Verification

- `vue-tsc` clean.
- eslint and prettier clean.
- Full client vitest suite passed (4333 tests), and `Sharing` was rerun after the UserSharing fix.
- No test added. The composable is a pass-through, and `configurationStore.test.ts` already covers the failure and retry paths.

## Recovery steps

- [Normal review](subagents/normal_review.md): no code changes. The only fix was the stale hash, corrected here.
- [Codex review](codex_review.md): no findings.
- [Scope evaluation](scope_evaluation.md): keep the scope as implemented.
- Skipped steps:
  - Test challenges: no tests were added.
  - Thermo-nuclear review: the diff is 24+/25-, mechanical, and under 50 lines.
  - Screenshots: the change is to a composable, with no visual change.
- Updated BUGS_FOUND row 2 in just_jesting_around to say the bug is a dead guard and to point at this branch.

The handoff entry is already in MY_BRANCHES under `branches_implemented_needs_ci`.
