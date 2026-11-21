# galaxy-brain research follow-ups from galaxy#23986 (learning review)

Source: [learning_galaxy.md](learning_galaxy.md), round 0 on `ae37e517ebc3e8acbbd2225848f4b896511375f1`. Current `dev` was checked at `7e7dfea5535`.

## Stale documentation (conflicts with current `dev`)

These notes describe code this PR builds on, and part of what they say is no longer true on `dev`, independent of whether #23986 merges.

### [[Component - Object Store Cache and Direct Access]] (verified @ `7761eeb3256`)

1. **"Three read paths."** The Overview table and the "Read path" sections say a caching store hands bytes to Galaxy through three paths: pull into cache, tee stream and direct download. `dev` has a fourth public read, `ObjectStore.get_data_head(obj, size)`, from #24517 (merged as `dcc54279d6e`, after the note's SHA). It returns the first `size` bytes **as stored in the backend**, not from the cache.
   - The interface is `objectstore/__init__.py:440` and `BaseObjectStore` dispatch is at `:840`, where a size of 0 or less returns `b""`.
   - `CachingConcreteObjectStore._get_data_head` (`_caching_base.py:242`) reads through `_read_remote_head`, which streams `_stream_remote` and stops at `size`.
   - On `ObjectNotFound` it falls back to a **non-empty** cached copy, the case after a failed push.
   - For backends without `_stream_remote` (rucio, irods, onedata, pithos) it uses `_get_filename`, a cache pull.
   - `DiskObjectStore` reads the file (`__init__.py:1341`), and nested stores use the first backend that has the object (`:1514`).
   - `PulsarObjectStore._get_data_head` raises `NotImplementedError` (`objectstore/pulsar.py:49`).
2. **Callers per path.** Add `get_data_head`. On `dev` it has no callers outside `objectstore/`. galaxy#23986 would be its first caller: protected-output verification reads at most 48 KiB per output.
3. **Gotchas 3 and 4.** Zero-byte cached files and `_exists` side effects should say how `get_data_head` treats them. An empty cached copy is never trusted as evidence, and the backend is read first.

### [[Component - Job Completion Lifecycle]] (verified @ `65e6daff233`)

1. **"Disk accounting / Baseline at this SHA"** says `finish()` sums `set_total_size()` and charges only `job.user`, and that "`fail()` charges nothing at this SHA". #24511 has merged forward to `dev` (`fcfe734fce3`).
   - `finish()` now calls `self._charge_outputs([...])` (`jobs/__init__.py:2601`).
   - `_charge_outputs` (`:1377`) charges every user holding an HDA of each non-purged output, found with `model.dataset_holders`, and locks users in id order.
   - `fail()` collects `uncharged_datasets` (outputs whose `total_size is None`) before refreshing outputs and charges them (`:1706-1737`).
2. **"Proposed by #24511 (open, `[25.1]`, not on `dev`)"** should become the baseline. The note itself asks to refresh the section once #24511 reaches `dev`.
3. **Walkthrough step 8 and the "Labelled quota source" transaction row** describe the old `adjust_total_disk_usage(collected_bytes, label)` call. Re-verify them against `_charge_outputs` / `adjust_disk_usage_for_datasets`. In particular, check which row locks are held from that point to the main commit.

### [[Component - Galaxy Pulsar Runner Code Sharing]] (verified @ `08d4c8af5d`)

1. **Channel 4, "What is unconstrained is the version"** says `command_factory.py:212-213` "emits a command that runs `remote_tool_eval.py` out of `$GALAXY_LIB`", so the remote Galaxy is "whatever full checkout the Pulsar operator pointed `galaxy_home` at". Since `4878910de64` ("Dispatch remote tool eval form on the Pulsar side"), the Pulsar command (`command_factory.py:43-50` on `dev`) runs the source only if `$GALAXY_LIB/galaxy/tools/remote_tool_eval.py` exists, and otherwise runs the packaged `galaxy-remote-tool-eval` console script from `galaxy-app` (`packages/app/pyproject.toml:106`). Non-Pulsar jobs choose between source and package by `galaxy_lib_dir` (`:244-248`). The version is still unchecked, but a remote host no longer needs a checkout. The channel table's "Mechanism" column should mention installed packages.

## Post-merge activities (only if #23986 merges)

### Research notes to update

- **New note.** Promote this review's [learning_galaxy.md](learning_galaxy.md) into a `Component - Protected Datasets (Crypt4GH)` research note, or queue it for `gx_research`. Cover grants, the protection plan, `galaxy-protected-stage`, `OutputProtector`, verification, the trust model and the admin requirements. Link it from the notes below.
- [[Component - Job Completion Lifecycle]]:
  - In the `finish()` walkthrough, add three steps. A protection setup failure fails the job before outputs are collected. `purged_outputs` is captured before the extended import. `DatasetProtectionManager.finish_job` verifies, purges or grants after outputs are collected and before the error fan-out, and its grants commit with the main commit.
  - In `fail()`, add that protected jobs don't move outputs out of the working directory and that `fail_job` removes stored data it can't verify.
  - Add that `cleanup_job` is forced to `always` for protected jobs and that `JobLike.set_streams` replaces tool streams.
- [[Component - Jobs API and Job Cache]]: the early search drops other users' jobs when the request decrypts inputs (`Tool._may_reuse_job`), and the late search is skipped for protected jobs.
- [[Component - Pulsar Input Staging]]:
  - Protected jobs require `rewrite_parameters`, `remote_metadata` and staged outputs (not `none`), and refuse remote tool evaluation and coexecution/TES runners (`runs_job_script_in_container`).
  - The protection plan travels as a config file.
  - Encrypted metadata files are staged through `input_metadata_rewrite`, which is called while building the plan.
  - `metadata/outputs_populated/` now also carries `protection.json`, `protection_setup_failed` and `protection_cleanup_failed`.
- [[Component - Object Store Cache and Direct Access]]: record `get_data_head`'s first caller (protected-output verification) and why it must bypass the cache: Pulsar with remote metadata writes straight to the store.
- [[Component - Implicit Dataset Conversion]]:
  - `Registry.get_converters_by_datatype` exposes inner-type converters for `<inner>.c4gh` with wrapped targets.
  - `Registry.get_converter_deps` replaces direct `converter_deps[...]` reads in `get_converted_dataset(_deps)` and `api/tools.py`.
  - `DefaultToolAction.process_dataset` calls `retire_unusable_conversion`.
  - Explicit `<conversion>` inputs are read encrypted or decrypted per conversion.
- [[Component - Post Job Actions]]: `ChangeDatatypeAction` wraps the new type for encrypted outputs (`tabular` becomes `tabular.c4gh`) and skips, with a warning, changes that would add or remove encryption.
- [[Component - Galaxy Pulsar Runner Code Sharing]]: channel 4 gains `galaxy-protected-stage` (a `galaxy-job-execution` console script, or `python -m galaxy.job_execution.protection.stage` from `$GALAXY_LIB`) and the `crypt4gh` extra. The remote host now needs `crypt4gh` for protected jobs.
- [[Component - Data Fetch]]: Crypt4GH uploads are detected by magic bytes, typed from the uploaded file name (`infer_crypt4gh_file_ext`), and skip text conversion. Plain files given a wrapper type are refused.
- [[Component - Backend Dependency Management]]: `crypt4gh` is a conditional dependency (`check_crypt4gh` on `crypt4gh_enabled`) and an optional extra of `galaxy-job-execution`.

### Pending research requests whose scope should grow

Add these to the request files only once #23986 has merged:

- `tool_evaluation_compute_environment`: the `ProtectedInputsComputeEnvironment` decorator and the new `input_metadata_file_rewrite(dataset, name, value)` hook, which `DatasetFilenameWrapper` now calls for metadata files.
- `dataset_metadata_files`: wrapper datatypes carry the inner type's `FileParameter` elements, stored encrypted. Also cover `MetadataFile.purge()` and creating metadata files on a throwaway HDA with no object store (`job_execution/protection/metadata_files.py`).
- `tool_containers_volumes_and_enforcement`: `JobInfo.extra_job_subdirectories` (`_protected/inputs` mounted read-only).
- `job_resubmission_and_runner_states`: `clear_working_directory` deletes rather than archives for protected jobs, and decryption failures go through `resubmit` rules like other jobs whose tool never ran.
- `model_store_import_trust`: the extended-metadata round trip now carries the protection sidecar next to `outputs_populated`, and the compute side sets `job.protection_scheme` on the exported job.
