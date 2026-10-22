# Implementation debrief

Issue draft: `vault/agents/gx_issues/to_file/proposed_untyped_param_lint_declared_labels.md` (not filed yet).

## Change

`getUntypedWorkflowParameters` (`client/src/components/Workflow/Editor/modules/parameters.ts`):

- Skips rename `${name}` when a `parameter_input` step is labelled `name` (same rule as the run form, `Workflow/Run/model.js`).
- Scans only `RenameDatasetAction.newname` in post-job actions; other actions never substitute `${...}` and the extract fix can't handle them.
- Tool-state `${...}` still flagged, declared label or not.

Side effect: the workflow attributes "Parameters" list uses the same function, so it now lists only parameters the run form would prompt for.

## Tests

New `parameters.test.ts` (5 cases). Red on `dev`: declared-label, mixed rename, tag-action cases failed; undeclared and tool-state controls passed. Green after.

Editor + Run vitest suites: 445/445 with `NODE_OPTIONS=--no-experimental-webstorage` (Node 25's webstorage breaks jsdom `localStorage`; without the flag 51 tests fail identically before and after the change). eslint/prettier clean (3 pre-existing `any` warnings).

## Not done

- No UI click-through of extract → lint clears.
- No backend change; `extract_untyped_parameter` on an already-declared label would still add a duplicate-label input, but the editor no longer offers it.
