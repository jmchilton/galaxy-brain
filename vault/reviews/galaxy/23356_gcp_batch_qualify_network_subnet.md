# PR 23356 — Qualify GCP Batch network and subnet names with the project ID

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23356 |
| **Author** | ksuderman (Keith Suderman) |
| **Base branch** | `release_26.1` |
| **Head reviewed** | `41bf63d0c3` (base tip `d372d708ec`, one commit) |
| **Size** | 1 file, +16 / -5 — `lib/galaxy/jobs/runners/gcp_batch.py` only |
| **State** | OPEN, 0 reviews, 0 comments at time of writing; opened 2026-08-24 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23356` |
| **Verdict** | **Request changes — correct the rationale and add focused tests.** The patch can unblock the reported failure, but **not by the mechanism the PR body and the new code comment claim**. Qualifying with `params["project_id"]` is a semantic no-op: line 227 already submits the Batch job into that same project, so `projects/{project_id}/global/networks/X` names the same-project resource that the documented partial URL `global/networks/X` names. The part that enables a different-project VPC is the new `"/" in value` pass-through, which for the first time lets an admin configure `projects/{host_project}/...`. The slash heuristic is permissive and untested, but passing through `global/networks/X` is **not independently a functional defect**: that is a documented valid same-project form, and qualifying it with this same `project_id` would not fix the cross-project case. The comment should say what the code really does, and the pure string behavior belongs in the existing tested helper module next door rather than inlined in a 171-line method with zero coverage. |

---

## What it does

One commit, `41bf63d0c3`, entirely inside the `if parsed_volumes:` network block of
`GoogleCloudBatchJobRunner._create_batch_job_spec` (`lib/galaxy/jobs/runners/gcp_batch.py:362-387`):

```python
project_id = params["project_id"]
network = params.get("network", "default")
subnet = params.get("subnet", "default")
network_interface.network = (
    network if "/" in network else f"projects/{project_id}/global/networks/{network}"
)
network_interface.subnetwork = (
    subnet if "/" in subnet else f"projects/{project_id}/regions/{params['region']}/subnetworks/{subnet}"
)
```

replacing unconditional `f"global/networks/{...}"` / `f"regions/{region}/subnetworks/{...}"`,
plus a `log.debug` that now prints the constructed values instead of the raw params.

Stated rationale: a relative path resolves against the project the Batch VMs are provisioned
in, which may not own the VPC (Terra pet projects), so submission 404s on the network resource.

Both the old and the new forms are syntactically legal. Confirmed from the pinned client's
own protos — `google-cloud-batch==0.21.0`
(`lib/galaxy/dependencies/pinned-requirements.txt:98`),
`google/cloud/batch_v1/types/job.py:921-942`:

```
network (str): The URL of an existing network resource. You can specify the
    network as a full or partial URL. For example, the following are all valid URLs:
    - https://www.googleapis.com/compute/v1/projects/{project}/global/networks/{network}
    - projects/{project}/global/networks/{network}
    - global/networks/{network}
```

Same three forms for `subnetwork`. So this is not a "the API rejects the old form" fix — it is
a resolution-scope fix, which is what makes P1-1 load-bearing.

---

## Main findings

### P1-1 — `project_id` is the *same* project the Batch job is created in, so the qualification is a no-op; the escape hatch is the real fix

This is the whole review. Traced every use of `project_id` in the file:

| line | use |
|---|---|
| `gcp_batch.py:50` | `RUNNER_PARAM_SPECS["project_id"] = dict(map=str, default=None)` |
| `:134-138` | if unset, filled from `google.auth.default()`'s ADC project; raises `ValueError` if neither |
| `:227` | **`request.parent = f"projects/{params['project_id']}/locations/{params['region']}"`** |
| `:252` | copied into per-job `params` by `_get_job_params` |
| `:369, 373, 376` | the new code |
| `:745, 807, 822` | `job_path` for get/delete |

Line 227 is decisive. `BatchServiceClient` is constructed with credentials only
(`:128`) — no project — so the *only* thing that determines where the Batch job, and hence the
VMs, are created is `request.parent`, built from `params["project_id"]`. There is no separate
knob: the same `params["project_id"]` names the compute project and now the network project.

A partial URL like `global/networks/X` on a Batch job resolves against that job's own project.
So for a given destination:

```
old:  global/networks/my-vpc                          -> project P's my-vpc
new:  projects/P/global/networks/my-vpc               -> project P's my-vpc
```

Identical resource. If the VPC lives in host project H ≠ P, the new code emits
`projects/P/...` and 404s exactly as before. And an admin cannot point `project_id` at H to
compensate, because that would also move the Batch job itself into H.

**What genuinely changed is the pass-through branch.** Before this PR a full path was
unusable — configuring `network: projects/H/global/networks/vpc` produced

```
global/networks/projects/H/global/networks/vpc
```

i.e. garbage. After this PR that value survives intact, and *that* is what lets a Terra
deployment reach a VPC in another project. The fix works; the explanation attached to it does
not.

Concretely I'd ask for:

1. **Rewrite the code comment** (`:365-368`). As written it asserts something false about the
   code's behaviour and will mislead the next reader and any admin who greps for it:
   > "so Batch resolves them in project_id's VPC, not the (possibly different, e.g. a Terra
   > pet) project the Batch VMs are provisioned in"

   `project_id` **is** the project the VMs are provisioned in. Something like:
   ```python
   # Batch resolves a bare/relative network name against the job's own project
   # (params["project_id"], the same one used for request.parent). To attach to a VPC
   # owned by another project -- a Shared VPC host, or a Terra workspace project distinct
   # from the pet project -- an admin must configure the fully project-qualified path;
   # those are passed through untouched. Bare names are normalized to the explicit form.
   ```
2. **Retitle the change.** "Qualify ... with the project ID" describes the no-op half. The
   value is "allow a project-qualified network/subnet to be configured".
3. Consider whether the *intended* fix is actually a **`network_project_id` param**
   (default: `project_id`), which is the shape this problem usually takes — see Design below.

Honesty about verification: I could not submit a real Batch job, so this is not based on an
observed API response. The conclusion is nevertheless strongly supported by Google's own
Batch documentation: it calls `global/networks/{network}` a valid partial URL, describes the
unqualified case as a network in the job's current project, tells Shared VPC callers to put
the **host** project in `projects/{HOST_PROJECT_ID}/...`, and constructs `request.parent` from
the job project separately. See [Specify the network for a
job](https://cloud.google.com/batch/docs/specify-job-network), especially the requirements and
`HOST_PROJECT_ID` explanation. The pinned client's generated proto confirms the same three
accepted URL forms. That is better evidence than the earlier version of this note's overly
broad claim that the symmetry was airtight without relying on the API's resolution semantics.

### P2 — The slash heuristic is too broad, but a documented relative URL is not itself a defect

`gcp_batch.py:372-377`. Any value containing a slash is emitted verbatim. That includes:

| configured value | emitted | outcome |
|---|---|---|
| `my-vpc` | `projects/P/global/networks/my-vpc` | fine |
| `projects/H/global/networks/my-vpc` | unchanged | the fix, works |
| `https://www.googleapis.com/compute/v1/projects/H/global/networks/my-vpc` | unchanged | fine |
| `global/networks/my-vpc` | unchanged | valid same-project partial URL; cannot select another project's VPC |
| `regions/us-east1/subnetworks/s` | unchanged | same |
| `foo/bar` | unchanged | silently invalid, surfaces as an opaque submission error |

The actual issue with `"/" in value` is validation and clarity: it treats every slash-bearing
string as a resource path, including `foo/bar`. It does **not** distinguish the API's three
documented forms. But `global/networks/X` should not be called "the exact broken form" in
isolation: Google documents it as valid, and it works for a network in the job's own project.
It remains unsuitable for the reported cross-project topology because it contains no host
project ID. Rewriting it to `projects/{params['project_id']}/...` would make the payload more
explicit but would not change that outcome.

If the code wants to normalize all accepted forms, it should recognize those forms explicitly
rather than use an arbitrary-slash test:

```python
if value.startswith("projects/") or value.startswith("https://www.googleapis.com/compute/v1/projects/"):
    return value  # already project-qualified
if value.startswith(expected_relative_prefix):
    return f"projects/{project_id}/{value}"
if "/" not in value:
    return f"projects/{project_id}/{expected_relative_prefix}/{value}"
raise ValueError(f"Unsupported GCP resource path: {value}")
```

That makes the accepted forms intentional, gives malformed values an actionable configuration
error, and can normalize relative forms for uniform logging. This is a worthwhile improvement,
but lower severity than the incorrect cross-project explanation in P1-1.

---

## Other findings

### Tests and reuse — Pure string construction, an existing tested helper module for exactly this, and zero new tests

The reuse point, and it is unusually clean-cut here because the extraction target already
exists and is already the pattern the rest of this runner follows.

`lib/galaxy/jobs/runners/util/gcp_batch/helpers.py` (360 lines) is precisely "pure functions
the GCP Batch runner needs", re-exported through `util/gcp_batch/__init__.py`:
`parse_volume_spec`, `parse_volumes_param`, `parse_docker_volumes_param`,
`convert_cpu_to_milli`, `convert_memory_to_mib`, `convert_duration_to_seconds`,
`resolve_max_run_duration`, `compute_machine_type`, `sanitize_label_value`. Every one of them
is unit-tested in `test/unit/app/jobs/test_gcp_batch_runner.py` — that file is *nothing but*
tests of that module plus `_get_job_params`.

So the codebase's own answer to "where does a pure GCP-Batch string transform live, and how is
it tested" is already written down, by this same runner, and this PR does not use it. Instead
it inlines two conditionals into `_create_batch_job_spec`, which spans
`gcp_batch.py:283-453` — **171 lines**, and has **no test coverage at all**: `grep` for
`_create_batch_job_spec`, `_submit_batch_job`, `batch_v1`, `AllocationPolicy` in the test file
returns nothing. Extraction here is not churn; it moves code from the least-tested method in
the file to the best-tested module in the package.

Suggested shape, in `helpers.py`, exported from `__init__.py`, importable at the top of
`gcp_batch.py` beside `compute_machine_type`:

```python
def qualify_network(network: str, project_id: str) -> str:
    """Expand a network name to the project-qualified partial URL Batch expects."""
    if network.startswith(("https://www.googleapis.com/compute/v1/projects/", "projects/")):
        return network
    if network.startswith("global/networks/"):
        return f"projects/{project_id}/{network}"
    if "/" not in network:
        return f"projects/{project_id}/global/networks/{network}"
    raise ValueError(f"Unsupported GCP network path: {network}")


def qualify_subnetwork(subnet: str, project_id: str, region: str) -> str:
    """Expand a subnetwork name to the project-qualified partial URL Batch expects."""
    if subnet.startswith(("https://www.googleapis.com/compute/v1/projects/", "projects/")):
        return subnet
    if subnet.startswith("regions/"):
        return f"projects/{project_id}/{subnet}"
    if "/" not in subnet:
        return f"projects/{project_id}/regions/{region}/subnetworks/{subnet}"
    raise ValueError(f"Unsupported GCP subnetwork path: {subnet}")
```

call site collapses to two lines:

```python
network_interface.network = qualify_network(params.get("network", "default"), project_id)
network_interface.subnetwork = qualify_subnetwork(
    params.get("subnet", "default"), project_id, params["region"]
)
```

**On the PR's Testing section.** "All 144 existing runner unit tests pass" — I reproduced that
exactly (144 passed in 7.5s, see Verification). But the claim is vacuous with respect to this
change: none of those 144 executes a single changed line. The only network/subnet tests that
exist are `test_unset_param_falls_back_to_spec_default[network|subnet]` and
`test_destination_overrides_every_param[network|subnet]`, which are `_get_job_params`
plumbing tests generated from `JOB_PARAM_KEYS` and are untouched by this diff. The suite
passing before and after is therefore not evidence of anything; it is also why no test file
needed editing.

Relatedly, the checked box **"This is a refactoring of components with existing test
coverage" is inaccurate on both halves.** This changes the bytes of the submitted
`CreateJobRequest` payload for every job with NFS volumes — a behaviour change, not a
refactor — and the component has no existing test coverage. Worth correcting because it is
the checkbox that justifies shipping without tests.

The test cases I'd want, all cheap, all pure, all belonging in
`test/unit/app/jobs/test_gcp_batch_runner.py` next to `TestSanitizeLabelValue`:

```python
class TestQualifyNetwork:
    def test_bare_name_is_project_qualified(self):
        assert qualify_network("my-vpc", "proj-a") == "projects/proj-a/global/networks/my-vpc"

    def test_default_is_project_qualified(self):
        assert qualify_network("default", "proj-a") == "projects/proj-a/global/networks/default"

    def test_project_qualified_path_passes_through(self):
        path = "projects/host-proj/global/networks/shared-vpc"
        assert qualify_network(path, "proj-a") == path

    def test_full_url_passes_through(self):
        url = "https://www.googleapis.com/compute/v1/projects/host-proj/global/networks/shared-vpc"
        assert qualify_network(url, "proj-a") == url

    def test_documented_relative_path_is_handled_intentionally(self):
        assert qualify_network("global/networks/my-vpc", "proj-a") == "projects/proj-a/global/networks/my-vpc"


class TestQualifySubnetwork:
    # same five, plus:
    def test_region_comes_from_the_caller(self):
        assert qualify_subnetwork("s", "proj-a", "europe-west4") == "projects/proj-a/regions/europe-west4/subnetworks/s"
```

The relative-path case documents a normalization choice; pass-through would also be valid if
that is the intended contract. The important red-to-green coverage is that bare and
project-qualified values produce the intended payload, and that malformed slash-bearing
strings are not mistaken for valid resource paths. I did not add, modify, or weaken any test.

### Design — `network_project_id` is probably the abstraction this wants, and the escape hatch is undiscoverable

Given P1-1, the supported way to attach to another project's VPC after this PR is "paste a
full `projects/H/...` path into `network` *and* a matching `projects/H/regions/{r}/...` path
into `subnet`" — repeating the host project, hand-writing the region into the subnet path, and
relying on a heuristic to notice. Nothing announces that this is possible.

The conventional shape for Shared VPC is one extra param:

```python
# Project owning the VPC, when it differs from project_id (Shared VPC host project).
"network_project_id": dict(map=str, default=None),
```

```python
network_project = params.get("network_project_id") or params["project_id"]
```

Then `network`/`subnet` stay bare names, the region is not duplicated, the intent is
self-documenting in `job_conf`, and it is one more key in the `_get_job_params` copy list at
`gcp_batch.py:252-273` (which is already parametrically tested — `JOB_PARAM_KEYS` is derived
dynamically, so a new key picks up two tests for free; that dynamic derivation was a good call
by whoever wrote it). This is a design question, not a demand — the pass-through works — but
it is what turns the change from "an accepted string format widened" into an abstraction an
admin can find.

Either way, **the accepted formats need documenting**, and there is currently nowhere to put
it: `grep -rl "gcp_batch\|GoogleCloudBatch"` over the whole tree outside `client/` returns
exactly four files — the runner, its helpers, its unit test, and one unrelated constant in
`pulsar.py:1184`. No `job_conf` sample, no `doc/`, no xsd. So `network`/`subnet` are
undocumented today and this PR changes what they accept.

---

## P3 findings

### P3-1 — `params["project_id"]` as a bare subscript is safe, though not obviously so

Checked, since a `KeyError` here would be latent (only jobs with NFS volumes reach this
block). It cannot raise:

- `_get_job_params` (`:245-281`) populates `params` with a fixed key list that includes
  `project_id`, via `job_destination.params.get(key, self.runner_params[key])` — so the key is
  always present in the dict.
- `self.runner_params[key]` is a subscript into the `RunnerParams` defaultdict, whose
  `__missing__` serves the spec default (there is a good comment at `:275-277` explaining
  exactly this), so it does not raise either.
- The spec default is `None`, but `_init_batch_client` (`:134-138`) fills it from ADC or
  raises `ValueError` during runner construction, so by submission time it is a non-empty
  string.

Same required-ness as `region`, which was already a bare subscript at `:227` and `:376` — so
the precedent holds and this is consistent. No change wanted; noting it because the
lead-in-the-review was "is this a regression for configs that previously worked" and the
answer is a clean no.

### P3-2 — A fifth and sixth hand-built GCP resource path in a file that already has four

`projects/{project_id}/locations/{region}/jobs/{name}` is written out by hand at `:745`,
`:807` and `:822`, and the `parent` form at `:227`. This PR adds two more f-string resource
paths without touching that. Not this PR's job to fix, but it is the same accretion pattern,
and if the proposed helpers land in `helpers.py` a `batch_job_path(project_id, region, name)`
beside them is a natural companion for a follow-up.

### P3-3 — Subnet region is not validated against `params["region"]`

If an admin supplies `subnet: projects/H/regions/us-east1/subnetworks/s` while
`region: us-central1`, nothing notices; the Batch API rejects it at submission with a message
about the subnetwork. Fine to leave — it fails fast, in the right place, with GCP's own
wording, and a client-side regex check would be its own small maintenance liability. Mentioned
only because the pass-through branch is what makes the mismatch newly expressible.

### P3-4 — Style

- **Imports: clean.** No new imports at all, nothing function-local, nothing to flag.
- **The comment** (`:365-368`) is four lines of rationale in the body of a method. Length is
  defensible for a non-obvious cross-project concern — but see P1-1: it is currently
  *incorrect*, which is worse than long. Shorten it to the mechanical fact ("bare names
  resolve against the job's own project; qualified paths pass through") and let the
  cross-project motivation live in the commit message.
- The `%s/%s` → `%s / %s` separator change in the log is right; with full paths in play the
  old form was ambiguous. Logging the constructed values rather than the raw params is a
  strict improvement.
- `params.get("network", "default")` keeps the redundant inline default (the spec at `:64-65`
  already defaults both to `"default"`, and `_get_job_params` guarantees the key). Harmless,
  pre-existing, and it does protect the direct-call path — leave it.

### P3-5 — Release-branch targeting and merge-forward

Targeting `release_26.1` is appropriate: this is a bounded fix to a runner that is broken for
a real deployment, the blast radius is one `if parsed_volumes:` block, and it only alters the
payload for destinations that mount NFS volumes.

The merge-forward is safe. I fetched `origin-https dev` and diffed: **`dev` carries the
identical pre-PR two lines** —

```python
network_interface.network = f"global/networks/{params.get('network', 'default')}"
network_interface.subnetwork = f"regions/{params['region']}/subnetworks/{params.get('subnet', 'default')}"
```

— with byte-identical surrounding context, so the routine `release_26.1` → `dev` merge applies
this cleanly and the fix will not be lost. `dev` has diverged from `release_26.1` in this file
only in unrelated spots (four `if x := ...` walrus conversions at `:119`, `:407`, `:556`,
`:786`), none of which touch this hunk.

---

## Verification

Ran, in the worktree at `41bf63d0c3`:

- **`pytest test/unit/app/jobs/test_gcp_batch_runner.py` → 144 passed in 7.49s.** Reproduces
  the PR's claim exactly, including the count.
- `--collect-only` filtered for network/subnet: only the four `_get_job_params` plumbing
  cases. `grep` for `_create_batch_job_spec` / `_submit_batch_job` / `batch_v1` /
  `AllocationPolicy` in the test file: **no hits**. So the changed lines have zero coverage
  before and after — the testing finding above, measured rather than assumed.
- Traced all nine `project_id` sites in `gcp_batch.py` and confirmed `request.parent` (`:227`)
  is the sole determinant of the Batch job's project, and that `BatchServiceClient` (`:128`)
  is built with credentials only.
- Read the pinned client's protos for the accepted `network` / `subnetwork` URL forms
  (`google-cloud-batch==0.21.0`, `types/job.py:921-942`) — confirmed all three forms, i.e. the
  pre-PR string was valid, not malformed.
- `git fetch origin-https dev` + diff of `gcp_batch.py` against the release base, for P3-5.
- `gh pr view 23356` — OPEN, no reviews, no comments, +16/-5.
- No `.venv` in this worktree; borrowed
  `~/projects/worktrees/galaxy/branch/htcondor_pulsar/.venv` with `PYTHONPATH` pointed at
  *this* worktree's `lib` and `test`. Nothing was written to that venv. `git status` in the PR
  worktree left clean; no files modified.

## Not verified

- **No real GCP Batch submission.** The 404 the PR reports was not reproduced. The resolution
  conclusion comes from Google's Batch networking guide and API contract, not an observed API
  response; the precise failure mode therefore remains unverified.
- Did not confirm the specifics of the Terra pet-project topology, i.e. whether the VPC in the
  reporter's environment is a Shared VPC host or a peered arrangement. That distinction would
  decide between the proposed `network_project_id` and plain path pass-through.
- Did not run mypy or `linters` over the touched file.
- Did not check CI status for the PR (opened the same day as this review).

## Follow-ups

Out of scope for this PR, listed so they are not lost:

- Extract the `projects/{p}/locations/{r}/jobs/{n}` path builder duplicated at `:745`, `:807`,
  `:822` into `helpers.py` (P3-2).
- Document the `gcp_batch` runner at all — `network`, `subnet`, and the other 30 keys in
  `RUNNER_PARAM_SPECS` exist only in the source.
- Any test coverage whatsoever for `_create_batch_job_spec`; a single test that builds a spec
  from a fake `job_wrapper` and asserts on the resulting `AllocationPolicy` would pin the NFS
  volume block, the machine-type selection and the service-account block at once. The
  helper-module discipline already in place makes this the obvious next increment.
