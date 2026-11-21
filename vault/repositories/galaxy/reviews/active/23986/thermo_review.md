# Thermo-nuclear code quality review: galaxy#23986

- Profile: thermo_review (`_shared/reviewers/thermo_review.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `ae37e517ebc3e8acbbd2225848f4b896511375f1`
- Base: `dev` (not a release branch, so no follow-up refactor issue file)

Scope: structure, reuse and refactoring only. The code was not run, and I did not hunt for bugs. The PR description deliberately chooses Crypt4GH-specific code with no pluggable protection-scheme layer. I take that as given. None of the findings below asks for a scheme abstraction. They are about how the feature attaches to Galaxy's shared job, metadata and datatype-change paths.

## Overall

The new modules are well isolated and carefully commented: `job_execution/protection/`, `managers/dataset_protection.py`, `datatypes/crypt4gh.py` and `util/crypt4gh.py`. Some consolidations are a net improvement: `Registry.redetect_ext` replaces four copies of `sniff.guess_ext(get_file_name(), sniff_order)`, `Registry.get_converter_deps` replaces three `converter_deps[...][...]` try/except blocks, and `DefaultJobDispatcher.runner_of` and `_source_or_package` are small, useful extractions. No file crosses the 1k-line threshold because of this PR. `jobs/__init__.py`, `registry.py` and `discover.py` were already over 1k, and `set_metadata.py` goes from 676 to 736 lines.

The main structural problem is the integration seam. The PR attaches through inline `if job.protection_scheme` and `if output_protector` checks spread across Galaxy's busiest flows, not through an object those flows call. That is 13 `protection_scheme` checks across `jobs/__init__.py`, `model/__init__.py` and `set_metadata.py`, and 24 `output_protector` references in `set_metadata.py` alone. The rest of Galaxy may only say "protected", as the design note promises, but it has to say it in a lot of places.

## Findings

### P2 1: Protected-job behavior is scattered as inline `job.protection_scheme` branches through `MinimalJobWrapper`; move it behind a per-job protection policy object

`lib/galaxy/jobs/__init__.py` now checks `job.protection_scheme` (or calls into `app.dataset_protection`) in at least nine unrelated places:

- `cleanup_job` forces `"always"`
- `protection_setup_failure()`
- `clear_working_directory` deletes rather than archives
- `_authorize_protected_job` resets `job.protection_scheme` and `job_io.protection_plan_path` on every prepare
- the job-cache reuse condition in `prepare`
- `fail()` skips the `outputs_to_working_directory` move, then runs a separate `fail_job` cleanup block
- `_finish_dataset` skips stdout and stderr in `dataset.info`
- `finish()` reads `purged_outputs` before import and runs `finish_job` verification after it

On top of that, `JobLike.set_streams` in `model/__init__.py` does a `getattr(self, "protection_scheme", None)` check, and `BaseJobRunner._finish_or_resubmit_job` calls `protection_setup_failure()` as a fallback inside the `remote_tool_eval` error path.

Each check is reasonable on its own. Together they are spaghetti growth in the most central class of the job system: a reader of `fail()` or `finish()` now has to know the Crypt4GH lifecycle to follow the generic flow. A future change to any of these flows has to remember the protection rule, and nothing enforces that. The same invariants also appear twice in different forms. "Tool output must not reach `dataset.info`" is enforced both in `_finish_dataset` and in `set_metadata.py`. "Don't keep the job directory" is enforced both in `cleanup_job` and in `clear_working_directory`.

**Suggested restructuring (code judo):** have `DatasetProtectionManager` return a per-job policy object from the place the job is authorized. A protected job gets a real implementation; every other job gets a null object that does nothing. `MinimalJobWrapper` holds `self.protection` and calls it unconditionally at fixed lifecycle points:

- `protection.cleanup_job(default)`
- `protection.clear_working_directory(jwd)`
- `protection.allows_job_reuse`
- `protection.redact_dataset_info(...)` / `redact_streams(...)`
- `protection.before_import(job)`
- `protection.on_fail(job, wd, message)`
- `protection.on_finish(job, wd, state)`
- `protection.setup_failure(wd)`

Every `if job.protection_scheme` disappears from the wrapper. The rules live together in one module where they can be read and tested as one policy. Generic flows stay generic. The `job.protection_scheme` column stays as the persisted discriminator used to rebuild the policy, but the wrapper stops branching on it. `JobLike.set_streams` should take an explicit `redact` decision from its caller instead of probing an attribute with `getattr`.

### P2 2: `set_metadata_portable` gains roughly a dozen `output_protector` branches; give output persistence a strategy object instead

`lib/galaxy/metadata/set_metadata.py` was already a long, stateful function. The PR threads `output_protector` through it as a nullable mode flag. With an output protector, the function:

- skips validation (`and not output_protector`)
- calls `protect_declared` and records `stored_from_discovery`, which changes `push_if_necessary` queueing
- strips tool metadata from `file_dict`
- swaps `collect_extra_files` for `persist_extra_files`
- skips stdout and stderr in `dataset.info` (two separate `not output_protector and ...` conditions)
- uses `_format_exc(output_protector)` for tracebacks in two places
- installs a root logging filter
- refuses unnamed outputs
- forces `job.protection_scheme`
- calls `output_protector.finish(...)` and flips `job.state`
- skips `write_job_metadata`

The same nullable `output_protector` is also threaded into `ModelPersistenceContext` (`discover.py`: `create_dataset`, `set_datasets_metadata`, `_persist_paths`) and `collect_primary_datasets` (`output_collect.py`).

This is the "one-off nullable mode that complicates existing control flow" pattern. Every branch is a place where plain and protected persistence can drift apart, and a new step added to this function has no way to know whether it needs a protected variant.

**Suggested restructuring:** define a small output-persistence strategy for jobs:

- `before_store(dataset, path, extra_files) -> stored_already: bool`
- `extra_files_action(dataset)`
- `dataset_info(context)`
- `format_exc()`
- `filter_tool_attributes(attrs)`
- `should_validate`
- `finish(datasets, wd) -> ok`
- `writes_job_metadata`

Build it once from `metadata_params`: plain persistence by default, `OutputProtector`-backed for protected jobs. Pass that object, not an `Optional[OutputProtector]`, to `set_metadata_portable`, `ModelPersistenceContext` and `JobContext`. The plain implementation keeps today's behavior exactly, and the conditionals become method calls. `OutputProtector` already holds most of this logic (`protect_declared`, `without_tool_metadata`, `finish`), so this mainly moves the remaining branches out of `set_metadata.py` and into the class that owns the concept.

### P2 3: The "datatype change must keep encryption" invariant is enforced separately at six datatype-change entry points; enforce it at the canonical choke point

`keeps_encryption` and `ensure_datatype_change_keeps_encryption` are called from six places:

- `managers/datasets.py` (deserializer)
- `managers/library_datasets.py` (with a re-ordering of `new_file_ext` so the check runs first)
- `services/history_contents.py` (bulk change)
- `controllers/dataset.py` (datatype list filter)
- `job_execution/actions/post.py` (`ChangeDatatypeAction._change_datatype`, which also wraps `newtype` and logs instead of raising)
- indirectly through `redetect_ext`, which preserves wrappers

Generic modules (`post.py`, `managers/datasets.py`) now import the `Crypt4GH` datatype class and do `isinstance` checks. That contradicts the design note's own boundary that "the rest of Galaxy only talks about protected datasets". It also leaves any other datatype-change path unprotected unless someone remembers this rule. Existing examples are the celery `change_datatype` task with an explicit type, and the job-search and import paths.

Galaxy already has a datatype-level hook for this, `Data.is_datatype_change_allowed()`, which the deserializer calls right next to the new check. It also has a single mutation point, `Registry.change_datatype(data, ext)`.

**Suggested restructuring:** generalize the existing hook into a target-aware policy on the datatype, for example `datatype.datatype_change_refusal(target) -> str | None`. `Crypt4GH` overrides it, and `Data` defaults to `None` unless `is_datatype_change_allowed()` is false. Then:

- call that one policy from `Registry.change_datatype`, and from one shared `ensure_can_change_datatype_to(item, target)` used by the API paths that need an early, user-facing error
- have the UI datatype list filter on the same policy
- move the PJA's "wrap the requested type when the input is encrypted" step into `Crypt4GH` as well (a "target for relabel" method)

Generic code then stops importing `Crypt4GH`, the six call sites collapse to one or two, and new change paths are covered by default.

### P2 4: Destination capability detection reaches across layers (`app.job_manager.job_handler.dispatcher`, runner name string compare) and is split between `ProtectionDestination.check` and `command_factory`

`MinimalJobWrapper._protection_destination` finds its runner through `getattr(self.app.job_manager.job_handler, "dispatcher", None)`. It then asks the dispatcher three new static or instance helpers (`runner_of`, `is_pulsar`, `splits_into_tasks`) and a new runner attribute (`runs_job_script_in_container`). `is_pulsar` is `runner.runner_name == "PulsarJobRunner"`. The wrapper is assembling facts the runner already owns, through a back-reference that the `getattr` default shows may be missing.

Refusals are also split across two layers:

- `ProtectionDestination.check` (metadata strategy, tasks, Pulsar remote metadata and `rewrite_parameters`, live output reporting, container runners, recryptor) runs while preparing.
- `command_factory.build_command` raises `insecure_destination_error` for two more conditions (metadata not embedded in the job; Pulsar with remote tool evaluation) while building the command line.

So "can this destination run protected jobs?" has no single answer, and runners have to catch `ProtectionError` at two different stages. `runners/__init__.py` and `pulsar.py` now both have new `except ProtectionError` arms, and `pulsar.py` has two.

**Suggested restructuring:** runners already call `job_wrapper.prepare()`. Have each runner describe its own capabilities, for example `runner.protection_capabilities(job_wrapper) -> ProtectionDestination`, with `PulsarJobRunner` overriding it instead of being detected by name. Pass that into `prepare`. Fold the two `command_factory` conditions into `ProtectionDestination.check`: embedded metadata and remote tool evaluation are both known before the command is built. Then `command_factory` only emits the stage commands, the dispatcher keeps its original shape, and all refusals happen in one place at one stage.

### P3 1: `ProtectedInputsComputeEnvironment` is ~90 lines of delegation plus a `__getattr__` escape hatch

`compute_environment.py` adds a decorator that forwards all twenty `ComputeEnvironment` methods explicitly. It adds `__getattr__` for "runner specific attributes, e.g. Pulsar's path mapper", and a `materialized_objects` property and setter pair so that writes reach the wrapped object. Only three methods change behavior: `input_path_rewrite`, `input_extra_files_rewrite` and `input_metadata_file_rewrite`.

The `__getattr__` is the "magic" this review profile warns about. Callers that do `isinstance` or attribute probing on the Pulsar environment now go through an untyped proxy, and the property pair exists only because the wrapper is not the object the runner created.

**Suggested fix:** extract a reusable `DelegatingComputeEnvironment` base so the protected override is three methods. Better still, put the protected-input rewrite into the path-rewrite step itself: an optional `input_overrides: Mapping[dataset_id, StagedInput]` that `ComputeEnvironment` consults (or that the tool evaluator applies) before delegating. That avoids wrapping the runner's object, so the `__getattr__` and the `materialized_objects` forwarding go away. `remote_tool_eval.py` then sets the overrides instead of building a second wrapper.

### P3 2: `check_job_inputs` and `authorize_job` duplicate the grant-check loop with different exception types

`DatasetProtectionManager.check_job_inputs` (raised at request time) and `authorize_job` (raised at prepare time) both:

- classify inputs
- refuse unsupported tools with `_unsupported_tool_message`
- loop over the inputs to decrypt, calling `get_usable_grant`, raising a "not authorized" message, then calling `_grant_refusal`

Only the exception class and the wording of the "not authorized" message differ.

**Suggested fix:** have one `_grants_for(user, tool, to_decrypt, skip_not_ready=...) -> list[(instance, grant)]` raise `ProtectionError`. `check_job_inputs` converts it to `RequestParameterInvalidException` in one `except`, which it already does for `inputs_needing_decryption`. This removes the parallel copy, which will otherwise drift the next time a refusal rule is added.

### P3 3: `Crypt4GHGrantData` encodes a state machine in optional fields; `_job_files_key`, `_extra_files_expiration`, `_extra_files_expire` and `_lacks_extra_files` reconstruct it

A grant's "job files" (extra files, metadata files, copied extra files) may or may not carry their own `extra_files_key`. When the key is missing they fall back to the grant's own `key_ref` and `expires_at` (`_job_files_key`). Expiration is `None` unless both `extra_files_key` and `extra_files` are set (`_extra_files_expiration`). `_store_user_grant` and `_record_output_grants` each hand-maintain these combinations: copy over `copied_extra_files`, set `extra_files_key` only when `extra_files` or `metadata_files` exist, and so on.

That is five optional or defaulted fields plus four helpers whose job is to interpret which combination is in effect.

**Suggested fix:** model the job-created files as one optional sub-record that always carries its key, for example:

```python
class JobFiles(BaseModel):
    key_ref: str
    expires_at: datetime
    extra_files: dict[str, str] = {}
    metadata_files: dict[str, str] = {}
    copied_extra_files: list[str] = []
```

Grant data then becomes `compute_header: str | None` plus `job_files: JobFiles | None`. The fallback helper, the null-expiration logic and the "keep previous when re-authorizing" copying shrink to `grant_data.job_files = previous.job_files`. `grant_status` and `_staged_metadata_files` read `job_files.expires_at` directly.

### P3 4: `managers/dataset_protection.py` mixes four responsibilities in 893 lines

The module holds:

- grant storage and validation (`validate_crypt4gh_grant`, `register_user_grant`, `_store_user_grant`, `grant_status`)
- tool-input classification (`_protected_inputs`, `_read_datasets`, `_dataset_instances`, the conversion handling and `retire_unusable_conversion`)
- job authorization and plan building (`authorize_job`, `_protected_input`, `_staged_metadata_files`, `_outputs_in_directory`)
- post-job verification and cleanup (`finish_job`, `fail_job`, `_is_protected_as_recorded`, `_record_output_grants`, `_purge`)

There are also about 25 module-level private helpers. It is under the 1k threshold, but it is the file every future protection change will touch.

**Suggested fix:** split it along those seams, for example `dataset_protection/grants.py`, `inputs.py`, `authorization.py` and `verification.py`, with `DatasetProtectionManager` as a thin facade. The per-job policy object proposed in P2 1 is a natural home for the verification half.

### P3 5: Generic helpers parked in `util/crypt4gh.py`

`iter_relpaths(directory)` is a general directory-walk helper. It is used by `datatypes/crypt4gh.py`, `protection/outputs.py` and `managers/dataset_protection.py` for any extra-files tree, but it lives in the Crypt4GH utility module. Every caller then imports `galaxy.util.crypt4gh` for a non-Crypt4GH operation.

**Suggested fix:** move it to `galaxy.util.path`, or reuse an existing walker there if one fits.

## Not flagged

- The lack of a pluggable scheme layer, which the PR description explicitly chooses.
- The dynamic `<inner>.c4gh` datatype registration. It mirrors the existing auto-compressed datatype pattern closely enough. A shared "wrapper datatype" concept would also serve `uncompressed_datatype_instance` (for example, the sniff-order filter now checks both `uncompressed_datatype_instance` and `crypt4gh_inner_datatype`), but that is optional and borders on the scheme-layer question.
- Test volume and layering, which are left to the test-challenger profiles.
