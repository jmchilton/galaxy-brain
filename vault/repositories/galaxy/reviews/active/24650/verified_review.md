### P1 1: Fix is a no-op after startup because the repository cache is cleared (implementation verified)

`_register_conf_repository` registers the conf stub in `app.tool_shed_repository_cache`. However, at the end of `__init__`, `UniverseApplication` runs `self.tool_shed_repository_cache = None` ("Limit lifetime of tool shed repository cache to app startup", `lib/galaxy/app/__init__.py:1233`), and nothing creates the cache again. Cached-toolbox materialization happens on demand at request time, through the `materialize_tool(..., reason=...)` callers in the API, services, and managers. By then the registration hits `if not tsr_cache: return`. `Tool.tool_shed_repository` then falls through to the install-DB query, finds no row, and returns `None`. The help keeps its literal `$PATH_TO_IMAGES` (#24527 again), and `installed_tool_dependencies` is `None`. The PR's tests construct a live `ToolShedRepositoryCache`, so they never exercise the state production is in.

<details><summary>Evidence</summary>

Parametrizing `test_materialized_shed_tool_without_install_row_rewrites_help_images` with `app.tool_shed_repository_cache = None` (empty install DB) fails on `6655fd8ef10`:

```
>       assert repository is not None
E       assert None is not None
```

Request-time readers of `Tool.tool_shed_repository` were checked against the stub: `__get_help_with_images`/`set_image_paths` reads only scalars, `installed_tool_dependencies` gives `[]`/`None`, which `ToolRequirementsAndDependencies` and `api/tools.py` treat the same, and the `load_tool` cache check in `tool_util/toolbox/base.py:1425` uses truthiness only. The `get_tool_relative_path` consumers receive install-flow repositories, not `Tool.tool_shed_repository`.

</details>

Keep the stub on the `Tool` rather than relying on the startup-scoped cache. In `populate_tool_shed_info`, store the passed repository when it is a `ToolConfRepository`. Have the `tool_shed_repository` property return `get_installed_repository(...) or self._conf_tool_shed_repository`. With that in place, `_register_conf_repository` and its per-process `local_repositories` mutation are unnecessary. Scope note: after startup, eager-toolbox conf-only shed tools now also return their stub instead of `None`. Implemented in `0ce25b264fa` on `pr_24650_review_0`. The regression test runs in both `during_startup` and `after_startup` modes, and the registration test now asserts the cache is left untouched.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Use a real install-DB row instead of a MagicMock in the precedence test (implementation verified)

`test_materializing_shed_tool_keeps_install_database_repository` builds the "installed" repository as a `MagicMock` and appends it to `ToolShedRepositoryCache.repos_by_tuple`, a private structure. As a result, it only covers the cache path and is coupled to the cache's internals.

Commit a real `ToolShedRepository` row to `app.install_model.context`, and run the test with and without the cache. This checks that a database row takes precedence over the conf stub on the query path production uses after startup. Implemented in `98ceefd32fb`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
