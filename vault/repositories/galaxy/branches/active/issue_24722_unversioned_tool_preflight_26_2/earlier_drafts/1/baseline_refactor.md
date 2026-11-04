Run via Claude Opus 5.5 at high effort.

No refactoring of the base branch was performed.

The branch history is unchanged: `543bdd93c73` (Baseline tests) followed by `ae1c7f50bc0` (the fix).

I checked the fix diff (`git diff upstream/release_26.2...HEAD -- lib`) for anything that could land on the base first:

- **`AbstractToolBox.get_tool_at_version` (`toolbox/base.py`).** This is new behavior, not a refactor. It resolves an unversioned guid or a short id at an exact version, which no existing code does. Landing it first would add a method with no caller. It belongs with the fix.
- **Pre-flight loop in `WorkflowsService._check_workflow_tools` (`services/workflows.py`).** The only refactor I could pull out is reshaping `if not has_tool: append; continue` / `tool = get_tool(...)` into an `if/else`. On the base that change does nothing and has no purpose of its own. The `else` is only there so a tool found by the fallback isn't overwritten. Splitting it out would add a commit without making the fix diff any easier to read.
- **`ToolModule.__init__` (`workflow/modules.py`).** A purely additive four-line fallback. There is nothing to refactor here.

The larger refactor is making `get_tool(exact=True)` follow lineage at the requested version, which would remove the new method and both call-site guards. It changes behavior for every `exact=True` caller and, according to the upstream comment in `get_tool`, breaks many built-in tool tests. It is a `dev` follow-up and doesn't fit this release fix (see `thermo_nuclear_review.md`, finding #1).
