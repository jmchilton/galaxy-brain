# PR 23225 — Cover interactive tools on the native Kubernetes runner, and type-check it

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23225 |
| **Author** | mvdbeek (Marius van den Beek) |
| **Base branch** | `dev` |
| **Head reviewed** | `55d06e0d5a58fcef2a6c6dcc2c63ee8c8732db9c` (merge-base `bbc8ad66e7`) |
| **Size** | 5 files, +120 / -9 |
| **State** | OPEN, 0 reviews, 1 comment at time of writing; opened 2026-07-31 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23225` |
| **Verdict** | **Approve.** Every load-bearing claim in the PR description checks out, and the central one — that the new test actually executes in CI rather than being skipped like its predecessor — I confirmed from the CI log, not from the description. Nothing was weakened: no `type: ignore`, no `cast`, no assertion removed, no test data bent. Comments are one under-tested silent bug fix (P2-1), one duplicated setup block that wants a mixin (P2-2), and assertion/reuse polish. None blocks merge. |

---

## What it does

Five commits, in order:

1. `d16e8ac94b` — drop the stale `# sending in self.app as trans` comment left by #23203's fix (`kubernetes.py:604`).
2. `337a035fb5` — split `AbstractTestCases.BaseInteractiveToolsIntegrationTestCase` into a test-free `BaseInteractiveToolsTestCase` + a test-bearing subclass, add `TestKubernetesNativeInteractiveToolsIntegration`, parameterise `test_kubernetes_runner.job_config()`'s PVC names.
3. `aa757358d6` — `k8s_timeout_seconds_job_deletion=dict(map=int, valid=lambda x: int > 0, ...)` → `int(x) > 0` (`kubernetes.py:112`).
4. `2707b82ffa` — `create_entry_points()`'s type expression was its default value, not its annotation (`interactivetool.py:172-177`).
5. `55d06e0d5a` — remove `[mypy-galaxy.jobs.runners.kubernetes] check_untyped_defs = False` from `mypy.ini`.

---

## The description's claims — all four hold

This is the whole justification for the PR, so I checked each rather than reading past them.

**"`TestKubeInteractiveToolsRemoteProxyIntegration`'s job config loads `PulsarKubernetesJobRunner`."** True. It calls `job_config(CONTAINERIZED_TEMPLATE, cls.jobs_directory)` (`test_interactivetools_api.py:237`), and `CONTAINERIZED_TEMPLATE` (`test_coexecution.py:52-55`) declares exactly one non-local runner:

```yaml
  pulsar_k8s:
    load: galaxy.jobs.runners.pulsar:PulsarKubernetesJobRunner
```

with `default: pulsar_k8s_environment`. `runners/kubernetes.py` is never loaded by that class.

**"It is skipped in CI by `@skip_if_github_workflow()`."** True — `test_interactivetools_api.py:204`, and `integration_util.skip_if_github_workflow` (`lib/galaxy_test/driver/integration_util.py:162-166`) returns `pytest.mark.skip` whenever `GITHUB_ACTIONS` is set. It also carries `@skip_unless_amqp()`.

**"`TestKubernetesIntegration` runs in CI but had no interactive tool coverage."** True. `.github/workflows/integration.yaml:139` runs `./run_tests.sh -integration test/integration -- --num-shards=4 --shard-id=${{ matrix.chunk }}` — the whole directory, so nothing needs registering — and `TestKubernetesIntegration` (`test_kubernetes_runner.py:170`) has no interactive-tool test. Its job config's default destination is `k8s_destination` → `KubernetesJobRunner`, which is what the new class inherits.

**"The runner sat on the `check_untyped_defs = False` list."** True, and the removal is meaningful rather than cosmetic. `mypy.ini`'s global section sets `check_untyped_defs = True`, and the section names in the file are exact module matches (`[mypy-galaxy.jobs.runners]` does not cover submodules — hence the fifteen individual `jobs.runners.*` entries). Both broken call sites live in *unannotated* methods — `__get_k8s_containers` (`kubernetes.py:545`) and, before #23203 annotated it, `__get_k8s_ingress_spec` (`:467`) — so their bodies really were invisible to mypy. The diff removes two lines from `mypy.ini` and adds none; 314 `check_untyped_defs = False` entries remain, one fewer than before, and nothing regressed onto the list.

**The bug being regression-tested.** `06e587c20c` (Nicola Soranzo, 2026-07-30, "Fix broken calls to `InteractiveToolManager` methods", fixing #23203, introduced by `aa13a63352`) changed four call sites from `get_entry_point_path(self.app, entry_point)` / `get_entry_point_subdomain(self.app, entry_point)` to the single-argument form. Both methods are annotated single-argument today (`interactivetool.py:339,343`). The new test exercises the surviving call sites at `kubernetes.py:475,485,605,615`, and a `TypeError` at any of them fails job submission — `wait_on_entry_points_active` raises on job state `error` (`test_interactivetools_api.py:96-97`), so the failure is caught rather than swallowed by the 120s timeout.

---

## Does the test actually run in CI?

**Yes — verified from the Integration log, executed and passing.** This was the question worth settling, since the PR's own argument is that the previous coverage only looked like coverage.

Integration run `30613529954` on head `55d06e0d5a`, job `Test (3.10, 0)`:

```
Running 309 items from 68 groups in shard 0: ...,
  integration.test_interactivetools_api::TestKubernetesNativeInteractiveToolsIntegration, ...
test/integration/test_interactivetools_api.py::TestKubernetesNativeInteractiveToolsIntegration::test_entry_point_and_ingress PASSED [ 48%]
```

The only guard on the class is `@skip_unless_kubernetes()` = `skip_unless_executable("kubectl")` (`integration_util.py:138-139`), which the minikube job satisfies. There is no `skip_if_github_workflow`, no `skip_unless_amqp`. All 27 workflow runs on this SHA are green (`Integration`, `Python linting` on 3.10 and 3.14, `Check test class names`, etc.); the two `skipped` entries are `CWL conformance` and `Test Galaxy packages for Pulsar`, both unrelated path filters.

One inherited skip condition that is *not* obviously right: `BaseInteractiveToolsTestCase` sets `container_type = "docker"`, and `ContainerizedIntegrationTestCase.setUpClass` runs `skip_if_container_type_unavailable(cls)` → `which("docker")` (`test_containerized_jobs.py:92-114`). For a native-k8s test the container runs *in the cluster*; a host docker binary is incidental. It happens to be present in the minikube CI job, so this is latent, but the docstring's "can run wherever a cluster is available" is not quite true — it needs a cluster *and* a host docker binary.

---

## P2 findings

### P2-1 — `k8s_timeout_seconds_job_deletion` is a real user-facing bug fixed with no regression test, and the test is nearly free

`lambda x: int > 0` compares the *type* `int` with `1`, which raises `TypeError: '>' not supported between instances of 'type' and 'int'`. I traced the reachability: `ParamsWithSpecs.__init__` (`lib/galaxy/util/__init__.py:1311-1321`) only runs the `valid` callable for params **explicitly present** in the job config —

```python
if "valid" in self.specs[name]:
    if not self.specs[name]["valid"](value):
```

— so the `default=30` path never touches it, which is exactly why this survived. Any deployment that sets `k8s_timeout_seconds_job_deletion` in its `job_conf` fails to construct the runner. That is a genuine bug, and the PR fixes it silently.

Two things worth saying:

- **The fix is correct and idiomatic.** Note line 1320 passes the *pre-`map`* `value`, not `self.params[name]` — the validator receives the raw string from the XML. So `int(x)` is load-bearing, not redundant, and it matches the surrounding convention (`BaseJobRunner.DEFAULT_SPECS` at `runners/__init__.py:103` is `lambda x: int(x) >= 0`; six other k8s specs use the same shape).
- **It should be covered, and it can be for one line.** The specs dict is built inline inside `KubernetesJobRunner.__init__` (`kubernetes.py:99-144`), not exposed as a class attribute, so there is no unit-test seam without `ensure_pykube()` and a live `pykube_client_from_dict`. But this PR is already editing the job-conf template that CI's `TestKubernetesIntegration` boots from. Adding

  ```xml
  <param id="k8s_timeout_seconds_job_deletion">30</param>
  ```

  to the `k8s` plugin block in `test_kubernetes_runner.py:106-112` makes a regressed validator fail Galaxy startup on every Integration run, at zero runtime cost. Given that the entire thesis of this PR is "the defect escaped because nothing exercised the code path", leaving the one defect that CI *can* cheaply catch uncovered is the gap I'd most want closed before merge.

The `create_entry_points()` annotation fix (commit 4) is the opposite case and I'd leave it alone: the sole caller (`interactivetool.py:238`) passes `entry_points` positionally, there is no unit test file for `InteractiveToolManager` anywhere in `test/unit`, and standing one up for a latent default-value slip is disproportionate. Worth stating in the PR body that it is deliberately untested rather than leaving it to inference.

### P2-2 — `handle_galaxy_config_kwds` / `tearDownClass` are a verbatim copy of `TestKubernetesIntegration`'s; this is the mixin the PR should leave behind

The new class's PV/PVC block (`test_interactivetools_api.py:261-293`) and `TestKubernetesIntegration`'s (`test_kubernetes_runner.py:181-217`) are identical except for the three volume/claim name strings:

```python
cls.persistent_volumes = []
cls.persistent_volume_claims = []
for path, volume, claim in volumes:
    volume_obj = persistent_volume(path, volume)
    volume_obj.setup()
    cls.persistent_volumes.append(volume_obj)
    claim_obj = persistent_volume_claim(volume, claim)
    claim_obj.setup()
    cls.persistent_volume_claims.append(claim_obj)
```

plus a byte-identical `tearDownClass`. Twenty lines, two copies, and the second copy is the one this PR adds.

`test_kubernetes_runner.py` is already the module that owns this vocabulary — it exports `KubeSetupConfigTuple`, `persistent_volume`, `persistent_volume_claim`, `job_config`, `TOOL_DIR`, and this PR imports all five. The natural shape is one more export beside them:

```python
class KubernetesVolumesMixin:
    """Creates a jobs-directory and tool-directory PV/PVC pair per test class."""
    claim_prefix = ""
    persistent_volumes: list[KubeSetupConfigTuple]
    persistent_volume_claims: list[KubeSetupConfigTuple]

    @classmethod
    def setup_persistent_volumes(cls, jobs_directory: str) -> tuple[str, str]: ...
    @classmethod
    def tearDownClass(cls) -> None: ...
```

That would also subsume the `job_config()` signature change: instead of two new keyword parameters (`jobs_directory_claim`, `tool_directory_claim`) threaded through a `string.Template`, one `claim_prefix` on the mixin would name both. Measured against the "does it leave behind a reusable abstraction or just accrete" bar, this is the one place the PR accretes. It is the third k8s integration test class in the tree and the second copy of this block; the fourth will be the third copy.

Related, smaller, same commit:

- **`KubernetesDatasetPopulator` is not reused.** `TestKubernetesIntegration` overrides `setUp` specifically to use it (`test_kubernetes_runner.py:156-167`), because it prints `kubectl describe nodes` when a history wait fails — precisely the diagnostic you want when a k8s integration test dies in CI. The new class inherits the base's plain `DatasetPopulator` (`test_interactivetools_api.py:58-60`). One-line override, real payoff on the first flake.
- **`ingress_for_tool` belongs next to `persistent_volume`, not on the test class.** As a `@staticmethod` on `TestKubernetesNativeInteractiveToolsIntegration` it is invisible to the next k8s test. `test_kubernetes_runner.py` already shells out to `kubectl get job … -o json` twice (`:249, :283`); with this, `json.loads(subprocess.check_output(["kubectl", "get", …, "-o", "json"]))` has three call sites and no helper. A `kubectl_get(kind, name=None)` in `test_kubernetes_runner.py` would collapse all three.

  On the shelling-out itself: **it is the right call, keep it.** `galaxy.jobs.runners.util.pykube_util` exposes `find_ingress_object_by_name` and `Ingress`, and `test_coexecution.py:28-31` does import from pykube_util in a test — so there is a typed alternative. But asserting through the same lookup helper the runner uses to *create* the object would be circular. `kubectl` is the independent observer. Worth a one-line comment saying so, since the pykube import is right there.
- Minor: the new call omits `unicodify()`, which both existing `kubectl` call sites use. `json.loads` accepts `bytes`, so it works; it just reads as inconsistent with the file it borrows from.

---

## P3 findings

### P3-1 — The ingress host assertion is weaker than it needs to be, and weak in the direction of the bug class

```python
assert rules[0]["host"].endswith(f".{KUBERNETES_PROXY_HOST}"), rules[0]["host"]
```

This passes for `foo.interactivetool.test.invalid` and equally for `.interactivetool.test.invalid` — an empty subdomain. The subdomain is produced by `get_entry_point_subdomain()`, one of the two methods whose signature drift caused #23203, so it is exactly the value most worth pinning. Signature drift is still caught (a `TypeError` fails submission), but a wrong *value* is not.

The stronger assertion is available for free and is a genuine cross-check rather than a restatement: the API's `target_if_active` (`interactivetool.py:320`) builds `f"{self.get_entry_point_subdomain(entry_point)}.{url_host}"` from the same manager call. The base class already exposes `entry_point_target(entry_point_id)` (`test_interactivetools_api.py:82-87`). So:

```python
target_host = urlparse(self.entry_point_target(entry_points[0]["id"])).hostname
assert rules[0]["host"] == target_host
```

asserts that what the runner wrote into the ingress and what the API hands the user are the same host — which is the actual invariant, and the one a user notices when it breaks.

### P3-2 — Only the `requires_domain=True` branch is reachable; the interesting half of `get_entry_point_path` stays uncovered

Both interactive-tool framework tools declare `requires_domain="True"`:

```
test/functional/tools/interactivetool_simple.xml:6
test/functional/tools/interactivetool_two_entry_points.xml:6,10
```

With `requires_domain` true, `get_entry_point_path` (`interactivetool.py:343-360`) returns `"/"` immediately and never reaches `_get_entry_point_url_elements`, and the runner forces `entry_point_path = "/"` anyway (`kubernetes.py:486`). So the test's `assert paths[0]["path"] == "/"` is asserting the trivial branch — and the path-routed branch, which is where `__get_k8s_ingress_rules_spec` (`:419`) and the `"?"`-stripping logic (`:476-484`) live, has no coverage on any runner.

The PR's own comment is honest about this ("`interactivetool_simple` declares `requires_domain`, so … the ingress path stays at the root"), and closing it needs a new `interactivetool_path_routed.xml` framework tool, which is out of scope here. Noting it as the obvious next increment, and as the reason this PR should be read as *first* coverage rather than *complete* coverage.

### P3-3 — Two assertions the test could add for near-zero cost

Both are inside what the docstring already scopes as "what the runner is responsible for":

- **The backend port.** `__get_k8s_ingress_rules_spec` maps `entry_point.tool_port` into the rule's backend service port. Nothing asserts it, so a port-plumbing regression produces a green test and a broken tool.
- **Ingress teardown.** The test already does `wait_for_job(job_id, assert_ok=True)` at the end; `__cleanup_k8s_ingress` / `__cleanup_k8s_service` (`kubernetes.py:907, 994-1002`) run on job completion. A trailing "no ingress remains for this tool" check covers the delete path — currently untested — and has the side benefit of leaving the cluster verifiably clean for the next class in the shard.

### P3-4 — The cleanup is only on the happy path, and `ingress_for_tool` assumes a clean cluster

```python
# Stop the entry point so the tool container does not outlive the test.
stop_response = self.dataset_populator._delete(...)
```

is the last statement in the test body, so any earlier assertion failure skips it and the comment's guarantee lapses exactly when it matters — a failing test leaves an interactive tool pod running for the rest of the shard. `self.addCleanup(...)` registered immediately after `wait_on_entry_points_active` makes it unconditional.

Compounding: `ingress_for_tool` asserts *exactly one* cluster-wide ingress annotated for the tool. A leaked ingress from an earlier failed run turns the next run's failure message into `Expected exactly one ingress for interactivetool_simple, got [ … two large JSON blobs … ]`, which points away from the real cause. Not worth restructuring; the `addCleanup` largely prevents it.

### P3-5 — Were the new `job_config()` parameters needed?

The distinct claim names (`it-jobs-directory-claim` / `it-tool-directory-claim`) exist to avoid colliding with `TestKubernetesIntegration`'s. I could not construct the collision: pytest shards run classes serially in one process, `tearDownClass` deletes both objects, and in this CI run the two classes landed on different shards (hence different minikube clusters) — the shard-0 manifest contains `TestKubernetesNativeInteractiveToolsIntegration` and not `TestKubernetesIntegration`. So this looks like defensive naming rather than a fix for an observed clash.

It is cheap and harmless, and I would not ask for it to be reverted — but it is the reason `job_config()` grew two parameters, and under P2-2's mixin it would collapse to one `claim_prefix`. If there *was* an observed collision, the PR body is the place to say so.

### P3-6 — Style, and what was checked for weakening

- **Imports.** All new imports are at module top: `json`, `subprocess`, and the five-name `from .test_kubernetes_runner import (...)` block (`test_interactivetools_api.py:3,5,29-35`). Nothing function-local, in test or library code.
- **No loosening in the type-checking half.** Grepped the full diff: zero `type: ignore`, zero `cast`, zero new `Any` in `lib/`. The only `Any` added is `dict[str, Any]` as the return of `ingress_for_tool`, which is an accurate description of a `kubectl -o json` blob. `Python linting` (`tox -e lint,lint_docstring_include_list,mypy,format`) is green on 3.10 and 3.14 with the exclusion removed, which is better evidence than a local run.
- **No test was weakened.** The base-class split is purely additive — `BaseInteractiveToolsIntegrationTestCase` keeps both of its tests and all four existing subclasses (`TestInteractiveToolsIntegration`, `…PulsarIntegration`, `…ShortURLIntegration`, `…RemoteProxyIntegration`, `TestKubeInteractiveToolsRemoteProxyIntegration`) still inherit them unchanged. No assertion removed, no timeout raised, no fixture data adjusted. The refactor is the good kind: it creates the seam that lets a deployment which cannot reach a tool through a proxy reuse the helpers without inheriting tests it must skip.
- The new docstring's "so that deployments which cannot reach an interactive tool through a proxy can still reuse the helpers" — *test cases*, not *deployments*, is what reuses helpers. Trivial wording nit.
- Pre-existing and untouched: the `# Move helpers to populators.py` TODO at `test_interactivetools_api.py:62`. The three helpers under it (`wait_on_proxied_content`, `entry_point_target`, `wait_on_entry_points_active`) are now inherited by a second unrelated hierarchy, which strengthens the case for that move — but it is a different PR.

---

## Verification

Read at `55d06e0d5a` in the worktree; no `.venv` present, so nothing Python was executed locally. What I confirmed by execution was CI-side, via `gh`:

- **The new test ran and passed in Integration CI.** Pulled the raw log for job `91105590361` (`Test (3.10, 0)`, run `30613529954`) and grepped it: `TestKubernetesNativeInteractiveToolsIntegration` appears in shard 0's collected manifest, and `test_entry_point_and_ingress PASSED [ 48%]`. This is direct evidence, not the PR body's claim.
- Enumerated every workflow run on the head SHA (`gh api …/actions/runs?head_sha=…`): 27 runs, all `success` except two path-filtered `skipped`. `Python linting` and `Integration` both green, so the `mypy.ini` removal holds on 3.10 and 3.14.
- Traced `06e587c20c` (the #23203 fix) with `git show` to confirm what the regression test is guarding, and `grep`ed all four surviving call sites plus the single `create_entry_points` caller.
- Read `ParamsWithSpecs.__init__` to establish that `valid` receives the raw pre-`map` value and only fires for explicitly-set params — that is what makes P2-1 a real bug and explains why it hid.

## Not verified

- **Did not run the new integration test, mypy, or any Galaxy test locally.** No `.venv` in this worktree; the only Galaxy venv on the box (`pr/22781`) has no `mypy` installed, and bootstrapping was out of scope. Everything about mypy's behaviour is reasoned from `mypy.ini`'s global `check_untyped_defs = True`, the exact-match section semantics, which methods carry annotations, and the green CI job.
- **Did not reproduce the red-to-green claim.** The PR says the new test was the only failure on a scratch branch with #23203 reverted, and that linting showed 8 mypy errors across four call sites. I confirmed the mechanism makes both plausible (a `TypeError` in `__get_k8s_containers` fails submission, and `wait_on_entry_points_active` raises on job state `error` rather than timing out silently) but did not build that branch.
- **Did not exercise a Kubernetes cluster.** No local minikube; claims about ingress object shape come from `__get_k8s_ingress_spec` / `__get_k8s_ingress_rules_spec` and from the CI pass, not from an observed `kubectl get ingress`.
- **Did not confirm P2-1's proposed regression test empirically** — that adding `k8s_timeout_seconds_job_deletion` to the job-conf template would have failed startup under the old lambda is reasoned from `ParamsWithSpecs:1319-1321`, not run.
- Did not survey whether other runners on the `check_untyped_defs = False` list have the same latent `valid=lambda x: <type> > 0` shape. `grep` over `kubernetes.py` shows the rest of its specs are correct; the other fourteen excluded `jobs.runners.*` modules were not audited.

---

## Merged, and the P2-2 refactor branch

PR merged into `dev` as `671d1b1e19` (merge commit for `mvdbeek/issue-23203-kubernetes-interactive-tools-broken`).

Branch `23225-review-followups` in `~/projects/worktrees/galaxy/pr/23225`, commit
`7b20dbc9c4`, cut from `origin/dev` after the merge. 2 files, +87/−75. Addresses P2-2 and
its three sub-items only; nothing else from the note.

**`KubernetesVolumesMixin`** in `test_kubernetes_runner.py` holds `claim_prefix`,
`setup_persistent_volumes()` and `teardown_persistent_volumes()`. Both
`TestKubernetesIntegration` (`claim_prefix = ""`) and
`TestKubernetesNativeInteractiveToolsIntegration` (`claim_prefix = "it-"`) mix it in ahead
of their integration base and call the two helpers from `handle_galaxy_config_kwds` /
`tearDownClass`.

The teardown is a plain helper the two classes call from their own `tearDownClass`, rather
than a `tearDownClass` on the mixin itself. A mixin that inherits nothing cannot call
`super().tearDownClass()` without a `type: ignore`, and `test/` is inside mypy's scope
(`make mypy` is `cd lib && mypy . ../test`). Two lines of duplication is a better trade
than an ignore in a change whose whole point is that copies cost.

**`job_config(jobs_directory, claim_prefix="")`** replaces the `jobs_directory_claim` /
`tool_directory_claim` pair added by the PR. One name for the pair, and the job config can
no longer name claims the class did not create.

**Reuse of what the module already exports:** `ingress_for_tool()` moved off the test class
to module level beside the other cluster helpers; it and the two clean
`kubectl get job -o json` sites now go through a new `kubectl_get(kind, name=None)`. The
`pytest.raises(CalledProcessError)` site at `:268` keeps its raw `check_output` — it wants
the failure and `stderr=STDOUT`. The interactive tools class overrides `setUp` to use
`KubernetesDatasetPopulator`, matching `TestKubernetesIntegration`.

### Verified

- **Generated `job_conf` XML is byte-identical** to pre-refactor output for both
  `claim_prefix=""` and `"it-"` — claim names still `jobs-directory-claim` /
  `tool-directory-claim` and `it-jobs-directory-claim` / `it-tool-directory-claim`.
  Diffed 4427 bytes each way.
- **mypy A/B, `--no-incremental` both ways:** identical results. The single error is
  `Library stubs not installed for "yaml"` in untouched `test_coexecution.py`, an artifact
  of the borrowed venv, present in the baseline too. Zero errors in either changed file, so
  the mixin and the narrowed `dataset_populator` annotation both type-check.
- **Collection unchanged at 21** (10 + 11 per file), and identical under the
  `Test* *Test *TestCase` pattern — so `KubernetesVolumesMixin` is not collected and
  `Check test class names` stays green.
- black, ruff, flake8, and the full pre-commit run all pass; no `--no-verify` needed.

### Not verified

The tests were not *run* — that needs a live cluster. Behaviour preservation rests on the
byte-identical job config, unchanged collection, and the fact that the moved code is
verbatim. The mixin's ordering ahead of the integration base is checked only by collection
succeeding, not by an executed `setUpClass`.

### Deliberately not in this branch

P2-1 (no regression test for the `k8s_timeout_seconds_job_deletion` validator) is coverage,
not reuse, and the P3 items — `addCleanup` for the entry-point stop, the stronger ingress
host assertion, the backend port and ingress-teardown assertions — are test strength. All
still open.
