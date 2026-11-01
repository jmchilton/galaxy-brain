Run via Opus 5.5 at low effort.

# Thermo-nuclear code quality review

Reviewed `git diff origin/release_26.2...HEAD` (through `c8b436a0ff0`) with the strict maintainability prompt (`vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md`).

**Acted on:** the type check in `_check_collection_type` duplicated `HistoryQuery`'s matching logic. It now reuses `HistoryQuery` (finding 1). I folded the duplicated batch-wrapper guard into the existing values-wrapper branch (finding 2). I renamed the `check_param` flag so it has the same name as the `from_json` flag, and trimmed it so `parameters/__init__.py` no longer goes over 1000 lines (finding 3). I added unit coverage for `allow_map_over` and DCE values (finding 4). Commits: `a0d0b6dfe11` (refactor) and `7b651353741` (tests).

**Did not act on:**
- I kept the `allow_map_over` flag plus the `isinstance` dispatch in `check_param`. A flag is required: the same `from_json` must reject mappable collections for tool-form or API values and accept them for workflow runtime step updates. The other options were worse for a stable backport: widening `ToolParameter.from_json` on every subclass, or duplicating `check_param`'s error handling in `modules.py`.
- I did not decompose `basic.py` (3.5k lines) or `modules.py` (3.7k lines). Both were already far over 1k, the diff adds only about 40 lines, and a stable branch is the wrong place to restructure them.
- `self.collection_types or []` in the error message is only there for typing. The `None` case never raises, because `direct_match_type` accepts everything when the parameter has no declared types.
- I did not unify batch detection with `meta.py`'s several `is_batch` variants. Each one has different semantics (`batch is True` vs truthy, `__class__` default), so unifying them is out of scope for a backport.

## Details

### 1. Missed code-judo: bespoke re-implementation of `HistoryQuery` (acted on)

`_check_collection_type` looped over `self.collection_types` and built `CollectionTypeDescription`s from the module-global factory. It then called `accepts` and `can_map_over`, which is exactly what `HistoryQuery.direct_match` and `HistoryQuery.can_map_over` already do. `HistoryQuery` is the canonical matcher: it is used by `match_collections`, `workflow/map_over.py` and `tools/actions` (and `_history_query` on this very class). Two copies of "what collection types does this parameter accept" will drift apart.

The only obstacle was that `HistoryQuery` takes an `HdcaLike` (`.collection.collection_type`), while the value here can be a DCE's `child_collection` or an adapter. Fix: add `direct_match_type(collection_type)` / `can_map_over_type(collection_type)` to `HistoryQuery`, and make the existing methods one-line delegates to them, so behavior is unchanged for their callers. `_check_collection_type` then reduces to: resolve the type, `direct_match_type`, then `allow_map_over and can_map_over_type`, else raise. The `if not collection_types: return` early exit is gone, because `direct_match_type` already treats an untyped parameter as accepting anything.

The query is built from `COLLECTION_TYPE_DESCRIPTION_FACTORY` rather than `self._history_query(trans)`. They are the same object: `DatasetCollectionManager.collection_type_descriptions = COLLECTION_TYPE_DESCRIPTION_FACTORY`. Using the factory directly keeps the check independent of `trans.app`, which the unit tests do not provide.

### 2. Spaghetti: duplicated wrapper guard (acted on)

`is_unexpanded_batch` re-tested `isinstance(value, MutableMapping) and "values" in value` on the line directly above an `if` that tested the same thing. I moved the batch flag into that branch. This follows the `batch_wrapper` pattern `DataToolParameter.from_json` already uses (the same name and shape, with the extra `__class__ == "Batch"` check this parameter needs for tool-request state).

### 3. File-size threshold and flag naming (acted on)

`lib/galaxy/tools/parameters/__init__.py` was 996 lines on `release_26.2`. The branch took it to 1007, because black exploded the `check_param` signature to one parameter per line and added a 3-line docstring paragraph. I renamed `allow_collection_map_over` to `allow_map_over`, the name `from_json` uses, so one concept now has one name across the call chain. With the shorter name the signature fits back on its original lines, and the docstring note became one sentence. The file is now exactly 1000 lines. `modules.py`'s call site collapsed back to a single argument line.

### 4. Test gap (acted on)

The unit file covered direct accept/reject for HDCAs and adapters, but nothing exercised `allow_map_over` or the DCE branch. These are the two paths the refactor touches. Added:
- `test_from_json_allow_map_over_accepts_mappable_hdca`: paired←list:paired, list←list:list, paired_or_unpaired←list. Each is accepted with the flag and rejected without it.
- `test_from_json_allow_map_over_rejects_unmappable_hdca`: paired←list, list:paired←list, sample_sheet←list:list.
- `test_from_json_checks_subcollection_element_type`: a paired DCE from a list:paired is accepted by a paired parameter and rejected by a list parameter.

### 5. `check_param` flag + `isinstance` dispatch (not acted on, justified)

This is a one-off boolean in a general-purpose function, which the prompt flags. The real invariant is "workflow runtime step updates may map over; direct tool submissions may not", so the information has to come from the caller. The alternatives were:
- (a) add `allow_map_over` to every `ToolParameter.from_json`: wide signature churn on a stable branch;
- (b) have `modules.py` call `from_json`/`validate` itself: this duplicates `check_param`'s runtime-value and error-formatting logic;
- (c) smuggle the flag through `trans` or `param_values`: magic.

The flag defaults to `False`, has a single caller, and the dispatch is two branches. I accepted it.

### 6. Large files (not acted on)

`basic.py` (about 3570 lines) and `workflow/modules.py` (about 3740 lines) were already well past 1k. The diff's growth there is small and cohesive.

### Verification

- Unit: `test/unit/app/tools/test_data_collection_parameters.py`: 25 passed. `test/unit/data/dataset_collections`: passed (114 total with the file above).
- Lint: ruff, black and isort are clean on the touched files. mypy reports nothing new in the touched ranges; the existing noise is unchanged.
- API (`test_tool_execute.py`, `test_tools.py`, `test_workflows.py` with `-k "paired_input_rejects or build_map_over or step_parameter or untyped_collection_input or subcollection_mapping or paired_or_unpaired"`): 38 passed, 1 skipped (the expected `is_request` skip). The server started before a final cosmetic edit, which restored the walrus on `child_collection` and does not change behavior.
