# extract_next_followups — implementation debrief

Follow-ups to #22860 (notebook → workflow extraction + report), ready to open right after #22860 merges.

## Branch shape

- #22860 merged 2026-10-06 (`67a54e12ede`). Rebased onto origin/dev `4fe00d9e7ab` with `--onto origin/dev 1e7e6c1f9fb`; clean, no conflicts; schema regen no diff.
- Worktree: `~/projects/worktrees/galaxy/branch/extract_next_followups` — own `.venv` (py3.13, dev's pinned reqs), own `client/node_modules`.

## What changed (by theme)

- **Labels (H3).** `_reject_unquotable` removed: any history whose dataset names had `"` 400'd extraction, legacy HID path included. Quotes/newlines accepted again; a notebook report drops the affected directive with a specific warning. Quotability = every `str.splitlines()` boundary + `"`, one `UNQUOTABLE_ARGUMENT_PATTERN`. Suggested output names are directive-safe at the source so pre-starred outputs keep their directives.
- **Default report (M1).** Empty / all-dropped notebook → no `reports_config` (default report kept, not a blank one).
- **Seeding (H1, M2).** Copied-in tool output no longer leaves a dangling input. Boundary rule: a job from another history is a step only if its inputs are present here (so whole copied/imported histories keep producer steps; a single copied dataset becomes an input). One input row per boundary output. One walk per map step (ICJ).
- **Report rewrite (H2, M4).** Final sweep drops any directive/embed/visualization cell still naming an instance object (incl. quoted/spaced id args, `hid=`, invocation-scoped lines). Inline embeds and visualization cells are dropped, not label-rewritten (see upstream bugs below). Notebook's own `history_link` → `history_link()`; other `workflow_*`/`invocation_*`/foreign history links still dropped (arg-less forms would silently change meaning).
- **Consolidation (M5, M6).** `PageManager.get_accessible_notebook`; one `ContentKind`/`ContentRef` vocabulary (`galaxy.schema.workflows`, OpenAPI unchanged); public `get_original_hda/hdca`, `original_content_ref`, `resolve_content`, `tool_for_job`, `walk_directives`, `remap_galaxy_markdown_*`; `OBJECT_ID_ARGUMENTS` builds the id patterns; `SummaryJob` typed; label clamp after dedupe suffix; docstrings trimmed; `DatasetPopulator.run_cat1`.
- **Client.** GCard clear-title is `icon-only color="red" transparent` like rename (consumer `:deep` override gone); card tests in own file; `from_page` is a `fromPageId` route prop (string-guarded); Extract Workflow ignores repeat clicks while the pre-extract save runs (`loading`); form fetch-failure test; JSDoc trims.
- **Tool access.** `tool_for_job` catches `ItemAccessibilityException`, so a summary row for a job whose user-defined tool is not owned by the caller, or has been deactivated, says `CUSTOM_TOOL_INACCESSIBLE` instead of returning 500.
- **Un-starred referenced outputs (M7, John: C + B).** Summary rows carry `referenced_by_report`; the form locks that star (disabled, `disabled-title` says the report uses it) and re-stars it when its row is re-checked. Server backstop: `reconcile_report_labels` returns a warning for each output it had to expose (API clients that omit `output_labels`). Four report API tests now send `output_labels` as the form does, so their exact-warning assertions stay unchanged; a new test covers the warning. Review fixes: only one output per referenced original is flagged (an in-history copy shares its original's row; locking both blocked extraction on duplicate labels); lock tooltip only on checked, valid rows (unchecked says to include the step); report toast heading "Notebook report notes".
- **Dead code.** Notebook-chat + save-view selectors and `history_page_open_chat` that the rebase resurrected (dev removed them in 0d083085bd2 / aad2f585bae).

## Tests

- Red-to-green throughout. Final run before rebase (`2ab2aa68eea`): unit + extraction/page API 395 passed, 2 skipped; after rebase: client vitest 452 (History, PageEditor, GCard), vue-tsc clean, pre-commit over the range clean.
- Tests changed deliberately:
  - Three `*_rejected` quote/newline API tests → acceptance tests asserting the stored label (stronger); H3 reverses PR behavior, John approved H3.
  - Three call-order unit tests (`test_build_report_runs_before_...` etc.) → one API test where the rewrite fails and no workflow is created.
  - Index-level unquotable unit tests → rewriter-level tests asserting the exact warning.
  - `test_extract_button_visible_in_notebook_editor` (selenium) was removed as redundant mid-branch, then restored (no removals without John's sign-off). It is redundant — every notebook click-through test waits for the button. Suggest removal.
- Selenium/Playwright not run locally.
- Pushed to `jmchilton/extract_next_followups` (force-pushed after rebase).
- Selenium: notebook tests' `output_star_active_for_job` still match (locked star keeps `active`).
- M7 follow-up coverage (`bce4345ee4c`): Selenium asserts the referenced star is `aria-disabled` with the report tooltip (passes on Playwright backend; local Selenium backend fails in setup login, env issue); card tests assert rendered `aria-disabled`/`data-title` and that a locked click emits nothing; HDCA and ICJ exposure-warning API tests. Selenium `extract_workflow_toggle_output_star` now checks `aria-disabled` (its `disabled` check never fired on GButton).
- Flaky under load once: `test_accessible_invocation_create_page`, `test_extract_mapping_workflow_from_history` (both pass on rerun, unrelated).

## Not acted on (and why)

- **Endpoint naming** (`/api/histories/{id}/extraction_summary` vs `/api/pages/{id}/workflow_extraction_summary`) — API naming is John's call.
- **M3** element of a mapped collection displayed in a notebook → directive dropped (seeding/report inconsistent). Needs a design choice (element identifier vs explicit warning).
- **`report_title`** payload field never sent by the client — drop or default to `page.title`?
- **Input names** still default to raw dataset names (pre-PR behavior in plain history extraction), so a notebook referencing an input named with `"` drops that directive with a warning.
- **HTML notebooks** — `reconcile_and_build_report` ignores `content_format`; HTML content goes through the markdown rewrite. Left as-is; the rollback API test uses that failure path.
- **Zero-input cross-history jobs** stay boundaries (existing unit test expects it); `local_keys` misses hidden/non-ready element HDAs, so a copied-history job that consumed a single collection element is treated as foreign.
- **Imported-from-another-user histories** — extracting seeded producer jobs goes through `get_accessible_job`, may be refused (same as history extraction).
- **BBadge/BLink/BFormCheckbox in GCard** — no GBadge exists; GLink/GCheckbox swap would restyle 164 cards and break selectors. Separate dev PRs.
- **`creating[:1]`** kept in the closure; guarded by a read-count test.

## Upstream (dev) bugs found

- Label embeds in invocation reports render the wrong object: `populate_invocation_markdown` inserts numeric `invocation_id=N`, then `_remap_embed_container` takes the first unencoded id as the object → `${galaxy history_dataset_name(output="x")}` showed HDA 1. Affects hand-written reports too.
- Visualization label cells: `ready_galaxy_markdown_for_export` applies `process_invocation_ids` only to `export_markdown`; `markdown` keeps decoded `invocation_id` → client fetch likely breaks (inferred).
- `invocation_inputs()`/`invocation_outputs()` expansion (`markdown_util` ~1300-1328) emits labels raw and `input={label}` unquoted — a collection input label with a space (or any `"`) yields invalid markdown in the default report.
- User-tool deactivation: owner deactivation doesn't filter on `active`; admin deactivation of a user tool likely raises KeyError (500).
- `ChatManager.get_accessible_page` near-duplicates the new `PageManager.get_accessible_notebook`.

Once the first two are fixed, the rewriter should rewrite embeds/visualizations to labels instead of dropping them.
