# E2E polish after approved second scope expansion

Fresh E2E review replaced the bulk history test's literal container selector with the existing navigation selector; the three recipient removal scenarios otherwise already use shared setup helpers, condition waits, and meaningful screenshots.

## Applied

- `test_history_sharing.py::test_bulk_unshare_with_me` now passes `shared_histories.shared_list.selector` to `toggle_card_selection_in_list`, replacing the literal `#history-list`. The selector already lives in `navigation.yml`; no new locator or DOM decoration was necessary. The helper uses its argument only to wait for the list container before using the existing history-card selectors.
- Retained the recipient-ID assertion added by the fresh test challenge in the workflow setup. It narrows the authenticated recipient's ID before the typed sharing helper receives it.

## Fresh audit

Reviewed the entire branch's two modified E2E files against `origin/release_26.2`, the new navigation selectors, the existing selection helper, and the E2E writing/smart-components notes. The scenarios are history single removal, history bulk removal, and workflow single removal.

- All action buttons, cards, tabs, confirmation controls, and list checks use existing navigation abstractions. The bulk selector argument was the only literal selector in the new test bodies.
- History setup is shared by its single and bulk tests. It creates data through the owner API and leaves a newly registered recipient logged in; workflow setup follows the same pattern with its workflow populator. Creation and sharing do not repeat the unrelated UI upload/share/login flows.
- No sleeps were introduced. Tests wait for cards before interacting, wait for the confirmation text, and wait for removed cards to disappear. The bulk case also waits for the retained card, and workflow removal waits for the empty-list message.
- Each scenario captures both its confirmation and resulting list state. These six checkpoints cover the meaningful recipient UI states. The bulk case verifies two shares are removed while a third remains; single history removal additionally checks access is revoked, and workflow removal checks the shared index.
- Existing DOM IDs already identify the relevant cards, operations, footer, and confirmation dialog. No client refactor or DOM decoration is needed; this branch targets `release_26.2`.

## Validation and remaining execution

Pinned Black and Ruff passed on both E2E files; `git diff --check` passed. Browser tests were not rerun in this polish step: the required screenshot step will run all three scenarios on the final branch, inspect their six screenshots, and record its actual results in `screenshot_debrief.md`. Prior-pass browser results are historical evidence only.
