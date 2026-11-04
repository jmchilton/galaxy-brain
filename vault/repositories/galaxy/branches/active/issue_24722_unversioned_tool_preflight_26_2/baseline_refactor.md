Run via Claude Opus 5.5 at high effort.

One behavior-preserving refactor commit, `215a1c4bb06`, was placed between the baseline tests and the fix. It extracts the invocation pre-flight's `has_tool`/`get_tool` lookup into a module-level `_find_workflow_tool` in `services/workflows.py`.

## History

Before: `99f05078e1b` (Baseline tests), `a7e01a3162a` (fix), `0c29b5fdc4c` (installed versions).

After:

1. `99f05078e1b` Baseline tests for unversioned shed tool ids in workflow invocation (unchanged, still first)
2. `215a1c4bb06` Extract _find_workflow_tool from the workflow invocation tool pre-flight (new)
3. `e389973cc5e` Accept unversioned shed tool ids for exact-version workflow invocation
4. `0e76ac8e20b` Name installed versions when an exact-version workflow tool is missing

The final tree is byte-identical to the old HEAD `0c29b5fdc4c` (`git diff 0c29b5fdc4c 0e76ac8e20b` is empty). Commit messages for the fix and the installed-versions commit are unchanged.

## The refactor

`215a1c4bb06` adds `_find_workflow_tool(toolbox, tool_reference, require_exact_tool_versions, user) -> ToolLike | None`. It holds the base branch's `has_tool` check followed by `get_tool`, and returns `None` when `has_tool` is false. The loop in `_check_workflow_tools` now calls the helper and treats `None` as missing. It also adds the `User`, `AbstractToolBox` and `ToolLike` imports the fix needs. Because of this commit, the fix's `services/workflows.py` diff is now just the four-line `get_tool_at_version` fallback inside the helper.

Behavior note: the base loop guarded with `if tool and not tool.is_workflow_compatible`. In theory, if `has_tool` were true and the following `get_tool` returned `None`, the base would skip the tool silently, while the refactor reports it as missing. `has_tool` is defined as `get_tool(...) is not None` with identical arguments, so the two calls cannot disagree on `None` vs. not-`None`. The existing comment about the cached toolbox concerns resolving a *different version*, not `None`. Neither the fix nor this refactor introduced this narrowing; the fix commit already did it.

## Not pulled onto the base

- **`AbstractToolBox.get_tool_at_version`.** This is new lookup behavior with no caller on the base, so it stays with the fix.
- **`ToolModule.__init__` fallback (`modules.py`).** A purely additive four lines. There is nothing to refactor.
- **`_describe_missing_tools` / `_installed_tool_versions`.** These change the error message (new behavior) and belong in the installed-versions commit.
- **Making `get_tool(exact=True)` match by version through lineage.** This would change behavior for every exact caller. It is a `dev` follow-up (see `thermo_nuclear_review.md`).

## Validation at `215a1c4bb06`

- ruff, black and isort are clean on `services/workflows.py`. mypy reports 18 errors, the same count as on the baseline commit; all of them are in other modules it pulls in.
- `PYTHONPATH=lib pytest test/unit/app/tools/test_toolbox.py`: 57 passed, 2 xpassed.
- `pytest test/integration/test_workflow_invocation.py test/integration/test_tool_source_storage.py` (with the specified env overrides): 42 passed. The final tree is identical to the previously tested HEAD, and the unit suite was rerun there: 58 passed, 2 xpassed. The fix adds one more unit test. The local branch `issue_24722_unversioned_tool_preflight_26_2` now points at `0e76ac8e20b`; nothing was pushed.
