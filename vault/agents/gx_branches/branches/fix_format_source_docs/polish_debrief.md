# Polish debrief: `fix_format_source_docs`

2026-10-02. Head moved from `c2ffe51a800` to `78729e38f32` (`jmchilton/fix_format_source_docs`; local worktree `~/projects/worktrees/galaxy/pr/19330`, branch `rescue_19330`).

## Entry state

- Listed under `branches_implemented` (blocker: await fork CI), not `branches_need_polish`. Fork CI at `c2ffe51a800` had one red, `Unit tests (3.14)`. It was `test_trs_proxy.py::test_server_from_url`, where an external TRS server returned HTML, so it's unrelated. That was treated as greenish, and the entry moved to `branches_need_polish`.
- This led to the `POLISH_BRANCH.md` change: polishing starts from `branches_implemented`.

## Checklist (GENERAL.md only; no workflow scope)

Every item passed. The concerns that came with it:

- **Fixed:** a legacy `format_source` on a `<collection>` with `<discover_datasets>` only warned. Runtime resolves discovered elements against `job.input_datasets` / `input_dataset_collections`, which are plain dicts keyed by qualified name, so the reference silently falls back to the default format. It's now an error. Red-to-green test: `test_outputs_format_source_discovered_legacy` (`9300d8bf325`).
- **Fixed:** `structured_like` read the profile from the raw XML root. It now uses `tool_source.parse_profile()`, like the other linters. The unguarded `Version()` crash risk on a malformed profile is shared by every profile-gated linter, so this branch doesn't address it.
- **Deferred, listed as a known limitation in the description:** `metadata_source` isn't linted.
- **Deliberately errors (John, 2026-10-02):** internal runtime keys (`name1` for `multiple="true"` data params, `<conversion>` names) and a selector on a `multiple="true"` data param fed a collection. These aren't supported reference forms, so the linter shouldn't endorse them, and the description doesn't list them as limitations.

## Strengthening round

- **Code (`78729e38f32`):** `structured_like` has a second runtime path, `collection_prototype` through `LegacyUnprefixedDict` in unmapped jobs. A bare name more than one group deep only resolved when mapped over, and the linter only warned on it; it's now an error. Red-to-green: `test_outputs_structured_like_unqualified_deep`. While writing it, I found my first expectation was wrong: `outer|input1` resolves only when unmapped, so it stays an error, as the branch already had it.
- **XSD:** reworded the sections-docs sentence ("therefore only `parameter_name` is used") so it applies only to `data_ref`-style references between inputs.
- **Description:**
  - The opener no longer calls the `qfile` example false; it does resolve through the alias. What it gets wrong is the general rule.
  - The impact numbers are corrected: the former false errors become warnings, and 26 nested references are newly linted.
  - Both `structured_like` runtime paths are described.
  - The functional test is cited as passing.
- No change to the branch notes: they credit #23459 with the reference linters, but #22432 added them. The description cites #22432.

## Tests

- `test_tool_linters.py`: 108 passed. The 12 failures are all from `edam-ontology` / CWL deps missing in the ad hoc `uv` env; they fail the same way without the branch changes.
- IUC `sickle`, the only real `structured_like`, still lints as a warning.
- The new discovered-collection error adds no hits in the three surveyed repos (IUC collections checked directly).
- The galaxytools and devteam counts come from the 2026-09-29 survey and weren't re-run at head (the clones are gone).

## Left over

- The delta checklist re-run on `c2ffe51a800..78729e38f32` passed every item. Both new comments were checked against runtime.
- Message wording: `structured_like='outer|input1'` says "does not match any input parameter", but it is a legacy alias that resolves only when unmapped. "Did you mean" still gives the fix. Consider a more specific message.
- The description now uses the reworked GENERAL.md checklist format (one-line answers, "Yes!" / "N/A").
- Fork CI at `78729e38f32` was still running at handoff (20 in progress).
- Scope questions for John:
  - Lint `metadata_source`?
  - Move the selector regex into `tool_util` and share it with `output_format.py`?
  - Add a functional test for the silent discovered fallback?

## After handoff

- `7cf90e27e0f`, at John's request: dropped the XSD sentence describing the legacy unqualified form (innermost conditional/section omitted, ambiguity, not supported for discovered collections), plus the matching `metadata_source` clause, which would otherwise point at an undefined "legacy form". Tool authors get the qualified form only; the linter warnings and errors cover the rest.
- `886fa6ce850`: the legacy `output3` comment in `format_source_in_conditional.xml` now says "remove in future profile version".
- `13956b940f6`: added the `format_source_in_collection.xml` test tool. `output_format_collection.xml` already used selectors, but both its elements were `txt`, so it couldn't show which element a selector picked, or test the qualified form or the first-element default. It is validated against the XSD and lints clean, but has not been run locally; CI will run it in the tool framework tests.
