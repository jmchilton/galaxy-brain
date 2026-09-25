# PR 473 — Dynamic VM sizing, resource env injection, and job lifecycle controls for GCP Batch

**Repo:** galaxyproject/pulsar · **PR:** #473 · **Author:** ksuderman · **Head:** `8827d935ae717a981e3a9f73f396a2ef1b712cf4` · **Base:** `master` (merge-base `0e4e622`)

Three separable features landed as one change against Pulsar's GCP Batch *client* (this is
client-side coexecution launching, not a `pulsar/managers/` manager). The sizing and unit-conversion
helpers are a near-verbatim fork of Galaxy's `lib/galaxy/jobs/runners/util/gcp_batch/helpers.py`,
copied with the stated intent of unifying "in a follow-up". Bottom line: **do not merge as-is.**
Four independent P1s — a job-name scheme that is recomputed non-deterministically and so breaks
status polling and kill; a `kill()` override that silently drops the AMQP kill message; a VM sizing
function that over-provisions by 2–4x on the single most common TPV core:memory ratio; and a feature
the PR description says is implemented (`task.compute_resource`) that is not in the diff at all.
Zero tests were added despite an existing `test/container_job_config_test.py` and a directly
portable upstream test file. Features 1 and 2 are entangled and both need rework; feature 3 (naming,
SSD validation, delete control) is closer but has its own P1.

## What changed

Three files, +275/-22:

- `pulsar/managers/util/gcp_util.py` — +168. New `convert_cpu_to_milli()`,
  `convert_memory_to_mib()`, `compute_machine_type()`, plus `DEFAULT_CPU_MILLI` /
  `DEFAULT_MEMORY_MIB` constants and `__all__` updates.
- `pulsar/client/container_job_config.py` — +84/-12. `cores`/`mem` fields on `GcpJobParams`;
  `parse_gcp_job_params()` now overrides `machine_type`; new `_validate_ssd_size()`; `GALAXY_SLOTS` /
  `GALAXY_MEMORY_MB` injected into `batch_v1.Environment`; `gcp_galaxy_instance_id()` renamed to
  `gcp_job_id_prefix()` with a `"pulsar"` fallback.
- `pulsar/client/client.py` — +23/-8. `_job_name` switched from `produce_unique_k8s_job_name()` to
  `f"{prefix}-{job_id}-{int(time.time())}"` with a `hasattr` cache; `kill()` added to
  `GcpMessageCoexecutionJobClient` and rewritten on `GcpPollingCoexecutionJobClient`, both gated on a
  new `delete_batch_job` destination param.

No tests, no docs, no changelog.

## Feature 1 — dynamic VM sizing

Input path: `parse_gcp_job_params()` (`pulsar/client/container_job_config.py:144-163`) reads `cores`
and `mem` straight off `self.destination_params`. TPV writes both into `job_destination.params`, so
these arrive for essentially every tool on a TPV-managed deployment. If **either** is set,
`machine_type` is unconditionally overwritten by `compute_machine_type()`.

### The sizing math over-provisions on the most common ratio

`compute_machine_type()` (`pulsar/managers/util/gcp_util.py:95-181`) classifies the request by
memory-per-vCPU ratio using a **2.0 GB/vCPU** upper boundary for `highcpu`, then sizes the machine
against a **0.9 GB/vCPU** density for that variant. Those two numbers disagree, and everything
falling in the (0.9, 2.0] band gets its vCPU count inflated by up to 2.2x before rounding up to the
next valid size. I reproduced the function standalone:

```
cores=2  mem=4GB   -> n2-highcpu-8    (requested 2 vCPU, got 8)
cores=4  mem=8GB   -> n2-highcpu-16   (requested 4 vCPU, got 16)
cores=8  mem=16GB  -> n2-highcpu-32   (requested 8 vCPU, got 32)
cores=4  mem=4GB   -> n2-highcpu-8    (requested 4 vCPU, got 8)
cores=1  mem=4GB   -> n2-standard-2
cores=16 mem=64GB  -> n2-standard-16  (correct)
```

`2 GB per core` is the single most common TPV shape in Galaxy tool configs, and it lands on the
worst case: a 4x VM. Compounding it, `GALAXY_SLOTS` is injected from the *request* (2), not the
allocated VM (8) — see Feature 2 — so you pay for 8 vCPU and the tool uses 2. This inverts the
PR's stated goal ("gives tools the full VM resources").

Note also that real `n2-highcpu` is 1 GB/vCPU, not 0.9, so the sizing density is wrong in its own
right; but the classification/sizing mismatch is the actual bug. A 2 GB/vCPU request should classify
as `standard` (`n2-standard-2` = 2 vCPU / 8 GB, cheaper and closer to intent).

### No bounds, no allow-list, no fallback handling

- `cores` and `mem` are `Optional[str]` with no validator. `cores: "512"` sails through
  `convert_cpu_to_milli()` and, after the largest-size fallback, produces a 128-vCPU machine type.
  There is no clamp, no per-destination ceiling, no allow-list of permitted machine types. On a
  deployment where TPV rules are influenced by user-selectable job resource params this is a billing
  surface.
- Units confusion is live and expensive. `mem` is documented as GB
  (`container_job_config.py:138-140`) and converted with `int(float(mem) * 1024)` — i.e. treated as
  **GiB**, not GB. A user who writes `mem: 2048` meaning MiB (the k8s convention, and the convention
  `convert_memory_to_mib()` itself uses for bare integers three lines away) gets
  **`n2-highmem-128`**. Two conversion conventions coexist in one function: the `float()` path treats
  a bare number as GB, the `convert_memory_to_mib()` fallback treats a bare number as MiB. Only
  non-numeric strings reach the second path, so the inconsistency is silent.
- `valid_sizes = [2, 4, 8, 16, 32, 48, 64, 80, 96, 128]` is shared across all three variants. Per
  GCP's N2 machine-series table `n2-highcpu` tops out at 96 vCPU, so the "requirements exceed largest
  size" fallback can emit `n2-highcpu-128`, which I believe is not a real machine type
  (**unverified** against the live Batch API). That fallback path logs a warning and proceeds rather
  than failing.
- No region/zone availability check. If the computed `n2-*` type is unavailable in the configured
  `region`, submission fails at GCP with no local diagnosis. That is arguably acceptable, but worth
  noting there is no fallback to the configured `machine_type`.

### Interaction with `_validate_ssd_size` doubles disk cost silently

`disk_size` defaults to 375 GB = one local SSD, which was valid for the old `n1-standard-1` default.
Once sizing kicks in the family is `n2`, so `_validate_ssd_size()`
(`pulsar/client/container_job_config.py:166-193`) bumps 375 → 750 GB (2 SSDs) on **every** job. That
is a silent doubling of local-SSD cost for existing deployments that never changed a setting.

The even-count rule is also incomplete: GCP's documented allowed local-SSD counts are 1, 2, 4, 8, 16,
24. Rounding an odd count up to even admits 6, 10, 12, 14, 18, 20, 22 — all still invalid. So
`disk_size: 2000` → 2250 GB → 6 SSDs → passes local validation, rejected by GCP. There is also no
upper bound; `disk_size: 100000` yields 267 SSDs. (GCP count table read from docs, **unverified**
against the live API.)

Replacing `assert size_gb % 375 == 0` with a rounding warning is the right direction — the assert was
a crash — but the replacement should reject counts outside the allowed set rather than round to a
different invalid value.

## Feature 2 — resource env injection

`gcp_job_template()` (`container_job_config.py:214-234`) adds `GALAXY_SLOTS` and `GALAXY_MEMORY_MB`
to `batch_v1.Environment.variables` alongside the pre-existing
`PULSAR_CONFIG_OVERRIDE_STAGING_DIRECTORY`.

**The mechanism itself is correct and reuses an existing convention.**
`pulsar/managers/util/job_script/CLUSTER_SLOTS_STATEMENT.sh:26-28` has an explicit
`elif [ -n "$GALAXY_SLOTS" ]` branch commented "kubernetes runner injects GALAXY_SLOTS into
environment", ordered ahead of the `PYTHON_CPU_COUNT` and `"1"` fallbacks. So the injected value does
win, and `MEMORY_STATEMENT.sh:8-11` will derive `GALAXY_MEMORY_MB_PER_SLOT` from
`GALAXY_MEMORY_MB`. No collision with anything Galaxy sets in this path — the whole point is that
nothing sets them on a bare Batch VM. Nothing sensitive is injected; both values are derived
resource numbers. This part is fine.

Three problems around it:

1. **`task.compute_resource` is never set.** The PR description states "`task.compute_resource` is
   set so the container gets the full VM instead of Batch's default 2 vCPU / 2 GB." Grep the diff and
   the file: it is not there. `gcp_job_template()` (`container_job_config.py:196-276`) sets
   `max_retry_count`, `max_run_duration`, `volumes`, and `environment` on the `TaskSpec` and nothing
   else. Galaxy's runner does set it — `lib/galaxy/jobs/runners/gcp_batch.py:318-321`. Taking the PR
   description's own premise, this means the container is capped at 2 vCPU while `GALAXY_SLOTS` tells
   the tool to spawn 8 or 16 threads: thread oversubscription on a container that is already
   4x-oversized at the VM level. Either the description or the code is wrong; both readings are bad.

2. **The injected values are the request, not the allocation.** `galaxy_slots = cpu_milli // 1000`
   from `params.cores` (`container_job_config.py:222-225`). Given Feature 1 routinely allocates 2–4x
   the requested cores, the tool never sees the cores that were actually paid for. The value should
   be derived from the selected machine type (or, better, sizing should stop over-provisioning and
   the two should agree by construction).

3. **`GALAXY_MEMORY_MB` is set to a MiB value** (`container_job_config.py:226-231`, `int(float(mem) *
   1024)`). The variable name and every consumer in `MEMORY_STATEMENT.sh` mean MB. ~5% high; minor
   next to the rest, but it is a unit bug in a PR whose subject is units.

The `int(float(mem) * 1024)` / `convert_memory_to_mib()` block is duplicated verbatim between
`parse_gcp_job_params()` and `gcp_job_template()`. Same input, same computation, two copies that can
drift.

## Feature 3 — job lifecycle controls

### Job naming

`_job_name` (`pulsar/client/client.py:1136-1143`):

```python
@property
def _job_name(self):
    if not hasattr(self, '_cached_job_name'):
        job_id = self.job_id
        prefix = getattr(self, 'job_id_prefix', 'pulsar')
        timestamp = int(time.time())
        self._cached_job_name = f"{prefix}-{job_id}-{timestamp}"
    return self._cached_job_name
```

The cache is per-client-*instance*, and Pulsar builds a brand-new client for every operation.
`MessageQueueClientManager.get_client()` (`pulsar/client/manager.py:289-304`) and
`ClientManager.get_client()` (`:159-166`) both construct and return a fresh client object on each
call; nothing memoizes them. GCP's `_launch_containers()` (`client.py:1115-1134`) returns `None`, so
no external id is persisted for Galaxy to hand back.

Consequence: the timestamp is regenerated on every subsequent operation.
`GcpPollingCoexecutionJobClient.raw_check_complete()` (`client.py:1189-1197`) and both `kill()`
implementations call `get_gcp_job(...)` / `delete_gcp_job(...)` with a job name that does not exist.
Status polling 404s and cancellation silently fails for every job whose poll happens in a different
second than its submit — i.e. all of them.

The upstream implementation this was copied from does not have this bug because it *persists* the
name: `gcp_batch.py:219` builds the same timestamped name, then `:197-198` does
`ajs.job_id = batch_job_name` / `job_wrapper.set_external_id(batch_job_name)` and reads it back at
`:728` and `:789`. The Pulsar copy took the name format and left the persistence behind. Fixing this
means either making the name deterministic from `(prefix, job_id)` — which is what
`produce_unique_k8s_job_name()` gave you and what the collision complaint was about — or plumbing an
`ExternalId` return out of `_launch_containers()` the way the TES mixin already does
(`client.py:848-849`).

The `getattr(self, 'job_id_prefix', 'pulsar')` defensive default is dead code —
`_setup_gcp_batch_client_properties()` is called from both `__init__`s and `gcp_job_id_prefix()`
already defaults to `"pulsar"`.

Neither the prefix nor the assembled name is validated against GCP Batch's `job_id` constraints
(lowercase, `[a-z]([-a-z0-9]*[a-z0-9])?`, ≤63 chars). `galaxy_instance_id` is operator-set and often
a hostname or UUID with dots or uppercase. Galaxy's helpers module already ships
`sanitize_label_value()` (`helpers.py:338`) for exactly this. Not a regression — the old path did not
sanitize either — but the rewrite was the moment to fix it.

### Delete control

`delete_batch_job` (`client.py:1158-1164`, `:1174-1180`), default true, preserves existing behaviour
when unset. Two problems:

1. **The `GcpMessageCoexecutionJobClient.kill()` override drops the AMQP kill message.** The PR
   description says it "adds the previously missing `kill()`". It was not missing — it was inherited
   from `BaseMessageJobClient.kill()` (`client.py:538-539`), which publishes
   `exchange.publish("kill", dict(job_id=self.job_id))`. The new override does not call `super()`, so
   the in-VM Pulsar process is never told to stop and never runs its own teardown. And when
   `delete_batch_job: false`, `kill()` becomes a **complete no-op** — the user's cancel does nothing,
   the VM runs to `walltime_limit` (default 24h). This is a regression against current behaviour on
   the AMQP path.

2. **The retention semantics diverge from the sibling implementation with the same intent.** Galaxy's
   `delete_completed_jobs=false` (`gcp_batch.py:789-804`) only retains jobs already in
   SUCCEEDED/FAILED; a running job is still deleted on cancel, so the VM is torn down. Pulsar's
   `delete_batch_job=false` skips deletion unconditionally. The stated motivation — "retain Cloud
   Logging for debugging" — only requires the completed-job behaviour. As written it converts a
   debugging convenience into a runaway-VM setting.

3. `except Exception: log.warning("Failed to delete GCP Batch job %s", self._job_name)` discards the
   exception entirely. No `exc_info=True`, no `%s` for the error. Debugging a failed delete gives you
   nothing.

4. The boolean parse `str(...).lower() not in ("false", "0", "no")` is hand-rolled and duplicated
   across two classes. `galaxy.util.asbool` is already a Pulsar dependency, already imported at
   `pulsar/managers/base/directory.py:5` and used in `pulsar/messaging/bind_amqp.py:21`, and handles
   `off`/`f`/`n` which this misses.

### Retries and walltime

Untouched by this PR but worth flagging in context: `task.max_retry_count = params.retry_count`
defaults to **2** (`container_job_config.py:123-125`). A GCP-side retry re-runs the whole task —
including the `pulsar-submit` runnable — against a Pulsar job directory that may already hold staged
outputs. I did not find any guard for this. The PR adds nothing here, but sizing jobs up 4x makes a
retried job 4x more expensive, so it is adjacent. **Unverified** whether a Batch retry actually
re-executes both runnables from scratch in this configuration.

## Interaction with Pulsar's state machine

`StatefulManagerProxy` (`pulsar/managers/stateful.py`) is server-side and not in play here — this is
the client-side coexecution path, where Galaxy polls the client directly. The relevant surfaces are
`GcpPollingCoexecutionJobClient.raw_check_complete()` and the AMQP status messages published by the
in-container Pulsar.

- **Polling path:** broken by the job-name bug above. `get_gcp_job()` on a non-existent name will
  raise rather than return a terminal state, so the job neither completes nor fails cleanly.
- **AMQP path:** status comes from the in-VM Pulsar, so the name bug does not break polling here —
  but it does break `kill()`, and `kill()` now also fails to notify the in-VM Pulsar (P1-2 above), so
  cancellation is doubly broken on this path.
- **GCP-side walltime:** `max_run_duration` expiry kills the VM. On the AMQP path the in-VM Pulsar
  dies without publishing a terminal status, so Galaxy waits indefinitely. Pre-existing, not
  introduced here.

## Reuse and abstraction

This is the weakest part of the PR, and it is weak in an unusual way: the abstraction the code should
consume **already exists and is already shared**.

`pulsar/managers/util/gcp_util.py:22-181` is a verbatim fork of
`galaxy/lib/galaxy/jobs/runners/util/gcp_batch/helpers.py`. `compute_machine_type()` is
byte-identical modulo two stripped comments. `convert_cpu_to_milli()` is identical.
`convert_memory_to_mib()` is identical except that Galaxy's precomputed constants
(`MB_TO_MIB = 1000 * 1000 / BYTES_PER_MIB`, `GB_TO_MIB`, `KB_TO_MIB`, `KIB_TO_MIB`,
`helpers.py:20-25`) were hand-inlined — and one of the four was inlined **wrong**:

| unit | Galaxy | Pulsar copy | 1000 MB → |
|---|---|---|---|
| `mb`/`m` | `value * MB_TO_MIB` (= ×0.95367) | `value * 1000 / 1024` (= ×0.97656) | 953 vs **976** |
| `gb`/`g` | `value * GB_TO_MIB` | `value * 1000 * 1000 / 1024 / 1024` | equivalent |
| `kb`/`k` | `value * KB_TO_MIB` | `value * 1000 / 1024 / 1024` | equivalent |
| `kib`/`ki` | `value * KIB_TO_MIB` | `value / 1024` | equivalent |

Galaxy precomputed those constants specifically so the arithmetic wouldn't be re-derived by hand;
the fork re-derived it by hand and got MB wrong. That is the copy-paste failure mode in miniature,
and it will keep happening for as long as two copies exist. The PR proposes to unify "in a follow-up
PR" — that inverts the correct order. Extract the shared module first, then build on it.

Concretely not reused:

- **`sanitize_label_value()`** (`helpers.py:338`) — exists, solves the job-name character problem,
  not copied.
- **`resolve_max_run_duration()` / `convert_duration_to_seconds()`** (`helpers.py:196-245`) — the
  lifecycle-control helper with a documented priority chain, not copied. Pulsar keeps a bare
  `walltime_limit` int.
- **`_get_cpu_milli()` / `_get_memory_mib()` priority chains** (`gcp_batch.py:500-537`). Galaxy reads
  `requests_cpu` → `limits_cpu` → resource param `processors` → TPV `cores` → configured default, and
  the memory equivalent. Pulsar's `parse_gcp_job_params()` reads **only** `cores`/`mem`. That matters
  because **Pulsar's own K8s mixin already reads `requests_cpu` / `requests_memory` / `limits_cpu` /
  `limits_memory`** in `_container_resources()` (`client.py:1035-1047`). So Pulsar now has two
  in-tree conventions for expressing container resources and the GCP path understands neither the
  k8s-style keys its sibling mixin uses nor Galaxy's resource-param path.
- **`galaxy.util.asbool`** — already a dependency, already used twice in-tree, reimplemented.
- **`_validate_ssd_size()`** sits in `container_job_config.py` (client-side config module) rather than
  `gcp_util.py` next to the other GCP helpers, splitting GCP knowledge across two files for no
  reason.

**Does it leave a reusable abstraction behind?** No. Every piece is either welded to
`LaunchesGcpContainersMixin` or lives in a GCP-specific module:

- `_container_resources()` on `LaunchesK8ContainersMixin` (`client.py:1035-1047`) is the obvious
  place for a shared *resource-request parsing* abstraction — it already exists, already parses the
  right keys, and is already used by one cloud mixin. Lifting it to `CoexecutionLaunchMixin` and
  having GCP consume it would have unified the request side across K8s, TES and GCP in one move.
- The two `kill()` bodies are byte-identical copies across `GcpMessageCoexecutionJobClient` and
  `GcpPollingCoexecutionJobClient`. That belongs on `LaunchesGcpContainersMixin` — which is where
  every other shared GCP behaviour on these two classes already lives (`_job_name`,
  `_gcp_job_params`, `_launch_containers`).
- The `delete_batch_job`-style retention control is not GCP-specific at all. `LaunchesK8ContainersMixin`
  has the equivalent concept as `k8s_cleanup_job` (`client.py:1021`). Three different spellings for
  one idea across three mixins in one file.
- Machine-type selection genuinely *is* provider-specific and reasonably lives in `gcp_util.py` —
  but it should be the *single* copy shared with Galaxy, not a second one.

**Imports:** all correct. `time` (`client.py:3`), `logging` and `re`
(`container_job_config.py:11-12`), `re` (`gcp_util.py:2`) are all module-level. The pre-existing
optional-dependency guard for `batch_v1` is untouched. No finding.

## Config surface and backwards compatibility

**Documentation: nothing added.** `docs/containers.rst:236-247` documents the GCP destination and
lists `project_id`, `region`, `walltime_limit`, `credentials_file`. None of the new options appear.

There is a mechanism here that the PR half-uses. `docs/gen_erd_diagrams.py:12` maps `GcpJobParams` →
`job_destination_parameters_gcp.png`, so pydantic fields become rendered documentation
automatically. `cores` and `mem` are fields and will show up. But **`job_id_prefix` and
`delete_batch_job` are read straight off `destination_params`** (`container_job_config.py:299`,
`client.py:1159`, `client.py:1175`) and are not `GcpJobParams` fields — so they bypass both the ERD
generator and the docs, and are entirely undiscoverable. They also skip pydantic's type coercion,
which is why `delete_batch_job` needs the hand-rolled string-bool parse in the first place. Declaring
them as fields fixes documentation, validation and parsing at once.

**Backwards compatibility: not preserved.** For an existing GCP Batch deployment running TPV — which
sets `cores` and `mem` for nearly every tool — this PR silently changes, with no config change and no
opt-out:

- machine type: configured `machine_type` (default `n1-standard-1`) → computed `n2-*`, typically 2–4x
  larger than the request;
- local SSD: 375 GB (1 SSD) → 750 GB (2 SSDs), because n2 forces an even count;
- job names: `pulsar-<instance_id>-<job_id>` → `<prefix>-<job_id>-<timestamp>`, so any job in flight
  across the upgrade becomes unfindable.

There is no way to say "always use my `machine_type`" — an explicitly configured `machine_type` is
unconditionally discarded whenever `cores` or `mem` is present
(`container_job_config.py:152-162`). Dynamic sizing needs an explicit opt-in flag, or at minimum an
opt-out, and the SSD-count change needs to be called out in release notes.

`delete_batch_job` defaulting to `"true"` does preserve the previous delete-on-kill behaviour on the
polling path. That one is right.

## Test coverage

**Nothing ships with tests.** `test/container_job_config_test.py` exists (36 lines, 4 tests, already
covering `parse_gcp_job_params` and `gcp_job_template`) and was not touched.

Everything of consequence here is pure, credential-free logic and is trivially unit-testable:

- `compute_machine_type()` — pure function, int in / str out. The 2 GB/vCPU over-provisioning bug is
  caught by one parametrized case.
- `convert_cpu_to_milli()` / `convert_memory_to_mib()` — pure. The MB inlining error is caught by one
  assertion.
- `_validate_ssd_size()` — pure. The invalid-count-after-rounding gap is caught by
  `_validate_ssd_size(2000, "n2-standard-8") == ?`.
- `gcp_job_id_prefix()` — pure, three branches, zero tests.
- `parse_gcp_job_params()` with `cores`/`mem` — already has a test fixture pattern to follow at
  `test/container_job_config_test.py:15-19`.
- `_job_name` determinism — a two-line test constructing two clients from the same params would have
  caught the P1.

Upstream already has the test file to port: `galaxy/test/unit/app/jobs/test_gcp_batch_runner.py` has
`TestConvertCpuToMilli`, `TestConvertMemoryToMib` and `TestSanitizeLabelValue` as parametrized
classes. Copying the tests alongside the copied implementation would have cost minutes.

No existing tests were weakened or removed — the only assertion deleted (`assert disk.size_gb % 375
== 0`, `container_job_config.py:249`) was a production assert replaced by validation logic, which is
an improvement.

## Independent verification of the four P1s (added 2026-08-19)

All four P1s were re-checked directly against the worktree at `8827d93` (the PR head is unchanged
since 2026-07-03), because two subagent predictions on sibling PRs #480 and #482 were later
falsified by CI. **All four hold.** Two of them sharpen into a more specific defect than the
original wording, and both gained a concrete fix.

### Finding 1 — `_job_name` — CONFIRMED, and it is *intermittent*, not deterministic

`pulsar/client/manager.py:289` and `:530` construct a **new client instance per call** —
`return K8sMessageCoexecutionJobClient(destination_params, job_id, self)`, no caching anywhere. So
`hasattr(self, '_cached_job_name')` (`client.py:1138`) caches within a single instance and never
across operations. Launch, status poll, and kill each build their own client and each stamp their
own `int(time.time())`.

Pre-PR the name came from `produce_unique_k8s_job_name(app_prefix="pulsar", job_id=job_id,
instance_id=self.instance_id)` → `pulsar-{instance_id}-{job_id}` (`pykube_util.py:49-60`), which
reads no clock and is stable across instances. That property was the thing being relied on, and the
PR removed it.

Worth stating explicitly in review: the failure is **not deterministic**. Two operations landing in
the same wall-clock second produce the same name and work by luck. This will survive a quick manual
smoke test and fail under load, which is the worst failure mode to ship.

### Finding 2 — `kill()` — CONFIRMED, and the existing abstraction already solves it

`BaseMessageJobClient.kill()` (`client.py:538-539`) is `self.client_manager.exchange.publish("kill",
dict(job_id=self.job_id))`. The K8s sibling defines `kill()` on the **mixin**
(`LaunchesK8ContainersMixin`, `client.py:983`) and lets the MRO route it. Verified by reproducing
the class graph:

| class | resolves `kill()` to |
|---|---|
| `K8sMessageCoexecutionJobClient` | AMQP publish (mixin shadowed by `BaseMessageJobClient`) |
| `K8sPollingCoexecutionJobClient` | k8s `stop_job` |
| `GcpMessageCoexecutionJobClient` *(as written)* | GCP delete — **AMQP publish lost** |
| `GcpPollingCoexecutionJobClient` *(as written)* | GCP delete |

The K8s split is deliberate and correct: message clients cancel by publishing, polling clients
cancel via the provider API. PR 473 breaks it by defining `kill()` on **both leaf classes**
(`client.py:1158`, `:1174`), which shadows the inherited publish.

**Fix — move the body to `LaunchesGcpContainersMixin` and delete both leaf overrides.** Verified:
the MRO then yields AMQP publish for the message client and GCP delete for the polling client,
matching K8s exactly. This also resolves finding 15 (duplicated `kill()` bodies) as a side effect —
one edit, two findings.

### Finding 3 — sizing — CONFIRMED at 4x, with an identified root cause and fix

The original note said "over-provisions 2–4x". Confirmed, and the cause is specific: **the variant
selection thresholds do not match the variant densities they select.** `gcp_util.py:116-120` defines
`highcpu: 0.9` GB/vCPU, but `:135` routes to `highcpu` for any ratio `<= 2.0`. Every request between
0.9 and 2.0 GB/vCPU is therefore labelled `highcpu` and then has its **core count inflated** to buy
memory at 0.9 GB/vCPU.

| request | as-is | fixed thresholds |
|---|---|---|
| 1c / 2 GB | `n2-highcpu-4` (4x cores) | `n2-standard-2` |
| 2c / 4 GB | `n2-highcpu-8` (4x cores) | `n2-standard-2` |
| 4c / 8 GB | `n2-highcpu-16` (4x cores) | `n2-standard-4` |
| 8c / 16 GB | `n2-highcpu-32` (4x cores) | `n2-standard-8` |
| 16c / 32 GB | `n2-highcpu-48` (3x cores) | `n2-standard-16` |
| 2c / 8 GB | `n2-standard-2` (exact) | `n2-standard-2` |

A 2.0 GB/vCPU ratio — an extremely ordinary Galaxy shape — is a clean **4x on cores**. Note the
4.0 GB/vCPU rows are already exact, because that is literally `n2-standard`'s density; this is
further evidence the thresholds, not the tables, are the defect.

**Fix — set the thresholds equal to the densities** (`<= 0.9` → highcpu, `<= 4.0` → standard, else
highmem). Worst-case core multiplier drops from **4x to 2x**, and the residual 2x is only
`1c / 1 GB`, which is unavoidable because n2 has no 1-vCPU size.

### Finding 4 — `task.compute_resource` — CONFIRMED absent

`grep -rn "compute_resource" --include="*.py"` over the whole worktree returns only Galaxy BYOC REST
paths (`/api/compute_resources/registrations/...` in `galaxy_byoc.py`, `scripts/config.py`,
`test/galaxy_byoc_test.py`). There is **no** `task.compute_resource` assignment in the diff or
anywhere else, while the PR description (body line 27) states "`task.compute_resource` is set so the
container gets the...". This is what makes findings 3 and 5 compound: nothing reserves the
allocation, so `GALAXY_SLOTS` / `GALAXY_MEMORY_MB` advertise a request that no mechanism enforces,
on a VM whose size was chosen by the over-provisioning function above.

### Also confirmed while verifying — setting `cores` silently flips the machine family n1 → n2

`parse_gcp_job_params()` calls `compute_machine_type(cpu_milli, memory_mib)`
(`container_job_config.py:162`) **without** passing `machine_type_family`, so it always takes the
`"n2"` default (`gcp_util.py:95`). But `GcpJobParams.machine_type` defaults to `"n1-standard-1"`
(`:131`). So merely supplying `cores` or `mem`:

1. discards any explicit operator `machine_type` (it is overwritten, not defaulted), and
2. moves the deployment from the n1 family to n2.

Then `_validate_ssd_size(params.disk_size, params.machine_type)` (`:249`) sees an `n2` family and
applies the even-SSD-count rule. With the **default** `disk_size` of 375 GB that is `ssd_count = 1`,
odd, so it rounds to 2 → **750 GB**. Setting a single `cores` value therefore doubles local SSD
spend on an otherwise-default config, announced only at `log.info`. This confirms the mechanism in
"Interaction with `_validate_ssd_size` doubles disk cost silently" above, and it stacks on top of
the 4x core over-provisioning in finding 3 — the two multiply on the same job.

### Also confirmed — three resource vocabularies now coexist in one file

| path | keys | type |
|---|---|---|
| K8s | `requests_cpu`, `requests_memory`, `limits_cpu`, `limits_memory` | `_container_resources()`, `client.py:1035` |
| TES | `tes_cpu_cores`, `tes_ram_gb` | `TesJobParams(TesResources)`, `container_job_config.py:307-322` |
| GCP *(new)* | `cores`, `mem` | `GcpJobParams`, `container_job_config.py:135-140` |

Beyond the duplication in finding 14, note that GCP's keys are the only **unprefixed** ones. TES
namespaces as `tes_*`; K8s uses compound `requests_*` / `limits_*`. `cores` and `mem` are generic
words claimed from a flat, shared destination-params namespace, and `GcpJobParams(**params)` is
handed the entire destination dict. That is a collision waiting to happen and should at minimum be
`gcp_cores` / `gcp_mem`.

## How to fix finding 1 convergently (added 2026-08-19)

> **SUPERSEDED 2026-08-20.** This section argues for making the GCP name deterministic.
> That was the wrong call — see "Revised: converge on Galaxy's own Batch runner" at the
> end of this note. The causal analysis below still holds; the recommendation does not.


The reflex fix — "revert to `produce_unique_k8s_job_name`" — is not obviously right, and the
timestamp was probably reaching for something real. The codebase already contains **two** working
strategies for this exact problem. PR 473 invented a third that behaves like neither.

| backend | strategy | `_launch_containers` returns |
|---|---|---|
| K8s | **deterministic name**, recomputed on demand from `(app_prefix, instance_id, job_id)` | `-> None` (`client.py:915-921`) |
| TES | **provider-assigned id**, returned and persisted by Galaxy | `-> ExternalId` (`client.py:827`, `return ExternalId(created_task.id)` at `:849`) |
| GCP *(PR 473)* | clock-stamped name + per-instance `hasattr` cache | `-> None` (`client.py:1115-1121`), `job` discarded |

Both existing strategies work because the name is *recoverable*. K8s recomputes it purely; TES stores
it. PR 473's is neither pure nor stored, which is why it breaks.

### Why the PR ended up with a clock

Tracing the diff, the timestamp is a *consequence*, not the feature. Pre-PR:

```python
self.instance_id = gcp_galaxy_instance_id(destination_params)   # -> "galaxy_instance_id"
# _job_name = produce_unique_k8s_job_name(app_prefix="pulsar", instance_id=..., job_id=...)
#           = "pulsar-{instance_id}-{job_id}"
```

`produce_unique_k8s_job_name` (`pykube_util.py:49-60`) has **two** identity slots — `app_prefix` and
`instance_id`. The PR wanted a configurable prefix (a legitimate feature), but implemented it by
*collapsing both slots into one*: `_setup_gcp_batch_client_properties` stopped setting
`self.instance_id` and set `self.job_id_prefix` instead, and `gcp_job_id_prefix()` falls back
`job_id_prefix or galaxy_instance_id or "pulsar"` — so the two identities now compete for one slot.
That made names *less* unique than before, and `int(time.time())` was added to buy the uniqueness
back. The `hasattr` cache then papers over the resulting instability exactly one call deep.

So the defect is not "someone added a timestamp." It is "a two-slot identity was collapsed to one
slot, and a clock was used to replace the lost slot."

### Recommended: adopt the TES strategy — GCP Batch is a provider that assigns ids

`CoexecutionLaunchMixin.launch()` returns `self._launch_containers(...)` verbatim (`client.py:738`)
and is typed `-> Optional[ExternalId]` (`:670`). `staging/up.py:81-85` then does:

```python
# for pulsar modalities that skip the explicit "setup" step, give them a chance to set an external
# id from the submission process (e.g. to TES).
launch_response = client.launch(**launch_kwds)
if isinstance(launch_response, ExternalId):
    job_id = launch_response.external_id
```

That seam exists, is typed end to end, and GCP explicitly opted out of it by annotating
`-> None` and discarding the `job` returned by `client.create_job(create_request)`
(`client.py:1133`). The minimal convergent change:

```python
) -> ExternalId:
    ...
    job = client.create_job(create_request)
    return ExternalId(job_name)      # the id GCP acknowledged
```

**Watch the qualification mismatch:** GCP's `job.name` comes back fully qualified
(`projects/{p}/locations/{r}/jobs/{id}`), while `get_gcp_job()` / `delete_gcp_job()`
(`gcp_util.py:197-232`) take the **short** name and build the qualified form themselves. So return
the short id (`job.name.rsplit("/", 1)[-1]`, or the submitted `job_name`), not `job.name` verbatim.

This also disposes of the problem the timestamp was likely aimed at: GCP Batch job ids must be
unique within project+region, and completed jobs are *retained* (that is what `delete_batch_job`
exists for), so a Galaxy retry of the same `job_id` would collide on a purely deterministic name.
Persisting the id solves that properly, where a clock only makes collisions unlikely while making
lookup impossible.

### Fallback: keep the K8s strategy, but fix the slot collapse rather than adding a clock

If returning an `ExternalId` is too large for this PR, the deterministic route is still correct —
just stop collapsing the two slots:

```python
def _setup_gcp_batch_client_properties(self, destination_params):
    self.instance_id = gcp_galaxy_instance_id(destination_params)
    self.job_name_prefix = gcp_job_id_prefix(destination_params)     # default "pulsar"

@property
def _job_name(self):
    return produce_unique_k8s_job_name(
        app_prefix=self.job_name_prefix, instance_id=self.instance_id, job_id=self.job_id
    )
```

`gcp_job_id_prefix()` drops its `galaxy_instance_id` fallback — that value belongs in the
`instance_id` slot, which now exists again. No clock, no cache, feature preserved.

### The actual convergence step

There are currently **three byte-identical name properties**:

- `_tes_job_name` (`client.py:865-869`)
- `_k8s_job_name` (`client.py:1012-1016`)
- `_job_name` (GCP — identical pre-PR)

all calling `produce_unique_k8s_job_name(app_prefix="pulsar", job_id=..., instance_id=...)`. The TES
one carries the comment `# currently just _k8s_job_prefix... which might be fine?` — the codebase is
explicitly asking to be converged here. Lift **one** `_job_name` onto `CoexecutionLaunchMixin` with
an overridable `job_name_prefix` class attribute defaulting to `"pulsar"`, and delete the other two.
The PR's configurable-prefix feature then lands for **all three** backends instead of only GCP,
which is a strictly better outcome than what was proposed.

Two supporting cleanups that fall out:

- `produce_unique_k8s_job_name` lives in `pulsar/managers/util/pykube_util.py` but is already
  imported by the TES and GCP paths. Move it to a neutral module and rename it
  `produce_unique_job_name`, leaving a thin alias behind.
- Name **validation** genuinely differs per backend and must stay a per-backend seam, not be merged
  away: `galaxy_instance_id()` enforces DNS-label rules via
  `re.match(r"(?!-)[a-z\d-]{1,20}(?<!-)$", ...)`, while GCP Batch ids must match
  `^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$`. This promotes finding 19 (P3) from a nitpick into part of the
  convergence design — the shared helper *builds*, each backend *validates*.
- `job_id_prefix` is another unprefixed key in the flat destination namespace (same concern as
  `cores` / `mem`); at the shared layer it should be `job_name_prefix`.

## Findings

1. **P1 — `_job_name` is non-deterministic across client instances; status polling and kill target a
   job name that does not exist.** `pulsar/client/client.py:1136-1143`. The `_cached_job_name` cache
   is per-object; `ClientManager.get_client()` / `MessageQueueClientManager.get_client()`
   (`pulsar/client/manager.py:159-166`, `:289-304`) construct a fresh client per operation, and
   `_launch_containers()` (`client.py:1115-1134`) returns `None` so no external id is persisted.
   Every `raw_check_complete()` (`client.py:1189-1197`) and every `kill()` recomputes `int(time.time())`
   and gets a different name. Upstream avoids this by persisting the name
   (`galaxy/lib/galaxy/jobs/runners/gcp_batch.py:197-198`, read back at `:728`, `:789`). Fix: make
   the name deterministic from `(prefix, job_id)`, or return an `ExternalId` from
   `_launch_containers()` the way `LaunchesTesContainersMixin` does (`client.py:848-849`) and thread
   it through.

2. **P1 — `GcpMessageCoexecutionJobClient.kill()` drops the AMQP kill message; with
   `delete_batch_job: false` it is a total no-op.** `pulsar/client/client.py:1158-1164`. The override
   does not call `super().kill()`, so `BaseMessageJobClient.kill()`'s
   `exchange.publish("kill", ...)` (`client.py:538-539`) never fires and the in-VM Pulsar is never
   told to stop. Contrary to the PR description, `kill()` was not "previously missing" — it was
   inherited and working. When `delete_batch_job` is false the method does nothing at all and the VM
   burns to `walltime_limit` (default 24h). Fix: call `super().kill()` unconditionally, gate only the
   `delete_gcp_job()` call.

3. **P1 — `compute_machine_type()` over-provisions 2–4x on the most common TPV core:memory ratio.**
   `pulsar/managers/util/gcp_util.py:95-181`. The `highcpu` classification boundary is 2.0 GB/vCPU but
   the sizing density is 0.9 GB/vCPU (`:135`, `:139-145`, `:148`). Verified: `cores=2, mem=4` →
   `n2-highcpu-8`; `cores=4, mem=8` → `n2-highcpu-16`; `cores=8, mem=16` → `n2-highcpu-32`. Combined
   with `GALAXY_SLOTS` being set from the *request* rather than the allocation (finding 5), operators
   pay for 4x and the tool uses 1x. Fix: classify 2.0 GB/vCPU as `standard`, or size `highcpu`
   against 1.0 GB/vCPU (the real n2-highcpu density) — and add a regression test.

4. **P1 — `task.compute_resource` is not set, contradicting the PR description.**
   `pulsar/client/container_job_config.py:196-276`. The description states it is set "so the container
   gets the full VM instead of Batch's default 2 vCPU / 2 GB"; grep finds no `compute_resource` in the
   diff. Galaxy's runner does set it (`gcp_batch.py:318-321`). On the description's own premise this
   leaves the container capped at 2 vCPU while `GALAXY_SLOTS` instructs the tool to spawn 8+ threads.
   Either implement it or correct the description — but the description is the one describing the
   feature's purpose.

5. **P2 — `GALAXY_SLOTS` / `GALAXY_MEMORY_MB` are derived from the request, not the allocation.**
   `pulsar/client/container_job_config.py:222-231`. With finding 3 unfixed this systematically
   understates available cores; with finding 3 fixed it will still drift whenever the request rounds
   up to the next `valid_sizes` entry. Derive from the selected machine type.

6. **P2 — `mem` has two conflicting unit conventions in one function, and the collision is
   expensive.** `pulsar/client/container_job_config.py:152-162`. Bare numerics take
   `int(float(mem) * 1024)` (GB→MiB, actually GiB); non-numerics fall through to
   `convert_memory_to_mib()`, which treats bare numerics as MiB (`gcp_util.py:64-66`). `mem: 2048`
   meaning MiB yields `n2-highmem-128`. Add an explicit unit contract, validate it, and bound the
   result.

7. **P2 — no upper bound or allow-list on computed machine size.** `pulsar/managers/util/gcp_util.py:153-171`.
   A bad `cores`/`mem` value silently produces a 128-vCPU VM with a warning-level log. Add a
   `max_machine_type` / `max_cores` destination param and fail loudly past it rather than warning.
   Related: `valid_sizes` includes 128 for all three variants, but per GCP's N2 series table
   `n2-highcpu` stops at 96, so the fallback can emit an invalid type (**unverified** against the
   live API).

8. **P2 — `delete_batch_job: false` retains *running* jobs, not just completed ones.**
   `pulsar/client/client.py:1158-1164`, `:1174-1180`. The stated motivation (keep Cloud Logging for
   debugging) only requires retaining terminal jobs. Galaxy's equivalent
   `delete_completed_jobs=false` (`gcp_batch.py:789-804`) explicitly checks for
   SUCCEEDED/FAILED before skipping the delete and deletes running jobs regardless. As written, a
   user cancel leaves the VM running to walltime. Match the upstream semantics.

9. **P2 — `_validate_ssd_size()` rounds odd counts to even, but GCP allows only 1, 2, 4, 8, 16, 24.**
   `pulsar/client/container_job_config.py:166-193`. `disk_size: 2000` → 2250 GB → 6 SSDs → accepted
   locally, rejected by GCP. No upper bound either. Validate against the allowed set and cap. (Count
   table read from GCP docs, **unverified** against the live API.)

10. **P2 — dynamic sizing has no opt-out and silently changes existing deployments.**
    `pulsar/client/container_job_config.py:152-162`. An explicitly configured `machine_type` is
    discarded whenever `cores` or `mem` is present, and since TPV sets both for nearly every tool
    this fires on essentially every job. Existing deployments also jump from 375 GB to 750 GB of
    local SSD (finding 9 / n2 even-count rule) with no config change. Gate behind an explicit
    `dynamic_machine_type` flag, or at minimum let a configured `machine_type` win.

11. **P2 — `job_id_prefix` and `delete_batch_job` bypass `GcpJobParams`, so they get no validation,
    no coercion and no documentation.** `pulsar/client/container_job_config.py:299`,
    `pulsar/client/client.py:1159`, `:1175`. `docs/gen_erd_diagrams.py:12` auto-documents
    `GcpJobParams` fields into `docs/job_destination_parameters_gcp.png`; these two are invisible to
    it and absent from `docs/containers.rst:236-247`. Declaring them as `GcpJobParams` fields fixes
    documentation, typing and the hand-rolled bool parse in one change.

12. **P2 — the sizing/conversion helpers are a fork of Galaxy's, and the fork already diverged.**
    `pulsar/managers/util/gcp_util.py:22-181` vs
    `galaxy/lib/galaxy/jobs/runners/util/gcp_batch/helpers.py:125-335`. Galaxy's precomputed
    `MB_TO_MIB = 1000 * 1000 / BYTES_PER_MIB` (×0.95367) was hand-inlined as `value * 1000 / 1024`
    (×0.97656) at `gcp_util.py:83` — 1000 MB gives 976 MiB here, 953 upstream. The other three unit
    branches happen to be equivalent. The PR proposes unifying in a follow-up; extract the shared
    module *first*.

13. **P2 — zero tests on entirely pure, credential-free logic.** `test/container_job_config_test.py`
    exists and was not extended. `compute_machine_type()`, `convert_cpu_to_milli()`,
    `convert_memory_to_mib()`, `_validate_ssd_size()`, `gcp_job_id_prefix()` and `_job_name`
    determinism are all directly testable; findings 1, 3, 9 and 12 would each be caught by a single
    parametrized case. `galaxy/test/unit/app/jobs/test_gcp_batch_runner.py:29-113` is a directly
    portable starting point.

14. **P2 — `parse_gcp_job_params()` ignores the resource keys Pulsar's own K8s mixin already reads.**
    `pulsar/client/container_job_config.py:152` reads only `cores`/`mem`, while
    `LaunchesK8ContainersMixin._container_resources()` (`pulsar/client/client.py:1035-1047`) reads
    `requests_cpu` / `requests_memory` / `limits_cpu` / `limits_memory`, and Galaxy's runner reads
    both families plus the `processors` resource param (`gcp_batch.py:500-537`). Lift
    `_container_resources()` to `CoexecutionLaunchMixin` and consume it here — that is the reusable
    abstraction this PR should have left behind.

15. **P3 — duplicated `kill()` bodies.** `pulsar/client/client.py:1158-1164` and `:1174-1180` are
    byte-identical. Belongs on `LaunchesGcpContainersMixin` alongside `_job_name` and
    `_gcp_job_params`.

16. **P3 — duplicated `mem` → MiB conversion.** `pulsar/client/container_job_config.py:155-161` and
    `:226-231` are the same six lines twice.

17. **P3 — hand-rolled bool parse where `galaxy.util.asbool` is already a dependency.**
    `pulsar/client/client.py:1159`, `:1175`. Already imported at
    `pulsar/managers/base/directory.py:5` and used in `pulsar/messaging/bind_amqp.py:21`. The
    hand-rolled version misses `off`, `f`, `n`.

18. **P3 — `except Exception` discards the exception.** `pulsar/client/client.py:1163-1164`,
    `:1179-1180`. Add `exc_info=True` or interpolate the error; as written a failed delete is
    undiagnosable.

19. **P3 — job name and prefix are not validated against GCP Batch's `job_id` charset/length.**
    `pulsar/client/client.py:1136-1143`. `galaxy_instance_id` is operator-set and commonly contains
    dots or uppercase. `sanitize_label_value()` already exists upstream
    (`galaxy/lib/galaxy/jobs/runners/util/gcp_batch/helpers.py:338`). Not a regression — the old path
    did not sanitize either — but this rewrite was the moment.

20. **P3 — `getattr(self, 'job_id_prefix', 'pulsar')` is dead defensiveness.**
    `pulsar/client/client.py:1140`. Both `__init__`s call
    `_setup_gcp_batch_client_properties()` and `gcp_job_id_prefix()` already returns `"pulsar"` as its
    own fallback (`container_job_config.py:299`).

21. **P3 — `_validate_ssd_size()` is misplaced.** It lives in `container_job_config.py:166-193`
    (client config module) while every other GCP helper lives in `pulsar/managers/util/gcp_util.py`.

22. **P3 — `GALAXY_MEMORY_MB` is populated with a MiB value.**
    `pulsar/client/container_job_config.py:226-231`. Name and every consumer in
    `pulsar/managers/util/job_script/MEMORY_STATEMENT.sh` mean MB; ~5% high.

## Verdict

**Request changes.** Four P1s, ten P2s, eight P3s.

The two naming/lifecycle P1s (findings 1 and 2) are outright breakage: as written, status polling and
job cancellation do not work on the GCP path, and cancellation on the AMQP path regresses from
working to silently no-op. Those alone block merge and are narrowly fixable.

The sizing P1s (findings 3 and 4) are worse in kind, because they are quiet: the code runs, jobs
succeed, and operators are billed 2–4x for VMs whose extra cores the tool never uses, on the most
common TPV shape in Galaxy. Combined with the SSD doubling and the absence of any opt-out (finding
10), an existing GCP Batch deployment that upgrades and changes nothing will see its bill move
without any signal that a behaviour change occurred.

Structurally, the request I'd make of the author is to invert the sequencing they proposed. The PR
copies Galaxy's helpers into Pulsar and promises to unify later; the copy has already diverged
(finding 12) before it merged. Extract the shared module first, then land sizing on top of one
implementation with the tests that already exist upstream. Separately, this PR is the third
consecutive place in one file where "resource request parsing" has been written from scratch — K8s
has `_container_resources()`, TES has `TesResources`, GCP now has `parse_gcp_job_params`. Lifting
`_container_resources()` to `CoexecutionLaunchMixin` (finding 14) is the abstraction this work should
leave behind and currently does not.

Suggested split for re-submission: (a) SSD validation + job naming + `kill()` fixes — small, testable,
mergeable soon; (b) shared-helpers extraction with Galaxy; (c) dynamic sizing + env injection +
`compute_resource`, behind an opt-in flag, with unit tests and docs.


## Revised: converge on Galaxy's own Batch runner (added 2026-08-20)

The earlier recommendation — make the GCP name a pure function of destination params and
the Galaxy job id — was wrong, for a reason that only showed up once Galaxy's *own* GCP
Batch runner was read rather than assumed about.

### Galaxy already made this choice, and Keith's port dropped half of it

`lib/galaxy/jobs/runners/gcp_batch.py:218`:

```python
prefix = params.get("job_id_prefix") or "galaxy-job"
job_name = f"{prefix}-{int(time.time())}-{os.urandom(4).hex()}-{job_wrapper.get_id_tag()}"
```

Galaxy uses a clock too. The clock is not the defect. What makes it work there is the
other half: `job_wrapper.set_external_id(batch_job_name)` at `:198`, recovered at `:832`.
Because the name is *stored*, it never needs to be recomputed, and `os.urandom(4).hex()`
is free to make it unrecomputable.

Keith's port kept the clock and dropped both the random component and the persistence.

### Why determinism is worse here, not better

Three things came out of checking it:

1. **`prefix-instance_id-job_id` collides on resubmission.** `mark_as_resubmitted`
   (`lib/galaxy/jobs/__init__.py:1572-1579`) sets `RESUBMITTED` on the same job row — the
   Galaxy job id does not change. Pulsar only calls `delete_gcp_job` from `kill()`, so the
   completed first job still holds the name.

2. **It collides across Galaxy instances by default.** GCP has no `instance_id`;
   `gcp_job_id_prefix` (`container_job_config.py:299`) is
   `job_id_prefix or galaxy_instance_id or "pulsar"`. Two Galaxies that leave it unset both
   produce `pulsar-<job id>`, and Galaxy job ids are per-instance sequential integers.
   The clock is currently masking this. Determinism would have made a mandatory config
   knob the price of admission. `os.urandom(4)` makes the problem go away for free.

3. **Determinism and `ExternalId` are mutually exclusive on the kill path.** `stop_job`
   (`runners/pulsar.py:834`) passes `job.job_runner_external_id` as the client's `job_id`.
   Return `ExternalId(job_name)` while also deriving the name from `job_id` and it
   double-prefixes.

### The obstacle that made this a two-repo change

Status polling could not see the external id at all. `get_client_from_state`
(`runners/pulsar.py:675-678`) deliberately passes the *Galaxy* id, because `get_client`
builds `files_endpoint` and `token_endpoint` from `encode_id(job_id)` — so the argument
could not simply be swapped. The external id had to travel beside it.

`TesPollingCoexecutionJobClient.raw_check_complete` had the same gap: `get_task(self.job_id)`
on a path where `job_id` is the Galaxy id, not the TES task id. Pre-existing, not
introduced by this PR.

### What was written

Pulsar — `jmchilton/pulsar:gcp-job-name-convergence-v2`, to be proposed against
`ksuderman/pulsar:gcp-batch-resource-management`:

- `Share deterministic job naming between the Kubernetes and TES clients` — moves
  `produce_unique_k8s_job_name` to `pulsar/util/job_naming.py` and hangs one `_job_name`
  off `CoexecutionLaunchMixin`. K8s and TES genuinely do recompute names, so determinism
  is right *there*.
- `Persist the GCP Batch job name instead of recomputing it` — `produce_timestamped_job_name`
  matching Galaxy's shape, `_launch_containers` returns `ExternalId`, kill and status read
  it, and the inherited deterministic `_job_name` raises on this backend so it cannot be
  recomputed by accident.

Galaxy — `jmchilton/galaxy:pulsar_external_id`: `get_client` takes `external_id` alongside
`job_id`; supplied on the polling, kill, and metadata paths; read from the job rather than
from `job_state.job_id`, which falls back to the Galaxy id when nothing was recorded.

### Still open

- Neither side validates the prefix. k8s checks `(?!-)[a-z\d-]{1,20}(?<!-)$`
  (`pykube_util.py:135-141`); `gcp_job_id_prefix` does nothing, so an operator string goes
  straight into a Batch job id against a 63-char cap. Galaxy has `sanitize_label_value`
  (`util/gcp_batch/helpers.py:338`) and Pulsar has no equivalent.
- Three backends read the instance discriminator from three different keys — TES accepts
  `galaxy_instance_id` or `tes_galaxy_instance_id`, k8s **only** `k8s_galaxy_instance_id`,
  GCP `job_id_prefix` or `galaxy_instance_id`. Plain `galaxy_instance_id` is silently
  ignored on k8s.
- `GcpJobParams.labels` (`container_job_config.py:141`, applied `:271`) is never populated.
  Galaxy sets `galaxy-job-id`, `galaxy-tool-id`, `galaxy-runner`, `galaxy-handler`
  (`gcp_batch.py:431-436`).
- `CreateJobRequest.request_id` is unused. It is Batch's idempotency token and would make a
  retried submission after an ambiguous network failure safe.
- Finding 2 (`kill()` on the mixin) is not addressed by either branch.
