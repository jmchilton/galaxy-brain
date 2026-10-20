This stuff looks worth acting on and agent has provided a branch. Thanks for the fix - this was on my TODO list for greater Planemo integration also (this slow down was detected when researching loading tool evaluation pieces and such for new tool dev options). -John

Reviewed by default (Claude Opus 5.5, low effort).

Fix branch `pr_24244_fix_0` in [jmchilton fork](https://github.com/jmchilton/galaxy/tree/pr_24244_fix_0):

- `23eec7db2ca` Skip Sentry integrations whose library is missing (P3 3)
- `0db38655333` Keep pydantic-ai and MCP Sentry tracing in the web app (P2 1)
- `d331e5111d6` Move IWC tests next to galaxy.workflow tests (P3 4)

P2 1 builds on P3 3's guarded loop, so the P3 3 commit comes first.

### P2 1: AI-agent and MCP Sentry spans dropped in the web process, which loads pydantic-ai and MCP anyway (implementation verified)

`auto_enabling_integrations=False` in `configure_sentry_client` (`lib/galaxy/app/__init__.py`) turns off `PydanticAIIntegration`, `MCPIntegration`, OpenAI/Anthropic and redis in every process, the web workers included. The web workers get no memory benefit. `buildapp` imports `galaxy.managers.agent_registry` at module top, and `fast_app` imports `api/mcp.py` (fastmcp) at module top. Both load at startup, not on first request. The PR therefore drops ChatGXY and MCP tracing on a release branch for nothing. The PR body mentions AI spans but not MCP or redis.

<details><summary>Evidence</summary>

- With the PR, `PYTHONPATH=lib`, Galaxy venv: `import galaxy.webapps.galaxy.buildapp` puts `pydantic_ai` and `mcp` in `sys.modules`. `import galaxy.webapps.galaxy.fast_app` adds `fastmcp` as well.
- sentry-sdk 2.63.0 (the `conditional-requirements.txt` floor) lists `pydantic_ai.PydanticAIIntegration`, `mcp.MCPIntegration`, `openai`, `anthropic` and `redis` in `_AUTO_ENABLING_INTEGRATIONS`.
- sentry-sdk 2.63.0's MCP integration raises `DidNotEnable` against the pinned `mcp==2.3.0`, because `mcp.server.lowlevel.server.request_ctx` is gone. sentry-sdk 2.72.0 supports it. Adding `MCPIntegration` unguarded would therefore crash startup on older sentry-sdk, so this fix depends on P3 3.

</details>

The fix lists `PydanticAIIntegration` and `MCPIntegration` when `is_webapp`, through the guarded import loop from P3 3. `is_webapp` used to be set in `UniverseApplication.__init__` after Sentry was configured. The fix sets it in `MinimalGalaxyApplication.__init__` from kwargs instead. Handlers and celery still avoid the imports. If the omission is deliberate, list MCP/redis in the PR body and release notes.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at low effort.

### P3 1: Registry move to `galaxy.managers.agent_registry` is left over from the dropped lazy approach

`agent_registry.py` imports `galaxy.agents.base` at module top. That runs `galaxy/agents/__init__.py` and loads pydantic-ai, so the new module is as heavy as `galaxy.agents.registry` was. The move only made sense for the lazy design in `da3f17e`. The final eager `app_pair` registration doesn't need it. The move also forces a lazy `static_backend` import to break a cycle, and 26.2 would publish another module path. Keep `galaxy.agents.registry`/`factory` in place and move only `iwc`/`gtn`, or make the module light (base types under `TYPE_CHECKING`). Not fixed: this is a module-layout decision for the author.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort.

### P3 2: `buildapp.app_pair` calls the app's private `_register_singleton` and wires `JobQueryManager` inline

This is now the only call to `_register_singleton` from outside the app classes in `lib/` or `test/`. Tests that inject dependencies use the container's public `app[Type] = instance` (e.g. `test/unit/app/managers/test_user_file_sources.py`). Put the recipe in a `register_agent_services(app)` helper next to `AgentService`, or at least use `app[...] =`. That keeps the construction with the service and gives any future non-`app_pair` web entry point one call to make. Not fixed: placement is the author's call.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort.

### P3 3: Explicit Sentry integration imports aren't guarded against `DidNotEnable` (implementation verified)

Auto-enabling skipped integrations whose library was missing. Importing an integration explicitly raises `DidNotEnable`, which now aborts app startup. `galaxy-app` doesn't depend on fastapi (only `galaxy-web-apps` and `tool_shed` do), so a `galaxy-app`-only install with `sentry_dsn` set would fail to start. Full Galaxy and Tool Shed installs aren't affected.

The fix imports each integration through `importlib` in a loop, catches `DidNotEnable` and logs a warning. Sentry still re-raises a `DidNotEnable` that comes from `setup_once` (e.g. a library-version check) for explicitly passed integrations. The pinned versions pass that check.

<details><summary>Evidence</summary>

The new `test/unit/app/test_sentry_integrations.py` hides `fastapi` from `sys.modules`. It fails on the reviewed commit with `DidNotEnable` from `sentry_sdk/integrations/fastapi.py` and passes with the fix. The test uses `importorskip("sentry_sdk")`. sentry-sdk is a conditional requirement and isn't in the dev venv, so it was run with sentry-sdk 2.63.0 and 2.72.0 overlays and is skipped in CI unless sentry-sdk is installed.

</details>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at low effort.

### P3 4: `test/unit/agents/test_iwc.py` now tests `galaxy.workflow.iwc` (implementation verified)

The module moved, but its test file didn't. The sibling `galaxy.workflow.curated` tests live in `test/unit/workflow/`, not `test/unit/workflows/` as the initial review said. The fix moves the file there, and all 11 tests pass.

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Claude Opus 5.5 at low effort. Verified via Claude Opus 5.5 at low effort.
