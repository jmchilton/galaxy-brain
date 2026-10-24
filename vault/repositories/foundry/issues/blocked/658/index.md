# #658 planemo workflow_lint crashes on a string-valued `run:` and never passes workflow_directory

[Issue](https://github.com/galaxyproject/foundry/issues/658) — opened by scottcain (AI-assisted), currently only `needs-triage`. No PR or branch addresses it on Foundry.

## Proposed labels

- `roadmap/substep`: toolchain bug report, not backbone work.
- Parent: none fits well. Weak candidate #501 "Improved Support for Tool Development" (UDT-in-workflow adjacent, like #582). Otherwise `roadmap/off`; John to pick.
- `priority/mvp`: `workflow_lint` is the only changeset-installability check, so the crash hides wrong tool pins ("correct results now").
- `agent/implement`: fix is small and specified; lives in planemo/gxformat2, which we maintain.
- `upstream/planemo`: fix lands in Planemo. Drop the label when released and pinned.
- `upstream/gxformat2`: part 2 needs `_try_build_nf2` to accept `workflow_directory` (label added 2026-10-24).

## Derived status

`blocked`: `upstream/planemo` (rule 3).

## Findings (checked 2026-10-24)

- Latest PyPI planemo is 0.75.47 (reporter's version). Master is 137 commits ahead, unreleased.
- Crash (part 1) is fixed on master. `_iter_tool_steps` now skips any step where `is_subworkflow_reference(step)` (string `run`) before the `.get("run", {})` line. Came with planemo PR #1742 "Support linked (URL / TRS) subworkflows" (merged 2026-10-13, mvdbeek). Not on PyPI. Not a Foundry-specific fix: side effect is string-`run:` steps (local UDT files) are never pin-checked, fine for UDTs, which are not Tool Shed tools. Unconfirmed by running; code read only.
- `workflow_directory` (part 2) is still broken on master. `_lint_structure` calls gxformat2's `_try_build_nf2(lint_context, workflow_dict)`, which calls `ensure_format2(workflow_dict, expand=True)` with no options. gxformat2 `_conversion.py:168` raises "Cannot resolve @import ... without workflow_directory" when it is None. `_load_workflow_dict` strips only URL/TRS `run:` strings; local-path ones stay. Planemo already passes `workflow_directory` elsewhere (`galaxy/workflows.py:637`, `python_to_workflow`), so the lint path is simply missed. Fix needs `_try_build_nf2` (private gxformat2 helper, no options param) to accept `workflow_directory`, or planemo to call `ensure_format2` itself, then pass `os.path.dirname(os.path.abspath(path))`.
- Part 3 (stop remaining lint passes after "Failed to parse workflow"): still true; each `lint_context.lint(...)` pass reloads the file independently.
- No planemo issue or PR found for the `workflow_directory` gap (searched "workflow_lint run", "string run lint"). gxformat2 #162 ("Lint with expanded workflows to validate URL/import subworkflows", open) is related.
- Related Foundry: #582 (embedded `GalaxyUserTool` in Planemo; same `run:`-bearing workflows), #585/#714 (UDT-in-workflow binding note).

## Next

1. Confirm part 1 by running `workflow_lint` from planemo master on a workflow with `run: file.yml`.
2. Small planemo PR (+ gxformat2 tweak if needed) for `workflow_directory`; add a test with a local `run:` import. Optionally a note on part 3.
3. Ask for a planemo release; bump the Foundry pin; drop `upstream/planemo`, status goes `queued`/`wip`.
