# Debrief: untyped_param_lint_declared_labels

Source: [research.md](../../../repositories/galaxy/branches/active/untyped_param_lint_declared_labels/research.md). Fix branch: `untyped_param_lint_declared_labels` (6bb6d2cab4d).

## Research

- Editor `getUntypedWorkflowParameters` flags every `${...}` and never checks step labels.
- Runtime fills rename `${label}` from labelled `parameter_input` steps (`effective_replacement_dict`); only `RenameDatasetAction` substitutes.
- The run form already skips declared labels for renames; it's the precedent the fix copies.
- Duplicates: none. Related: #10989 (lint polish), #19000 (rename variables in editor).

## Review round (one subagent)

- YAML gained `outputs:` (gxformat2 schema requires it); example lints and converts.
- Repro corrected: re-applying the fix is rejected with duplicate step label (traced, not run), not "adds a second input".
- Table legend added; PR refs made fully qualified; "only way" claim narrowed (`replacement_params` also fill `${name}`).

## Leftovers (not in issue)

- Duplicate-label error message traced from code only; confirm before filing.
- Rename `${data_input_label}` is still flagged (correct, runtime doesn't fill it) and its fix hits duplicate label; gxformat2#271 points users to `#{}`. Possible follow-up.
- Mid-string tool-state `${X}` is flagged but the fix only handles exact `${X}` values. Out of scope.
- `get_informal_replacement_parameters` (backend, run form) still scans all PJA args, so the run form prompts for tag `${X}` that's ignored. Out of scope.

## Recommendation

Post. It's a real user-visible loop with a small fix ready; or keep internal and go PR-first, linking this from the branch.
