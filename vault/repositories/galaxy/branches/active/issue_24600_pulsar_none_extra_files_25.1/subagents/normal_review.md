# Normal review debrief

The review found no blocking issues and confirmed all four design decisions: return the local extra-files path rather than `None`, skip `path_rewrites_input_extra`, add a separate `remote_metadata: false` integration module, and leave the sample conf alone. I acted on the `-> str` annotation nit (commit `0f3ed112d3f`) and recorded the departure from the proposal's `None` design in the implementation debrief.

Not acted on:
- `none` + `outputs_to_working_directory: true`. The primary output already ignores the local false path. Extra files now match that, and the combination is untested. I noted it rather than changing code, since fixing it would mean changing the primary path too.
- Making `FakeLocalComputeEnvironment` return `dataset.get_file_name()` instead of `None`. That would require rewriting the baseline commit (force pushes aren't permitted here), and the hooks behave the same either way.
- Follow-ups: the remote-metadata + `none` bug is queued in `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/`. The sample job_conf comment drift is left for a docs follow-up.

<details><summary>Full review</summary>

Run via Opus at low effort.

# Normal review: issue_24600_pulsar_none_extra_files_25.1

Reviewed `git diff origin/release_25.1...HEAD` (f728652f009 baseline tests, bf8723a0b9d fix + tests). Unit tests run locally: 4 passed. Integration not rerun.

Overall: correct, minimal and well-scoped fix. No blocking issues. No security concerns.

## Decision 1: return `dataset.extra_files_path` instead of `None`

Agree with the deviation from the proposal.

- On 25.1 the only callers are `DatasetFilenameWrapper.__getattr__` (`wrappers.py:514/516`), which return the hook value straight into the template. Returning `None` there would require a wrapper change and would render `"None"` anywhere a fallback was missed.
- On dev, `runtime.py` Directory outputs do `... or dataset.extra_files_path` (works either way), Directory inputs pass it to `content_path` (works either way), and `_bundle_path_rewrite` is typed `str` and does `compute_extra_files_path + value[...]` (would crash on `None`). So a str is the more forward-merge-safe contract. `SharedComputeEnvironment` also always returns a str.
- Consistency with the primary path: when Pulsar's `input_path_rewrite`/`output_path_rewrite` return `None`, the wrapper leaves `false_path` unset and uses `dataset.get_file_name()`, i.e. the real object-store path, *not* the local compute environment's false path. So the extra-files fallback that matches the primary is `dataset.extra_files_path`, not `self.local_path_config.input_extra_files_rewrite(dataset)`. Using the local config would put extra files beside a local false path (`outputs_to_working_directory`, materialized inputs) while the primary goes to the object store: inconsistent. `dataset.extra_files_path` is also the canonical value (honours `_extra_files_path` / object store `extra_files_path_name` overrides) rather than a `_files` suffix derived from a filename.
- Caveat (pre-existing, not this branch): under `none` + `outputs_to_working_directory: true`, Pulsar drops the locally computed false path for the primary output (it's passed to the path mapper, which returns `None`, and the wrapper falls back to the object store path). Extra files now behave the same way. Neither combination is tested; `outputs_to_working_directory` defaults to false and the integration conf doesn't set it.

The proposal's "Alternatives" section argued `None` keeps the hook convention; it may be worth a sentence in the debrief / PR body noting why the str contract was chosen (25.1 wrapper has no fallback; dev `_bundle_path_rewrite` typed `str`).

## Decision 2: not recording into `path_rewrites_input_extra`

Correct. The dict's keys become `ClientInput(..., INPUT_EXTRA_FILES_PATH)` (`pulsar.py:402-406`); the stager's `__upload_input_extra_files` re-consults the action mapper for the extra-files dir and, for a non-staging action, would at most register a rewrite via `action.path_rewrite`, which is `None` for `none`/unchanged-rewrite. So recording it would be a no-op at best.

Mixed per-path configs: the remote extra-files path has always been derived from the *primary* path's rewrite, never from the extra-files dir's own action, so a config where primary and `_files` dir match different actions was already unsupported (the primary-transfer / extra-`none` case registers a rewrite to a non-existent remote dir today). The newly-handled case (primary `none`, extra dir matching a staging rule) crashed before and now reads in place, which is right on a shared filesystem. Not worth handling.

## Decision 3: tests

- New integration module: warranted. `integration_module_instance` is one Galaxy config per module, and flipping `remote_metadata` in the existing module would change the #21566 regression coverage. `remote_metadata: false` + `none` is also the more common real shared-FS setup, so the module has value beyond this bug. Minor: `composite` (input extra files only) might also pass in the existing module; not worth splitting.
- Pre-existing bug found (`remote_metadata: true` + `none` skips staging of the metadata dir so set_meta never runs): should be recorded as a follow-up issue via the incubator process if not already (I see `issues_incubator/incubating/pulsar_none_remote_metadata_unstaged/` in galaxy-brain, so it looks tracked).
- Unit tests: worthwhile, not trivial. They exercise the real `PathMapper`/`FileActionMapper` with a fake client, pin the `path_rewrites_input_extra` side effect (which the integration test can't observe), and cover the unchanged-`rewrite` edge, which the integration test doesn't. The baseline commit correctly contains only the two tests that pass before the fix. Nit: `FakeLocalComputeEnvironment.input_path_rewrite`/`output_path_rewrite` return `None`, whereas the real local env (`SharedComputeEnvironment`) returns `str(job_io.get_input_path(...))`; harmless since Pulsar falls back to `get_file_name()`, but returning `dataset.get_file_name()` would be more realistic. Optional.
- Unit vs integration: the none-case unit test overlaps the integration test; keeping it is fine given it's fast and checks the dict.

## Decision 4: scope

Leaving `job_conf.sample.yml` comment drift out of a 25.1 bug fix is fine. Mention it in the debrief as a possible follow-up (docs-only PR against dev or the same release).

## Code nits

- Comment on `input_extra_files_rewrite` is useful (non-obvious why falling back is correct). `output_extra_files_rewrite` has none; fine, or a one-word "# As above." is unnecessary.
- No typing changes needed; return type could be annotated `-> str` on both hooks to make the contract explicit (optional, but helps the dev merge where `_bundle_path_rewrite` relies on it).
- Commit messages are clear and reference both issues.

## Findings ranked

1. (Low) Pre-existing `none` + `outputs_to_working_directory` primary-path quirk is now mirrored for extra files; untested. Recommendation: note in debrief; no code change.
2. (Low) Document why the str contract was chosen over the proposal's `None` in the PR body/debrief.
3. (Nit) Optionally annotate both hooks `-> str`.
4. (Nit) Optionally make the fake local env return `dataset.get_file_name()` for realism.
5. (Follow-up) Ensure the remote_metadata + none set_meta bug and sample job_conf comment drift are tracked.

</details>
