# PR 23357 — [26.1] Fix visualization plugin URLs when Galaxy is served under a URL prefix

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23357 |
| **Author** | ksuderman |
| **Base branch** | `release_26.1` |
| **Head reviewed** | `156a3f3a1b89ab4e24697ed44b98f635fc7c97ee` (merge-base `d372d708ecd825181bdc48027acc05721d29362c`) |
| **Size** | 4 files, +19 / −5 (1 commit) |
| **State** | OPEN, 0 comments; opened 2026-08-24 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23357` |
| **CI** | see [CI](#ci) below |
| **Verdict** | **Approve with comments.** The net behaviour change is right and the blast radius is about as small as it gets for a release branch: one string concat replaces one `url_for` call, plus a mock-config attribute. I have no correctness objection to the shipped code. My comments are that (a) the PR description's account of *why* the old code failed does not match what I can measure, and that matters because it changes how many other call sites are broken; (b) the one production line that can actually regress — the registry wiring — has no test; and (c) the patch inlines a normalization of `galaxy_url_prefix` that is now the first such consumer outside `fast_app.py` and will get copy-pasted. None of these block merge on a release branch. |

---

## What it does

`VisualizationPlugin.to_dict()["href"]` was built with the legacy `galaxy.web.url_for`. The patch
drops that helper and prepends an explicit prefix instead.

- `lib/galaxy/visualization/plugins/plugin.py:18` — constructor gains `url_prefix: str = ""`, stored
  at `:22`.
- `lib/galaxy/visualization/plugins/plugin.py:34` — `"href": self.url_prefix + self.static_path`,
  replacing `url_for(self.static_path)`. The `from galaxy.web import url_for` import is removed.
- `lib/galaxy/visualization/plugins/registry.py:142-144` — `_load_plugin` dereferences the weakref
  and passes `app.config.galaxy_url_prefix.rstrip("/")`.
- `lib/galaxy/app_unittest_utils/galaxy_mock.py:301` — `MockAppConfig.galaxy_url_prefix = "/"`.
- `test/unit/app/visualizations/plugins/test_VisualizationPlugin.py:26-37` — two new tests plus one
  new assertion on the existing `test_default_init`.

**Does it fix the reported problem?** For a deployment that sets `galaxy_url_prefix: /galaxy`, yes.
`"/".rstrip("/")` is `""` so the default is a no-op, `"/galaxy"` and `"/galaxy/"` both normalize to
`"/galaxy"`, and `client/src/components/Visualizations/VisualizationFrame.vue:35` consumes
`plugin.href` **raw** — no `withPrefix`, no `absPath` — so the server is the right place to fix it and
there is no double-prefix hazard on the client. I checked every in-tree consumer of the field
(`client/src/api/plugins.ts:28` types it; `VisualizationFrame.vue:35,55,66` is the only reader) and
none of the in-tree visualization plugins under `config/plugins/visualizations/` touch
`visualization_plugin.href` — they only use `logo` (`example/static/script.js:12`).

**Imports.** Module-level throughout; the patch removes an import and adds none. Nothing buried in a
function.

---

## Findings

### P2-1 — The stated mechanism is not what I can measure, and the difference changes the follow-up scope

The PR body says `url_for` "does not apply `galaxy_url_prefix` when Galaxy runs as an **ASGI** app",
so "the static plugin URLs were therefore generated without the prefix and returned 404s."

I cannot reproduce that. `galaxy.web.url_for` is `handle_url_for`
(`lib/galaxy/web/framework/__init__.py:10-22`), which returns either `routes.url_for(...)` or, on
`AttributeError`, the literal string `"*deprecated attribute, URL not filled in by server*"`. Both
of those are wrong in a prefixed deployment, but neither is "an unprefixed `/static/...` path", and
which one you get is thread-dependent:

- `routes`' request config is a `threading.local` (`routes/__init__.py:12`, `_RequestConfig.__shared_state`).
- `fix_url_for` (`lib/galaxy/webapps/galaxy/api/__init__.py:374-380`) populates it during `get_trans`
  from `GalaxyASGIRequest.environ` (`:292-301`), which is `a2wsgi.wsgi.build_environ(scope, None)`.
  That sets `SCRIPT_NAME = scope["root_path"]`, which under the prefix mount at
  `lib/galaxy/webapps/galaxy/fast_app.py:330-332` is `/galaxy`.
- `routes.url_for("/static/...")` prepends `SCRIPT_NAME`.

Measured (see [Verification](#verification)):

```
same-thread : '/galaxy/static/plugins/visualizations/myvis/static'   # correct!
other-thread: '*deprecated attribute, URL not filled in by server*'
```

`get_trans` and both `/api/plugins` handlers (`lib/galaxy/webapps/galaxy/api/plugins.py:321` `index`,
`:343` `show`) are sync `def`s, so FastAPI dispatches each through a *separate* `run_in_threadpool`
call and they are not guaranteed the same anyio worker.

Why this is worth correcting rather than a pedantic quibble: if the real symptom is the sentinel
string, then the bug is **not prefix-specific** — unprefixed ASGI deployments hit it too — and every
sibling `url_for` reachable from a FastAPI endpoint is equally exposed (see P2-3), including
`dictionary["url"]` fourteen lines above the `to_dict()` this PR fixes, in the same response payload.

**Suggested:** ask the reporter what `href` value they actually observed. "404 on
`/static/plugins/...`" and "`*deprecated attribute, URL not filled in by server*`" are different bugs
with different follow-up scope. Then reword the description. The shipped fix is correct either way —
removing `url_for` from this path makes it deterministic — so this is a description defect, not a code
defect.

*(Honest caveat: I did not run a live prefixed Galaxy. The thread split above is a standalone probe,
and "FastAPI lands them on different workers in production" is a read of the framework, not a
measurement.)*

### P2-2 — The only production line that can regress is untested; one of the three new assertions is not red-to-green

All three new assertions construct `VisualizationPlugin` directly
(`test/unit/app/visualizations/plugins/test_VisualizationPlugin.py:22,30,36`). Nothing goes through
`VisualizationsRegistry`, so `registry.py:142-143` — the wiring that reads
`app.config.galaxy_url_prefix`, the only line where a typo or a config rename would break this — has
no coverage.

Separately, `test_href_without_url_prefix` (`:28-32`) passes with **or** without the patch.
`VisualizationsBase_TestCase.setUpClass` calls `routes.Mapper()`
(`test/unit/app/visualizations/plugins/__init__.py:9`), and in that context the pre-fix
`url_for("/static/plugins/visualizations/myvis/static")` returns exactly
`/static/plugins/visualizations/myvis/static` — I ran it. Only `test_href_with_url_prefix` (`:34-37`)
is genuinely red-to-green, and it only fails because of the new kwarg.

Also, the PR body's "`MockAppConfig` gains a `galaxy_url_prefix` attribute so unit tests exercise the
same code path" is not what the change does. `MockAppConfig.__getattr__`
(`lib/galaxy/app_unittest_utils/galaxy_mock.py:306-312`) raises `AttributeError` for unknown names, so
without `:301` the *existing* `TestVisualizationsRegistry` tests would error on `registry.py:143`. The
attribute is a necessary regression fix, not new coverage.

**Suggested fix** — one test in the file that already has the scaffolding
(`test_VisualizationsRegistry.py:67-75`):

```python
def test_plugin_href_uses_url_prefix(self):
    mock_app = cast("StructuredApp", galaxy_mock.MockApp(root=glx_dir))
    mock_app.config.galaxy_url_prefix = "/galaxy"
    plugin_mgr = VisualizationsRegistry(mock_app, directories_setting=vis_reg_path)
    assert plugin_mgr.plugins["example"].to_dict()["href"] == "/galaxy/static/plugins/visualizations/example/static"
```

That is the assertion that would have caught the bug in the first place, and it is the one that will
catch it coming back.

### P2-3 — Sibling call sites with the same defect that this PR does not fix

A prefix fix at one `href` strongly suggests sites 2..N. Concretely, in FastAPI-reachable
serialization code:

- **`lib/galaxy/webapps/galaxy/services/visualizations.py:128`** — the same `show()` method. Line 128
  builds `dictionary["url"]` with the identical legacy `url_for`; line 142 assigns
  `dictionary["plugin"] = visualization_plugin.to_dict()`, i.e. the field this PR fixes. One response,
  two URL fields, one of them fixed. There is already a standing TODO on **line 127**:
  `# replace with trans.url_builder if possible`.
- **`lib/galaxy/managers/workflows.py:1420`** — `module.get_tooltip(static_path="/static")`, a
  hardcoded unprefixed static root. `lib/galaxy/workflow/modules.py:2452` runs it through
  `self.trans.url_builder(static_path)`, and `UrlBuilder` cannot resolve a raw path as a named route,
  so it falls through to legacy `web.url_for` at `api/__init__.py:230-234` — same failure mode. Tool
  help images in workflow step tooltips are the same bug.
- **`lib/galaxy/tools/__init__.py:3037`** and **`:3123`** — `static_path=self.app.url_for("/static")`.
- Other API `url` fields built the same way: `services/roles.py:23`, `services/workflows.py:97`,
  `services/tool_shed_repositories.py:70`, `services/datasets.py:705`, `managers/hdcas.py:349`.

I am **not** asking for any of these on a release branch — the current scope is correct for 26.1. But
the PR should say it fixes one of several, and `services/visualizations.py:128` in particular deserves
a tracking issue, because an admin who applies this patch will still see a broken `url` in the very
same JSON body and reasonably conclude the fix did not work.

### P2-4 — First server-side consumer of `galaxy_url_prefix`, with its normalization inlined

Before this patch, `config.galaxy_url_prefix` had exactly two readers, both in
`lib/galaxy/webapps/galaxy/fast_app.py` (`:300`, `:330-332`), plus a topology check in
`lib/galaxy_test/driver/driver_util.py:899`. `registry.py:143` makes it three, and inlines
`.rstrip("/")` at the call site.

The codebase's established answer for "URL in an API response" is `trans.url_builder`
(`lib/galaxy/managers/context.py:88`; `UrlBuilder` at `lib/galaxy/webapps/galaxy/api/__init__.py:211-257`;
`SerializerBase.url_for` at `lib/galaxy/managers/base.py:657-660`). I checked whether that fits here
and **it does not** — `UrlBuilder._url_path_for` resolves *named routes* against
`app.state.route_name_index`, and a raw `/static/plugins/...` path is not a route name, so it would
`NoMatchFound` straight into the legacy `web.url_for` fallback and reintroduce P2-1. So I am not asking
for that swap, and threading `trans` into `to_dict()` would be too invasive for 26.1 anyway (though
`trans` *is* available at all four callers: `registry.get_visualizations`, `registry.get_visualization`,
`services/visualizations.py:142`, `api/plugins.py:375`).

What I would ask for is that the normalization live in one place, so the next static-asset call site
inherits it instead of copy-pasting `.rstrip("/")`:

```python
# GalaxyAppConfiguration
@property
def url_prefix_path(self) -> str:
    """Prefix suitable for prepending to a root-relative path; '' when unprefixed."""
    prefix = self.galaxy_url_prefix
    return "" if prefix == "/" else "/" + prefix.strip("/")
```

…then `fast_app.py:300` and `registry.py:143` both read it. Still a small, release-safe change, and it
gives the P2-3 follow-ups a single hook.

**Related consistency note.** After this patch the `href` field is server-prefixed while its sibling
`logo` field in the same dict is not: `plugin.py:52` sets `config["logo"] = "./static/plugins/..."`,
and the client fixes it up with `absPath()` (`VisualizationHeader.vue:16`) or the plugin does
`root + visualization_plugin.logo` (`config/plugins/visualizations/example/static/script.js:12`). Two
conventions in one payload. Not worth churning on a release branch, but worth deciding on `dev`.

### P3-1 — Dead branch and an unnecessary weakref dereference

`registry.py:142-143`:

```python
app = self.app()
url_prefix = app.config.galaxy_url_prefix.rstrip("/") if app is not None else ""
```

The `is not None` guard is *type*-correct — `self.app` is `weakref.ref(app)` (`:57`) so `self.app()` is
`Optional[StructuredApp]` and mypy demands it. But the branch is unreachable at runtime:
`_load_plugin` is called only from `_load_plugins` (`:73`), which is called only from `__init__`
(`:64`), while the constructing caller still holds a strong reference to `app`. So the patch pays for
a weakref deref plus a dead fallback, per plugin, to read a value the constructor already had in hand
— `__init__` reads `app.config.root` directly at `:62-63` from the strong reference two lines earlier.

**Suggested:** compute once in `__init__`, next to `self.directories`:

```python
self.url_prefix = app.config.galaxy_url_prefix.rstrip("/")
```

…and pass `self.url_prefix` at `:144`. One fewer branch, one fewer deref, and the prefix is computed
once instead of once per plugin.

### P3-2 — No normalization of a missing leading slash

`galaxy_url_prefix` is documented as a free-form `str` with default `/`
(`lib/galaxy/config/schemas/config_schema.yml:1789-1795`) and nothing requires a leading slash. With
`galaxy_url_prefix: galaxy`, `.rstrip("/")` yields `"galaxy"` and `href` becomes
`galaxy/static/plugins/...` — a *relative* URL, which resolves differently depending on the current
route. `fast_app.py:300` only compares against `"/"`, so this is arguably already broken upstream, but
the derived property in P2-4 is the natural place to fix it (`"/" + prefix.strip("/")`).

### P3-3 — Optional: precompute the href path

`to_dict()` re-concatenates `self.url_prefix + self.static_path` on every call. Since both are fixed
at construction, a `self.href_path` computed in `__init__` would be marginally cleaner. Note that
`static_path` itself cannot simply be prefixed, because `_set_logo` (`plugin.py:50`) reuses it as a
*filesystem* path via `f".{self.static_path}"` — worth a comment, since the dual meaning of that
attribute is exactly the kind of thing that makes the next person prefix the wrong one.

---

## Act before merge

1. **P2-2** — add the registry-level test. It is ~5 lines in a file that already has the fixtures, and
   it is the only test that covers the line that can actually break.
2. **P2-1 / P2-2** — correct the PR description: the `url_for` failure mode, and the claim that the
   `MockAppConfig` change adds coverage.
3. **P2-3** — state in the description that this fixes one of several affected sites, so nobody reads a
   still-broken `dictionary["url"]` as this patch failing.

Everything else (P2-4, all P3s) is fine to defer.

## Follow-ups, not this PR

- `services/visualizations.py:128` — the sibling `url` field in the same response, with its own TODO
  already on line 127. Best fixed on `dev`.
- `managers/workflows.py:1420` hardcoded `/static` for tool tooltips.
- The `url_prefix_path` derived config property (P2-4), and migrating `fast_app.py` to it.
- Decide whether `logo` should be server-prefixed too, so the payload is internally consistent.
- The broader question behind P2-1: whether the legacy `url_for` thread-local should be considered
  usable at all from FastAPI handlers, or whether the remaining call sites should be migrated
  wholesale.

---

## CI

Red, but **none of it is attributable to this PR.** The diff touches only visualization plugin `href`
construction; no failing test exercises visualizations. Logs were still available
(`gh api repos/galaxyproject/galaxy/actions/jobs/<id>/logs --allow-escape-sequences`).

| Check | Failure | Attribution |
|---|---|---|
| `Integration` (3.10, shards 0–3) | Failing **step is `Setup Minikube`**, not "Run tests": `medyagh/setup-minikube@latest` → `sudo` exit 1 on `minikube version --short` | **Infra.** Identical four-shard failure at the same step on `release_26.1` itself (run 32143107654, 2026-08-18); Integration has been red on the base branch for 6 consecutive runs back to 2026-08-07. There is a concurrent `backport-minikube-cni-25-1` branch fixing it. |
| `API tests` (3.10, 1) | `test_workflows.py::TestWorkflowsApi::test_export_invocation_bco` — 502, `jsonschema Unresolvable: provenance_domain.json` | **Pre-existing, repo-wide.** Fails on the base commit's own run (32748425944, merge `c268be0d`, sole failure) and on `release_26.0`, `release_25.1`, and ~8 unrelated feature branches. External schema fetch is broken. |
| `API tests` (3.10, 1) | `test_workflow_with_deleted_dataset_step_parameter` — `400008 Attempting to modify the state of a completed workflow invocation`; server log shows `Failed to schedule WorkflowInvocation[id=118] … reason=step_input_deleted` immediately prior | **Scheduling race.** Unrelated to the diff. |
| `Selenium tests` (3.10, 2) | `test_history_pages.py::TestHistoryPages::test_revision_diff_view` — `AssertionError` | **Known flake.** Byte-identical failure on unrelated branch `fix-gcp-batch-network-subnet` (run 32735891917) the same day. |
| `Playwright tests` (3.10, 0) | `test_tool_discovery_view.py::…::test_tool_discovery_help_toggle_shows_and_hides` — Timeout waiting on the tool-panel help toggle selector | **Flake.** Playwright is red on 7+ unrelated branches today, each with a *different* timeout. Tool panel, no visualization involvement. |
| `Toolshed tests` (3.14, galaxy_api) | `test_1040_install_repository_basic_circular_dependencies` — three `assert None` failures on reactivate/uninstall/deactivate | **Suite-wide flake.** Same suite failing on `release_25.1` (32747638561) and `backport-minikube-cni-25-1` (32735778807). Separate app, no visualization registry. |
| `CWL conformance` | skipped | n/a |

Unit tests — the layer this PR actually changes — passed in CI, matching my local run.

---

## Verification

**No `.venv` in this worktree.** Rather than bootstrap one, I borrowed the venv from the
`pr/22781` worktree (`/Users/jxc755/projects/worktrees/galaxy/pr/22781/.venv`, Python 3.12) and ran
against this branch's sources via `PYTHONPATH=<23357>/lib:<23357>/test`. **Caveat:** the installed
package versions are 22781's, not necessarily this branch's pinned set. Nothing was written into the
23357 worktree; `git status --porcelain` there is clean and HEAD is still `156a3f3a1b`.

**Ran empirically:**

- `pytest test/unit/app/visualizations/ -q` at head → **6 passed, 6 warnings in 30.13s**. That is the
  whole directory (`test_VisualizationPlugin.py` + `test_VisualizationsRegistry.py`), i.e. the three
  new assertions plus the four pre-existing tests.
- Standalone `routes` probe: with a `request_config` carrying `SCRIPT_NAME=/galaxy`,
  `routes.url_for("/static/plugins/visualizations/foo/static")` returns
  `/galaxy/static/plugins/visualizations/foo/static`. So `routes` *does* honour the prefix.
- `a2wsgi.wsgi.build_environ` source read (`:90-117`) — `SCRIPT_NAME = scope.get("root_path", "")` —
  and confirmed by probe: constructing a `GalaxyASGIRequest` over a scope with `root_path="/galaxy"`
  gives `environ["SCRIPT_NAME"] == "/galaxy"`.
- The thread split in P2-1: `fix_url_for` + `url_for` on the same thread → the correctly prefixed
  path; `url_for` on a different thread → `*deprecated attribute, URL not filled in by server*`.
  Confirmed `routes._RequestConfig.__shared_state` is a `threading.local`.
- Pre-fix behaviour in the unit-test context: `url_for("/static/plugins/visualizations/myvis/static")`
  after `routes.Mapper()` returns the unprefixed path — which is what makes
  `test_href_without_url_prefix` not red-to-green.

**Reasoned statically, not run:**

- No live Galaxy was started, prefixed or otherwise. I have not observed the reported 404.
- That FastAPI actually lands `get_trans` and the endpoint body on *different* anyio workers under
  production load — that is a read of `run_in_threadpool` dispatch, not a measurement.
- All client-side claims (`VisualizationFrame.vue`, `redirect.ts`, `api/plugins.ts`) are source reads;
  no browser and no client test run.
- Whether out-of-tree / shed-published visualization plugins consume `visualization_plugin.href` from
  the iframe's `data-incoming` payload. The in-tree ones do not; I did not survey published packages.
- The sibling-defect list in P2-3 is grep + source read. I confirmed each cited line exists and reads
  as described, but did not exercise any of those endpoints under a prefix.
