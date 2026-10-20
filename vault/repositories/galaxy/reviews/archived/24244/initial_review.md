# Initial review: galaxyproject/galaxy#24244

Profile `default`, Opus 5.5 (claude-opus-5-5), low effort. Reviewed commit `334e1640d7e71f3f51bfaf94112ed0111703a61c` against merge-base with `origin/release_26.2`.

## Summary

Solid, well-scoped change. The import-graph fix works: with the PR, `import galaxy.app` and `import galaxy.celery.tasks` no longer load `pydantic_ai`. At the merge-base, `galaxy.celery.tasks` loaded it. I checked this locally with a Galaxy venv and `PYTHONPATH=lib`. `buildapp`, `fast_app` and `galaxy.managers.agent_registry` still load it, as intended. No stale references to `galaxy.agents.{iwc,gtn,registry,factory}` remain in lib/, test/, client/, doc/, config schema/sample, mypy.ini or `.gitignore`. The findings below are about Sentry coverage and some leftover structure from an earlier version of the approach.

## Findings

### P2 1: AI-agent Sentry spans dropped in the web process, which loads pydantic-ai anyway

`auto_enabling_integrations=False` (`lib/galaxy/app/__init__.py` `configure_sentry_client`) turns off PydanticAI, OpenAI, Anthropic, GoogleGenAI and MCP instrumentation in every process. That includes the web workers. Those workers still import pydantic-ai, openai and the MCP server through `app_pair` and the agent and MCP API routes, so turning the integrations off there saves no memory. It only removes ChatGXY and MCP tracing on a release branch. The PR body says AI spans are lost, but it doesn't mention MCP or redis.

Suggested fix: when `is_webapp` and `inference_services` is configured, append `PydanticAIIntegration()` to the explicit list. Do the same for `MCPIntegration()` when MCP is enabled. Each integration module imports its library, so these imports belong inside that branch. Handlers and celery still avoid the imports, and the process that runs agents keeps its spans. If this is deliberately out of scope, list MCP/redis in the PR body and in the release notes.

### P3 1: Moving the registry to `galaxy.managers.agent_registry` is left over from the dropped lazy approach

Commit `da3f17e` made the registry and service lazy, and the move to `managers` fit that design. The final commit `334e164` replaced it with eager registration in `app_pair`. `agent_registry.py` now imports `galaxy.agents.base` at module top, and that runs `galaxy/agents/__init__.py` and pulls in every agent plus pydantic-ai. As a result, `galaxy.managers.agent_registry` is just as heavy as `galaxy.agents.registry` was. The move gains nothing for import weight and makes the release-branch diff larger. It also adds the lazy import of `static_backend` to work around a cycle. Suggest keeping `galaxy.agents.registry` / `galaxy.agents.factory` in place. The `iwc`/`gtn` moves are the ones that matter. The other option is to finish the job and make the module genuinely light (base types under `TYPE_CHECKING`).

### P3 2: `buildapp.app_pair` reaches into `app._register_singleton` and wires `JobQueryManager` inline

`app_pair` now imports `AgentService`, `AgentRegistry`, `build_registry` and `managers.jobs.JobManager`. It then calls the app's private `_register_singleton` twice. Moving this wiring into a small `register_agent_services(app)` helper next to `AgentService` would keep the construction recipe with the service. `app_pair` would then make a single call that is easy to find. It also gives a reusable hook for any future non-`app_pair` web entry point. Today all of them (fast_factory, paste `app_factory`, the test driver via `build_galaxy_web_app`) go through `app_pair`, which I verified.

### P3 3: Explicit Sentry integration imports aren't guarded against `DidNotEnable`

Auto-enabling silently skipped integrations whose library was missing. `from sentry_sdk.integrations.fastapi import FastApiIntegration` raises `DidNotEnable("FastAPI is not installed")` when the library is absent, and the celery, starlette and sqlalchemy integrations behave the same way. `SentryClientMixin` lives in the `galaxy-app` package, which doesn't depend on fastapi (only `galaxy-web-apps` and `tool_shed` do). A `galaxy-app`-only install with `sentry_dsn` set would therefore fail at startup instead of running without that integration. Full Galaxy and Tool Shed installs aren't affected. A small loop that imports each integration and catches `DidNotEnable` keeps the old tolerance.

### P3 4: `test/unit/agents/test_iwc.py` now tests `galaxy.workflow.iwc`

The module moved, but its test file stayed under `test/unit/agents/`. `test/unit/workflows/` exists. Nit.

## Checked, no issue

- **Stale references / back-compat:** none left. `python -m galaxy.agents.gtn --refresh` never shipped: `lib/galaxy/agents/gtn/` is absent from `release_26.0`/`release_26.1` and tags up to `v26.1.1`, so no shim is needed. Config schema, sample and `galaxy_options.rst` were regenerated.
- **Packaging:** the `packages/app/src/galaxy/gtn` symlink is correct. `setuptools.packages.find` picks it up, and `galaxy.workflow`/`galaxy.managers` are already linked. `MANIFEST.in` has no gtn data entries to move, because the DB is downloaded. The mypy.ini sections were renamed correctly.
- **DI consumers:** only `api/agents.py` and `api/chat.py` resolve `AgentService`, and nothing resolves `AgentRegistry` from the app. No code path builds `UniverseApplication(is_webapp=True)` without `app_pair`. `scripts/galaxy_main.py` (handlers) never needed it.
- **Regression test:** `test_lazy_agent_imports.py` runs in a subprocess, so the result is clean regardless of what pytest has already imported. It checks `sys.modules`, which is the right signal. `galaxy.app` imports `galaxy.celery.tasks` transitively (verified), so both reported leaks are covered. The test costs about 12s for a cold `import galaxy.app`, but it should be stable. It isn't trivial and it guards against a real regression. The test has a minor quirk: it overwrites `PYTHONPATH` instead of prepending to it, which is harmless here.

## Risks

Mostly a two-way door. The one-way element is that `galaxy.gtn` (including the admin `python -m galaxy.gtn --refresh` command) and `galaxy.workflow.iwc` become the published module paths once 26.2 ships.

<details><summary>Risk Details</summary>

- Module paths `galaxy.gtn`, `galaxy.workflow.iwc` and `galaxy.managers.agent_registry` become de facto public in 26.2. Admin docs reference `python -m galaxy.gtn`.
- Sentry instrumentation in production drops coverage for aiohttp, boto3, httpx, redis, tornado, MCP and AI spans. This is an operational change that is easy to revert.
- Agent registry construction now happens only in `app_pair`. Any future web entry point that bypasses `app_pair` would get unresolvable `AgentService` dependencies on the agent and chat routes.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the final module locations are the ones Galaxy wants to keep, especially `galaxy.managers.agent_registry` (see P3 1), since 26.2 will lock them in. Deployers running Sentry (usegalaxy.*) should confirm that losing ChatGXY/MCP tracing is acceptable, or take P2 1.

</details>
