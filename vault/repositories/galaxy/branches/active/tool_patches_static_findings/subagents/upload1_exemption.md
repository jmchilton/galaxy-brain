# upload1 exemption (static findings refusals)

Commit `6e28b7debd8` on `tool_patches_static_findings` (not pushed) exempts Galaxy's own `upload1` from static findings refusals. It uses the same predicate as branch 3 (`tool_security_runtime` `69080fb376c`): the two branches carry an identical `_GALAXY_UPLOAD_TOOL` + `is_galaxy_upload_tool()`. The `lib/galaxy` exemption is unchanged.

Not acted on:

- The exemption is in `reviews_tool()`, at load, and not in `check_static_findings()` at job preparation. That means it changes what is stored for upload1 (see below), against the stated preference. It is needed because cached-toolbox materialized tools have `config_file = None`, so a check at job preparation could not see the path. Branch 3 hit exactly that and closed it with a separate `Tool.stored_source_path` set by the cached toolbox.
- Breadth of the `lib/galaxy` rule: it uses `abspath`, and in an installed package it already covers every bundled tool, but not in a source checkout. Left as is.

## Predicate and placement

- `is_galaxy_upload_tool(path)`: `realpath(path)` equals the real path of `lib/galaxy/tools/bundled/data_source/upload.xml`.
  - It matches in a source checkout (`bundled` links to `tools/`), in an installed package, and through `test/functional/tools/upload.xml`.
  - A Tool Shed or local tool that declares `id="upload1"` or `UploadToolAction` loads from another path and is still reviewed.
- `reviews_tool()` returns False for it. `with_static_review()` logs at `INFO` that upload1 is exempt, once per tool load or materialization, not per job, and only when refusals are on.
- What upload1 reports without the exemption: `template-reflection` (medium) and `option-injection` (low, a false positive on `$paramfile`). It was refused at `medium` and `low`.

## Stored review, freshness, INDEX_SCHEMA_HASH

- **`INDEX_SCHEMA_HASH`:** unchanged. No model or field changes.
- **Stored `StaticReview`:** upload1's entry now stores None instead of a review, the same as the `lib/galaxy` tools. This applies only when `tool_security_refuse_static_findings` is on (it defaults to off).
- **Freshness:** `static_review_is_current()` now expects None for upload1. An index built by this branch before the change, with refusals on, re-populates upload1's entry once. No released index is affected.

## Tests

- **Unit, red then green** (`test_static_findings_refusal.py`):
  - `test_galaxy_upload_tool_path`
  - `test_galaxy_upload_tool_is_exempt`: at `low`, the review is None, the entry is current, and the log is said once
  - `test_upload_tool_lookalike_is_reviewed[upload.xml | data_source/upload.xml]`: a copy is refused with `option-injection` at `low`

  Red: only the exemption test failed.
- **Integration:** `test_tool_static_findings_refusal.py` gained `test_galaxy_upload_tool_runs` (upload1 at `medium`, run in both the eager and the cached-toolbox class).
  - Red with the change reverted: 2 of 2 failed, with `[static-findings] ... reports template-reflection`.
  - Green, whole file alone: 8 of 8 passed.
- **Unit suites:** security, `test_static_findings_refusal.py`, toolbox, cached tool, populate store, freshness and index versions: 853 passed, 2 xpassed.
- **Static checks:** ruff, black and isort are clean. mypy reports 297 errors on the changed files both before and after; all of them are in unrelated imported modules, plus one existing untyped helper in the test.

## Docs

- "Refusing tools with findings" gains a bullet: upload1 is exempt and why (reflection, `$paramfile`), and copies are reviewed.
- The `tool_security_refuse_static_findings` description names upload1. The sample and rst were regenerated.
