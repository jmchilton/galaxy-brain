# Initial review — #24650 (default profile)

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5 (`claude-opus-5-5`), effort low
- Reviewed commit: `6655fd8ef10` (diff vs `origin/release_26.2`, 2 files, +126/-1)
- Verification: code reading only (no `.venv`; tests not run)

## Verdict

Diagnosis is right (the stub is only handed to the ctor while `Tool.tool_shed_repository` re-resolves through `app.tool_shed_repository_cache`), but the fix registers into a cache that Galaxy sets to `None` once startup finishes. Cached-toolbox materialization is lazy and mostly happens after startup, so the common case (user opens a tool form) still looks like it's broken. The unit test builds a live cache and can't catch this. Request changes.

## P1 1: Fix is a no-op for tools materialized after startup (repository cache is gone)

`UniverseApplication.__init__` ends with:

```python
# Limit lifetime of tool shed repository cache to app startup
self.tool_shed_repository_cache = None
```

(`lib/galaxy/app/__init__.py:1232-1233`, from `4b579c34c6f "Limit lifetime of repository cache"`). After that:

- `_register_conf_repository` hits `if not tsr_cache: return`, so nothing is registered.
- `Tool.tool_shed_repository` → `get_installed_repository(..., from_cache=True)` (`lib/galaxy/tools/__init__.py:1367-1377`) finds no cache, falls through to the install-DB query, gets no row, and returns `None`.
- `__get_help_with_images` (`lib/galaxy/tools/__init__.py:2090`) skips `set_image_paths`, so `$PATH_TO_IMAGES` stays in the help, which is #24527 again.

`CachedToolBox` materializes on demand (`MaterializationReason.DETAIL`, `EXECUTION`, `PACKAGING`, ...), i.e. at request time and after the cache is cleared. Only tools materialized during `__init__` (e.g. data managers) benefit. The new `installed_tool_dependencies` claim in the PR body is hit by the same problem. The tests set `app.tool_shed_repository_cache = ToolShedRepositoryCache(...)` and never model the cache going away, so they pass while production doesn't change. `raw_help` is computed in the `Tool` ctor (`lib/galaxy/tools/__init__.py:1618-1621`), which runs at materialization, and `_configure_toolbox` explicitly builds search corpora "without materializing their tool stubs" (`lib/galaxy/app/__init__.py:441-442`). So the manual test in the PR body only works if that tool happened to be materialized during `__init__`, or if it ran under an app/driver that doesn't clear the cache. Worth asking the author how it was run.

Suggested fix: don't rely on the startup-scoped cache. Let the `Tool` keep the `ToolConfRepository` it was built with and fall back to it when the cache/DB lookup misses. For example, `populate_tool_shed_info` stores the passed repository when it's a `ToolConfRepository`, and the `tool_shed_repository` property returns `get_installed_repository(...) or self._conf_tool_shed_repository`. Then `_register_conf_repository` isn't needed. (The eager post-fork `reload_toolbox` also runs after the cache is cleared. I haven't traced whether `tool_cache` masks that, so it's out of scope here.) The key regression test materializes with `app.tool_shed_repository_cache = None` and an empty install DB, and checks that the help images get rewritten. Red on this head, green after.

## P3 1: Lookup-or-register is now duplicated with the eager path

`_register_conf_repository` reimplements what `AbstractToolBox.get_tool_repository_from_xml_item` does inline (`lib/galaxy/tool_util/toolbox/base.py:1209-1240`): look up the repo, then `tsr_cache.add_local_repository` on a miss. If the cache-based approach stays, make it one `ToolShedRepositoryCache` method (e.g. `get_or_add_local_repository`) and use it from both paths. Otherwise the two will drift (for example, `getattr(self.app, ...)` here vs. `self.app.tool_shed_repository_cache` there). This goes away if P1 is fixed the way suggested.

## Notes (no action)

- The stub keeps `repository_path=None` and `tool_path=stored.tool_dir` (that predates this PR). `get_tool_relative_path` consumers (data table manager, installed repository manager) now see it once it's registered in the shared cache. I didn't trace any concrete breakage, since those paths take install-DB repositories.
- Lock use (`_cache_lock` around the check-then-add) is fine. Repeated materializations register only once, as the test checks.
