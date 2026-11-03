(space for John's free style comments - just keep empty)

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Claude Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Claude Opus 5.5 at low effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via Claude Opus 5.5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Claude Opus 5.5 at medium effort.

</details>

<details><summary>Risks</summary>

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It only registers conf-derived `ToolConfRepository` stubs in the in-memory `tool_shed_repository_cache` when the cached toolbox materializes a shed tool, mirroring what the eager `AbstractToolBox.get_tool_repository_from_xml_item` already does; nothing is persisted, no API or tool-author contract changes, and reverting restores prior behavior on restart.

<details><summary>Risk Review Advice</summary>

Worth a glance: the registration is lazy (on materialize, not at conf load), so `local_repositories` contents now depend on which tools have been materialized in a given process; any other reader of the cache that enumerates `local_repositories` could see different results per process. The install-database lookup is keyed by `installed_changeset_revision`, so a DB row at a different revision for the same tool_shed/owner/name will not suppress the stub and both will sit in `repos_by_tuple`.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24650_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

<details><summary>Branch and Commit Details</summary>

[`pr_24650_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24650_review_0) (on `6655fd8ef10`) makes the fix survive past startup. `UniverseApplication` drops `tool_shed_repository_cache` when startup finishes, so the PR's registration into that cache did nothing for tools materialized at request time. The branch instead has `Tool` keep the `ToolConfRepository` it was constructed with and fall back to it when the cache/install-DB lookup misses. It removes `_register_conf_repository`, so `cached_toolbox.py` is back to its base apart from one comment. The regression test now runs with and without the cache. The precedence test now uses a real install-DB row.

- [`0ce25b264fa`](https://github.com/jmchilton/galaxy/commit/0ce25b264fa855b5cfa438d5336e184a2dfbe9f6) Keep conf repository on Tool; cache is gone after startup — adds the `Tool._conf_tool_shed_repository` fallback and removes the registration. It also parametrizes the help-image regression test over `during_startup`/`after_startup` (`after_startup` is red on `6655fd8ef10`). The registration test becomes `test_materializing_shed_tools_leaves_repository_cache_untouched`.
- [`98ceefd32fb`](https://github.com/jmchilton/galaxy/commit/98ceefd32fbb51dd4fb3a80b1c79a7baef729a8e) Use real install-DB row in repository precedence test — replaces the `MagicMock` that was pushed into `repos_by_tuple` with a committed `ToolShedRepository` row, run with and without the cache.

</details>

</details>

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

Fixed on the review branch in [`0ce25b264fa`](https://github.com/jmchilton/galaxy/commit/0ce25b264fa855b5cfa438d5336e184a2dfbe9f6).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Use a real install-DB row instead of a MagicMock in the precedence test (implementation verified)

`test_materializing_shed_tool_keeps_install_database_repository` builds the "installed" repository as a `MagicMock` and appends it to `ToolShedRepositoryCache.repos_by_tuple`, a private structure. As a result, it only covers the cache path and is coupled to the cache's internals.

Commit a real `ToolShedRepository` row to `app.install_model.context`, and run the test with and without the cache. This checks that a database row takes precedence over the conf stub on the query path production uses after startup. Implemented in `98ceefd32fb`.

Fixed on the review branch in [`98ceefd32fb`](https://github.com/jmchilton/galaxy/commit/98ceefd32fbb51dd4fb3a80b1c79a7baef729a8e).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at low effort. Verified via Opus 5.5 at medium effort.

</details>
