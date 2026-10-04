# Polish debrief: `type_source_nested_inputs`

2026-10-03. Targets `release_26.1`. Head moved from `250af0005ed` to `2343b04d07c` (`jmchilton/type_source_nested_inputs`, worktree `~/projects/worktrees/galaxy/branch/type_source_nested_inputs`). Fixes #23886.

## Entry state

- One commit on `release_26.1` (0 behind). The index entry was not in `branches_implemented`, so it went straight to `branches_need_polish` at John's request.
- Fork CI was queued (26 runs) when polishing started. Polishing went ahead anyway, so CI is still a blocker.

## Checklist (GENERAL + WORKFLOW_RELATED, subagent)

No must-fix items. The subagent confirmed against the code:

- The bare alias never worked on 26.1.
- `format_source` and `structured_like` still get aliases through `map_values`.
- Nothing else consumes `_collect_inputs`, `_legacy_mapping` or `OutputCollections`.

Focused unit tests passed (31).

Acted on: `qualified_key` now returns `Optional[str]` rather than `str | None`, to match `wrapped.py`. Squashed into the fix commit.

Not acted on:

- `execute` still unpacks `CollectedToolInputs` by position. Kept minimal for a release-branch fix.
- The error is still a bare `Exception` (existing style), and `all_permissions` is typed `Any`.

## Strengthening round (subagent)

**Red proof.** The base versions of the three source files were swapped in, with the branch's tests kept and each run alone. All three fail at the bug:

- `collection_type_source_conditional`: `'Conditional' object has no attribute 'inputs'` at `actions/__init__.py:1185`.
- `collection_type_source_digit_name`: `'NoneType' object has no attribute '_history_query'` at `:1186`.
- `collection_type_source_conditional_mapped`: invocation `failed`, caused by `MessageException: Failed to create 1 job(s)` from the `Conditional` `AttributeError`.

**Fact-check.**

- Galaxy's 21 `type_source` attributes are top-level, apart from one that's already qualified (`merge_collection.xml`, `inputs_0|input`).
- `git grep` gives 0 hits for `type_source=` in local, freshly fetched clones of tools-iuc, bgruening/galaxytools and tools-devteam.

**Applied:**

- **New commit `557b8fdceee`:** the XSD docs for `type_source` and `collection_type_source` now say nested inputs must be qualified.
- **Description:**
  - Highlighted sentences for "no shipped tool is affected", "why `release_26.1`" (a crash fix, not a regression, since the walk dates from 2018) and "not the #23444 resolver".
  - Risks rewritten as a one-way door.
  - "Every job failed" became "job creation failed".
  - Red claims now quote the errors.
  - The mapped test's failure is now described as a failed invocation, with the `AttributeError` as its cause.

## Load-time rejection (John, after the polish)

John asked for bare aliases to be rejected at tool load, at every profile, instead of at runtime. Commit `2343b04d07c`:

- `qualify_legacy_data_input_reference` in `tools/parameters/__init__.py` maps legacy paths to qualified ones, keeping repeat indices.
- `Tool.parse_outputs` raises `ToolLoadError` on a bare alias.
- The runtime alias branch and `LegacyUnprefixedDict.qualified_key` are gone.
- **Removed:** the API test `test_collection_type_source_unqualified_rejected` and its tool `collection_type_source_conditional_unqualified`. That tool can no longer load, so the API test would just skip.
- **Added instead:** parametrized load tests in `test_tool_deserialization.py`. The 3 rejection tests fail with the check removed.
- All 22 shipped and test tools that use `type_source` still load.
- **Context for the change:** on `release_26.1`, a bare alias on an output that a `<filter>` excludes never reaches the lookup, so such a tool could run. We know of no such tool.
- **Found, not fixed:** `<output type="collection" collection_type_source=…>` without `collection_type` already crashes the XML parser. `xml.py` sets `attrib["type"] = unicodify(None)`, and lxml raises `TypeError`. This is a separate bug.

## Tests at head

- At `2343b04d07c`:
  - `test/unit/app/tools/`: 493 passed.
  - The `collection_type_source_conditional` framework test passed.
  - ruff, black and isort are clean.
  - mypy: the `_wrapped_params` arg-type error came from the branch's own `CollectedToolInputs.inp_data: dict[str, Any]` annotation. It is now `LegacyUnprefixedDict`, squashed into the fix commit (head `29794f9e3af`), and `galaxy/tools/` is clean.
- Earlier, at `557b8fdceee`: `test_tool_linters.py` and `test_actions.py` passed (116), and xmllint accepted the XSD.
- The API, framework and workflow tests were run green on 26.1 during implementation (see the implementation debrief). They weren't re-run after the doc-only commit.

## Left over

- Fork CI at `2343b04d07c`.
- Optional: squash the add-then-remove of the unqualified tool and API test.
- The "does not name a collection input" runtime branch is still untested.
- Scope questions for John:
  - Keep the `release_26.1` target? It's a 2018 bug, not a regression.
  - Add a `type_source` linter here, or as a follow-up? It can reuse `qualify_legacy_data_input_reference`'s path logic.
  - Tool loading now changes on a release branch. Is that OK for `release_26.1`?
  - Is "the documented spelling crashes" enough of a pitch? No major tool repo uses `type_source`.
