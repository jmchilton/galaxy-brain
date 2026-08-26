# PR 23354 — [26.1] Bound expression.json read failures in the workflow scheduler

| | |
|---|---|
| **PR** | https://github.com/galaxyproject/galaxy/pull/23354 |
| **Author** | mvdbeek (`mvdbeek:expression-json-read-race`) |
| **Base branch** | `release_26.1` (base tip `d372d708ec`, merge-base `dd33e5ce15`) |
| **Head reviewed** | `6dab970f80` (2 commits) |
| **Size** | 3 files, +189 / -30 |
| **State** | OPEN, not a draft, 0 reviews; opened 2026-08-24 |
| **Worktree** | `/Users/jxc755/projects/worktrees/galaxy/pr/23354` |
| **Addresses** | #23257 (ksuderman, "expression.json could not be read" — still OPEN) |
| **CI** | Red at head, unattributed. Integration shards 0-3 died in *environment setup* (cri-dockerd install, zero test output) — infrastructure, not the PR. API tests (3.10, 1) and Playwright ran long and failed, but GitHub's log API drops the pytest block for those jobs and the check annotations say only `exit code 1`, so I could not name a single failing test. `Selenium tests` is red on the base tip too. Worth a look before merge; I have no evidence either way. |
| **Verdict** | **Approve with comments.** The design is sound, the abstraction moves in the right direction (two duplicated `open()`+`json.load()` sites in the scheduler collapse to one helper), the failure surface reuses the existing `InvocationUnexpectedFailure` wrapper verbatim, and I could not find a way to make the grace period loop forever. One finding I would want addressed before this lands on a release branch: on non-posix object stores the bounded policy never engages, because `get_file_name()` raises `ObjectNotFound`, not `FileNotFoundError` (P2-1). |

---

## What it does

`lib/galaxy/workflow/modules.py:187-239` adds two module-level helpers:

- `read_expression_json(dataset_instance, step=None)` — opens the dataset, `json.load`s it, and on
  `FileNotFoundError` / `json.JSONDecodeError` either re-raises (no step: job-side), delays
  (`update_time` within `EXPRESSION_JSON_GRACE_PERIOD_SECONDS = 60`), or fails the invocation with
  `InvocationUnexpectedFailure(reason=unexpected_failure, details=..., workflow_step_id=step.id)`.
- `replace_expression_json_dataset(replacement, step=None)` — the extracted `DCE→hda` /
  `DatasetInstance` resolution that used to be inlined in `ToolModule.callback`.

Both scheduler-side read sites now route through it: `to_cwl` (`:273`) and the connected non-data
parameter branch of `ToolModule.callback` (`:2896`). Plus two type aliases (`ExpressionJsonValue`,
`StepInputReplacement`), a rewrite of the `can_map_over` test in `_find_collections_to_match`
(`:690-693`), and a return annotation on `WorkflowProgress.replacement_for_input`
(`run.py:460-462`).

**Abstraction check — the good part.** `grep -n "get_file_name\|open(" lib/galaxy/workflow/*.py`
now returns exactly one read: `modules.py:197`. Before this PR there were two hand-rolled
`with open(...) as f: json.load(f)` blocks in the same file with different comments and no shared
error handling. That is a real consolidation, not accretion, even though it does add two functions
to an already-3000-line module.

The failure object is also correct reuse rather than invention: `run.py:296-301` already wraps any
stray `MessageException` as `InvocationUnexpectedFailure(reason=FailureReason.unexpected_failure,
details=str(e), workflow_step_id=step.id)`. The PR constructs the identical shape, and the
`workflow_step_id=` keyword works because `InvocationMessageBase` sets `populate_by_name=True`
against the `validation_alias="workflow_step_index"`
(`lib/galaxy/schema/invocation.py:206-211`, `:125`). `unexpected_failure` is the right member —
there is no more specific one, and it is deliberately excluded from `FAILURE_REASONS_EXPECTED`
(`invocation.py:101-109`) so `run.py:263-265` logs it at `error` rather than `info`, which is what
you want for a filesystem anomaly.

---

## Verification

This worktree has no `.venv`. I borrowed `/Users/jxc755/projects/worktrees/galaxy/pr/22781/.venv`
(also 26.1 — `VERSION_MAJOR = "26.1"` in both) and pointed `PYTHONPATH` at *this* worktree's `lib`
and `test`; confirmed `galaxy.workflow.modules.__file__` resolved to `pr/23354` before running
anything. Nothing in either worktree was modified — `git status --porcelain` is empty here and the
borrowed venv was not written to (mypy came from `uvx`, not an install).

**Tests — run, not just read:**

```
python -m pytest test/unit/workflows/test_modules.py -q   → 70 passed
python -m pytest test/unit/workflows/ -q                  → 106 passed, 1 skipped, 15.83s
```

**Lint / types — run:**

```
uvx --from black==26.3.1 black --check   modules.py run.py test_modules.py → 3 files unchanged
uvx --from isort==8.0.1  isort --check   (same 3, --settings-path .isort.cfg) → clean
uvx --from mypy==2.1.0   mypy --config-file mypy.ini --python-executable <borrowed venv>
                         lib/galaxy/workflow/modules.py lib/galaxy/workflow/run.py
                         → Success: no issues found in 2 source files
```

I did not take that mypy "success" on faith — a scratch probe (`reveal_type` on
`replacement_for_input`'s return, plus a deliberate `x: int = r`) confirmed mypy was genuinely
resolving Galaxy types and not silently `ignore_missing_imports`-ing the whole tree. The probe is
deleted. It also produced the revealed type quoted in P3-2.

**Reasoned, not executed** (each traced through the source, cited below): the timezone/clock
analysis, the mid-traversal delay analysis, the `can_map_over` behavior-preservation argument, and
the object-store error surface.

### The infinite-loop question (the reporter's explicit worry) — bounded

`seconds_since_updated` lives on `UsesCreateAndUpdateTime`
(`lib/galaxy/model/__init__.py:545-548`), which `DatasetInstance` inherits (`:5378`). It computes
`now() - update_time`, and `now()` is `datetime.now(timezone.utc).replace(tzinfo=None)`
(`lib/galaxy/util/__init__.py:71-75`) — the *same* callable used as the column's `default` and
`onupdate` (`model/__init__.py:1466`, and `orm/now.py` re-exports it). Naive UTC on both sides. No
timezone mismatch; the grace window is neither always-on nor always-off.

The `update_time is not None` guard at `modules.py:211` is load-bearing and correct, though the
comment undersells why. `seconds_since_updated` falls back to `self.update_time or now()`, i.e. it
returns ~0 for an unflushed row — *always inside the grace period*. Without the explicit `None`
check this would be the infinite loop the reporter feared. The PR closes it.

Could `update_time` be refreshed on each scheduling pass, keeping the window permanently open? I
found no path. `onupdate=now` fires only when the HDA row is part of an UPDATE, and nothing in the
delay loop writes to it — `replacement_for_input` → `replacement_for_connection` is read-only apart
from `expire_populated_state()` on collections (`run.py:535`), which expires rather than updates. A
*stale* identity-map `update_time` would be an older value, pushing the invocation toward failure,
not toward looping. The one unbounded-ish case is clock skew between Galaxy processes (a handler
whose clock is ahead makes `seconds_since_updated` negative), and that delays only for the duration
of the skew; `lib/galaxy/model/orm/now.py`'s own header already tells admins to run NTP.

At `workflow_monitor_sleep` default `1.0` (`config_schema.yml:3655-3657`) the grace period is worth
roughly 60 retries. See P3-1 about what those retries do to the log.

### Delay raised mid-traversal — safe, and unchanged from before

`visit_input_values` runs at `modules.py:2907-2914`; `execute()` is not reached until `:2977`. So a
`DelayedWorkflowEvaluation` out of `callback` aborts **before any job is created**. Everything the
traversal accumulates is a per-iteration local: `execution_state` (a `tool_state.copy()` at `:2862`),
`found_replacement_keys` (`:2867`), `param_combinations` (`:2852`). The only persistent write ahead
of the raise is `step.state = self.state` at `:2836`, which is recomputed from
`compute_runtime_state` on every pass regardless.

And critically: pre-PR, the same code raised a bare `json.JSONDecodeError` from the same point, and
it unwound through the same `except Exception` at `run.py:260`. The unwind path is unchanged; only
the exception type differs. This was my highest-risk hypothesis going in and it does not hold.

### The `can_map_over` rewrite — behavior-preserving

`DatasetCollectionElement.collection` is the **parent** collection
(`model/__init__.py:8506-8509`, `primaryjoin` on `dataset_collection_id`, distinct from
`child_collection` at `:8503`). So the old code read the parent's `allow_implicit_mapping`, and the
new code reads the same thing. Semantics preserved (arguable as they may be).

Exhaustively, the objects reaching that loop with a `.collection` attribute are: HDCA (`:8054`),
LDCA (`:8448`), DCE (`:8506`) — all three admitted by the new `isinstance` — and
`CollectionAdapter`, whose `.collection` returns `self`
(`model/dataset_collections/adapters.py:60-65`). But `allow_implicit_mapping` is defined *only* on
`DatasetCollection` (`model/__init__.py:7710-7711`); no adapter defines it. So under the old
`hasattr` an adapter would have raised `AttributeError`, not mapped. Nothing was lost by excluding
them — and in any case `replacement_for_input` cannot return one: adapters are constructed at
`modules.py:2889` (inside `callback`, downstream of this loop) and in
`dataset_collections/subcollections.py:45`, neither of which feeds `step_outputs`.

The removed `if data is not NO_REPLACEMENT:` guard at old `:688` was **already dead code** —
`NoReplacement` has no `.collection`, so the old `hasattr` had `continue`d long before. Same for the
`list[...]` multiple-input case. The new early `continue` subsumes it exactly.

### Why mvdbeek's objection in the issue thread doesn't hold (useful for the discussion)

mvdbeek asked: *"The job handler must be able to see the outputs to finish the job, so this is only
ever possible if for some reason job and workflow schedulers have different NFS access timings?"*

The handler never reads back the path the scheduler reads. With `outputs_to_working_directory` and
non-extended metadata, `lib/galaxy/jobs/__init__.py:2123-2128` has the handler do
`shutil.move(dataset_path.false_path, dataset_path.real_path)` — it *writes* `real_path`, from its
own NFS client, and never opens it afterwards. With extended metadata that move happens on the
compute node instead (the `# output will be moved by job if metadata_strategy is extended_metadata`
comment on `:2124`), i.e. on a different VM with a different mount — exactly ksuderman's Google
Batch shape.

ksuderman's other claim — that the handler only examines metadata, not bytes — is *half* wrong and
it doesn't help mvdbeek's case. `ExpressionJson.set_meta`
(`lib/galaxy/datatypes/text.py:157-177`) genuinely does `json.load` the file and raises
`Invalid JSON encountered` on garbage. But it reads the working-directory copy (or runs on the
compute node), not `real_path` on the scheduler's mount. So "the job handler saw valid JSON" is
still not evidence that the scheduler's NFS client will. Close-to-open consistency between two
clients is the whole gap, and the race window is as wide as assumed.

That same `set_meta` leaves behind a signal the PR ignores — see P3-6.

---

## P2-1 — on object stores the bounded policy never engages, and the path leak returns

`modules.py:200` catches `(FileNotFoundError, json.JSONDecodeError)`. That covers posix correctly,
including the non-obvious case: when `object_store.exists()` is False, `Dataset.get_file_name`
returns `""` (`model/__init__.py:4831-4834`), and `open("")` raises
`FileNotFoundError: [Errno 2] No such file or directory: ''` — verified empirically.

But on a caching or distributed object store it never gets that far.
`lib/galaxy/objectstore/_caching_base.py:306` raises `ObjectNotFound` when the pull into cache
fails, and `:68` / `:74` raise `ObjectInvalid`; `objectstore/__init__.py:1220` does the same for the
distributed store. Both escape `read_expression_json` untouched, so an S3-, Azure-, irods- or
rucio-backed 26.1 deployment gets none of this PR's benefit for the identical race — and there *is*
a race there, `_caching_base.py:299-305` is a TOCTOU between `_exists` and `_pull_into_cache`.

Worse for the PR's own stated goal: `ObjectNotFound` is a `MessageException`
(`galaxy/exceptions/__init__.py:240`), so it falls into `run.py:295-302` and gets reported as
`details=str(e)` — which is
`"objectstore.get_filename, no cache_path: <obj>, kwargs: {...}"`, i.e. object-store internals in
the invocation message. That is precisely what the comment at `modules.py:204` ("keep that out of
the invocation message") is guarding against on posix. `ObjectInvalid` is a plain `Exception`
(`exceptions/__init__.py:57`), so it isn't even wrapped with a step id.

**Suggested fix** — widen the tuple:

```python
from galaxy.exceptions import ObjectInvalid, ObjectNotFound  # top of file
...
except (FileNotFoundError, json.JSONDecodeError, ObjectNotFound, ObjectInvalid) as e:
    ...
    problem = e.msg if isinstance(e, json.JSONDecodeError) else "file not found"
```

There is direct precedent in-tree for pairing these two families against exactly this failure mode:
`lib/galaxy/jobs/__init__.py:1959` is `except (OSError, ObjectNotFound) as e:` inside the
NFS-attribute-cache retry loop. I would *not* widen `FileNotFoundError` to `OSError` — the new
`test_read_expression_json_does_not_swallow_other_os_errors` shows that narrowness is deliberate,
and I agree with it.

## P2-2 — 60s is a module constant, next to a config option that documents this exact problem

`EXPRESSION_JSON_GRACE_PERIOD_SECONDS = 60` (`modules.py:184`) is not reachable by an admin. Galaxy
already ships `retry_job_output_collection`, and its description
(`lib/galaxy/config/schemas/config_schema.yml:3745-3754`) is this PR's problem statement almost
word for word:

> If your network filesystem's caching prevents the Galaxy server from seeing the job's stdout and
> stderr files when it completes, you can retry reading these files. The job runner will retry the
> number of times specified below, waiting 1 second between tries. For NFS, you may want to try the
> `-noac` mount option (Linux) or `-actimeo=0` (Solaris).

I'm not arguing 60 is the wrong number — it came out of the issue discussion and the reasoning there
is sound. I'm arguing that the site that hits this is by construction a site with a slow or oddly
mounted shared filesystem, and it is the one site that cannot turn the knob. A deployment whose
NFS lag is 90s gets a permanently-failing workflow and a constant in a 3000-line Python module as
its only recourse. This is the standing "old codebase, don't grow a second unrelated knob for the
same phenomenon" concern.

**Suggested fix** — either a config option beside the existing one
(`workflow_scheduler_expression_json_grace_period`, default 60, reachable as
`trans.app.config.…` — `read_expression_json` already has `step`, and `step.workflow` is one hop
from an app), or, if that's too much for a release branch, at minimum a comment on `:181-183`
pointing at `retry_job_output_collection` so the next person finds both.

## P2-3 — the one behavior the fix exists for is the one cell of the 2×2 not asserted

The new tests cover three of four combinations:

| | within grace | past grace |
|---|---|---|
| **invalid JSON** | `..._empty_file_recently_updated_delays` (`:343`) | `..._malformed_fails_after_grace_period` (`:350`) |
| **missing file** | **absent** | `..._missing_file_fails_after_grace_period` (`:365`) |

Missing-file-within-grace → `DelayedWorkflowEvaluation` is the path the PR exists to create, and it
is asserted nowhere. It's one line given the existing helper:

```python
def test_to_cwl_expression_json_missing_file_recently_updated_delays(tmp_path):
    hda = _expression_json_hda(tmp_path / "expression.json", None)
    with pytest.raises(modules.DelayedWorkflowEvaluation):
        modules.to_cwl(hda, [], _workflow_step())
```

Second gap: everything new calls `to_cwl` / `read_expression_json` /
`replace_expression_json_dataset` directly. The reported traceback in #23257 went through
`ToolModule.callback`, not `to_cwl` — a non-data (`text`) parameter connected to an upstream
`expression.json` output. Nothing exercises the `modules.py:2896` wiring, and nothing exercises the
delay→retry→succeed cycle that is the point of the change.
`test/unit/workflows/test_workflow_progress.py:129 test_replacement_for_tool_input` is the existing
harness for that shape (`MockTrans`, `_new_workflow_progress`, `step_dict`) and would take an
`input_type: "text"` sibling. I'd take that over an integration test.

**What the tests get right,** and I want to be explicit since these are the assertions I would
otherwise have asked for: `assert str(tmp_path) not in why.details` (`:375`) actually checks the
path-leak claim rather than trusting it; `test_read_expression_json_does_not_swallow_other_os_errors`
(`:385`) pins the deliberate narrowness of the `except`; `..._without_update_time_fails_immediately`
(`:377`) pins the anti-infinite-loop guard; `..._without_step_reraises_read_error` (`:393`) pins the
job-side contract. No monkeypatching anywhere — the helper writes real files under `tmp_path` and
sets `dataset.external_filename`, so `Dataset.get_file_name`'s real code path runs. Nothing is
weakened.

## P3-1 — an ERROR traceback per second for sixty seconds, and it omits the one fact an operator needs

`modules.py:207` is `log.exception(...)` on **both** branches, before the delay/fail split. At the
default `workflow_monitor_sleep: 1.0` that is up to ~60 ERROR-level stack traces per transient NFS
blip per step, for a condition the PR itself classifies as expected-and-recoverable.

And the message deliberately omits the path — correct for `details`, wrong for the log. For
`FileNotFoundError` the path survives in the traceback's exception repr, but for
`json.JSONDecodeError` (the empty-file case, which is the *actual* reported symptom) it does not:
`e.msg` is a fixed string like `"Expecting value"`. So an operator debugging the exact scenario from
#23257 gets sixty tracebacks and no filename. Half of mvdbeek's stated intent for this design was
"log an error [so we get] an idea of it really is NFS"; without the path there's no mount to go look
at.

**Suggested fix** — split the severities and put the path in the log only:

```python
log.warning(
    "%s. Dataset was last updated at %s, path %s.",
    details, dataset_instance.update_time, dataset_instance.get_file_name(),
)  # delay branch
log.exception(...)  # fail branch keeps the traceback
```

(`get_file_name()` is cheap on the second call for posix; guard it if that worries you on an object
store.)

## P3-2 — `StepInputReplacement` isn't load-bearing, and it loses the one honest annotation there was

mypy's revealed type for `replacement_for_input`:

```
NoReplacement | HistoryDatasetAssociation | HistoryDatasetCollectionAssociation
  | DatasetCollectionElement | PromoteCollectionElementToCollectionAdapter
  | None | int | float | str | list[Any] | dict[Any, Any]
```

Because `ExpressionJsonValue` (`:169`) uses bare `list` and `dict`, the alias admits `list[Any]` and
`dict[Any, Any]` — so it accepts essentially any value except an unrelated model object. Three
consequences:

1. The old annotation had `list[model.DatasetCollectionInstance]` for the `multiple` branch
   (`run.py:471-476`). That branch builds `temp` from `replacement_for_connection`, which is
   *unannotated* and returns `Any`, so `list[Any]` type-checks vacuously. The one place the old
   annotation carried real information is the one place the new one doesn't. `-> Any` on
   `replacement_for_connection` is the actual leak; annotating that would make the alias mean
   something.
2. The alias omits `LibraryDatasetCollectionAssociation` (`model/__init__.py:8437`), which the old
   `model.DatasetCollectionInstance` covered and which the *runtime* check at `modules.py:690` still
   admits. Type says HDCA-only; `isinstance` says any `DatasetCollectionInstance`. Pick one.
3. It includes `PromoteCollectionElementToCollectionAdapter`, which `replacement_for_input` cannot
   return (see the `can_map_over` section) — that member exists for `callback`'s local at `:2873`.
   Two different value spaces sharing one alias.

None of this is wrong, and I'd take it over the old annotation; it just isn't the narrowing the
commit message ("Name what a connected tool step input can be replaced with") implies. Cheapest real
improvement: `list[Any]` → drop the bare containers from `ExpressionJsonValue` in favour of a
recursive JSON alias, and annotate `replacement_for_connection`.

## P3-3 — `replacement.hda` where `dataset_instance` exists

`modules.py:234` uses `replacement.hda`, which is `None` for a DCE whose element is an LDDA.
`DatasetCollectionElement.dataset_instance` (`model/__init__.py:8598-8603`) returns
`element_object` and raises a clear `AttributeError` for nested collections, which is the accessor
the rest of the model uses. This is a faithful extraction of the pre-PR code so it is not a
regression, and the LDDA-in-a-collection case may be unreachable here — but the extraction into a
named helper is the moment to use the model's own accessor rather than carry the field access
forward.

## P3-4 — a purged expression.json spends 60s in the grace period

`to_cwl` checks `value.dataset.purged` before reaching the read (`:265-270`), but
`replace_expression_json_dataset` does not, and that is the path from `ToolModule.callback`. A
purged dataset returns `""` from `get_file_name` (`model/__init__.py:4826-4828`, with its own
`log.warning`), which becomes `FileNotFoundError` → "file not found". If it was purged recently the
invocation delays a minute and then reports a misleading cause. A `dataset_instance.purged` check in
`replace_expression_json_dataset` would fail fast with the right reason, and `to_cwl` already shows
the shape (`InvocationFailureDatasetFailed`, `reason=dataset_failed` — a *better* reason than
`unexpected_failure` for this case).

## P3-5 — the rewritten `safe_loads` comment lost its subject

Old (`:271-273`): `# OUR safe_loads won't work, will not load numbers, etc...`
New (`:198`): `# safe_loads preserves non-container JSON values as their source text.`

The new sentence is factually correct — `galaxy/util/json.py:59-60` returns `arg` unchanged when the
parsed value is not `Iterable`. But it now sits above a `json.load` call and states a property of a
function that isn't being called, with the "…which is why we don't use it here" clause deleted. The
original was vague but at least said what the comment was *for*. Restore the second half.

## P3-6 — `metadata.json_type` is an existing signal for exactly this decision

`ExpressionJson.set_meta` (`lib/galaxy/datatypes/text.py:153-177`) writes
`dataset.metadata.json_type` after successfully `json.load`ing the file. A dataset with `json_type`
populated *was* valid JSON when metadata ran; a read failure now is almost certainly a visibility
problem. One with `json_type` unset either had no data (`if dataset.has_data()` at `:159`) or the
metadata job never ran.

That is a cheaper and more specific discriminator than elapsed time, and it already exists. It
wouldn't replace the grace period — you'd still want the clock as a backstop — but
`json_type is not None` would let a genuinely-corrupt-and-recent dataset fail immediately instead of
burning 60s, which is the case mvdbeek explicitly wanted to be able to detect.

**Flagged as unverified**: I did not confirm that `json_type` is reliably populated for
`expression.json` outputs of internal tools like `compose_text_param` — under
`outputs_to_working_directory` the metadata may be computed remotely and imported, and I did not
trace whether the import preserves it. Worth a check before acting on this one.

---

## Verdict

**Approve with comments.** The core judgement is right: bound the retry by `update_time` rather than
a counter, keep the job-side raise unchanged, and give the invocation a step id and a
path-free reason. All three claims in the PR description hold —

- **Job-side behavior preserved: true.** `to_cwl` has exactly one caller outside
  `lib/galaxy/workflow/modules.py` — `lib/galaxy/tools/evaluation.py:1123` — and it passes no
  `step`, so `step is None` and the original exception propagates. (That call site is a
  function-level `from galaxy.workflow.modules import to_cwl` at `:1117`; pre-existing, almost
  certainly circular-import driven, untouched here.) The other two readers of `expression.json`
  bytes, `tools/parameters/wrapped_json.py:189` and `tool_util/cwl/representation.py:153`, are
  job-side and outside this PR's blast radius.
- **No new function-level imports**; `TypeAlias` and `InvocationUnexpectedFailure` both land at the
  top of `modules.py`.
- **No test weakened**; the new ones are real-file, monkeypatch-free.

Before merge I'd act on **P2-1** — a 26.1 release fix for an object-store-era race that only works
on posix is half a fix, and on `ObjectNotFound` it reintroduces the path leak the PR is otherwise
careful about. **P2-3**'s missing-file-within-grace test is one line and covers the headline
behavior. **P2-2** is the reuse concern and the one I'd most want a *response* to even if the answer
is "not on a release branch." Everything at P3 is optional.

---

## Not verified

- **CI failures not attributed.** Integration shards 0-3 failed in setup with no test output
  (infrastructure). API tests (3.10, 1) and Playwright failed after 35-48 minutes, but
  `gh run view --log` drops the pytest block for those jobs and the check annotations carry only
  `Process completed with exit code 1`, so I have no failing test names. `Selenium tests` is red on
  the base tip `d372d708` as well. I did not download the HTML artifacts. **Someone should confirm
  these are unrelated before merge** — I am not asserting either way.
- **No integration, framework, or API test was run.** Only `test/unit/workflows/`.
- **The delay→file-appears→succeed cycle was never executed**, at any level. That is the fix's whole
  purpose and no test in the tree covers it.
- **The object-store branch was never exercised.** `_expression_json_hda` sets
  `dataset.external_filename`, which short-circuits `Dataset.get_file_name` past the object store
  entirely (`model/__init__.py:4840-4843`). P2-1 is read from source, not reproduced.
- **`metadata.json_type` reliability** for internal-tool `expression.json` outputs (P3-6).
- **Client-side rendering of `details`** on a failed invocation was not checked.
- **mypy was not run across the whole tree** (the PR claims 2,280 files); only the two changed lib
  files, against a borrowed 26.1 venv rather than this worktree's own.
- **flake8/ruff not run** — only black and isort, both clean.
- Nothing was posted to GitHub; nothing was committed.

---

## Follow-ups (out of scope for this PR)

- **Orphaned running jobs on invocation failure.** #23257 documents that when the invocation flips
  to `failed`, already-dispatched jobs keep running to `ok` and tail steps sit at `new` forever. This
  PR fixes the null-`workflow_step_id`/null-`details` half of that report and does not touch the
  other half — correctly, it's a separate concern about `FailWorkflowEvaluation` semantics. Worth
  its own issue if one doesn't exist.
- **`replacement_for_connection` is unannotated** and returns `Any`, which is what makes
  `StepInputReplacement` unable to constrain the `multiple` branch (P3-2). Annotating it is a
  self-contained cleanup that would give the new alias teeth.
- **`"expression.json"` as a bare string literal** appears in ~12 places across `lib/galaxy` —
  `tools/__init__.py:4422`, `tools/evaluation.py:365`, `tool_util/cwl/util.py:539`,
  `model/__init__.py:5544`, and so on. `ExpressionJson.file_ext` is `"json"`, not
  `"expression.json"`, so there is no obvious constant to point at. Pre-existing and unrelated to
  this PR, but the two new occurrences at `modules.py:237` and `:273` make it a dozen.
