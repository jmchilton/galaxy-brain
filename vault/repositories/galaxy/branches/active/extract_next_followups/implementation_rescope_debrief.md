# Re-scope debrief (2026-10-16/17)

The first re-harden's [scope evaluation](earlier_drafts/2/scope_evaluation.md) recommended a modest expansion (E1–E4). Original scope kept as `jmchilton/extract_next_followups_alt_original_scope` at `d4d504fb3c1` ([alt](alts/original_scope.md)). Expansion: `d4d504fb3c1..737377a6efa`, 6 commits, 8 files, +347/-145.

## What was added

- **E1** `471aa003bac` — names not parallel to ids → 400 (was IndexError 500) on by-ids and legacy HID extract. Extra names now also 400 (26.1 ignored them; nothing sends them).
- **E3** `087d2dffc23` — `invocation_inputs()`/`invocation_outputs()` expansion quotes labels, drops a section whose label can't be quoted. Reach is narrower than the scope doc thought: only PDF/basic export (`to_basic_markdown`) expands these; the JSON report renders them client-side.
- **E4** `05ab09a4b2c`, `7a566a5d723` — `HistoryBoundary.of(history)` over `all_contents`, so a copied-history job that consumed a hidden collection element stays a step. Test asserts the wiring.
- **E2** `df78226dea9`, `737377a6efa` — one input card per original (copies grouped), one server helper `group_inputs_by_original` used by validation and `extract_steps_by_ids`. Multi-file upload: one card per file, extracts (was 400 on the branch, disabled Create on dev). Copies sent with different names → 400 naming the payload fields.

## Process

Phase A (E1/E3/E4) → normal review ([phase A review](subagents/rescope_phase_a_review.md): no bugs, E4 test strengthened) → phase B (E2, full shape; fallback not needed) → normal review ([re-scope review](subagents/rescope_review.md): no bugs; error wording + job-less copies test). Debriefs: [phase A](rescope_phase_a_debrief.md), [phase B](rescope_phase_b_debrief.md).

## Decisions for John

- Copies of one original sent with different names now 400 (dev kept the first name). By-ids ships in 26.2.
- `test_twice_copied_output_seeds_one_input` restated: two rows `[False, True]` seeded → one seeded row holding both copies. Reviewer judged it faithful, not weakened.
- Legacy HID `extract_steps` left alone: it wires to the last-seen copy's hid; likely leaves a tool input unconnected when a different copy is picked. Client doesn't use it.
- Retarget to `release_26.2` and E5 (endpoint naming, `report_title`) still open — see scope evaluation.

## Test note

API runs without `GALAXY_TEST_TOOL_CONF` silently skip tool-dependent tests (`test_multi_file_upload_lists_one_input_per_file` among them). The re-scope review ran it with the tool conf and `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1`; it passes.
