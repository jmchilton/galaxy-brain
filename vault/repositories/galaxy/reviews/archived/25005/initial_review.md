# galaxy#25005 initial review (round 0)

- Profile: default (`_shared/reviewers/default.md`)
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `2b11cda0d36d236a4562eb8ef7be2cfeb77add03` (base `release_26.1`)
- Tests not run (worktree has no `.venv`); static review.

## Verdict

Solid, well-scoped hardening. `ensure_job_path_in_job_directory()` sits next to `ensure_path_in_directory()` and reuses the existing `output_collection_security` failure path in both `set_metadata` and `JobWrapper.finish()`. Tests are red-to-green and cover the three metadata/output configs plus the generated shell. No P1. Two P2s about behavior changes that can hit existing tools/deployments, and a few small P3s.

## Findings

### P2 1 - Refused `from_work_dir` copy can leave an empty output in an OK job

The shell guard refuses the copy when `realpath` resolves outside the job dir, or when `realpath` is missing / fails (both `$(realpath ...)` expand to empty, `case "" in "/"*)` doesn't match). The job only fails because `_ensure_outputs_in_job_directory()` re-checks the source in `finish()`. That re-check only catches *escaping* sources. When the shell refused for any other reason (no `realpath` in the environment that runs the job script, e.g. old macOS dev boxes, minimal or old images on runners that run the job script inside the tool container), the source resolves inside the job dir, the finish check passes, and the pre-created empty destination becomes an OK dataset. The only signal is a line on job stderr, which isn't used for state detection.

The PR description says the copy "is refused rather than performed", which is the right call, but the refusal should be visible. Options: have the `*)` branch leave a marker in the job dir that `finish()` turns into an error, or have `finish()` fail when a `from_work_dir` source exists in-root but wasn't collected, or fall back to a portable resolver (`cd -P "$(dirname ...)" && pwd -P`) when `realpath` is missing.

### P2 2 - Links to the job's own input datasets now fail jobs, unconditionally

Common tool idioms like `ln -s '$input' sorted.bam` (pass-through branch) with `from_work_dir="sorted.bam"`, or `ln -s '$input' '$output'` under `outputs_to_working_directory`, previously produced the input's content. Now the link target (object store) is outside the job dir, so the job fails with `output_collection_security`. The `from_work_dir` case applies in the default config too. 64360a61721 gated its new restrictions by tool profile for compatibility. This PR isn't profile-gated. Reading a dataset the job was already given isn't an escalation.

Suggest allowing targets whose realpath equals one of the job's input dataset paths (`job_io.get_input_paths()`), or at least calling the break out in the PR description and release notes so admins know why previously-working tools now error. Since this is a release branch, a decision here is worth making before merge.

### P3 1 - `from_work_dir` source logic duplicated instead of reused

`_ensure_outputs_in_job_directory()` rebuilds `os.path.join(self.tool_working_directory, output.from_work_dir)` and re-implements the `*`/`?` split from `command_factory.__quote_preserving_globs` (`re.split(r"([*?])", ...)`, escaping the other parts). The canonical (source, destination) pairs come from `BaseJobRunner.get_work_dir_outputs()`, which also walks copied HDAs and applies the `in_directory` check. Two copies of "what the job script globs" can drift. A small shared helper for the glob split (e.g. next to `ensure_job_path_in_job_directory`) used by both the shell quoting and the Python check would leave a reusable abstraction behind.

### P3 2 - Likely duplicate `output_collection_security` job message with extended metadata

With extended metadata + `outputs_to_working_directory`, `set_metadata` already rejects the escaping named output and records an `output_collection_security` message. The import marks the job ERROR. `finish()` then runs `_ensure_outputs_in_job_directory()` on the same `false_path`, which still exists because set_metadata doesn't remove it, and appends a second identical message. The integration test only checks membership (`in {...}`). Skip the finish-side named-output check when `extended_metadata` (keep the `from_work_dir` part), or dedupe. Not verified by running.

### P3 3 - Race-raised `OutputCollectionSecurityError` in the finish move loop is uncaught

`_move_working_directory_output()` re-checks and raises `OutputCollectionSecurityError` (a `ValueError`), but the `finish()` move loop only catches `OSError`. Normally `_ensure_outputs_in_job_directory()` already rejected it, so this only fires if the path changes between the two checks, and then it surfaces as a generic finish failure instead of the security message. Either catch it in the loop like `fail()` does, or drop the redundant re-check in `_move_working_directory_output()` and rely on the up-front check.

## Notes (not findings)

- `ensure_job_path_in_job_directory()` "located in" test via `realpath(parent) == realpath(job_dir)` handles symlinked `jobs_directory` and symlinked `outputs/` / `working/` subdirs correctly. The unit tests cover both.
- Multi-match globs: `[ -f a b ]` errors out, so the copy never runs. That's pre-existing, and the multi-line `realpath` output can't sneak past the `case`.
- Copying (not moving) in-root symlinked outputs avoids a dangling link after cleanup. Good catch.
- Imports are top-level. Comments are short.
