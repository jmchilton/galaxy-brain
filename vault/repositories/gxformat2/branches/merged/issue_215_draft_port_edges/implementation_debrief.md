# Implementation debrief

The rationale, real-data checks and review are in the [TS branch's debrief](../../../../galaxy-tool-util-ts/branches/merged/issue_215_draft_port_edges/implementation_debrief.md); this branch is the source of the shared wording, expectations and fixtures.

- `next_draft_step` port items report edges; `validate_draft` rejects a `TODO_*` in port with no source and no non-null default.
- Local gate: `pytest` 954 passed, 8 skipped; ruff, flake8, black, mypy and pyrefly clean at the first commit, and pytest, ruff, black and mypy rerun clean at the second.
- 0 unwired rejections across real drafts in foundry-runs and Foundry content.

```text
created .../gxformat2/branches/merged/issue_215_draft_port_edges/differential-review/snapshots/20261106T211735Z-implementation-735814742d
  implementation @ 735814742d10 vs origin/main (merge-base b0241eee5438)
  first snapshot: 2 commits, 6 files, 15 hunks
```
