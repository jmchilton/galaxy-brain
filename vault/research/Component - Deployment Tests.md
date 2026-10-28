---
type: research
subtype: component
tags:
  - research/component
  - galaxy/testing
  - galaxy/api
  - galaxy/client
component: Deployment Tests
galaxy_areas: [testing, api, client]
status: draft
created: 2026-10-26
revised: 2026-10-26
revision: 1
ai_generated: true
summary: "Running API and Selenium suites against usegalaxy servers via GALAXY_TEST_EXTERNAL, requirement markers, and a manual GH workflow"
sources: ["https://github.com/galaxyproject/galaxy/pull/15420"]
related_notes:
  - "[[Component - API Tests]]"
  - "[[Component - E2E Tests - Writing]]"
  - "[[Component - API Tests Tools]]"
  - "[[Component - Worktree Bootstrapping]]"
  - "[[Component - Tool Testing Infrastructure]]"
  - "[[Component - DRS Support]]"
related_prs: [15420, 15031, 18977, 20963, 21102, 22103, 18197]
---

# Deployment Tests

**Galaxy SHA**: `fd43a3c6ce806ea2fb773ab5939a4a7d744a3d07` (`origin/dev`, 2026-10-26). Every path and line number below comes from that blob.

## Overview

"Deployment tests" means running Galaxy's existing API and Selenium test suites against a Galaxy that is already deployed (usegalaxy.org, usegalaxy.eu, test.galaxyproject.org) instead of a server the test driver launches. The machinery came in with #15420 "Outline Deployment Tests" (merged 2023-01-27). It added:

- a manual GitHub Actions workflow;
- a bash runner;
- a `--skip-node` startup flag;
- `requires_celery`;
- requirement annotations on a set of API and Selenium tests.

The requirement-decorator system it builds on came from #15031 (2022-12-03).

**In scope**: the workflow and runner, the framework's external-server mode, the requirement decorators and their two skip layers, the populator capability skips that keep tests portable across tool panels, coverage numbers, a gap audit, and a local recipe.

**Out of scope**: general API test authoring ([[Component - API Tests]]), E2E authoring ([[Component - E2E Tests - Writing]]), tool XML tests and planemo, and `.ci/minikube-test-setup/deployment.yaml` (k8s, unrelated).

**Status**: the code is dormant. The workflow has had no functional change since 2023 apart from dropping the `branch` input in #18197, and the bash runner has never been modified. The GitHub API reports zero recorded runs, though old run records may simply have expired. The PR's goal of making this part of the release process was not reached.

## Pipeline

```
Actions tab (workflow_dispatch: target, type, debug)
  → .github/workflows/deployment.yaml   (uv, py3.10, chromedriver, secrets → env)
  → test/deployment/usegalaxystar.bash  (startup, target → URL/creds, pytest -m …)
  → scripts/common_startup.sh           (.venv, no client build)
  → pytest over 14 API + 7 Selenium files → deployment_tests.html artifact
  → GalaxyTestDriver sees GALAXY_TEST_EXTERNAL → no server, all URLs remote
```

### Dispatch: `.github/workflows/deployment.yaml`

- The trigger is `workflow_dispatch` only. There is no schedule and no push or PR trigger.
- **Inputs**:
  - `target`: `usegalaxytest`, `usegalaxymain` (default) or `usegalaxyeu` (L5–13).
  - `type`: `all`, `api` or `selenium` (L14–22).
  - `debug`: boolean (L23–26).
- **Setup**: a single-cell matrix with `python-version: ['3.10']` (L33–35, vestigial). Then `astral-sh/setup-uv` with `.tool-versions` (L41–47), and `nanasess/setup-chromedriver` (L48). This is Selenium only; nothing installs Playwright browsers.
- **Env (L52–64)**:
  - `GALAXY_TEST_DEPLOYMENT_{TARGET,DEBUG,TEST_TYPE}` come from the inputs.
  - Each target gets `GALAXY_TEST_USEGALAXY{MAIN,TEST,EU}_USER_EMAIL`, hard-coded to one shared account, plus `_USER_PASSWORD` and `_USER_KEY` from the matching repo secrets.
  - `GALAXY_TEST_TIMEOUT_MULTIPLIER: 10`.
- **Output**: `deployment_tests.html` is uploaded with `if: always()` (L65–69).

### Runner: `test/deployment/usegalaxystar.bash`

The file has a single commit (`235ef39f169`) in its history.

| Lines | Behavior |
|---|---|
| L21 | `./scripts/common_startup.sh --skip-client-build --skip-node`. **`--skip-node` no longer exists** (see Bootstrap). |
| L24–29 | When debug is set, uses `-s -v`. The variable is unquoted in `[ ]`. |
| L31–52 | Maps the target to its URL and credentials. Any other target exits 1. |
| L53–58 | Exports `GALAXY_TEST_EXTERNAL`, `GALAXY_TEST_USER_API_KEY` and `GALAXY_TEST_USER_EMAIL`. The Selenium user email and password are set to the same account. |
| L60–84 | Hard-coded lists of 14 API test files and 7 Selenium test files. |
| L100–104 | `PYTEST_MARKER_EXPRESSION="not requires_admin and not requires_new_library and not requires_new_user and not requires_celery"`. The comment gives the reasons: avoid "an explosion of semi-permanent artifacts", and admin keys are disabled "for security/simplicity reasons". |
| L105–110 | `pytest --html deployment_tests.html -m "$EXPR" …` (requires `pytest-html`) |

The header comment (L3–14) is stale: it lists only the main and test targets, but EU is handled at L43–48.

**What the script does not set**:
- `GALAXY_CONFIG_MASTER_API_KEY`
- any `GALAXY_TEST_SKIP_IF_REQUIRES_*` variable
- `GALAXY_TEST_DRIVER_BACKEND`
- `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS`
- `GALAXY_TEST_SKIP_AXE`

### Bootstrap: `scripts/common_startup.sh`

- #15420 added `--skip-node` and `GALAXY_SKIP_NODE`, which wrapped the nodeenv install block.
- #20963 "Use nodejs-wheel to install node" (`b488cf26946`, 2025-09-29) deleted that block, and the flag went with it. The argument loop (L17–29) ignores unknown flags, so the runner's `--skip-node` is a silent no-op.
- `--skip-client-build` still works (L28).
- **Possible gap on release branches (inferred from the code, not run)**:
  - `DEV_WHEELS` is decided by branch name (L82–93): `release_*` and `master` leave it at 0.
  - `pytest`, `pytest-html`, `selenium` and `playwright` are listed only in `lib/galaxy/dependencies/dev-requirements.txt`, which is installed only when `DEV_WHEELS=1`.
  - So a run dispatched from a release branch would have no pytest installed. That is the branch a release-process run would naturally use.
  - The fix would be for the runner to pass `--dev-wheels` (L24).

## External-server mode

### Two ways the framework skips starting a server

| Path | Trigger | Code |
|---|---|---|
| A: no driver | `GALAXY_TEST_ENVIRONMENT_CONFIGURED` | `real_driver` yields `None` (`lib/galaxy_test/conftest.py:25–35`, `lib/galaxy_test/selenium/conftest.py:8–20`, also `workflow/conftest.py:20`, `test/functional/conftest.py:17`, `lib/tool_shed/test/conftest.py:10`). Its only setter is `_load_config_file()` (`selenium/framework.py:135`), when `GALAXY_TEST_END_TO_END_CONFIG` is set. |
| B: driver, no server | `GALAXY_TEST_EXTERNAL` | `GalaxyTestDriver._configure` reads the variable (`driver_util.py:1146`). `_register_and_run_servers` launches a server only `if self.external_galaxy is None` (L1197–1248). Otherwise it logs and calls `ensure_test_file_dir_set()` (L1249–1252). |

The deployment runner uses path B. `env.target_url_parts()` (`base/env.py:26–34`) lets `GALAXY_TEST_EXTERNAL` override the host and port. `testcase.host_port_and_url()` (`testcase.py:19–26`) prefers `server_wrappers[0]`, but that list is empty in external mode, so the env URL is used. `api/conftest.py:46–61` follows the same path.

### Credentials

- **User key**: `get_user_api_key()` returns `GALAXY_TEST_USER_API_KEY` (`api_util.py:31–37`). `GalaxyInteractorApi._get_user_key` uses that key directly. Only when no key is set does it call `ensure_user_with_email`, which needs the admin key (`tool_util/verify/interactor.py:366–374`, `1304–1329`).
- **Admin key**: `get_admin_api_key()` checks `GALAXY_CONFIG_MASTER_API_KEY`, then `GALAXY_CONFIG_OVERRIDE_MASTER_API_KEY`, and **falls back to the literal `"TEST123"`** (`api_util.py:6, 18–28`). The runner sets neither variable, so every `admin=True` request sent to production carries `key=TEST123`.
- **Behavior skipped in external mode**:
  - `UsesApiTestCaseMixin.tearDown` kills running jobs only on managed instances (`base/api.py:101–110`).
  - Celery fork-pool shutdown is skipped (`base/api.py:64–74`, `api/conftest.py:84–93`).
- **`test_http_server` fixture**: with `GALAXY_TEST_EXTERNAL` set it yields `TestHttpServer(is_remote=True)`, so tests use real external URLs and skip when the site is down (`galaxy/util/unittest_utils/test_http_server.py:340–350`). This came from #22103 (2026-03), the most recent change written with external mode in mind.

### Selenium side (`lib/galaxy_test/selenium/framework.py`)

Environment variables read at module level (L141–175):

| Env var | Effect |
|---|---|
| `GALAXY_TEST_TIMEOUT_MULTIPLIER` (L149) | **Read only here**, so the workflow's `10` stretches browser waits but not API `wait_on` timeouts. |
| `GALAXY_TEST_DRIVER_BACKEND` (L153) | Defaults to `selenium`. The deployment job does not set it. |
| `GALAXY_TEST_EXTERNAL_FROM_SELENIUM` (L164) | Browser-facing URL, when it differs from the API URL (L469–476). |
| `GALAXY_TEST_SELENIUM_USER_EMAIL` / `_PASSWORD` (L168–169) | `login()` (L579–591) logs in as this user if it is set; otherwise it **`register()`s a new user**. |
| `GALAXY_TEST_SELENIUM_ADMIN_USER_*` (L170–173) | `admin_login()` calls `using_requirement("admin")` first (L633–639). |
| `GALAXY_TEST_SKIP_AXE` (L174) | Turns off the axe accessibility baseline that `@selenium_test` runs after every test (L339). |

- `managed_history` (L242–262) wraps the test in `requires_new_history`, creates a history named with a timestamp, and deletes it afterwards. That is why 225 collected Selenium tests carry the marker even though only one Selenium test file uses the literal `@requires_new_history`.
- Selenium populators (`SeleniumSessionGetPostMixin`, L1615–1668) authenticate with browser cookies for normal calls and with `?key=<admin key>` for `admin=True` calls.
- **Doc/code drift**:
  - `run_tests.sh:96` and `doc/source/dev/writing_tests.md:1604` say the E2E YAML key `local_galaxy_url` maps to `GALAXY_TEST_SELENIUM_URL`. The code maps it to `GALAXY_TEST_EXTERNAL` (`framework.py:121`), and nothing reads `GALAXY_TEST_SELENIUM_URL`.
  - `GALAXY_TEST_SELENIUM_ADMIN_API_KEY` (L124) is set but never read.
  - `GALAXY_TEST_STRICT_CHECKS` (`driver_util.py:1148`) is set but never read.

## Requirement annotations (`lib/galaxy_test/base/decorators.py`)

The module docstring (L1–10) says tests are expected to create jobs, workflows and datasets freely, but tests creating "new published objects, histories, libraries, etc..." should be annotated.

`KnownRequirementT` (L21–28) is `admin | celery | new_history | new_library | new_published_objects | new_user`. There is no `requires_database` at this SHA.

| Symbol | Lines | Effect |
|---|---|---|
| `using_requirement(tag)` | L41–49 | Runtime check: raises `unittest.SkipTest` if `GALAXY_TEST_SKIP_IF_REQUIRES_<TAG>` is set to anything other than `"0"` |
| `_attach_requirements` | L52–57 | Appends the tag to `__required_galaxy_features` and applies `pytest.mark.requires_<tag>` |
| `_wrap_method_with_galaxy_requirement` | L60–68 | Adds the marker, plus a wrapper that calls `using_requirement` at call time |
| `requires_tool_id(tool_id)` | L71–76 | Marker only, and not in `__all__`. It is consumed by the `check_required_tools` / `required_tool(s)` fixtures (`api/conftest.py:152–176`). Added in #18977. |
| `requires_new_history` | L79–80 | `new_history` |
| `requires_new_user` | L83–86 | `new_user` **and** `admin` |
| `requires_new_library` | L89–92 | `new_library` **and** `admin` |
| `requires_new_published_objects` | L95–96 | **Bug: there is no `return`**, so the decorated test becomes `None` and pytest silently drops it. It has zero uses. |
| `requires_admin` | L99–100 | `admin` |
| `requires_celery` | L103–104 | `celery`. This is the only decorator #15420 added. |

- **Registration**: the markers are registered in `pytest.ini:18–25`.
- **Unit tests**: `test/unit/test_base/test_decorators.py` covers markers, the admin env skip, and the rule that new_user and new_library imply admin. Nothing covers `requires_new_published_objects`, which is how the missing `return` went unnoticed.

### Two skip layers, only one used

1. **Static**: `pytest -m "not requires_…"` deselects tests by their decorator markers. This is the only layer the runner uses.
2. **Runtime**: `using_requirement(tag)` calls inside populators skip a test when the matching `GALAXY_TEST_SKIP_IF_REQUIRES_*` variable is set. These calls catch tests that reach a capability without carrying the decorator.
   - **`admin` call sites**: dynamic tools (`populators.py:1080–1101`), `get_roles` L1624, `get_configuration(admin=True)` L1631, `create_role`/`create_group` L1712/L1726, quotas L1766/L1772, `make_private` L1778, library creation and permissions L3676/L3691/L3780, and Selenium `admin_login`.
   - **Other tags**: `new_library` L3677/L3690; `new_history` L1842; `new_published_objects` in `DatasetPopulator.make_public` L1809 and `WorkflowPopulator.make_public` L3500.
   - **Not hooked at all**:
     - `UsesApiTestCaseMixin._different_user()` (`base/api.py:155–182`). With a named user it goes through `ensure_user_with_email` and an admin-key `POST users/{id}/api_key` (L148–153).
     - Selenium `NavigatesGalaxy.register()` (`navigates_galaxy.py:1073`).

   The runner exports none of these variables, so a selected test that hits an admin-only helper **fails instead of skipping**. `run_tests.sh` help (L312–316) also leaves out `…_CELERY`.

### `requires_new_history` and the two `_test_history` implementations

`BaseDatasetPopulator.test_history_for(method)` (L1113–1118) sets `require_new = has_requirement(method, "new_history")`. What happens next depends on the populator class:

- **`DatasetPopulator`** (API tests) overrides `_test_history` (L2433–2443) and delegates to `GalaxyInteractorApi.test_history` (`interactor.py:624–644`):
  - With `require_new=False` and `GALAXY_TEST_HISTORY_ID` set, it reuses that history. This reuse is what the decorator protects against.
  - Exceptions are re-raised (L639–641).
  - Cleanup only cancels the history's jobs. **Histories are never deleted**, so deployment runs leave every API test history on the target server.
- **The base `_test_history`** (L1127–1142) is used by `SeleniumSessionDatasetPopulator` and `GiDatasetPopulator`:
  - It ignores `require_new`.
  - Its `except Exception:` runs cleanup **without re-raising**. Under `contextlib.contextmanager`, that swallows `AssertionError` and `SkipTest` raised inside the `with` block, so a failing test body passes.
  - The `raise` was dropped in `aeac8c6060c` (2022-11).
  - Affected call sites: Selenium `test_admin_app.py:218` and `test_upload_activity.py:119–120`. Neither file is in the deployment rotation, but the bug is real.

### Capability skips for tool panels, datatypes and external sites

These helpers keep suites portable across servers with different tool panels and datatypes. All are in `lib/galaxy_test/base/populators.py` unless noted:

- **Tools**: `skip_without_tool` (L214–229) probes `GET tools?in_panel=False`, then calls `check_missing_tool` (L322–329). That raises `SkipTest`, or `AssertionError` if `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS` is set.
- **Datatypes and plugins**: `skip_without_datatype` (L260–282), `skip_without_visualization_plugin` (L285–302).
- **Server config**: `skip_without_asgi` (L245–257), `skip_without_agents` (L232–242).
- **External sites**: `skip_if_site_down` plus pre-bound `skip_if_{github,dockstore,workflowhub,quay,galaxy_depot,toolshed}_down`, and `skip_on_network_error` (all in `galaxy/util/unittest_utils/__init__.py:57–115`).

Selenium `framework_tool_and_types = True` (`framework.py:411`) has effect only when the driver launches the server. Against usegalaxy.* the framework test tools don't exist, so a test that depends on them without `skip_without_tool` or `requires_tool_id` fails rather than skips.

## Coverage (dev @ fd43a3c6)

These counts come from `pytest --collect-only` on a `git archive` export with `GALAXY_TEST_EXTERNAL` set to a dummy URL; nothing was executed. Collected counts are higher than decorator counts because new_user and new_library imply admin, `managed_history` adds `new_history`, and parametrization multiplies items.

| | API (52 files) | Selenium (71 files) |
|---|---|---|
| collected items | 1864 | 551 |
| `-m requires_admin` | 175 | 24 |
| `@requires_new_user` / `_new_library` / `_new_history` | 53 / 69 / 68 | 2 / 6 / 225 |
| `@requires_celery` | 2 (`test_history_contents.py:1724,1747`) | 0 |
| `@requires_tool_id` collected | 144 | 0 |
| `@skip_without_tool` (grep) | 538 | 20 |
| kept by deployment marker expression | 1687 | 527 |

**The deployment selection itself** keeps **314 of 429** API tests and **22 of 24** Selenium tests:

- **Kept**: `test_workflow_extraction` (88/88), `test_histories` (71/78), `test_history_contents` (70/80), `test_dataset_collections` (48/51), and all of the Selenium list except 2 tests in `test_anon_history`.
- **Mostly filtered**: `test_users` keeps only 5 of 47.
- **Fully filtered**: `test_roles` (0/20), `test_folders` (0/9) and `test_folder_contents` (0/16) contribute nothing.

The Selenium list is well chosen. Every class uses `ensure_registered = True` plus `@managed_history`. The only tests that create users (`test_anon_history.py:30,37`) are `@requires_new_user` and get filtered out.

## Known gaps

1. **The runtime skip layer is off.** Exporting `GALAXY_TEST_SKIP_IF_REQUIRES_{ADMIN,NEW_USER,NEW_LIBRARY,NEW_PUBLISHED_OBJECTS,CELERY}=1` from the runner would turn admin-helper hits into skips instead of `TEST123` failures.
2. **18 selected API tests still need admin, by static triage (not run).** They switch to a named second user (`_different_user()`, `_setup_user`) or call `make_private`/`user_private_role_id`:
   - `test_workflow_extraction.py:1238,1267`
   - `test_dataset_collections.py:818`
   - `test_histories.py:227,263,278,722,1007,1025,1036,1047,1180`
   - `test_history_contents.py:504,517,1443`
   - `test_users.py:595`
   - `test_framework.py:58`
   - `test_drs.py:56`

   `_different_user(anon=True)` only swaps cookies and is safe.
3. **Selected tests publish on production.** `test_histories` L633, L648 and L661 call `make_public`. The decorator for this case is broken, and the marker expression doesn't name it anyway.
4. **Artifacts accumulate.** API test histories are never deleted, and the job kill in `tearDown` is skipped in external mode. Selenium `managed_history` does delete its history.
5. The runner still passes the removed `--skip-node`, and a run from a release branch probably has no pytest installed (see Bootstrap).
6. The timeout multiplier affects only Selenium waits. API waits against a slow production queue use the default timeouts.
7. **Backend drift.** The job runs Selenium with chromedriver, while CI has moved to Playwright as the primary backend and runs Selenium only weekly (`writing_tests.md:1616–1627`, see the `projects/playwright/` workspace).
8. **One shared account, three hard-coded targets.** There is no usegalaxy.org.au target. The target list is duplicated in the YAML choice list and the bash `if` chain.
9. **The test list is frozen at its 2023 contents.** Annotation work has continued across the suites, but the runner's file lists have not grown.

## Extension points

- **New target**: add a choice to the workflow (L10–13), an env triple (L55–63), and a bash `elif` (L31–52). Create the secrets `USEGALAXY<X>_USER_{PASSWORD,KEY}`.
- **New file in rotation**: append it to `api_tests` or `selenium_tests` (bash L60–84). First check what survives with `pytest --co -m "<expr>" <file>`.
- **New requirement class**:
  1. Extend `KnownRequirementT`.
  2. Add a wrapper via `_wrap_method_with_galaxy_requirement`, plus an `__all__` entry.
  3. Register the marker in `pytest.ini`.
  4. Add a `using_requirement` call in the relevant populator.
  5. Update the `run_tests.sh` help.
  6. Add a unit test in `test/unit/test_base/test_decorators.py`.
- **Make a test deployment-safe**: add the `@requires_*` decorators. Use `@requires_tool_id` or `@skip_without_tool` for tool dependencies, `skip_if_*_down` for external sites, and `_different_user(anon=True)` when the test only needs anonymity.

## Recipe: run against a server locally

```bash
./scripts/common_startup.sh --skip-client-build --dev-wheels
. .venv/bin/activate

export GALAXY_TEST_EXTERNAL=https://usegalaxy.org
export GALAXY_TEST_USER_API_KEY=<user api key>
export GALAXY_TEST_USER_EMAIL=<that user's email>
export GALAXY_TEST_SELENIUM_USER_EMAIL="$GALAXY_TEST_USER_EMAIL"
export GALAXY_TEST_SELENIUM_USER_PASSWORD=<password>
export GALAXY_TEST_TIMEOUT_MULTIPLIER=10

# beyond the CI script: turn runtime admin/publish hits into skips
export GALAXY_TEST_SKIP_IF_REQUIRES_ADMIN=1
export GALAXY_TEST_SKIP_IF_REQUIRES_NEW_USER=1
export GALAXY_TEST_SKIP_IF_REQUIRES_NEW_LIBRARY=1
export GALAXY_TEST_SKIP_IF_REQUIRES_NEW_PUBLISHED_OBJECTS=1
export GALAXY_TEST_SKIP_IF_REQUIRES_CELERY=1
# optional: GALAXY_TEST_DRIVER_BACKEND=playwright, GALAXY_TEST_SKIP_AXE=1

pytest -s -v --html deployment_tests.html \
  -m "not requires_admin and not requires_new_library and not requires_new_user and not requires_celery" \
  lib/galaxy_test/api/test_histories.py lib/galaxy_test/selenium/test_collection_builders.py
```

- **Caveat**: the skip variables do not cover `_different_user()` or `_setup_user()`. Deselect the 18 tests from Known gaps item 2 with `-k`.
- **Alternatives**:
  - Run the CI script directly with `GALAXY_TEST_DEPLOYMENT_{TARGET,DEBUG,TEST_TYPE}` and `GALAXY_TEST_USEGALAXY<X>_USER_{KEY,EMAIL,PASSWORD}` set.
  - Use the `run_tests.sh` flags `--external_url`, `--external_master_key` and `--external_user_key` (L452–463).
- **On your own server with an admin key**: export `GALAXY_CONFIG_MASTER_API_KEY` and drop the admin exclusions. The full suites then run, minus tool-panel skips. Set `GALAXY_TEST_REQUIRE_ALL_NEEDED_TOOLS=1` to turn missing-tool skips into failures.

## History

| Date | PR | Change |
|---|---|---|
| 2022-12-03 | #15031 | `decorators.py`: requirement tags, markers, `GALAXY_TEST_SKIP_IF_REQUIRES_*` |
| 2023-01-27 | **#15420** | Workflow, bash runner, `--skip-node`, `requires_celery`, API and Selenium annotations, `test_drs` URL fixes |
| 2024-05-21 | #18197 | Dropped the workflow's `branch` input |
| 2024-10-15 | #18977 | `requires_tool_id` marker and `required_tool(s)` fixtures |
| 2025-09-29 | #20963 | Node installed via nodejs-wheel, which removed `--skip-node` |
| 2025-10-27 | #21102 | Playwright backend and `GALAXY_TEST_END_TO_END_CONFIG` YAML |
| 2026-03-13 | #22103 | Mock HTTP server, with a real-URL fallback when `GALAXY_TEST_EXTERNAL` is set |

Everything else in the workflow's history is dependabot updates, runner churn, and the uv/`.tool-versions` migration.

## Notes

- The architecture topic doc `projects/architecture/topics/tests.md` (around L678) mentions deployment testing in a single sentence. This note is the deep version.
- Bugs worth filing upstream:
  - `requires_new_published_objects` has no `return`.
  - The base `_test_history` swallows exceptions.
  - The stale `--skip-node` flag, possibly together with the missing `--dev-wheels` for release branches.
  - The `local_galaxy_url` docs mapping.
