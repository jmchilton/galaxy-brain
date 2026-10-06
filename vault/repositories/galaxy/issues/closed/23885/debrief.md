# Debrief: refactor rewrites the source workflow version

Source: `refactor_rewrites_source_workflow_version.md`. Proposal: `proposed_refactor_rewrites_source_workflow_version.md`.

## Research

- Checked the mechanism on `dev` @ `4f78c5014e8`. `do_refactor` passes the persistent `get_internal_version()` workflow to `WorkflowRefactorExecutor`. `_apply_upgrade_tool` and `_apply_upgrade_subworkflow` set `tool_id`, `tool_version` and `subworkflow` on persistent steps. The export shares `step.position`, a `MutableJSONType` value, with the persistent step.
- `release_26.1` has the same code, so it's affected too.
- The four failing tests exist on #23799 head `75e33460a39`. They weren't re-run against `dev` this session; the claim that they fail comes from the earlier branch work.
- Duplicate search found only #23762, a separate no-op-version bug.

## Rewrite

- The draft's notes for the filer became a single-line opener, then a before/after table of versions, then who is affected. The code walk and the test list went into details.
- Proposed Approach: a detached dry-run build, which is what #23799 does. Alternatives: expire the source steps (#23792), or roll back or refresh the session.
- I left out the draft's warning about #23762's false `tool_version_change` claim. It isn't relevant to this issue.

## Review corrections

- The autoflush argument against expiring was wrong: Galaxy's session has `autoflush=False`. It's now argued from what expiring covers: changes to objects that weren't expired, or an explicit flush.
- The position figure is a relative left offset between steps (10 → 7), not an absolute value.
- #23792 is described as merged forward into #23799 and then replaced.

## Open

- Whether to ask for a `release_26.1` backport (John's call).
- After filing: the gx_branches agent should update #23799's opener to `Fix 🎯 #23762 and 🎯 #NNNN`.
