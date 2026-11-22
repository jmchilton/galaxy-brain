# Initial review: galaxy#25023 (default profile)

- Profile: `default` (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `ff96b8bb47c49cd0886b04747bc1825bc8e25601` (merge-base with `release_26.2`: `4d02c778c4c7`)

## Verdict

Solid, well-tested fix. Approve after the cross-PR conflict with #25021 is resolved. No P1s on this branch alone. The design holds up: `compute_environment.json` keyed by dataset ids, `RemoteComputeEnvironment`, dropping the object store config, and guarding the eval block with `{ ...; }`. The big risk is a semantic conflict with the companion PR #25021, which merges cleanly as text. The integration tests can't catch it because embedded Pulsar with `copy` keeps Galaxy paths readable from the "remote" side. Smaller items: unstructured (data table) path staging silently drops out under remote evaluation, and a few cleanup/typing nits.

## Findings

### P2 1: Semantic conflict with #25021: Pulsar `compute_environment.json` would record Galaxy-side paths

`PulsarJobRunner._setup_remote_tool_evaluation` builds `compute_environment.json` through `remote_evaluation_paths(job_io, compute_environment, ...)`. That function relies on `PulsarComputeEnvironment.input_path_rewrite` and `input_metadata_rewrite` returning **Pulsar** paths. The current #25021 head (open, same base) changes both to return the **local Galaxy path** and record the Pulsar path in `_evaluated_path_rewrites`. `input_extra_files_rewrite` gets the same change. Its evaluator then rewrites those paths after `build()`.

`git merge-tree ff96b8bb47c <25021 head>` merges with no conflicts. In the merged tree, `PulsarComputeEnvironment.input_path_rewrite` returns `local_input_path` (merged `pulsar.py` around line 1528) and `input_metadata_rewrite` returns `metadata_val`. Nothing on the remote side applies `evaluated_path_rewrites()`: `RemoteComputeEnvironment` inherits the default `{}`, and the remote evaluator never gets the Galaxy-side mapping. So whichever PR lands second sends the Pulsar evaluator Galaxy object-store paths for inputs, extra files and metadata files. That breaks every destination that doesn't share Galaxy's filesystem.

The PR description also says the `load_contents` commit is "the same commit as in #25021, so the two PRs merge cleanly". #25021 has since reverted that commit: its body says `str(wrapper)` is readable at prepare time. The two now differ in `wrapped_json.py` too.

Fix: build the Pulsar mapping from the remote side explicitly rather than through `input_path_rewrite`. For example, use the path mapper's remote rewrite, #25021's `_local_and_remote_input_paths`, or `path_rewrites_input_metadata` / `path_rewrites_input_extra`. Or agree on one semantics for `input_path_rewrite` in both PRs. Update the description's merge claim either way.

### P2 2: Integration tests can't tell staged paths from Galaxy paths

`test_pulsar_embedded_remote_tool_eval.py` uses embedded Pulsar with `default_file_action: copy` on the same host, so Galaxy object-store paths stay readable where the job runs. `command_reads_input_size`, `command_reads_configfile` and the `inputs_as_json_with_staging_paths` "every `source_path` exists" check therefore pass whether the evaluator gets Pulsar paths or Galaxy paths. That is exactly the regression P2 1 would cause. Only `test_deferred_input` asserts something path-specific, and only that the Galaxy job directory isn't in the command line.

Fix (strengthening, no behavior change): in `test_command_line_recorded`, or a sibling test, assert that the recorded command line refers to `<data_dir>/pulsar_staging/<job_id>/inputs/...` and does not contain the Galaxy object store's `file_path`. Optionally have the staging-path check script assert that each `source_path` lies under the Pulsar job directory.

### P2 3: Unstructured path staging is skipped under remote evaluation (sibling-path divergence)

With local evaluation on Pulsar, `PulsarComputeEnvironment.unstructured_path_rewrite` runs during template evaluation. It calls `path_mapper.check_for_arbitrary_rewrite`, and the collected `path_rewrites_unstructured` become `arbitrary_files` in the `ClientJobDescription`. That is how data-table and select-option paths (`PATH_ATTRIBUTES`) get staged or rewritten for destinations without shared reference data.

With remote evaluation, Galaxy never evaluates the templates, so `path_rewrites_unstructured` stays empty. `_setup_remote_tool_evaluation` passes it on, but it is effectively always `{}`. On the remote side, `RemoteComputeEnvironment.unstructured_path_rewrite` returns `paths["unstructured"].get(path)`, which is `None`. The command silently gets the Galaxy-side reference path. That works on CVMFS-style shared reference data and fails at run time otherwise.

Fix: at minimum, document in `doc/source/admin/jobs.md` that remote evaluation on Pulsar needs data-table and reference paths readable at the same path on the Pulsar side. Better, pre-compute unstructured rewrites on the Galaxy side for select/data-table parameters, or fail loudly when an unstructured path would need staging.

### P3 1: `remote_command_line` runs a DB query on every access, now inside per-dataset loops

`MinimalJobWrapper.remote_command_line` is a property that runs `select(JobExportHistoryArchive)...` each time. This PR adds many call sites: five in `pulsar.py`, `finish()` and `prepare()`. One of them sits inside the `deferred_dataset_ids` set comprehension, so it runs once per input dataset. Hoist it into a local in `get_client_from_wrapper`/`__prepare_job`, or cache it (e.g. `functools.cached_property` after the job is loaded).

### P3 2: `assert self.tool` turns a False into an AssertionError

Before, `remote_command_line` evaluated to False when the strategy wasn't remote and didn't touch `self.tool`. The new code asserts `self.tool` after the strategy check. On a remote-strategy destination, a job whose tool is missing (e.g. uninstalled) now raises from any caller of the property instead of reporting False. Use `if self.tool is None or self.tool.tool_type in (...) or self.__has_tasks: return False`.

### P3 3: `compute_environment.json` / `job_io.json` written twice for Pulsar

`MinimalJobWrapper.prepare` writes both files with the compute environment it was given (already `PulsarComputeEnvironment` for Pulsar). Then `_setup_remote_tool_evaluation` rewrites both. The second write differs only in the remote `job_io` fields, plus `unstructured`, which is empty per P2 3. Two writers of the same artifact with slightly different contents will drift. Consider one writer. For example, let the runner supply the `job_io` overrides and unstructured mapping to `prepare`, or have `prepare` skip the write when the runner will do it. Also, `io_dict["tool_dir"] = compute_environment.tool_directory()` duplicates the loop's `tool_directory` entry. A comment saying why both keys exist would help.

### P3 4: Narrow typing for `RemoteEvaluationPaths`

`RemoteEvaluationPaths = dict[str, dict[str, str]]` is accessed with fixed keys (`"datasets"`, `"extra_files"`, `"metadata_files"`, `"unstructured"`) in `RemoteComputeEnvironment` and `remote_evaluation_paths`. A `TypedDict` documents the contract between Galaxy and the evaluator and lets mypy catch key typos. It is also defined after the class that references it as a string annotation; move it above.

### P3 5: Whole tool directory staged when `<required_files>` is absent

Prefix `""` with default excludes is reasonable for Tool Shed repos. Built-in tools under `tools/<section>/` and test tools under `test/functional/tools/` share one directory, though, so every remote-evaluated job stages the whole directory. That is hundreds of files for the functional test tools. Consider limiting it to tools from a Tool Shed repository (or an admin opt-in), or at least logging the count, so admins can see why transfers grew. Optional.

## Notes (not findings)

- `wrapped_json._galaxy_file_name` (`unsanitized.get_file_name()`) would fail inside the remote evaluator, which has no object store. It is only reached through `handle_files="OBJECT"` from `ExpressionTool.exec_before_job`, and that runs on the job handler. Safe.
- The `{ ...; }` guard also fixes a latent issue on the local runner: with streamed stdout/stderr, `&&` used to guard only the first line of the setup block. The new unit tests in `test_command_factory.py` exercise that properly.
- Keying by `Dataset.id` and `<class>:<instance id>:<metadata name>`, with the rationale against UUIDs, looks right. `test_remote_evaluation_paths.py` is a reasonable red-to-green unit test for the shared-key bug.
- Imports are at module top throughout.
