# issue_23891_output_reference_resolver — implementation debrief

Fixes galaxyproject/galaxy#23891. Three commits on `jmchilton/issue_23891_output_reference_resolver` @ `669fe3e4a81`, **stacked on `fix_format_source_docs`** (`13956b940f6`, not yet a PR). That base is 423 commits behind `origin/dev`; not rebased. The runtime files touched were unchanged on dev at the time, apart from a one-line walrus in `determine_output_format` and the XSD `### 26.2` section, which the base already has.

## What changed
- **Shared resolver** `lib/galaxy/tool_util/parser/output_references.py`:
  - `InputReferences` is the linter's private `_InputReferences` XML walker, moved and rebuilt over `ToolSource.parse_input_pages()` / `InputSource`, so YAML tools work too.
  - `resolve()` returns the matches, `qualified_key` and `runtime_key`.
  - `output_reference_problem()` holds the rules: `format_source` → data, hidden_data or data_collection; `metadata_source` → data or hidden_data; a selector only on a data_collection.
  - `output_format.py` reuses `split_element_selector`.
- **Load-time resolution** `Tool._resolve_output_references` runs in `Tool.parse` after `parse_outputs`, not inside it, so subclass overrides can't skip it. It covers `<data>`, `<collection>` and nested `<data>`, for both `format_source` and `metadata_source`. Only string values are touched.
  - **Valid:** a legacy alias is rewritten to the qualified key with the reference's own repeat index (`files_2|file` → `files_2|file_cond|file`). This fixes the collision row.
  - **Invalid:** below profile 26.2, the value is set to `None` with a `log.warning`. From 26.2, `ToolLoadError`. Documented in the XSD changelog and in the attribute docs.
  - The `ToolOutput` is changed in place, so the remote-metadata `to_dict`, discovered collections and `known_outputs` all see the new value. As a side effect, legacy aliases on discovered collections now resolve; before, they silently fell back.
- **Exception to the rewrite:** a legacy reference is kept as written when its qualified target is itself another input's legacy alias. Example: `format_source_in_conditional.xml` output3, where `input1` → `cond|input1` would resolve the nested `cond|inner_cond|input1`. The first version got this wrong, and the existing framework test caught it.
- **`output_collect.py`:** collectors always get the collection's default format. A collection that declared `format_source` parses its collectors without a default, so a dropped reference would otherwise give `data`.
- **Linter, on top of the parent branch:**
  - Uses the shared resolver.
  - Errors on a reference to a non-dataset input (e.g. a select param).
  - Suggests the qualified name with the reference's own repeat index.
  - The discovered-collection legacy error now says "cannot resolve before Galaxy 26.2" when this Galaxy rewrites the alias. The old wording stays when it can't (ambiguous or shadowed). This changes the expected text in the parent branch's `test_outputs_format_source_discovered_legacy`.

## Tests (red → green, each confirmed red with the load hook disabled)
- **Framework tools:**
  - `format_source_internal_keys`: `input2`, conversion name, `coll2`, and a discovered collection with `format="txt"` + `format_source="input2"`, which also covers the `output_collect` change (red without it: `data`).
  - `format_source_legacy_alias_collision`.
- **API** `test_format_source_internal_keys_collection_for_multiple_input`: a collection fed to a `multiple` data param, covering `input['forward']` and `input2` (red: `input2` → fasta). The tool test framework can't feed a collection to a multiple data param, hence an API test.
- **Unit tests:**
  - `test/unit/app/tools/test_output_references.py`: load-time rewrite, drop, collection and nested outputs, the 26.2 load error.
  - `test/unit/tool_util/test_output_references.py`: repeat reindexing, the shadowed-alias exception, `rep_1` exact match, `hidden_data`, mismatched repeat indices.
  - 2 new linter tests.
- **Also green:** the existing format_source/output_format/conversion/collection framework tests (25), linters/parsing/actions unit suites (238).
- **Pre-existing failure:** `implicit_conversion_optional_param` times out locally, on the base as well (needs a converter binary).

## Sweep
555 `format_source`/`metadata_source` references in tools-iuc (2026-07-30), galaxytools (2026-09-24), tools-devteam and Galaxy's test tools:
- 0 internal-key uses.
- 94 rewrites, all one-level legacy aliases that resolve the same.
- 22 drops, all already resolving to nothing: galaxytools `rpy_statistics_collection/*` and `Sambamba_merge`, IUC `barcode_splitter` (fixed upstream, tools-iuc#8471), `ncbi_fcs_gx` `mode.input`, `metadata_source` on a select or collection param, and the new test tools.

## Review suggestions not acted on
- **Type-check against `self.inputs` instead of the parsed source.** Not done; it would split the rules the linter shares. I added `hidden_data` instead.
- **`structured_like` and `change_format` `input_dataset` still read raw names** from the job dicts and can hit the same internal keys and shadowing. Out of scope (the issue doesn't claim them). Follow-up: `_resolve_output_references` could grow to cover them. The `structured_like` linter already uses `InputReferences`.
- **Lint `metadata_source`.** Still a decision for John (open since the parent branch's polish). The resolver now supports it, and tools at profile 26.2+ fail to load on a bad `metadata_source` without any lint warning beforehand.
- **Side effects to mention in the PR:** the tool API `to_dict` shows the rewritten key (`cond|input1`). In `workflow/modules.py:2841`, a dropped reference now advertises the declared `format` instead of `"input"`, which matches runtime but is stricter in the editor.

## Notes for the branch agent
- `type_source_nested_inputs` (targets `release_26.1`) also edits `collect_input_dataset_collections` and keeps legacy aliases in `input_collections` for `format_source`/`structured_like`. Check the interplay when both land on dev.
- This branch can only open once `fix_format_source_docs` is a PR; it could be squashed into it or stacked.
