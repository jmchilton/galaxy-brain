Add missing E2E tests for importing another user's shared history from its history view and for purging all histories from the histories list.

Two history actions had no E2E test on `release_26.2`:

| UI path | What a user does | Checked before | Checked now |
| --- | --- | --- | --- |
| Shared history view (`HistoryView` + `CopyModal`) | opens another user's shared history, clicks "Import this history", renames it, clicks Copy History | nothing | a new history is current, with the given name and the shared dataset (`1.txt`) |
| Histories list (`HistoryList`) | Select all > Purge > confirm | single-card purge only; bulk purge nothing | every selected history reports `purged` through the API |

| Shared history, as the second user | Histories list before bulk purge |
| --- | --- |
| ![shared history view](screenshots/history_view_shared_importable.png) | ![histories list](screenshots/histories_before_bulk_purge.png) |

***These test existing behavior, not a fix: the only non-test change is two `data-description` attributes on `CopyModal.vue`. It targets `release_26.2` because missing tests are bugs.***

<details><summary>Details</summary>

- New `NavigatesGalaxy` helpers: `navigate_to_history_view(history_id)`, `history_view_import(new_name=None)` and `histories_purge_all()`.
- New selectors: `history_view.import_button`, `histories.bulk_purge_button`, `histories.select_all`, and a top-level `copy_history_modal` (`name_input`, `copy_button`) that any `CopyModal.vue` mount can use.
- `copy_history_modal` is scoped to `dialog[open]` because a page can mount several `CopyModal`s.
- It replaces `multi_history_panel.copy_history_modal`, which nothing used and which matched any `.modal-dialog`.
- `copy_button` uses `.g-modal-confirm-buttons button:last-child`, the same positional `GModal` selector already used for other modals in `navigation.yml`.
- The purge test runs as a fresh user (`SeleniumTestCase`, not the shared-state class), so purging every listed history touches nothing other tests rely on.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It adds two `data-description` attributes and test code, and removes one unused selector.

## Context

Split out of 🌿[`galaxy_ui_driver`](https://github.com/jmchilton/galaxy/tree/galaxy_ui_driver), which drives these flows. Alternative kept on 🌿[`selenium_history_import_purge_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_history_import_purge_alt_original_scope) - copy modal selectors nested under `history_view.copy_modal`, leaving the stale `multi_history_panel.copy_history_modal` entry in place. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the scope: both missing paths covered through shared selectors and helpers.</summary>

- Already widened once, to a shared top-level `copy_history_modal` replacing the stale entry.
- Testing "Copy this history" from history options through the same modal is a different feature; left as follow-up.
- A UI "list empties" check after purge is weaker than the API `purged` poll.
- Splitting import and purge into two PRs is overhead with no gain.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approved with no code changes; the re-scope already made the one structural move available.</summary>

- Helpers live in `NavigatesGalaxy`, selectors in `navigation.yml`; tests use components only.
- Decorating `GModal`'s confirm button is a client refactor, out of bounds on a release branch.
- `client/src/utils/navigation/schema.ts` is already stale on `release_26.2`; regenerating it is unrelated churn.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Both tests kept; E2E is the right layer and assertions check backend effects.</summary>

- Import checks a new id, the requested name and contents `["1.txt"]`.
- Purge polls `purged` per history with a `DATABASE_OPERATION` wait.
- No sleeps; no unit or API tests to challenge.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the re-scoped branch.</summary>

An earlier pass's one reuse nit (use the existing clear-and-send-keys helper) was fixed before the re-scope.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No refactoring needed: the branch is additive apart from replacing one dead selector.</summary>

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing - test-only for users; a regression fails the E2E on an exact assertion (history name, dataset names) or a purge wait timeout, with screenshots of the shared history view and histories list.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A. E2E only; both tests check results through the API.
- [x] Are baseline tests in their own leading commits (if applicable)? N/A. The whole PR is tests for existing behavior.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `lib/galaxy_test/selenium/test_history_sharing.py::TestHistorySharing::test_import_shared_history`
- `lib/galaxy_test/selenium/test_histories_list.py::TestHistoriesPurge::test_purge_all_histories`

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
