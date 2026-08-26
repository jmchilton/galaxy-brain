# PR 23262 — Add resubmission count as a job metric

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23262 |
| **Author** | gsaudade99 (Gabriel Saudade) |
| **Base branch** | `dev` |
| **Head reviewed** | `d621b1e5c3ac144e035dc7cac4e820210d32c257` (merge-base `4906c84e2e`) |
| **Size** | 6 files, +150 / -9 (single commit) |
| **State** | OPEN, opened 2026-08-05; 1 review comment (davelopez), 1 issue comment (domgz) |
| **CI** | **Test Galaxy packages: FAILURE** — `ModuleNotFoundError: No module named 'sqlalchemy'` |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23262` |
| **xref** | usegalaxy-eu/issues#1035 (ESG4Stars resource-optimization flagging) |
| **Verdict** | **Request changes — the objective is right, the shape is wrong.** Counting Galaxy-level resubmissions is a genuinely useful admin signal and I want it. But the plugin reaches through `app` into `galaxy.model` and SQLAlchemy from inside `galaxy-job-metrics`, a package that deliberately depends on `galaxy-util` alone *and ships to Pulsar compute nodes*; and the number it computes already exists in the tree, spelled differently, as the `attempt` variable admins write resubmit conditions against. Both are fixable without giving up the feature. |

---

## Endorsement first

The goal is sound and I'd like to see it land. Jobs that get resubmitted repeatedly with
escalating resource requests are exactly the signal an admin needs to find TPV rules whose
initial allocation is wrong, and there is currently no aggregate way to see it — you can tell
that *a* job was resubmitted (the UI exposes it per-dataset), but you cannot ask "which tools
resubmit most". Putting the count in `job_metric_numeric` is the right *delivery vehicle* for
that question: `Job.add_metric` (`lib/galaxy/model/__init__.py:614-620`) routes ints to the
numeric table, so the value lands next to `core`'s runtime and `cgroup`'s memory and is
aggregatable by the same reporting queries admins already run. Nothing below is an argument
against the feature.

---

## What it does

- New `lib/galaxy/job_metrics/instrumenters/resubmission.py` (58 lines): `ResubmissionPlugin`
  with `plugin_type = "resubmission"`, `default_safety = Safety.SAFE`, a formatter rendering
  `Resubmission Count`, and a `job_properties` that runs
  `SELECT count(*) FROM job_state_history WHERE job_id = ? AND state = 'resubmitted'`
  via `self.app.model.context.scalar(...)`.
- `__init__(self, app=None, **kwargs)` captures the `app` that `JobMetrics` happens to forward;
  `job_properties` returns `{}` when `app is None`.
- Docs: a `resubmission` section in `doc/source/admin/job_metrics.rst`, an `automodule` entry
  in `doc/source/lib/galaxy.job_metrics.instrumenters.rst`.
- Tests: 3 new unit tests in `test/unit/job_metrics/test_resubmission.py`, a formatting case in
  `test_job_metrics.py`, and integration coverage in `test/integration/test_job_resubmission.py`
  asserting counts of 0, 1 and 2.

I ran the unit suite (borrowed venv from the `pr/22781` worktree, `PYTHONPATH=lib:test`):
`test/unit/job_metrics/` → **17 passed**. Nothing was deleted or weakened.

---

## Claims I verified

**"The `job_metrics` package does not include galaxy models and sqlalchemy; this is why CI is
failing" (davelopez).** Holds exactly. `packages/job_metrics/pyproject.toml` declares
`dependencies = ["galaxy-util"]` and nothing else, and the failing job
(`Test Galaxy packages`, run 30987009978) shows three collection errors, all
`src/galaxy/job_metrics/instrumenters/resubmission.py:8: from sqlalchemy import (...)` →
`ModuleNotFoundError: No module named 'sqlalchemy'`. Note it fails on `sqlalchemy` only because
that import comes first — adding `sqlalchemy` alone would move the failure one line down to
`from galaxy import model`, which needs `galaxy-data`.

**"`app` is already reachable by every plugin."** Holds, and I traced the whole chain, because
whether it is *interface* or *accident* changes the recommendation:

```
lib/galaxy/app/__init__.py:739   JobMetrics(conf_file, conf_dict, app=self)
lib/galaxy/job_metrics/__init__.py:81/85   JobInstrumenter.from_file/from_dict(..., **kwargs)
lib/galaxy/job_metrics/__init__.py:191-194 JobInstrumenter.__init__ -> self.extra_kwargs = kwargs
lib/galaxy/job_metrics/__init__.py:238     load_plugins(plugin_classes, source, self.extra_kwargs)
lib/galaxy/util/plugin_config.py:149-155   plugin_kwds = config.copy(); plugin_kwds.update(extra_kwds)
lib/galaxy/util/plugin_config.py:120       plugin_class(**plugin_kwds)
```

**It is an accident, not an interface.** Two pieces of evidence. First, all seven existing
plugins (`cgroup`, `core`, `cpuinfo`, `env`, `hostname`, `meminfo`, `uname`) declare
`def __init__(self, **kwargs)` and none of them names or reads `app`. Second, look at what
`plugin_kwds` *is*: it starts as the admin's YAML config dict for that plugin entry — which is
why `core` reads `kwargs.get("timezone")` and `env` reads `kwargs.get("variables")` — and
`extra_kwds` is merged into that same namespace. So `app` is not a framework-provided service;
it is a value squatting in the admin's config keyspace. That is worth saying plainly, because
"the hatch already exists, so using it is fine" is the obvious defence of the current design
and it does not survive reading `plugin_config.py:149-155`.

**"`job_properties(job_id, job_directory)` is the collection hook and every other plugin reads
files out of `job_directory`."** Holds. `InstrumentPlugin.job_properties`
(`lib/galaxy/job_metrics/instrumenters/__init__.py:51-57`) documents the contract in its own
docstring: *"Collect properties for this plugin from specified job directory. This method will
run on the Galaxy server and can assume files created in job_directory with
pre_execute_instrument and post_execute_instrument are available."* All seven existing plugins
do exactly that and nothing else. `ResubmissionPlugin` is the first to ignore `job_directory`
entirely and reach into the database.

**`lib/galaxy/job_metrics/__init__.py:228` is the only caller of `job_properties`.** Holds —
`JobInstrumenter.collect_properties`, reached from `JobMetrics.collect_properties` (:146-147),
whose only caller is `JobWrapper._collect_metrics` (`lib/galaxy/jobs/__init__.py:2406`). One
call site, one hop. That matters for P1-3's recommendation: widening this hook is a
two-file change, not an ecosystem migration.

**`default_safety = Safety.SAFE` is correct.** `summarize_metrics`
(`lib/galaxy/managers/jobs.py:1916-1921`) gives non-admins `Safety.SAFE`, admins
`Safety.UNSAFE`. `SAFE` therefore means "show this to the job's owner". That is right here,
because resubmission is *already* user-visible: `HDAManager.has_been_resubmitted`
(`lib/galaxy/managers/hdas.py:291-300`) is wired into the HDA serializer as the `"resubmitted"`
key (`hdas.py:624`). The count leaks nothing the user cannot already see. Worth noting the new
integration test's visibility depends on this — it fetches metrics as a regular user, so a
downgrade to `POTENTIALLY_SENSITVE` would make it fail.

**Python style.** Clean. All imports are at module top (`typing`, `sqlalchemy`, `galaxy.model`,
relative `. / ..` imports), `TYPE_CHECKING` used correctly for the `GalaxyManagerApplication`
annotation, no function-local imports, `__all__` present matching the convention of every
sibling plugin, and no references to plans or tickets in comments.

**No tests were weakened.** The one modified assertion is a strengthening:
`test_failure_runner_job_metrics_collected` previously ended at `assert job_metrics` (truthy)
and now calls `_assert_resubmission_count(history_id, 0)`, whose
`next(m for m in job_metrics if m["plugin"] == "resubmission")` raises if metrics are missing
*and* pins the value. Strictly more.

---

## The two lines of inquiry

### (a) "This feels unoptimized" — refined, and the real problem is elsewhere

I could not confirm this as a *performance* problem, and I think claiming it would be a
distraction. The specifics:

- `job_state_history.job_id` and `job_state_history.state` are both
  `index=True` (`lib/galaxy/model/__init__.py:2910-2911`), so this is an indexed
  `count(*)`, once per job termination, on a path that already does several `commit()`s,
  `_fix_output_permissions()`, output-size stats and dataset finalization. It is noise.
- The session usage is correct, not merely lucky. `self.app.model.context` is literally the
  same object as `JobWrapper.sa_session` (`lib/galaxy/jobs/__init__.py:1010`), and the
  sessionmaker sets `autoflush=False` (`lib/galaxy/model/base.py:74`), so issuing this query
  in the middle of `finish()` — between `job.set_final_state(...)` and the following
  `commit()` — does not flush partial state. I went looking for that hazard and it is not there.
- The count *is* final at collection time, which was the other thing worth checking. On
  resubmission, `_finish_or_resubmit_job` (`lib/galaxy/jobs/runners/__init__.py:690-698`) calls
  `_handle_runner_state("failure", ...)` and **returns before `job_wrapper.finish()`** when the
  state handler claims the job. So metrics are not collected per attempt; they are collected
  once, on the terminal attempt, after all the `resubmitted` rows exist. The recorded number
  is correct.

What *is* true, and is the germ of the right finding: **the caller already holds the ORM
object and throws it away.** `_collect_metrics` opens with

```python
def _collect_metrics(self, has_metrics, job_metrics_directory=None):
    job = has_metrics.get_job()
```

(`lib/galaxy/jobs/__init__.py:2397-2398`) and then passes `self.job_id` down. `model.Job` has
`state_history: Mapped[list["JobStateHistory"]] = relationship()`
(`lib/galaxy/model/__init__.py:1719`), so the data is one attribute access away in app-layer
code that is allowed to touch the model. The plugin re-fetches by id from three layers down
through a package boundary it is not supposed to cross. That is not a performance defect, it is
a layering defect that happens to also cost a round trip. I'd frame it that way rather than as
"unoptimized", which invites a reply about query cost that misses the point.

**Is the number already recorded somewhere? Yes — this is the biggest finding, see P1-3.**

**Is a metric the right home for a value derived from durable state?** Partly. Every other
plugin captures something ephemeral (`/proc` contents, cgroup counters, the runtime
environment) that is gone forever if not snapshotted. This one is a query over rows that
persist indefinitely, so storing it is denormalization. I still think it is justified — see
"Endorsement first" — but two consequences follow that the PR should acknowledge:

- **No retroactivity.** Turning the plugin on gives you data from that moment forward, while
  the underlying rows already cover all history. For the ESG4Stars use case ("flag tools with
  the biggest potential for resource optimization") the interesting data is the *past*. A
  reports-side query over `job_state_history` would answer the question today, retroactively,
  with no config change. If the metric is the answer, the PR should say why aggregating
  alongside runtime/memory in `job_metric_numeric` is worth losing history for — I think it is,
  but it should be a stated trade-off rather than an unexamined one.
- **Denormalized copies drift.** Not in practice here, per the "count is final" analysis above,
  but it is one more reason the derivation should live in exactly one place (P1-3).

**Is `app is None -> return {}` a silent no-op?** Yes, and it is *reachable in real
configuration*, not just in tests. See P1-2 — I reproduced it.

### (b) "Can we adjust the plugin interface to inject this?" — yes, and there is precedent

Short answer: yes, and Galaxy has solved this exact problem twice already in adjacent packages.
The pattern to reuse is **a `Protocol` defined in the low package, implemented above it, passed
in by the caller** — not a service object smuggled through `**kwargs`.

**Precedent 1 — `galaxy.objectstore`.** Deps: `galaxy-util[config-template]`, `pydantic`,
`PyYAML`. No `galaxy-data`, no SQLAlchemy. It needs to resolve user-defined object stores,
which requires database-backed managers it cannot import. So it declares the shape it needs
*inside itself*:

```python
class UserObjectStoreResolver(Protocol):
    def resolve_object_store_uri_config(self, uri: str) -> ObjectStoreConfiguration: ...
    def resolve_object_store_uri(self, uri: str) -> ConcreteObjectStore: ...
```

(`lib/galaxy/objectstore/__init__.py:91-96`). The implementation lives in
`galaxy.managers.object_store_instances` as `UserObjectStoreResolverImpl` and is injected by
the app at `lib/galaxy/app/__init__.py:610-611` and threaded through as an explicit
`user_object_store_resolver: UserObjectStoreResolver | None = None` parameter
(`objectstore/__init__.py:1407, 1505, 1860, 1940`).

**Precedent 2 — `galaxy.files`.** Same move, and the docstrings are almost written for this PR:

```python
class ProvidesFileSourcesTransaction(Protocol):
    """The slice of a Galaxy transaction ProvidesFileSourcesUserContext reads."""

class UserDefinedFileSources(Protocol):
    """Entry-point for Galaxy to inject user-defined file sources."""
```

(`lib/galaxy/files/__init__.py:30-31, 69-75`).

So the abstraction to reuse exists, it is idiomatic, it is used twice, and `galaxy.job_metrics`
should adopt it rather than inventing an `app` kwarg or relaxing its dependency list.

#### The concrete shape I'd propose

Three pieces. None of them churns the six existing plugins, and none adds a dependency.

**1. Give `model.Job` the count, once.** This is the reusable abstraction the change should
leave behind (see P1-3 for why there are already two-and-a-half implementations):

```python
# lib/galaxy/model/__init__.py, on Job
@property
def resubmission_count(self) -> int:
    return sum(1 for h in self.state_history if h.state == Job.states.RESUBMITTED)
```

and rewrite `_ExpressionContext` (`lib/galaxy/jobs/runners/state_handlers/resubmit.py:141-151`)
to use `attempt = job.resubmission_count + 1`, deleting its hand-rolled loop. That single edit
makes the new metric *definitionally* the same quantity as the `attempt` variable admins
already write `resubmit:` conditions against, instead of a look-alike.

**2. Declare the slice `galaxy.job_metrics` is allowed to see, as a `Protocol`, inside
`galaxy.job_metrics`** — mirroring `ProvidesFileSourcesTransaction` almost verbatim:

```python
# lib/galaxy/job_metrics/instrumenters/__init__.py
class ProvidesJobMetricsContext(Protocol):
    """The slice of a Galaxy job that instrument plugins may read at collection time."""

    @property
    def id(self) -> int: ...

    @property
    def resubmission_count(self) -> int: ...
```

`typing.Protocol` costs nothing and adds no dependency. `model.Job` satisfies it structurally
the moment it grows `resubmission_count` — no registration, no adapter, no import of
`galaxy.model` from `galaxy.job_metrics`.

**3. Add one optional hook to `InstrumentPlugin` and route the caller's `Job` to it.**

```python
# InstrumentPlugin — new, with a default that preserves today's behaviour
def collect(self, job: ProvidesJobMetricsContext, job_directory: str) -> dict[str, Any]:
    """Framework entry point. Override to read job context; default delegates to job_properties."""
    return self.job_properties(job.id, job_directory)
```

`JobInstrumenter.collect_properties` (`job_metrics/__init__.py:224-235`) calls `plugin.collect(...)`
instead of `plugin.job_properties(...)`; `JobMetrics.collect_properties` (:146) and
`JobWrapper._collect_metrics` (`jobs/__init__.py:2406`) pass the `job` object that
`_collect_metrics` already has on line 2398. `ResubmissionPlugin` becomes:

```python
class ResubmissionPlugin(InstrumentPlugin):
    plugin_type = "resubmission"
    formatter = ResubmissionPluginFormatter()
    default_safety = Safety.SAFE

    def job_properties(self, job_id, job_directory):
        return {}

    def collect(self, job, job_directory):
        return {RESUBMISSION_COUNT_KEY: job.resubmission_count}
```

No `sqlalchemy`, no `galaxy.model`, no `app`, no `None` fallback to be silent about, and the
unit test can pass a three-line fake instead of a `Mock` (which fixes P2-1 for free).

#### Options I considered and rejected, with reasons

| Option | Verdict |
|---|---|
| **Widen `job_properties(job_id, job_directory)` itself** to take a context | Rejected. It is `@abstractmethod`; changing the signature churns all seven in-tree plugins and silently breaks any out-of-tree one. The additive `collect` hook with a delegating default gets the same result for free, and it mirrors how `pre_execute_instrument` / `post_execute_instrument` already sit on the base class as optional overrides with no-op defaults. |
| **A frozen dataclass context populated by the caller** instead of a `Protocol` over `Job` | Reasonable alternative, and it *confines* what a plugin can reach (a `Protocol` documents the slice but does not stop duck-typed access to `job.user`, `job.session`, …). But it needs population code on the hot path and computes `resubmission_count` eagerly for every job whether or not any plugin wants it. Since metrics plugins are admin-configured trusted code, confinement is a layering hint rather than a security boundary, so I'd take the zero-cost `Protocol` and the precedent. If the team prefers confinement, the dataclass with lazily-evaluated fields is the fallback — the rest of the design is unchanged. |
| **Have the app-side caller pre-compute the count and hand it in** | This is what the dataclass option *is*; on its own (e.g. stuffing a value into an untyped dict) it loses the type surface and the documentation value. Same cost, less clarity. |
| **A separate hook the framework calls only for plugins that declare they want it** (e.g. a `wants_job_context` class flag) | Rejected as over-built. It is the same as option 3 plus a flag whose only purpose is to skip one attribute access. |
| **Skip the plugin system: expose the count on the job API** | Genuinely tempting, and it is strictly better for *retroactivity* — the rows are already there for every job in history. But it does not serve the stated use case, which is aggregate cross-tool analysis alongside runtime and memory, and that lives in `job_metric_numeric`. My recommendation: do the metric, and mention in the docs that a direct `job_state_history` query covers pre-enablement history. |
| **Add `sqlalchemy` + `galaxy-data` to `galaxy-job-metrics`** (davelopez's open question) | Rejected — see P1-1 for the full argument. |

---

## P1 findings

### P1-1 — `galaxy-job-metrics` ships to Pulsar compute nodes; do not add `sqlalchemy`/`galaxy-data` to it

This is my answer to davelopez's open question ("I'm not sure whether we should include these
packages or not"), and I think it is a clear no rather than a judgement call.

`packages/packages_for_pulsar_by_dep_dag.txt` contains exactly five entries:

```
tool_util_models
util
job_metrics
objectstore
tool_util
```

`galaxy-job-metrics` is one of the five packages Pulsar installs on compute nodes — that is the
whole reason the package exists separately, because `pre_execute_instrument` /
`post_execute_instrument` and their output parsers have to run on the compute side of the
Galaxy/Pulsar split. `galaxy-data` is server-only.

And the import is not avoidable or lazy. `JobMetrics.__plugins_dict`
(`lib/galaxy/job_metrics/__init__.py:149-152`) calls `plugin_config.plugins_dict`, which walks
`galaxy.job_metrics.instrumenters` with `import_submodules` (`plugin_config.py:41` →
`lib/galaxy/util/submodules.py:42-51`) and **imports every submodule unconditionally**, whether
or not the admin configured it. So `resubmission.py` — and therefore `sqlalchemy` and
`galaxy.model` — is imported anywhere `JobMetrics` is constructed at all.

What `galaxy-data` would drag onto every Pulsar node, for one integer
(`packages/data/pyproject.toml`): `galaxy-files`, `galaxy-objectstore`, `galaxy-schema`,
`galaxy-tool-util`, `alembic`, `bdbag`, `bx-python`, `h5grove`, `h5py`, `isa-rwval`, `msal`,
`mrcfile`, `numpy`, `openpyxl`, `pycryptodome`, `pydicom`, `pysam`, `rocrate`,
`social-auth-core`, … That is not a dependency-hygiene quibble; it is a materially worse Pulsar
install.

There is also a second-order effect worth knowing about even if the deps were added elsewhere:
`__import_submodules_impl` swallows import failures with `log.exception(...); continue`
(`submodules.py:49-51`). So in any environment where `galaxy-job-metrics` is installed without
`galaxy-data`, the plugin does not fail loudly — it logs a traceback at startup, vanishes from
`plugin_classes`, and a config naming it then dies with
`"Failed to find plugin of type [resubmission] in available plugin types ..."`
(`plugin_config.py:94-97`). Confusing failure, far from the cause.

One more structural detail the author probably could not have known:
`packages/job_metrics/tests/job_metrics` is a **symlink to `test/unit/job_metrics/`**. The unit
test file added in this PR is automatically part of the package's isolated test suite, which is
why CI reports three collection errors rather than one. Anything added under
`test/unit/job_metrics/` must be runnable with `galaxy-util` alone.

**Fix:** the design in inquiry (b) above. It removes the imports entirely rather than
sanctioning them, so `pyproject.toml` needs no change and the boundary keeps meaning what it
says.

### P1-2 — `app is None -> {}` is a reachable silent no-op, not just a defensive guard

`ResubmissionPlugin.job_properties` returns `{}` when `self.app is None`
(`lib/galaxy/job_metrics/instrumenters/resubmission.py:43-44`). I assumed this was belt-and-braces
for tests. It is not: **`app` is never forwarded to per-destination metrics configurations.**

`JobMetrics.__init__` accepts `**kwargs` but does not retain them, and the three per-destination
builders construct `JobInstrumenter` with no kwargs at all:

```python
# lib/galaxy/job_metrics/__init__.py
125    def set_destination_conf_file(self, destination_id: str, conf_file: str) -> None:
126        instrumenter = JobInstrumenter.from_file(self.plugin_classes, conf_file)
...
129    def set_destination_conf_element(self, destination_id: str, element: "Element") -> None:
130        plugin_source = plugin_config.PluginConfigSource("xml", element)
131        instrumenter = JobInstrumenter(self.plugin_classes, plugin_source)
...
134    def set_destination_conf_dicts(self, destination_id: str, conf_dicts: list[dict[str, Any]]) -> None:
135        plugin_source = plugin_config.PluginConfigSource("dict", conf_dicts)
136        instrumenter = JobInstrumenter(self.plugin_classes, plugin_source)
```

All three are reached from `JobConfiguration` (`lib/galaxy/jobs/__init__.py:469-485`) whenever an
execution environment sets `metrics:` — a list, or `src: path`, or `src: xml_element`.
Demonstrated against the PR head:

```
$ PYTHONPATH=lib python -c "..."
global config   -> app = 'FAKE_APP'
per-destination -> app = None
per-destination job_properties(1, /tmp) -> {}
```

So an admin who writes

```yaml
execution:
  environments:
    slurm_big:
      runner: slurm
      metrics:
      - type: core
      - type: resubmission
```

gets `core` metrics, no `resubmission` metric, no error, and no log line. The metric they
explicitly asked for is simply absent. The default path is safe — `metrics` unset resolves to
`{"src": "default"}` and never calls these builders (`jobs/__init__.py:469-472`) — so this bites
precisely the admins who care enough to configure per-destination metrics, which for a metric
aimed at diagnosing specific destinations is the likely audience.

I'd call this a **pre-existing framework gap that this PR is the first to expose**, and it is
good evidence for the P1-1/inquiry-(b) argument: the `**kwargs` channel was never an interface,
so it was never made to hold for every construction path. Nobody noticed because no plugin had
ever depended on it.

**Fix:** the injection redesign makes it disappear — with no `app`, there is nothing to fail to
forward. If the current shape is kept for now, it needs both halves: store `self.extra_kwargs =
kwargs` in `JobMetrics.__init__` and thread it through all three `set_destination_conf_*`
builders, *and* have the plugin `log.warning` once at construction time when `app is None`
rather than returning `{}` from every collection silently.

### P1-3 — Galaxy already counts this; the PR adds a second, differently-named definition of the same number

`_ExpressionContext.safe_eval` in the resubmit state handler
(`lib/galaxy/jobs/runners/state_handlers/resubmit.py:139-151`):

```python
attempt = 1
current_time = now()
...
for state in self._job_state.job_wrapper.get_job().state_history:
    if state.state == model.Job.states.RUNNING:
        last_running_state = state
    elif state.state == model.Job.states.QUEUED:
        last_queued_state = state
    elif state.state == model.Job.states.RESUBMITTED:
        attempt = attempt + 1
```

and it is published to admins as the `attempt` variable in `resubmit:` conditions
(`resubmit.py:168`). That is the same quantity the PR introduces, off by one — a fact the PR's
own documentation states without noticing the implication:

> *"A job that runs once reports `0`; the execution attempt number is therefore
> `resubmission_count + 1`."*

The equivalence is not theoretical; the PR's own new integration test demonstrates it. It
targets the `fail_two_attempts` environment, whose config is
(`test/integration/resubmission_job_conf.yml:44-50`):

```yaml
    # This will fail twice and succeed on walltime reached and will fail twice and fail hard else.
    fail_two_attempts:
      runner: failure_runner
      resubmit:
      - condition: 'attempt < 3'
```

and the new test asserts `_assert_resubmission_count(history_id, 2)`. So the test is
simultaneously exercising `attempt == 3` (via the config) and `resubmission_count == 2` (via the
metric), against the same rows, computed twice by two different pieces of code that do not know
about each other.

There is a third, partial implementation as well: `HDAManager.has_been_resubmitted`
(`lib/galaxy/managers/hdas.py:291-300`) issues its own `select(exists()...)` over
`JobStateHistory.state == Job.states.RESUBMITTED`, serialized as the HDA `"resubmitted"` key
(`hdas.py:624`).

Three places now reason about "resubmitted rows in `job_state_history`": one loop over the ORM
relationship in the resubmit handler, one `exists()` query in the HDA manager, one `count(*)`
query in the new plugin. This is exactly the accretion pattern worth pushing back on in a
codebase this old — and the fix is small and improves all three call sites:

```python
# lib/galaxy/model/__init__.py, on Job
@property
def resubmission_count(self) -> int:
    return sum(1 for h in self.state_history if h.state == Job.states.RESUBMITTED)
```

`_ExpressionContext` loses its counter branch and reads `attempt = job.resubmission_count + 1`.
The metric reads `job.resubmission_count`. `has_been_resubmitted` keeps its query (it is
answering a different question — across an HDA's producing job, without loading the job — so
leaving it alone is defensible), but at least the *definition* of the count exists once.

This is the "does the change leave behind a reusable abstraction" question, and right now the
answer is no: it adds a third copy. With the property, it removes one and leaves one.

---

## P2 findings

### P2-1 — The unit tests mock the query away, so they cannot detect a wrong `WHERE` clause

`test/unit/job_metrics/test_resubmission.py:9-17`:

```python
def test_resubmission_count_comes_from_persisted_state_history():
    app = Mock()
    app.model.context.scalar.return_value = 2
    plugin = ResubmissionPlugin(app=app)

    properties = plugin.job_properties(42, "/cleared-and-recreated-working-directory")

    assert properties == {RESUBMISSION_COUNT_KEY: 2}
    app.model.context.scalar.assert_called_once()
```

The statement handed to `scalar` is never inspected. The test asserts that the plugin returns
whatever the mock returns and that it called the mock once — i.e. it tests the plumbing and
none of the logic. The entire content of the plugin is the `select` predicate, and that is the
one thing not covered.

Demonstrated by mutation against the PR head — I changed `model.Job.states.RESUBMITTED` to
`model.Job.states.QUEUED` in the plugin and re-ran the file:

```
======================== 3 passed, 3 warnings in 1.63s =========================
```

A plugin counting the wrong state passes its own unit suite. (The mutation was reverted;
`git status` is clean.)

The test name — `test_resubmission_count_comes_from_persisted_state_history` — asserts a claim
the test does not check.

**Fix:** this is another thing the injection redesign fixes for free. Once `collect(job, ...)`
reads `job.resubmission_count`, the unit test passes a small fake with a real value and there is
nothing left to mock; and the *counting* gets its own test next to the `model.Job` property,
where a real `Job` with real `JobStateHistory` rows can be asserted against. If the current
shape is kept, the test needs to compile the statement and assert on it
(`str(statement.compile(compile_kwargs={"literal_binds": True}))`), which is unpleasant enough
to be an argument for the redesign in itself.

Note that P1-1 constrains the options here: because `packages/job_metrics/tests/` symlinks to
`test/unit/job_metrics/`, no test in this directory may import `galaxy.model` or SQLAlchemy
either. A real-ORM test of the count belongs in `test/unit/data/` next to the model property —
which is another way of saying the count does not belong to `galaxy-job-metrics`.

### P2-2 — A database-derived metric is still gated on the job working directory existing

The plugin's stated selling point is that it survives working-directory clearing (true —
`clear_working_directory()` runs at `resubmit.py:102`). But collection itself is gated on the
directory, in both call paths:

```python
# lib/galaxy/jobs/__init__.py:1467-1469, in fail()
if not job.tasks and working_directory_exists:
    self._collect_metrics(job, job_metrics_directory)
```

```python
# lib/galaxy/jobs/__init__.py:2397-2404, in _collect_metrics()
if job_metrics_directory is None:
    try:
        # working directory might have been purged already
        job_metrics_directory = self.working_directory
    except Exception:
        log.exception("Could not recover job metrics")
        return
```

So a job whose working directory is gone — purged, or an object-store failure resolving it —
records no `resubmission_count`, even though the rows it is derived from are sitting in the
database untouched. The plugin has no need of `job_directory` and never opens it, yet it
inherits the filesystem precondition of the plugins that do.

This is not a bug introduced by the PR and I would not block on it. I raise it because it is
independent evidence for the framing: `job_properties` is a *job-directory* contract from its
docstring down to its call-site guards, and a metric derived from durable state does not fit it
cleanly. Worth a sentence in the admin docs at minimum, since the docs currently imply the
opposite ("the value is retained when a resubmission clears or recreates the job working
directory" — the *value* is, but the *collection* may not happen).

### P2-3 — The deployment caveat domgz raised bears on whether this serves the ESG4Stars use case

domgz noted that usegalaxy-eu currently bypasses Galaxy's resubmission mechanism — an HTCondor
cron resubmits instead — so the metric would read `0` there until they switch. Verified as
plausible from the Galaxy side: the count only sees `Job.states.RESUBMITTED` rows, which are
written by `JobWrapper.mark_as_resubmitted` (`lib/galaxy/jobs/__init__.py:1579-1586`), reachable
from exactly two places — the resubmit state handler (`resubmit.py:126`) and Slurm's
`NODE_FAIL` recovery (`lib/galaxy/jobs/runners/slurm.py:148`). Scheduler-internal requeues are
invisible by construction.

That is a real caveat for the stated motivation, since usegalaxy-eu is the deployment the xref
issue comes from. It is not an objection to the PR — the metric is correct for deployments using
Galaxy resubmission, and the docs already say so accurately (see "Docs" below) — but the PR body
frames the ESG4Stars benefit as immediate, and at usegalaxy-eu it is contingent on a separate
operational change. Worth stating in the PR body so nobody is surprised by a wall of zeroes.

---

## P3 findings

### P3-1 — On the task path, each task records the parent job's count

`_collect_metrics` is also called from `TaskWrapper.finish` with a `Task`
(`lib/galaxy/jobs/__init__.py:3018`). `TaskWrapper.__init__` sets `self.task_id = task.id` and
then `super().__init__(task.job, queue)` (`jobs/__init__.py:2877-2879`), so `self.job_id` is the
*parent job's* id. The plugin therefore queries the parent job's resubmission count and
`add_metric` attaches it to each task. Job splitting is largely vestigial and the number is at
least not wrong, just duplicated, so this is a footnote — but the injection redesign
incidentally clarifies it, since the caller would pass whichever object it actually has.

### P3-2 — RST underline lengths, including an unrelated edit to the `cpuinfo` heading

`doc/source/lib/galaxy.job_metrics.instrumenters.rst` uses exactly-matching underlines
throughout (`cgroup` 47/47, `core` 45/45, `env` 44/44, `hostname` 49/49 on `dev`). The PR:

- adds `galaxy\_job\_metrics.instrumenters.resubmission module` (53 chars) with a 54-char
  underline, and
- **changes the `cpuinfo` underline from 48 to 49** for a 48-char title, breaking the
  convention on a line the PR otherwise has no reason to touch.

Neither produces a Sphinx warning (overlong underlines are legal), and "Build docs" is green.
Both are one-character fixes; the `cpuinfo` line should just be reverted.

### P3-3 — Docs: accurate, but unwrapped and silent on two limitations

The prose claims check out:

- *"reads the persisted job state history"* — correct.
- *"includes both configured resubmission rules and runner-triggered resubmissions, such as
  Slurm node-failure recovery"* — correct, and I verified the Slurm path
  (`lib/galaxy/jobs/runners/slurm.py:142-149`, `NODE_FAIL` → `mark_as_resubmitted`).
- *"does not include scheduler-internal requeues that Galaxy does not observe"* — correct by
  construction.
- *"It has no options."* — correct.

Two gaps and a nit:

- Nothing documents that the plugin does not work in a per-destination `metrics:` block (P1-2).
  As long as that behaviour exists it needs to be written down.
- Nothing documents domgz's caveat (P2-3) — that a deployment bypassing Galaxy's resubmission
  mechanism will see zeroes. That is the first thing an admin will hit.
- `doc/source/admin/job_metrics.rst` wraps at ~120 columns throughout; the two new paragraphs
  are single lines of 356 and 206 characters (lines 61 and 63).

### P3-4 — Integration test coverage is genuinely good; small nits only

Credit where due — this is the part of the PR I would not change much. The tests drive **real**
resubmissions through the existing `failure_runner` harness and assert three distinct counts:

- `test_failure_runner_job_metrics_collected` → 0 (a job that fails without resubmitting)
- `test_walltime_resubmission` → 1
- `test_multiple_resubmissions_are_counted_after_working_directory_reset` → 2

That is real end-to-end coverage of the number, including the `0` case, which is easy to skip
and is the one that proves `0` is recorded rather than dropped. (It is: `job_properties` returns
`{"resubmission_count": 0}`, a non-empty dict, so `if properties:` at
`job_metrics/__init__.py:229` keeps it, and `if metric_value is not None:` at `jobs/__init__.py:2415`
records it.) The refactor of the two existing tests into `with self.dataset_populator.test_history()`
blocks to get a `history_id` is the right way to do it and touches nothing else.

Nits:

- `_assert_resubmission_count` asserts `resubmission_metric["plugin"] == "resubmission"` after
  having already selected on that predicate — redundant.
- The `next(...)` generator will raise `StopIteration` rather than an assertion failure when the
  metric is missing, which reads as an error rather than a failure. `next(..., None)` plus an
  explicit `assert ... is not None, "resubmission metric not collected"` gives a better message.

I did **not** run the integration suite (see "Not verified").

---

## Verdict

**Request changes.** The feature is worth having and I would like it to land; the objection is
to the shape, and all of it is fixable without cutting scope.

The load-bearing problems are (1) `galaxy-job-metrics` is one of five packages Pulsar installs
on compute nodes, so it cannot take `sqlalchemy` and `galaxy-data` — the answer to davelopez's
question is no, and the `app` kwarg the plugin uses to get around that is not an interface but a
value squatting in the admin's config keyspace (`plugin_config.py:149-155`); (2) the `app is
None` fallback is a reachable silent no-op, because per-destination `metrics:` blocks never
receive `app` at all, which I reproduced; and (3) Galaxy already computes this number in
`_ExpressionContext` and publishes it to admins as `attempt`, so as written the PR adds a third
hand-rolled reading of `job_state_history` rather than consolidating.

**Is this the right abstraction?** Right feature, right storage (`job_metric_numeric`), right
safety level, good integration tests — wrong layer. The fix is not novel: `galaxy.objectstore`
and `galaxy.files` both solved "a low package needs something only the app can provide" with a
`Protocol` declared in the low package and an implementation injected from above
(`objectstore/__init__.py:91-96` + `app/__init__.py:610-611`; `files/__init__.py:30-31, 69-75`).
Adopting that here — plus a `Job.resubmission_count` property that `_ExpressionContext` also
uses — leaves the tree with one definition of the count instead of three, keeps
`galaxy-job-metrics` on `galaxy-util`, deletes the silent-`{}` failure mode, and makes the unit
test meaningful. It is a bigger diff than the current one, but most of it is deletion.

---

## Not verified

- Did not run `test/integration/test_job_resubmission.py`. It needs a full test-server startup
  and the worktree has no `.venv`; the unit runs above borrowed the `pr/22781` venv. So the
  0/1/2 assertions are read, not observed — including whether `_assert_job_fails` +
  `test_history()` interact cleanly in the new multi-resubmission case.
- Did not exercise a Pulsar deployment. The P1-1 claim that `resubmission.py` is imported on
  compute nodes is reasoned from `packages_for_pulsar_by_dep_dag.txt` plus the unconditional
  `import_submodules` walk, not from a Pulsar install.
- Did not check for out-of-tree `InstrumentPlugin` subclasses beyond this repo; the
  backward-compatibility argument for the additive `collect` hook assumes some exist and is
  deliberately conservative either way.
- The `Job.resubmission_count` property and the `collect` hook are sketches typed into this
  note, not code I ran.

---

## Draft review comment

> *Posted by Claude (AI assistant) on behalf of jmchilton — not authored by them personally.*

I like this and I'd like to see it land. "Which tools keep getting resubmitted with bumped
resource requests" is exactly the question an admin needs to answer to find bad TPV rules, and
there's no good way to ask it today — you can see that a single dataset's job was resubmitted,
but you can't aggregate. Putting the count in `job_metric_numeric` is the right vehicle for
that, since it lands next to `core`'s runtime and `cgroup`'s memory and the same reporting
queries pick it all up together. So this is a "wrong shape" review, not a "should we do this"
review.

**On the packaging question raised on `resubmission.py:13` — I think it's a fairly clear no, and
the reason may not be obvious.** `galaxy-job-metrics` is one of the five packages Pulsar
installs on compute nodes (`packages/packages_for_pulsar_by_dep_dag.txt`), which is the whole
reason it's split out — instrumentation has to run on the compute side. And the import isn't
avoidable: `JobMetrics.__plugins_dict` walks `galaxy.job_metrics.instrumenters` with
`import_submodules` and imports *every* module unconditionally, configured or not. So adding
`galaxy-data` here would put `numpy`, `pysam`, `h5py`, `bx-python`, `alembic`,
`social-auth-core` and friends onto every Pulsar node in exchange for one integer. (Adding just
`sqlalchemy` wouldn't work either — it'd move the failure one line down to
`from galaxy import model`.) Also worth knowing: `packages/job_metrics/tests/job_metrics` is a
symlink to `test/unit/job_metrics/`, so the new unit test is part of the package's isolated
suite too — that's why CI reports three collection errors instead of one.

**Two other things I found while digging, both of which the same fix addresses:**

*The `app is None -> return {}` fallback is reachable in real config, not just tests.*
`JobMetrics.__init__` takes `**kwargs` but doesn't retain them, and the three per-destination
builders (`set_destination_conf_dicts` / `_conf_element` / `_conf_file`,
`lib/galaxy/job_metrics/__init__.py:125-137`) construct `JobInstrumenter` with no kwargs at all.
So an environment with an explicit `metrics:` list gets `app=None` and silently records nothing
— no error, no log line. I reproduced this against the PR head:

```
global config   -> app = 'FAKE_APP'
per-destination -> app = None
per-destination job_properties(1, /tmp) -> {}
```

For a metric aimed at diagnosing particular destinations, admins configuring per-destination
metrics are exactly the likely audience. I'd call this a pre-existing framework gap that this PR
is just the first to hit — nobody noticed because no plugin had ever depended on the `app`
kwarg before.

*Galaxy already computes this number.* `_ExpressionContext` in the resubmit state handler
(`lib/galaxy/jobs/runners/state_handlers/resubmit.py:141-151`) counts the same `resubmitted`
rows and publishes them to admins as the `attempt` variable in `resubmit:` conditions. The PR's
docs actually state the equivalence — "the execution attempt number is therefore
`resubmission_count + 1`" — and the new integration test demonstrates it: it targets
`fail_two_attempts`, whose config is `condition: 'attempt < 3'`, and asserts
`resubmission_count == 2`. Same rows, two implementations that don't know about each other.
(There's a third partial one in `HDAManager.has_been_resubmitted`.)

**A concrete suggestion rather than a demand** — Galaxy has solved "a low-level package needs
something only the app can provide" twice already, and I think reusing that pattern here fixes
all three points at once:

1. Put the count on the model, once:

   ```python
   # lib/galaxy/model/__init__.py, on Job
   @property
   def resubmission_count(self) -> int:
       return sum(1 for h in self.state_history if h.state == Job.states.RESUBMITTED)
   ```

   and have `_ExpressionContext` use `attempt = job.resubmission_count + 1`, deleting its loop.
   Now the metric is *definitionally* the same quantity admins already write conditions against.

2. Declare the slice `galaxy.job_metrics` may see as a `Protocol` inside `galaxy.job_metrics` —
   this is what `galaxy.files` does (`ProvidesFileSourcesTransaction`: *"The slice of a Galaxy
   transaction ProvidesFileSourcesUserContext reads"*) and what `galaxy.objectstore` does with
   `UserObjectStoreResolver` (implemented in `galaxy.managers`, injected at
   `lib/galaxy/app/__init__.py:610`):

   ```python
   class ProvidesJobMetricsContext(Protocol):
       """The slice of a Galaxy job that instrument plugins may read at collection time."""
       @property
       def id(self) -> int: ...
       @property
       def resubmission_count(self) -> int: ...
   ```

   `typing.Protocol` adds no dependency, and `model.Job` satisfies it structurally.

3. Add one *optional* hook to `InstrumentPlugin` so no existing plugin changes:

   ```python
   def collect(self, job: ProvidesJobMetricsContext, job_directory: str) -> dict[str, Any]:
       """Framework entry point. Override to read job context; default delegates."""
       return self.job_properties(job.id, job_directory)
   ```

   `JobInstrumenter.collect_properties` calls `collect` instead of `job_properties`, and
   `JobWrapper._collect_metrics` passes the `Job` it already has — it opens with
   `job = has_metrics.get_job()` on `lib/galaxy/jobs/__init__.py:2398` and then throws it away in
   favour of `self.job_id`, so the object is right there. There's only one call site to change.

   The plugin then becomes `return {RESUBMISSION_COUNT_KEY: job.resubmission_count}` — no
   sqlalchemy, no `galaxy.model`, no `app`, no `None` case.

I went back and forth on whether a frozen dataclass context populated by the caller would be
better than a `Protocol` over the `Job`; it confines what a plugin can reach, which is nice, but
it needs population code and computes the count eagerly for every job whether anyone wants it.
Since metrics plugins are admin-configured trusted code I'd take the zero-cost `Protocol` and
the existing precedent, but I don't feel strongly and the rest of the design is the same either
way.

**Smaller things:**

- The unit tests mock the query away, so they can't detect a wrong predicate — I changed
  `RESUBMITTED` to `QUEUED` in the plugin and all three still pass. That's not really fixable
  while the plugin builds a `select` itself (you'd have to compile the statement and assert on
  SQL); it's another argument for moving the counting to the model, where a real `Job` with real
  `JobStateHistory` rows can be asserted against directly.
- The **integration tests are the strongest part of this PR** — they drive real resubmissions
  and pin 0, 1 and 2, including the `0` case, which is the one that proves zero is recorded
  rather than dropped. Please keep all three through whatever refactor. Two nits:
  `_assert_resubmission_count` re-asserts `plugin == "resubmission"` after already selecting on
  it, and the bare `next(...)` raises `StopIteration` rather than failing with a message.
- `default_safety = Safety.SAFE` is right — non-admins get `SAFE` from `summarize_metrics`, and
  resubmission is already user-visible via the HDA `"resubmitted"` serializer key. Worth noting
  the integration test's visibility depends on it.
- Something to flag given the xref: worth noting in the PR body that a deployment bypassing
  Galaxy's resubmission mechanism will read zero until it switches over, so the ESG4Stars
  benefit isn't immediate everywhere. The docs are accurate about *what* is counted; it's the PR
  framing that implies it works out of the box.
- Docs nits: the two new paragraphs in `job_metrics.rst` are single 356- and 206-character lines
  in a file that wraps at ~120; the new heading's RST underline is one char long; and the
  `cpuinfo` underline got changed from 48 to 49 (it matched exactly before) — that one looks
  accidental and can just be reverted.
- Style is otherwise clean: imports all at module top, `TYPE_CHECKING` used correctly, `__all__`
  matching the sibling plugins.

One thing I'd genuinely like your read on, since it affects how useful this is on day one: a
metric only starts collecting when you enable it, but the `job_state_history` rows are already
there for every job that ever ran. For the "find the worst-offending tools" use case, is
going-forward data enough, or is it worth a note in the docs that a direct query over
`job_state_history` answers the same question retroactively?

---

## Implementation — `resubmit` branch

Rather than hand the redesign back to gsaudade99 (a sysadmin, with better things to do), we
built it. Worktree `~/projects/worktrees/galaxy/branch/resubmit`, branch `resubmit`, merged up
to `fa2fa47aed`. 16 files, and pushed to `jmchilton/resubmit`.

Four commits, the first his:

- `0b1fabc6a8` **gsaudade99** — `add resubmission as job_metrics`, cherry-picked whole so
  authorship covers the docs and formatter as well as the tests.
- `1680351fc2` — `Count resubmissions in one place, on the Job`
- `3b0675f5d6` — `Let instrument plugins read the job, without importing it`
- `39332c1bf5` — `Record resubmission_count from core, rather than a plugin to switch on`
- `2117f40b9d` — `Let a formatter decline to display a metric it still records`
- `3119c23059` — `Make displaying a zero resubmission count an admin's call`

### What changed against the review's proposal

The design is as sketched in inquiry (b), with one deliberate departure: **the metric lives in
`core` rather than in a plugin admins switch on.** The reasoning is the one the note itself
raised under retroactivity — this question is only ever asked after the interesting jobs have
run, so an opt-in plugin is empty on every instance that had not already guessed it would want
one. The cost of always-on turned out to be nil (see below), so there was nothing to trade off.

Consequently `resubmission.py` is deleted rather than fixed. P1-1 and P1-2 dissolve with it.

### The performance premise, verified

`set_final_state` (`model/__init__.py:2441`) calls `set_state`, which appends to
`state_history` — that forces the lazy collection to load. It runs at `jobs/__init__.py:2313`,
three lines before `_collect_metrics` at 2316. So on the normal finish path the property reads
what the session already holds: **no extra query.** Worst case is the `fail()` path
(`:1469` collects metrics before `:1516` sets the final state), where a job loaded fresh costs
one indexed SELECT.

### Recorded always, displayed when non-zero

The first cut recorded the metric only when non-zero, to keep a `job_metric_numeric` row per
job off large instances. That was rejected: it makes the metric mean two things, since absent
could be "never resubmitted" or "this Galaxy predates the metric".

So it is recorded on every job, and *displaying* is decided separately. The question was whether
Galaxy's existing custom-display support could express that, and it could not:

- **Safety levels** already keep a metric out of the UI (`dictifiable_metrics` filters on them),
  but `configured_plugin.safety(metric_name)` decides per metric *name*. It cannot say "show
  this one only at values worth seeing".
- **`JobMetricFormatter`** is the per-plugin display hook, but `format()` had to return a
  `FormattedMetric` — no channel for "nothing to show".

The extension is one return type: `format()` may now return `None`, meaning recorded but not
displayed, and `dictifiable_metrics` drops those beside the ones safety removes. It is
value-dependent, per-plugin, and available to any future metric with the same shape.
`CpuInfoFormatter` delegates to the base formatter so its annotation widened to match; the other
formatters return a `FormattedMetric` directly and are untouched.

Consequence worth naming: the suppression is server-side, so the API omits the zero too, admins
included. The value is in the database either way, so reports and direct queries see a uniform
metric.

### `show_zero_resubmissions`, and the formatter lookup it exposed

Hiding is the default; a `core` option turns the zero back on. Plugin config already reaches
constructors in both syntaxes — `__load_plugins_from_element` takes an XML element's tag as the
plugin type and `dict(plugin_element.items())` as kwargs, `__load_plugins_from_dicts` does the
YAML equivalent — so the option itself was free. Parsed with `asbool`, because XML attributes
arrive as strings and `"false"` is truthy; `cgroup`, `cpuinfo` and `meminfo` all do this for
their `verbose` options.

Getting it to the *rendered* metric was not free. `JobMetrics.format` looked up
`plugin_classes[plugin].formatter` — the class attribute — and `CorePlugin` assigned that
exactly once, guarded by `if CorePlugin.formatter is None`. Whichever `core` plugin was
constructed first fixed the formatter process-wide, so no configured option could reach display.
The existing `timezone` option has the same latent bug.

Fixed by asking the configured plugin first, mirroring the safety lookup a few lines below in
the same function, with the class attribute kept as fallback for metrics whose plugin is no
longer configured. The default instrumenter is the one consulted, since `summarize_metrics`
renders without a destination.

Red-to-green on this specifically: with the class-only lookup restored,
`test_show_zero_resubmissions_reaches_display_from_the_metrics_configuration` fails. Note the
existing `verbose` options are all *collection*-time filters inside `job_properties` — this is
the first config-driven display filter, so it establishes the pattern.

### Verification

- `test/unit/job_metrics/` + `test/unit/data/model/test_model.py` — **29 passed**.
- Red-to-green confirmed on `Job.resubmission_count`: with the property removed the new test
  fails `AttributeError: 'Job' object has no attribute 'resubmission_count'`.
- **The Protocol is load-bearing, not decorative.** mypy accepts `Job` where
  `ProvidesJobMetricsContext` is wanted; a negative control passing `JobStateHistory` is
  rejected with *"missing following ProvidesJobMetricsContext protocol member:
  resubmission_count"*.
- mypy (Makefile invocation, `cd lib && mypy ...`) — 13 errors, all in unrelated transitive
  modules (`objectstore/s3.py`, `util/__init__.py`, tool_util models); **none in changed files**.
  Same borrowed-venv stub noise seen during the 23321 work.
- ruff + flake8 clean; pre-commit hooks passed on each commit.
- `grep` confirms no `sqlalchemy`, `galaxy.model`, `galaxy.app` reference remains anywhere in
  `lib/galaxy/job_metrics/` or `test/unit/job_metrics/` — which matters because
  `packages/job_metrics/tests/job_metrics` is a symlink to `test/unit/job_metrics/`, so the new
  test files are part of the package's isolated suite.
- Pulsar checked against the local clone: it calls only `pre_execute_commands` /
  `post_execute_commands`, never `collect_properties`, so widening that signature does not
  reach it.
- 3 failures in `test/unit/app/jobs/` (`test_expression_run`, `test_runner_local`) are
  **pre-existing** — identical failures on unmodified `fa2fa47aed`, caused by the borrowed venv.

### Not done

- Integration test not run — needs a full test-server startup and the worktree has no `.venv`.
  The 0/1/2 assertions are still read, not observed.
- Pushed to `jmchilton/resubmit`; no PR opened.
