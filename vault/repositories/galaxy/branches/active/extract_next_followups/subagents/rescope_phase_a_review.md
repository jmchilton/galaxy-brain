# Re-scope phase A review (E1, E3, E4)

**Top line:** I found no correctness problems in E1, E3 or E4. I acted on one thing: the new E4 API test now extracts the seeded rows and asserts that the cat1 step's `input1` is wired to a `data_input` step. Before, it only checked how the row was classified. It passes, so E4 does not leave a dangling input. That change is commit `7a566a5d723`, pushed as a follow-up commit (the classifier blocked amending it into `05ab09a4b2c`; squash it if wanted). There are no code changes.

Range: `d4d504fb3c1..05ab09a4b2c`, plus `7a566a5d723`.

## Not acted on
- **Making E4 lazy** (`local_keys` as a cached property, so a history that was never copied never scans it): not done. `summarize()` already walks the same `all_contents` in the same session, so the extra cost is one contents query plus one Python pass over objects that are already loaded. Making it lazy would also change the dataclass shape that the unit tests build. Low value.
- **SQL query for copied-from chains**: rejected. The creating-job guard in `get_original_hda`/`_hdca` makes a recursive CTE messy for little gain.
- **Sharing E3's quote-or-skip with `_ReportLabelRewriter._rewrite`**: not done. The two share only the `is_quotable_argument_value` guard and a one-line f-string, so a shared helper would add nothing.
- **Expanded `invocation_inputs`/`outputs` sections never resolve to ids in the PDF export**: this was already broken before the branch. It needs a rescan or an id in each emitted line, which is out of scope. It is already noted in the phase A debrief.
- **Narrowing `content_type` to a `Literal`**: skipped. The model attribute is a plain `str`, so the narrowing would just be a cast.

<details>
<summary>Full review</summary>

### E1: names/ids length gives a 400 (`471aa003bac`)
- Correct. The check runs before `_distinct_input_names` and before `extract_steps`/`extract_steps_by_ids` index `names[i]`, so neither can raise an IndexError any more. The `names[len(content_ids):]` tail is gone, as intended.
- Callers checked:
  - The client `WorkflowExtractionForm.getSelectedInputs` filters ids and names together, so they always line up. This was also true on 26.1.
  - `/api/histories/{id}/extract_workflow` goes through `WorkflowsService.extract_from_history`, so it is covered.
  - Legacy `POST /api/workflows` with `from_history_id` (used by bioblend's `extract_workflow_from_history`) sends no names, so it is unaffected.
  - No controller in `webapps/galaxy/controllers` calls `extract_steps`.
  - Planemo and ephemeris have no hits.
- Behaviour change: 26.1 already had `/api/workflows/extract` and silently ignored extra names. That now returns a 400. Both schemas document the names as "parallel to" their ids, and nothing could have relied on the extras. This matches REVIEW_FOCUS ("reject never-working input"). Worth one line in the PR description.
- Tests cover both paths with real API calls and check the error message.

### E3: quoted labels in the invocation section expansion (`087d2dffc23`)
- `_invocation_section` replaces four nearly identical blocks. It now always quotes the label; before, the collection input was emitted unquoted. A label that is missing or can't be quoted is skipped.
- Quoted and unquoted forms parse the same (`ARG_VAL_REGEX`), and the expansion output is not rescanned. So simple labels render as they did before. The only fixture that uses an unquoted form (`workflow_fixtures.py:1058`) is a stored report, not expansion output.
- Skipping unquotable labels matches the sibling path, `_ReportLabelRewriter._rewrite`. The expansion has no warnings channel, so the skip is silent, which is acceptable for the PDF path.
- The unit tests drive the real `resolve_invocation_markdown` and validate the output. They are red before the fix and green after.

### E4: `HistoryBoundary.of` over `all_contents` (`05ab09a4b2c`)
- Correct, and `summary_from_page` is the only construction site (checked with grep).
- Performance: `all_contents` loads every HDA and HDCA, hidden, deleted and purged included. `WorkflowSummary.__summarize` already does that and walks `get_original_hda`/`_hdca` for each content in the same session, so the relationships are mostly loaded already. The added cost is about one more pair of contents queries and an O(N) loop. `produced_elsewhere` returns before touching `local_keys` for jobs in the same history.
- Gap in the test (fixed): it asserted only that cat1 is a seeded tool row. Now it also extracts the seeded rows and asserts that cat1's `input1` connects to the seeded `data_input`, which is the hidden element, a boundary input. This is the same wiring check its sibling `test_copied_history_seeds_original_producer_steps` makes. It passed (1 passed, 42s).
- Deleted and purged contents count as local, as they did before. That is consistent with summarize.

### General
- Imports are at the top of each file, and the docstrings are short.
- No tests were weakened. The only test change strengthens one.
- No security concerns.

</details>
