# galaxy#23886 — Collection output type_source crashes for inputs in conditionals and for names ending in _digit

[Issue](https://github.com/galaxyproject/galaxy/issues/23886) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Collection output `type_source` crashes job creation (mapped or not) for `cond|input` references, legacy bare aliases into conditionals, and names ending in `_<digit>`, because `create_collection` string-walks `tool.inputs`; also fix [#23877](https://github.com/galaxyproject/galaxy/pull/23877)'s docs, which say conditionals work "mapped only"; next: record the `DataCollectionToolParameter` during `collect_input_dataset_collections` and replace the walk, red framework tests first.

Closed 2026-10-05.
