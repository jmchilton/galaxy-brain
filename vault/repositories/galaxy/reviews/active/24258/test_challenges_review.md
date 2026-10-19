# Test Challenges Review — PR #24258

Profile: gx_test_challenger · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 05f17d3f066 (merge-base a11275030bf)

## Scope

Test-infra-only fix to the shared helper `lib/galaxy/selenium/navigates_galaxy.py`:
- `libraries_index_create` now waits for `save_new_library_btn` to be absent/hidden (DATABASE_OPERATION wait) after clicking save.
- `wait_for_overlays_cleared` swaps the stale `.toast` CSS selector for the `toast.message` navigation component (`[data-description="toast message"]`), matching GToast.

No unit, API, or Vitest tests added or touched. Callers: `lib/galaxy_test/selenium/test_library_landing.py`.

## Challenges

- Unit tests: none to challenge.
- E2E coverage: the fix is to E2E infra; existing library landing tests exercise both helpers. No new E2E test warranted.
- Helper reuse: change moves from raw selector to the navigation.yml component — the right direction. Fixes the helper, not the Selenium/Playwright adapter semantics.
- Parity: waits use `wait_for_absent_or_hidden`, which tolerates opacity/hidden differences between Selenium and Playwright on fade-out.
- CI: only red check is `Test (3.10)` unit job failing `test/unit/data/model/test_model_store.py::test_export_invocation_to_ro_crate` — unrelated to this diff. Flakiness fix itself can't be proven by one green run; acceptable for a release-branch flake fix.

## Findings

No P1/P2/P3 findings. Proportionate, correct-looking test-infra fix.
