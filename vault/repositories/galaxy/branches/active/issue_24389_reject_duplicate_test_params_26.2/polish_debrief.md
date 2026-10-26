# Polish debrief

- One commit on the 26.1 lint branch reverting its flag commit, so conflicting duplicates error at load at profile >= 24.2.
- Checklist subagent: code correct. Fixed: the revert dropped the lint assertion in the conflicting `edit_attributes` test; restored (`f9f918beb13`). Applied: bold-italic lines on the 26.2 target and stacking; risk note on `release_26.2`'s `_qualify_test_inputs`.
- Left over: verify on `release_26.2` after the parent merges forward (26.2 `case.py`/`parse.py` differ; `_qualify_test_inputs` rewrites unqualified duplicates into repeat instances). Optional: tools-iuc fixes for sourmash sketch and isoformswitchanalyzer.
- Fork CI not yet checked.

```
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/issue_24389_reject_duplicate_test_params_26.2/differential-review/snapshots/20261026T170034Z-polishing-f9f918beb134.json
  polishing @ f9f918beb134 vs issue_24389_lint_duplicate_test_params_26.1 (merge-base 88151f3a8d66)
  first snapshot: 1 commit, 2 files, 11 hunks
```
