## What

A non-multiple `data` parameter handed a dataset collection produces a raw 500:

```
TypeError: Expected [] to be hashable
  File "galaxy/tools/parameters/wrapped.py", wrap_values
  File "galaxy/tools/wrappers.py", ElementIdentifierMapper.identifier
```

`DefaultToolAction.collect_input_dataset_collections` replaces a `DataToolParameter`'s value with the collection's `dataset_instances` — a **list** — without checking `multiple`. A non-multiple `data` parameter cannot hold a list, so every downstream consumer (`wrap_values`, `ElementIdentifierMapper.identifier`, `DatasetFilenameWrapper`) is handed a list where it expects one dataset, and the failure surfaces far from its cause with no indication of which step or parameter is at fault.

The element count is the only thing that varies, which is why this has been filed three times:

| Elements | Error | Issue |
|---|---|---|
| 0 | `Expected [] to be hashable` | #23521 |
| 1 | `Expected [<HDA>] to be hashable` | #19538 |
| 2+ | `Expected [<HDA>, <HDA>] to be hashable` | #22401 |

#22406 already rejects an HDCA in `DataToolParameter.from_json`, which covers the direct API-request half of #22401. Paths that do not go through `from_json` — workflow invocation among them — still reach the rewrite, which is how #23521 and #19538 happen.

## The fix

Guard the rewrite on `input.multiple`. Only `multiple="true"` can reduce a collection; for anything else raise `RequestParameterInvalidException` at the point of detection, naming the parameter and the element count:

> Dataset collection with 0 element(s) supplied to single dataset parameter 'param1'. This parameter accepts one dataset, so the tool has to be mapped over the collection instead.

A 400 instead of a 500, and a workflow invocation that fails with a readable message pointing at the offending step.

This is not a behaviour change in the sense of anything that used to work: every one of these cases crashed before, just later and less legibly.

## Testing

`test_collection_rejected_for_single_data_param` in `test/unit/app/tools/test_actions.py` runs all three element counts through `DefaultToolAction.execute` — the code path from the reported tracebacks. Reverting the source change turns it red with the literal `TypeError: Expected [] to be hashable` from #23521.

`test_on_text_multiple_true_collection` picks up an assertion that `multiple="true"` still reduces the collection to its datasets, so the guard cannot be widened by accident.

- `test/unit/app/tools/test_actions.py` — 14 passed
- `test/unit/app/tools/` — 650 passed, 11 failed, all 11 identical to the failure set on clean `dev`
- `test/unit/workflows/` — 118 passed, 1 skipped
- black / isort / ruff / flake8 clean; mypy reports 0 errors in the changed file

## Not fixed here

This stops the 500 and names the culprit, but it does not explain how a collection reaches a single `data` parameter *un-mapped* in the first place. Normal workflow mapping never gets here: `_find_collections_to_match` adds the collection for matching and `Tree._walk_collections` descends to leaf elements, whose `DatasetCollectionElement` has no `child_collection` and is skipped by the rewrite. So something upstream is bypassing collection matching for these steps.

Both older tracebacks (#19538, #22401) fail inside `wrap_values(input.cases[current].inputs, ...)`, so the parameter is nested in a tool `<conditional>` in all the reported cases — a plausible lead is `ToolModule.get_all_inputs` walking a different `__current_case__` than execution does, which would leave the parameter out of `all_inputs` and therefore out of matching. Chasing that needs the reporter's workflow.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
