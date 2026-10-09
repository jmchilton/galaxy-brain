# gxui package move — implementation handoff

**Integrated 2026-10-09** into `galaxy_ui_driver` (gxui tip `ce968bc19f8`; helper lift and context-test
split below it as 7k/7l). Review fixes: login restore uses the new `ConfiguredDriver(storage_state=)`
(7m) instead of swapping the private browser context; the redaction test now reaches the failing
verb; daemon's old `--config`/`--storage-state` path and the `galaxy_test.selenium.gxui` shims
dropped (gxui never shipped); `import yaml` hoisted; isort.

2026-10-07. Requested parallel development while Claude tests `galaxy_ui_driver`.
Branch: `galaxy_ui_driver_followups`, worktree
`~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups`.

Started from `b70f93d5410`, then rebased only this worktree onto Claude's
`f561c00528d` snapshot, preserving the intervening rerun implementation and tests.
The testing worktree, standing branch, Galaxy server and loop sessions were not changed.

## Commits to integrate

| Commit | Change | Place in the standing stack |
|---|---|---|
| `4a39f042bb9` | Lift upload helpers into `galaxy.selenium`; put `workflow_run_wait_for_ok` on `NavigatesGalaxy` | Below the final gxui commit |
| `647d69a6255` | Move gxui implementation and console entry point into `galaxy-selenium` | Fold into the final gxui commit |
| `8d4434b6256` | Split core and test-framework context tests so the core package suite collects independently | Below the final gxui commit; reconcile with the upstream context-bootstrap revert when rebasing |

The branch tip is `8d4434b6256`. This is an integration branch, **do not open a
separate PR or polish it independently**. The standing branch remains owned by the
testing session. Use the standing branch's existing one-commit-per-Galaxy-change,
gxui-always-at-tip policy when incorporating these changes; no merge commit.

The three commits can be inspected or cherry-picked in the table's order from
`jmchilton/galaxy_ui_driver_followups`. If the testing session advances gxui again,
keep its newer behavior when resolving the move. The relocation was checked
against `f561c00528d`: the verb and daemon ASTs match that snapshot exactly.

## Dependency boundary

- Canonical upload module: `lib/galaxy/selenium/upload_activity_helpers.py`.
  The old `galaxy_test.selenium.upload_activity_helpers` explicitly re-exports
  the same public classes and types, so existing E2E imports and MROs keep working.
- `RunsWorkflows` stays in the test framework for its YAML fixture staging and
  test-populator methods. Its UI-only `workflow_run_wait_for_ok` is inherited
  from `NavigatesGalaxy` now. Moving the whole class would preserve the unwanted
  dependency on `galaxy_test`.
- Canonical gxui module: `lib/galaxy/selenium/gxui/`. `GxuiContext` combines the
  standalone Galaxy context and core upload mixin; it no longer inherits test
  populators or fixture-staging methods.
- `gxui = galaxy.selenium.gxui.client:main` belongs to
  `packages/selenium/pyproject.toml`; the entry point was removed from
  `packages/test_selenium/pyproject.toml`.
- The old `python -m galaxy_test.selenium.gxui.client` and daemon launchers
  delegate to core. The current loop launcher therefore remains usable after
  integration. Old `context`/`verbs` library imports should use the core namespace.
- The moved modules retain their previous typing baseline through scoped mypy
  entries. No runtime dependency was added to either package.

## Validation

- Checkout: **36 passed** for gxui, helper dependency checks, rerun parameter
  tests and legacy import/launcher checks. The separately relocated test-framework
  context test and compatibility tests: **3 passed**.
- Built and installed local selenium/navigation/util wheels with only declared
  runtime dependencies plus pytest into `/private/tmp/gxui-followups-env`.
  Verified `galaxy_test` is absent and the installed `gxui` entry point belongs
  to `galaxy-selenium`.
- Installed-wheel tests, with the package's `pythonpath=src` override disabled:
  **32 passed**, including real Chromium daemon, shared CDP page, browser restart,
  running-call recovery and standalone context tests.
- Full standalone selenium unit suite: **578 tests collect** without test-framework
  imports. The existing package config warns about `asyncio_mode` because the
  minimal environment has no pytest-asyncio; this does not affect the checks.
- Existing upload/workflow E2E classes: **103 tests collect**. Their live Galaxy
  execution remains with the testing session.
- mypy: **7 source files pass**. Repository commit hooks, including Black, Ruff
  and Flake8, pass; diffs have no whitespace errors.

Re-run the focused checkout checks with the existing shared Python:

```sh
cd ~/projects/worktrees/galaxy/branch/galaxy_ui_driver_followups
PYTHONPATH=lib ~/projects/worktrees/galaxy/branch/playwright_text_table_parity/.venv/bin/python -m pytest \
  test/unit/selenium/test_gxui.py test/unit/selenium/test_ui_helpers.py \
  test/unit/selenium/test_context.py test/unit/selenium/test_tool_form_parameters.py \
  test/unit/test_selenium_ui_compatibility.py test/unit/test_selenium_test_context.py
```

## Harness and skill follow-up

The active launcher and skill worktree were left unchanged during testing.
After integration, change `galaxy_ui_loop/bin/gxui` to invoke
`galaxy.selenium.gxui.client`, and update the source location in the harness and
galaxy-skills READMEs. The compatibility launcher makes this optional for execution,
but the documentation should point to the canonical package.
