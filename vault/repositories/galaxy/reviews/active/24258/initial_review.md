# Initial review — #24258 (default profile)

- Profile: default
- Model: Claude Opus 5.5
- Effort: low
- Reviewed commit: 05f17d3f066 (merge-base a11275030bf, base release_26.2)

## Summary

Two test-helper tweaks in `lib/galaxy/selenium/navigates_galaxy.py`:

1. `libraries_index_create` now waits for `#save_new_library` to disappear (DATABASE_OPERATION wait) after clicking save, so a follow-up "create" click can't toggle the still-open form closed before the POST resolves.
2. `wait_for_overlays_cleared` swaps the stale `.toast` selector for the `toast.message` component (`[data-description="toast message"]`). The old selector probably no longer matched GToast markup, so the wait passed straight away and did nothing.

Both changes are correct and use existing navigation components rather than raw selectors. Both helpers go through `wait_for_absent_or_hidden`, so Selenium and Playwright share the same semantics. A toast that fades via opacity is only "hidden" to Selenium. Under Playwright, the wait finishes only when the element detaches. That is slower but not flaky, and GToast removes the node after it fades.

## Findings

No P1, P2 or P3 findings.

## CI

At the reviewed commit, the only failure is `Unit tests / Test (3.10)`, in `test/unit/data/model/test_model_store.py::test_export_invocation_to_ro_crate`. This PR touches only Selenium helpers, so the failure is unrelated.

## Risks

Risks are minimal. This test-only change doesn't lock Galaxy into choices that are hard to change (a two-way door).
