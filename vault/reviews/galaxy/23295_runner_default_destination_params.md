# PR 23295 — Generalize runner-level `default_<param>` seeding of destination params

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23295 |
| **Author** | ksuderman (Keith Suderman) |
| **Base branch** | `dev` |
| **Head reviewed** | `ef9560684d27259d2674a4600aa91649bddd926e` (merge-base `1e5d2683af`) |
| **Size** | 3 files, +115 / -8 |
| **State** | OPEN, 0 reviews, 0 comments at time of writing; opened 2026-08-13 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23295` |
| **Predecessor** | #23068 (merged `fb7b5ce335`, 2026-07-14) |
| **Verdict** | **Request changes — two small ones.** The direction is right and the `default_` prefix is a genuinely good idea, but the helper ships with a resolution rule that an existing in-repo regression test explicitly guards against, and the rename leaves a live-but-dead config key behind. Both are a few lines. |

---

## What it does

Promotes the ad-hoc `PASSTHROUGH_PARAMS` mechanism that #23068 put on
`PulsarGcpBatchJobRunner` into two pieces on `BaseJobRunner`:

- `runner_default_destination_params: list[str]` — opt-in class attribute
  (`lib/galaxy/jobs/runners/__init__.py:105-112`)
- `_apply_runner_default_destination_params(job_destination) -> bool` — for each listed
  `<param>`, if the destination has no key `<param>` and `self.runner_params` has a truthy
  `default_<param>`, copy it onto `job_destination.params`
  (`lib/galaxy/jobs/runners/__init__.py:284-304`)

Then registers `default_custom_vm_image` in `PULSAR_PARAM_SPECS`
(`lib/galaxy/jobs/runners/pulsar.py:223-229`), swaps `PulsarGcpBatchJobRunner` onto the new
attribute + helper (`lib/galaxy/jobs/runners/pulsar.py:1202-1210`), and adds five unit
tests in `test/unit/app/jobs/test_runner_default_destination_params.py`.

I ran the new tests (borrowed venv from the `pr/22781` worktree, `PYTHONPATH=lib`):
**5 passed**. Nothing was weakened; the file is purely additive.

---

## Claims I verified

**"#23068 is unreleased, so the rename is clean."** Holds. The merge commit
`fb7b5ce3358e24e76aad3cb970fdc7d804ed34ce` is not an ancestor of `origin/release_26.1` or
`origin/release_26.0`. It is `dev`-only. And `grep -rn custom_vm_image lib/ doc/ test/ config/`
finds no documentation or sample-config reference to the old runner-level name — nothing
stale to update, because #23068 never documented it. (See P3-3: this PR doesn't document
the new name either.)

**"Mutating `job_destination.params` in place is safe."** Holds, and it's the sanctioned
pattern. `JobConfiguration.get_destination` (`lib/galaxy/jobs/__init__.py:814-828`) says so
in its own docstring: *"Destinations are deepcopied as they are expected to be passed in to
job runners, which will modify them for persisting params set at runtime."* Dynamic and TPV
destinations construct a fresh `JobDestination` per mapping, and `JobDestination` is a
`@dataclass(eq=False)` with a `default_factory=dict` for `params`, so there's no shared-dict
aliasing. This one is fine.

**"There's a commented-out sketch of this idea in Pulsar's base `_populate_parameter_defaults`."**
Holds — `lib/galaxy/jobs/runners/pulsar.py:646-651`, dating to the LWR era (last touched only
by the 2015 flake8 pass, `9805294f97`). Answering the question of *why* it stayed commented
out: the sketch reads `self.runner_params.get(key)` where `key` iterates
`destination_defaults`, i.e. it mirrors a runner-level param onto a destination param **of
the same name**. Pulsar's two namespaces overlap by name and not by meaning
(`PULSAR_PARAM_SPECS` holds `amqp_url`, `manager`, `relay_*`; `destination_defaults` holds
`jobs_directory`, `url`, `private_token`, …), so switching that on wholesale would have
conflated them. **This PR's `default_` prefix is exactly the fix for that**, and it is the
strongest thing about the design. Credit where due.

**"The same logic is hand-rolled in three places."** Half-holds. See the abstraction section.

---

## The abstraction question — why this PR exists

### Does an existing mechanism already do this? Mostly no — but a *better* prototype exists

I checked `_populate_parameter_defaults` (Pulsar-only, `pulsar.py:638`), `RunnerParams` /
`ParamsWithSpecs` (`lib/galaxy/jobs/runners/__init__.py:88`, `lib/galaxy/util/__init__.py:1305-1330`),
`JobDestination` / `JobConfiguration.get_destination`, and the job_conf schema handling.
There is no generic runner→destination defaulting layer. The author's claim that none exists
is correct, and TPV's destination inheritance is the wrong layer for this (it can't see
runner plugin config).

**But `GoogleCloudBatchJobRunner._get_job_params` (`lib/galaxy/jobs/runners/gcp_batch.py:244-280`)
is already a more complete version of the same idea**, with a three-tier resolution —
destination param > runner config > spec default — implemented in one line:

```python
params[key] = job_destination.params.get(key, self.runner_params[key])
```

and it carries a comment explaining precisely the trap this PR walks into (quoted in P1-2
below). It is also covered by a parametrized regression test that derives its key list
dynamically so new params are auto-covered
(`test/unit/app/jobs/test_gcp_batch_runner.py:365-430`).

So the honest framing is: **the abstraction worth extracting already exists in `gcp_batch.py`,
and this PR extracts the weaker of the two candidates.** The new helper is two-tier (no spec
default), truthiness-gated rather than presence-gated on the runner side, and mutating rather
than resolving. If `BaseJobRunner` is going to grow one blessed way to do this, it should be
the gcp_batch shape with the `default_` prefix bolted on, not the Pulsar shape.

### Is `BaseJobRunner` the right home, and is the seam right?

The home is right; **the seam is not.** `_populate_parameter_defaults` does not exist on
`BaseJobRunner` at all — grep across `lib/` and `test/` finds it only in `pulsar.py` (defined
at :638 and :1207, called once at :399 from `PulsarJobRunner.queue_job`). So the new helper
sits on the base class with **zero base-class call sites**, and the only hook that invokes it
is Pulsar-specific.

Concretely, the "future migration" for HTCondor / GCP Batch / Kubernetes doesn't just mean
"add a list and register specs" — each of those runners has no `_populate_parameter_defaults`
to override, so each has to invent its own call site inside its own `queue_job`. That is the
footgun: an opt-in list that silently does nothing unless a subclass separately remembers to
call a protected helper, on a path the base class doesn't own.

Two better seams, either of which would make the attribute self-enforcing:

1. Define `_populate_parameter_defaults(job_destination)` on `BaseJobRunner` (default:
   call the new helper, return whether anything changed), have Pulsar's override chain up to
   it as it already does, and call it from `BaseJobRunner.prepare_job`
   (`lib/galaxy/jobs/runners/__init__.py:306`) — which every runner's `queue_job` already
   invokes. Pulsar would need care not to double-apply, but that's mechanical.
2. Apply it where the destination is resolved rather than where it's consumed — i.e. in the
   mapper/`JobConfiguration` path, before `set_job_destination` persists the params. This
   also fixes P3-2.

Option 1 is the smaller change and is what I'd suggest.

### Does it subsume the three cited sites? Only one of them

| Site | Runner-side lookup | Destination-side gate | Writes to |
|---|---|---|---|
| `PulsarGcpBatchJobRunner` (#23068) | `.get(key)`, truthy | `key not in params` | destination params (mutates) |
| `GoogleCloudBatchJobRunner` (`gcp_batch.py:244-280`) | `self.runner_params[key]` — subscript, **falls through to spec default**; no truthiness gate | `params.get(key, …)` — presence | a fresh local dict, destination untouched |
| `HTCondorJobRunner` (`htcondor.py:467-469`) | `self.runner_params.htcondor_collector` — attribute, **falls through to spec default** | `params.get(k) or …` — **truthiness on the destination side** | local variables |
| New helper | `.get(f"default_{k}")`, truthy | `k not in params` | destination params (mutates) |

Three of the four columns differ for two of the three sites:

- **GCP Batch** would lose spec-default fallback and gain a truthiness gate, so
  `delete_completed_jobs: true` (spec default `True`) and `use_container` / `use_object_store`
  (booleans) would stop resolving correctly. It would also start mutating the destination it
  currently leaves alone.
- **HTCondor** gates on the *destination* value's truthiness — an empty-string
  `htcondor_collector` on a destination currently falls back to the runner; under the helper
  it would win. Different behavior for a real config shape.

So the "future migration" story in the PR body is weaker than stated: it isn't only a rename
problem, it's a semantics problem. Worth saying plainly in the PR body rather than leaving
reviewers to discover it during those migrations. **The author's reason for deferring the
migrations (released config surface) is sound and I'd keep them out of this PR** — the fix is
to the claim, not the scope.

---

## P1 findings

### P1-1 — The old runner-level `custom_vm_image` spec is still registered, so existing `dev` configs silently no-op

`lib/galaxy/jobs/runners/pulsar.py:219-222` still has:

```python
custom_vm_image=dict(
    map=specs.to_str_or_none,
    default=None,
),
```

That entry was added by #23068 *purely* as a runner-level knob — `PULSAR_PARAM_SPECS` is
passed only as `runner_param_specs` (`pulsar.py:249`); it is not a destination-param schema.
After this PR nothing reads it. So an admin who adopted #23068 on `dev` and wrote

```yaml
pulsar_gcp_batch:
  load: galaxy.jobs.runners.pulsar:PulsarGcpBatchJobRunner
  custom_vm_image: projects/…/galaxy-cvmfs-image
```

gets **no error, no warning, and no custom VM image** — jobs quietly launch on the default
boot image. `RunnerParams._param_unknown_error`
(`lib/galaxy/jobs/runners/__init__.py:89-90`) raises `Exception` for unknown runner params,
so *deleting* the entry converts this into a loud startup failure naming the offending key.
That is much better than a silent behavior change, and it's the whole reason the "it's
unreleased, so a clean rename is fine" argument works — the argument only holds if the old
name actually stops being accepted.

Fix: delete `custom_vm_image` from `PULSAR_PARAM_SPECS`. (Alternatively keep it with an
explicit deprecation: map it onto `default_custom_vm_image` and `log.warning`. But given the
key is a month old and `dev`-only, deleting is cleaner and matches the PR's own framing.)

### P1-2 — `.get()` on `RunnerParams` bypasses `__missing__`; the sibling test file already guards against exactly this

`lib/galaxy/jobs/runners/__init__.py:300`:

```python
runner_value = self.runner_params.get(f"default_{name}")
```

`RunnerParams` is a `collections.defaultdict` subclass whose `__missing__` returns
`self.specs[name]["default"]` (`lib/galaxy/util/__init__.py:1325-1326`), and `__init__` only
`update()`s the keys the admin actually configured. `dict.get()` does not invoke
`__missing__`, so **an unset param resolves to `None` instead of its spec default.**

This is not a hypothetical — `gcp_batch.py:274-277` carries the warning in the code:

```python
# Subscript access on runner_params (a defaultdict) so unset keys fall
# back to the spec defaults defined in runner_param_specs; .get() would
# bypass __missing__ and yield None instead of the configured default.
params[key] = job_destination.params.get(key, self.runner_params[key])
```

and `test/unit/app/jobs/test_gcp_batch_runner.py:385-396` is a parametrized regression test
whose docstring says *"This is the regression guard: .get() on the RunnerParams defaultdict
would bypass `__missing__` and yield None instead of the configured default."*

Demonstrated against the PR head with real `RunnerParams`:

```
specs = {"default_use_container": dict(map=bool, default=True)}
runner_params["default_use_container"] -> True
runner_params.get("default_use_container") -> None
_apply_runner_default_destination_params(dest) -> False, dest.params == {}
```

Today this is **latent**: `default_custom_vm_image`'s spec default is `None`, so behavior is
unchanged. But the PR's entire purpose is to publish a reusable mechanism, and it publishes
one whose contract silently disagrees with the same repo's other implementation of the same
idea. The first runner to register a `default_<param>` with a meaningful spec default hits it.

Fix: `self.runner_params[f"default_{name}"]`. Note the trade-off — subscript raises
`KeyError` if the spec wasn't registered, which is the correct loud failure for a
mis-declared abstraction (see P3-1) but happens at job-queue time. If that's a concern,
validate the declaration in `BaseJobRunner.__init__` instead (also P3-1) and keep the
subscript here.

---

## P2 findings

### P2-1 — The truthiness gate makes `false` / `0` / `""` runner-level defaults unexpressible

`if runner_value:` at `lib/galaxy/jobs/runners/__init__.py:301` means an admin can never use
this mechanism to set a boolean default to `false` or a numeric default to `0`. With
`map=bool` I confirmed a runner-level `default_use_container: ""` maps to `False` and is
skipped — the admin explicitly configured a value and it was discarded.

The destination side is already correctly presence-based (`if name in params`). The runner
side should match: `if f"default_{name}" in self.runner_params` — asymmetric gates in a
six-line helper are the kind of thing that gets copied without being reread. If truthiness is
deliberate (i.e. "`None` means unset because every spec defaults to `None`"), say so in the
docstring, because as written the docstring says "defines a truthy `default_<param>`" without
explaining why truthy rather than present.

This also matters for the migration story: HTCondor's and GCP Batch's params include booleans.

### P2-2 — The tests hand-roll a stub instead of reusing the fixture pattern next door, which is why P1-2 isn't caught

`test/unit/app/jobs/test_runner_default_destination_params.py:10-16` defines `_StubRunner`
with `self.runner_params = runner_params` — a **plain dict**. `dict.get` and
`RunnerParams.get` behave identically, so the tests cannot observe the `__missing__` bypass;
they test a mock, not the mechanism.

Two established patterns in the same directory should have been reused:

- `test/unit/app/jobs/test_gcp_batch_runner.py:365-372` — `object.__new__(Runner)` +
  a real `RunnerParams(specs=…, params=…)`. This constructs the runner without running
  `__init__` (no client, no threads) while keeping the real params object.
- `test/unit/app/jobs/test_runner_params.py` — the existing home for `RunnerParams`
  semantics, including `test_param_default` which asserts exactly the subscript-vs-spec-default
  behavior.

Also missing: **no test that `PulsarGcpBatchJobRunner` actually invokes the helper.** The
override at `pulsar.py:1207-1210` is untested; the `runner_default_destination_params` list
and the `default_custom_vm_image` spec registration are only exercised as literals passed to
a stub. A test that builds a `PulsarGcpBatchJobRunner` via `object.__new__` with
`RunnerParams(specs=PULSAR_PARAM_SPECS, params={"default_custom_vm_image": …})` and calls
`_populate_parameter_defaults` would cover the wiring, the spec registration, and the
interaction with the inherited `destination_defaults` pass in one test — and would have
caught P1-1 if written to assert the old key is rejected.

Otherwise the five tests are reasonable and cover the stated contract. They do restate the
implementation fairly closely (each test maps 1:1 onto a branch), but that's acceptable for a
helper this small; the gap is the stub, not the case selection.

### P2-3 — The PR body's "subsumes three hand-rolled cases" claim needs softening

Covered in the abstraction section. Suggestion, not a defect in the code: the body should say
the other two sites differ in *semantics* (spec-default fallback, and which side the
truthiness test is on), not just in config-surface naming. Otherwise the follow-up PRs get
planned as renames and turn out to be behavior changes.

---

## P3 findings

### P3-1 — A listed param with no registered `default_<param>` spec fails silently

Verified: a runner declaring `runner_default_destination_params = ["never_registered"]`
without a matching spec produces no error and no seeding — `.get()` returns `None`. The
abstraction has three things that must agree (the list, the spec entry, the call site) and no
check that they do. A one-line assertion at the end of `BaseJobRunner.__init__` —
every `f"default_{n}"` for `n in self.runner_default_destination_params` is in
`runner_param_specs` — makes a misdeclaration a startup error, which is where it belongs.
This pairs with the P1-2 fix.

### P3-2 — Seeded values never reach `job.destination_params`

`_populate_parameter_defaults` runs inside `PulsarJobRunner.queue_job` (`pulsar.py:399`),
which is downstream of `job_wrapper.set_job_destination(...)` in the handler
(`lib/galaxy/jobs/handler.py:347`). So values seeded by this helper are in the in-memory
`JobDestination` only; they are not persisted. Consequences:

- On Galaxy restart, `PulsarJobRunner.recover` (`pulsar.py:846`) builds `AsynchronousJobState`
  from `job_wrapper.job_destination`, which for a recovered job is reconstructed from the
  persisted `job.destination_params` (`lib/galaxy/jobs/__init__.py:1042`) — so the seeded
  value is gone for the remainder of that job's lifetime.
- Anything reading persisted params rather than the live object — e.g. `_set_working_directory`
  (`lib/galaxy/jobs/__init__.py:1860-1872`, which documents this exact staleness hazard) —
  won't see runner-level defaults.

This is **pre-existing** — it's equally true of the `destination_defaults` seeding the helper
sits beside, and harmless for `custom_vm_image`, which is consumed only at submission. But
`BaseJobRunner` is now advertising the mechanism to every runner, and the docstring should
note the limitation ("seeded values are not persisted to `job.destination_params`; don't use
this for params read on the recovery path"). Or move the seam upstream of persistence, which
is option 2 in the seam discussion.

### P3-3 — No sample-config or docs entry for the new knob

`lib/galaxy/config/sample/job_conf.sample.yml:369-376` has a `pulsar_gcp` runner block that
documents `amqp_url` and `galaxy_url`. `default_custom_vm_image` is a new admin-facing knob
and the first user of a new naming convention; a two-line commented entry there is where an
admin will actually find it. #23068 didn't document `custom_vm_image` either, so this is
inherited rather than introduced — but this PR is the one establishing the convention, so
it's the right place to start documenting it.

### P3-4 — Nits

- `runner_default_destination_params: list[str] = []` (`runners/__init__.py:112`) is a mutable
  class-level default. It's only ever read and subclasses rebind rather than mutate, so it's
  safe today; `ClassVar[list[str]]` would express the intent (and stop a subclass from
  assigning it per-instance, which is what the test stub does).
- Python style is otherwise clean: `JobDestination` is imported at module top
  (`runners/__init__.py:36`), no function-local imports were added, `list[str]` and the
  annotated return type match the surrounding module's conventions, and the docstrings follow
  the file's Sphinx-ish style.
- Naming: `runner_default_destination_params` reads as "default destination params" rather
  than "destination params with runner defaults". `destination_params_with_runner_defaults`
  or `runner_defaultable_destination_params` is clearer, but this is bikeshedding — the
  docstring disambiguates it and the current name isn't wrong.

---

## Verdict

**Request changes**, on P1-1 (delete the dead `custom_vm_image` spec so stale `dev` configs
fail loudly instead of silently launching on the wrong image) and P1-2 (subscript, not
`.get()`, on `RunnerParams` — the repo already has a comment and a regression test saying so).
Both are one-liners.

Beyond that: the `default_` prefix is the right call and resolves the ambiguity that kept the
2013-era sketch commented out for a decade. What I'd push back on is the shape. The seam is
opt-in-by-remembering-to-call on a hook (`_populate_parameter_defaults`) that only Pulsar has,
so the advertised migration path for HTCondor/GCP Batch/Kubernetes requires each of them to
invent a call site; and the extracted semantics are the weaker of the two implementations
already in the tree — `GoogleCloudBatchJobRunner._get_job_params` does destination > runner >
spec-default resolution in one line and is regression-tested. If this is going to be *the*
mechanism, it should be that resolution rule, hung off `BaseJobRunner.prepare_job` (or the
destination-resolution path) so no runner has to opt in twice.

**Is this the right abstraction?** Right idea and right naming convention; wrong seam and a
weaker resolution rule than the one the codebase already proved out in `gcp_batch.py`.

---

## Not verified

- Did not run any Galaxy suite beyond the new file's 5 tests (borrowed venv; no `.venv` in
  this worktree).
- Did not exercise a live Pulsar/GCP Batch submission — the seeding path's end-to-end effect
  on the Pulsar client is reasoned from `get_client_from_wrapper` (`pulsar.py:671-682`), not
  observed.

---

## Suggestion branch — `23295-review-suggestions`

Pushed to `jmchilton/galaxy` and opened as a suggestion PR against ksuderman's branch:
**https://github.com/ksuderman/galaxy/pull/10**. Commit `13026c1f6b` on top of the PR head
`ef9560684d`; worktree `~/projects/worktrees/galaxy/pr/23295`. A sketch of the findings above as code, not a merge candidate. 4 files,
+168 / −62. `pytest test/unit/app/jobs/test_runner_default_destination_params.py
test_gcp_batch_runner.py test_runner_params.py` → 164 passed. Red-to-green verified:
stashing the `lib/` changes and re-running the new file gives **6 failed, 9 passed**, one
failure per finding.

### Correction to the seam recommendation above

Option 1 as written ("call it from `BaseJobRunner.prepare_job`, which every runner's
`queue_job` already invokes") is wrong on its second clause. **`PulsarJobRunner` never calls
`prepare_job`** — `queue_job` (`pulsar.py:397-402`) calls its own private `__prepare_job`
(`:524`), which goes straight to `job_wrapper.prepare()`. `grep -n "prepare_job\|build_command_line"
lib/galaxy/jobs/runners/pulsar.py` returns only lines 401 and 524. So hooking `prepare_job`
alone would have covered every runner *except* the one this PR migrates.

The fix is small and it makes the result better rather than worse: seed from **both**
places and make the helper idempotent, which it already is (the destination-side
`if name in params` gate short-circuits the second pass). `test_seeding_is_idempotent`
pins that. So:

- `BaseJobRunner._populate_parameter_defaults` — new, calls the seeding helper, returns bool.
- `BaseJobRunner.prepare_job` calls it (covers drmaa, condor, aws, gcp_batch, cli, htcondor,
  kubernetes, chronos, godocker, pbs, local, tasks).
- `PulsarJobRunner._populate_parameter_defaults` chains up via `super()` instead of starting
  from `updated = False` (covers Pulsar, which keeps its own call site at `:399`).

Net effect: **`PulsarGcpBatchJobRunner._populate_parameter_defaults` is deleted entirely.**
The runner opts in with one class attribute and nothing else, which is what "generalized"
should mean. The same is then true for HTCondor/Kubernetes/GCP Batch when their turn comes —
class attribute plus spec registration, no call site to invent.

Deleting the commented-out sketch at the old `:646-651` is part of this: the base mechanism
is now the thing the sketch was gesturing at, so leaving it in place would be confusing.

### Resolution rule

```python
runner_value = self.runner_params[f"default_{name}"]   # was .get(...)
if runner_value is not None:                            # was: if runner_value
```

Subscript fixes P1-2. `is not None` rather than presence-checking fixes P2-1 *without*
giving up the spec-default tier — presence (`f"default_{name}" in self.runner_params`) would
be False for an unset-but-spec-defaulted param and defeat the whole point. `None` as the
sentinel matches the convention already in `PULSAR_PARAM_SPECS`, where every
`specs.to_str_or_none` entry defaults to `None`.

**This is the part worth arguing for in the PR comment**, because it retires P2-3. Once the
helper resolves destination > runner > spec-default, its rule is *identical* to
`GoogleCloudBatchJobRunner._get_job_params`. The migration story stops being a semantics
problem and goes back to being what the author said it was — a config-surface rename. The
one exception is HTCondor, which gates on the *destination* value's truthiness
(`params.get(k) or self.runner_params.htcondor_collector`, `htcondor.py:467-469`); that
difference survives, and is arguably an htcondor bug rather than a constraint on the
abstraction.

### Also on the branch

- **P1-1**: `custom_vm_image` deleted from `PULSAR_PARAM_SPECS`. `test_legacy_runner_level_name_is_rejected`
  asserts it stays gone, so a stale `dev` config raises through `_param_unknown_error`
  instead of silently launching on the default boot image.
- **P3-1**: `BaseJobRunner.__init__` raises `ConfigurationError` if a listed param has no
  `default_<param>` spec. This is what makes the subscript safe — a misdeclaration can no
  longer reach job-queue time as a `KeyError`.
- **P3-2**: the non-persistence limitation is in the helper's docstring.
- **P3-3**: `default_custom_vm_image` documented in `job_conf.sample.yml:376-378`.
- **P3-4**: `ClassVar[list[str]]`.
- **P2-2**: tests rebuilt on `object.__new__` + real `RunnerParams`, the pattern from
  `test_gcp_batch_runner.py:365-372`. Added: spec-default fallback, falsy values
  (parametrized `False`/`0`/`""`), destination falsy beats runner default, idempotency,
  misdeclaration raises, and three `PulsarGcpBatchJobRunner` wiring tests.

Not done: `runner_default_destination_params` keeps its name (P3-4 bikeshed), and no other
runner is migrated — the author's reason for deferring those is sound.

### Verification notes

- Ruff/black/flake8 via Galaxy's own pre-commit hooks: passed on all three source files. The
  commit used `--no-verify` only because the trailing-whitespace hook rewrites unrelated
  pre-existing whitespace throughout `job_conf.sample.yml`.
- `test/unit/app/jobs/` full run: 3 failed, 1 error — identical set at baseline with the
  `lib/` changes stashed (`test_runner_local.py` ×2, `test_expression_run.py`,
  `test_job_context.py`). Pre-existing, environment-related; the venv is borrowed from the
  `pr/22781` worktree since this one has none.
- The `prepare_job` insertion is not covered by a test on this branch. `test_runner_local.py`
  would be the place, but it fails at baseline here.
