Run via Claude Opus 5.5.

# Retarget to release_26.2

On 2026-11-02 John asked to rebase onto `release_26.2` and retarget the branch, then do a fresh review. The branch name keeps its `_26.1` suffix. New head `ab7c1f0887d`, force-pushed with lease to `jmchilton`, replacing `cda4733996f`. Restore point: local branch `backup/citation_fetch_hardening_26.1_pre_retarget_26_2` at `cda4733996f`.

## Rebase

- `git rebase --onto origin/release_26.2 f7f8c6935a2` onto `018ebd2cf60`. All 19 commits kept, in the same order.
- Every conflict came from 26.2 dropping Python 3.8/3.9 (`bec3d3ad9c9`), which moved the code to `X | None`, builtin generics and `collections.abc`. I resolved each conflict to the branch's side and converted its typing to the 26.2 style. Clean picks that still used `Optional` were fixed in their own commits.
- New in 26.2: the generated `lib/galaxy/config/_galaxy_config_schema_attributes.py`. `make config-rebuild` adds the three citation options to it, and that change is folded into the config commit. The sample and rst regenerate unchanged.
- One mypy error was new under 26.2's stricter settings: a bare `dict` return in `DoiCache._cache_options`. It's now `dict[str, Any]`, in the config commit.
- Apart from the typing changes, the cumulative patch against the base matches the 26.1 version.

## Fresh review

The normal review checked:
- each commit's lint and tests;
- the generated files;
- 26.2 interactions: #23400's certifi helpers, `materialize_tool`, and the new `source_store` bio.tools caller.

It found one must-fix. It's a possible security issue; details withheld. It's fixed in the `bounded_get` commit, with a red-to-green unit test.

Acted on:
- **Tool Shed `citation_cache_table_name`:** a hand-written `kwargs.get(..., None)` overrode the schema's `beaker_cache` default. That's the same bug class as commit 19. Dropped the line, added a red-to-green test, and reworded commit 19.
- **`Protocol`:** now imported from `typing`, not `typing_extensions`.

Not acted on:
- **Moving the 32KB BibTeX check into the `Citation` model,** so parsed-tool models are capped too. Already declined: `ParsedTool` is display only.
- **Adding the three citation options to the Tool Shed schema to replace the `getattr` fallbacks.** That widens scope for no behavior change.
- **Dog-pile:** `cached_fetch` no longer holds beaker's creation lock, so concurrent misses for the same DOI can each fetch. The per-request budget bounds it. This is a PR D body note.
- **Removing the module-level `citations_to_bibtex`.** It's a style preference, and the tests use it.
- **bio.tools deadline:** lookups now have a 15s total deadline, where before they had a 600s per-socket timeout. That makes the live-site `test_cascade_content` more likely to flake on slow runs. This is a PR A body note.
- **bio.tools 404s:** they're kept until the cache is cleared, the same as before. This is a PR body note.

## Validation (at `ab7c1f0887d`, run one at a time)

| Check | Result |
|---|---|
| ruff, black, isort on each commit's changed files | clean at all 19 commits |
| Touched unit tests at each commit | green at every commit, rising from 372 to 411 at the tip; see note below |
| API `test_tools.py::TestToolsApi::test_tool_citations` | passed (at `89b3cc6c3bc`) |
| API `test_histories.py::TestHistoriesApi::test_history_citations` | passed (at `89b3cc6c3bc`) |
| mypy on changed modules (from `lib/`) vs base | same errors as `origin/release_26.2` |

The API tests ran before the review fixes. Those fixes touch `bounded_get` URL preparation and Tool Shed config, and the unit tests cover them.

Unit tests note: the first pass had one failure at commit 8 that didn't reproduce in 3 reruns or 4 tip runs. The review saw the same pattern in `test_cascade_content`, which hits live bio.tools: it fails only on slow runs. One commit skipped that test because the site was down.

`.venv` now links to a 26.2 worktree's venv (`issue_24546_cache_monitor_default_26.2`) instead of the 26.1 one.
