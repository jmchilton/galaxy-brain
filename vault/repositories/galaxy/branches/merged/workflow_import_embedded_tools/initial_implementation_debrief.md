# Initial implementation

Implemented issue [#24471](https://github.com/galaxyproject/galaxy/issues/24471) on `workflow_import_embedded_tools`, targeting `release_26.1`, the first release branch with the embedded GalaxyUserTool import path.

Extracted embedded tool resolution from `ToolModule.from_dict` into `resolve_tool_uuid`, retaining user ownership, permission checks, private copies and admin tool handling. The importer calls it in the existing dependency pre-pass, before constructing any parent steps. Recursive subworkflow imports use the same path. Standalone module construction still resolves tools itself.

The first commit contains passing baseline tests for final-step outputs and earlier-step annotations. Six additional user tool cases reproduced the NOT NULL workflow_step.workflow_id failure before the fix; all eight user tool variants now pass. Tests cover earlier workflow outputs and rename actions, nested workflows, and a stock tool before an embedded UDT. Both admin variants also fail with the original constraint error on the base manager and pass with the fix. All 10 strengthened import variants and 26 relevant user tool API tests passed. The normal review found no blockers.

`mypy` on both implementation files reports the same three pre-existing unused-ignore errors on the base and branch, with no new errors; the changed test file passes. Full formatting passed; its unrelated quote normalization in `mulled_build.py` was reverted. All commit hooks passed. No UI changes or database migrations are needed.

Initial scope: resolve embedded tools before workflow construction for both user and admin tools, including nested imports. Do not change dynamic tool transaction semantics or workflow output/PJA persistence.

Implementation snapshot:

```text
created /Users/jxc755/projects/repositories/galaxy-brain/vault/repositories/galaxy/branches/active/workflow_import_embedded_tools/differential-review/snapshots/20261026T143606Z-implementation-9b4b8fde4150.json
  implementation @ 9b4b8fde4150 vs origin/release_26.1 (merge-base b17e5145564f)
  first snapshot: 3 commits, 3 files, 5 hunks
```
