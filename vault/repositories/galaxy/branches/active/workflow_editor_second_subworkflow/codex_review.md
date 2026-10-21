Codex (`65132d40dac..148e0edfd5e`) raised two P2s against the panel search wait that polish added. I fixed both.

- **Acted on, both P2s, with one change.** The panel lookup is now an exact-title match, and the action button is clicked inside that card. This is folded into the helper commit `f5cf35fd8b7` (was `1b68eb20e25`), and `workflow_editor_search_for_workflow` no longer waits itself.
  - **What replaced the wait.** Polish had made the helpers wait until every panel title contained NAME, then click the first insert/copy action anywhere in the panel. That wait is gone. `_workflow_editor_panel_card_action` now waits for the card whose title is exactly NAME, then clicks the insert-subworkflow or copy-steps action inside that card. Each action button has a per-card id. The click retries during transitions.
  - **Exact only, with no only-card fallback.** With a fallback, a stale single card `child extended` would still match a request for `child`, which is finding 1's scenario. All three callers (`test_editor_embed_two_workflows`, `setup_subworkflow`, `test_editor_insert_steps`) pass the stored title from `workflow_upload_yaml_with_random_name` or a populator `name=`.
  - **Why the stale list is safe.** An exact-title card is the right target whether or not the 800ms debounced search has applied. For the same reason, finding 2 (results that matched by tag or owner block the gate) no longer applies.
  - pre-commit and mypy pass on `navigates_galaxy.py`. The rebase changed no content.
  - **E2E not yet run.** The thermo step runs the new test plus `test_editor_embed_workflow` and `test_editor_insert_steps`.

Not acted on: nothing.

- Sibling `workflow_open_exact_title` uses a list lookup of the same shape, but keeps a contains-gate plus an only-card fallback because `workflow_create_new` stores a prefixed title. Once both branches land, a shared card-by-title helper is a dev follow-up.

<details><summary>Full Codex output</summary>

Coverage note: "Reviewed all changed hunks and relevant surrounding code and callers. Browser E2E tests were not executed."

1. **P2, navigates_galaxy.py:1468.** "Substring matches can release the wait before the new search finishes." The predicate accepts any non-empty list whose titles contain the requested name. WorkflowPanel debounces searches for 800ms, so an old result can satisfy it immediately, and both insertion helpers then click the first global action. Scenario: insert 'child extended', then request 'child' while the list still holds 'child extended'. The helper inserts 'child extended' again; add_subworkflow times out on a node labelled 'child', and add_steps copies the wrong steps. Confidence: certain. **CONFIRMED and fixed.**
2. **P2, navigates_galaxy.py:1468.** "Valid search results can make the new wait time out permanently." The panel's unqualified search matches names, tags and owners, so requiring every title to contain the text rejects valid results. Scenario: 'target' alongside 'other' tagged 'target'. Confidence: certain. **CONFIRMED and fixed** (exact-title lookup, no all-titles gate).

</details>
