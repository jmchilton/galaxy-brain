# Debrief: temp_sse_flags_in_e2e_workflows

Prepared 2026-10-08. Source: `temp_sse_flags_in_e2e_workflows.md` (gx_branches session, noticed while removing `selenium.yaml` in #23976). Proposal: `proposed_temp_sse_flags_in_e2e_workflows.md`.

## Research

- Verified on dev `9fd083720a7`: `cc289e93f18` ("TEMP … revert before merge") and `bbb4cdc5f1d` (collapse SSE flags into `enable_sse_updates`) both merged via #22513 (2026-04-30). TEMP block still in `playwright.yaml`, `integration_selenium.yaml` (L23-26) and `selenium.yaml` (L22-25); #23976 (deletes `selenium.yaml`) still open.
- Old keys `enable_sse_history_updates` / `enable_sse_entry_point_updates` absent from `lib/`, `client/src`, schema. `load_app_properties` copies overrides unchecked; `_update_raw_config_from_kwargs` keeps only schema keys + deprecated aliases; no warning on this path. Scratch run: notifications on, SSE off, no warning.
- `enable_notification_system`, `enable_sse_updates` default false. Env overrides apply after test kwargs, so integration_selenium tests can't opt out of notifications.
- Revert safety: no notification-dependent tests in `lib/galaxy_test/selenium`; the 4 integration_selenium notification/SSE tests set their own config. Client stores skip polling when SSE on, so SSE-everywhere would drop polling coverage.
- Both workflows already have a schedule-only step writing overrides to `$GITHUB_ENV`.
- No duplicate, no open PR touching these lines.

## Rewrite

- Recommended: revert all three lines (as the commit said). Alternative: real shakedown via `ENABLE_SSE_UPDATES`, ideally schedule-only.
- Dropped the side idea (warn on unknown `GALAXY_CONFIG_OVERRIDE_*` keys) and the author's name; no @-mentions.
- Reviewer: fixed false "no clean way to run weekly-only" claim, added opt-out point, listed covering tests, single-line opener.

## Leftover

- Reviewer verified the silent drop by code read only (drafter ran it).
- Side issue worth filing separately: warn on unknown override keys.
- Ask John whether to loop in the #22513 author (no @ without OK). Assignment: not obviously John's work; could also just be a small revert PR.
