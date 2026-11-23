# Learning Galaxy follow-up — #25005

Reviewed commit: `2b11cda0d36d236a4562eb8ef7be2cfeb77add03`

## Stale research (baseline conflicts)

`vault/research/Component - Job Completion Lifecycle.md` (verified at `origin/dev` `65e6daff233`, which already contains `64360a61721`):

1. **"A failure before the commit propagates to the runner, which calls `fail()`"** (contract paragraph, repeated under Failure boundaries). Not true for output discovery: `finish()` catches `MaxDiscoveredFilesExceededError`, `JobOutputNameTooLongError` and `OutputCollectionSecurityError` from `discover_outputs()`, sets `final_job_state = ERROR`, writes a `max_discovered_files` / `output_collection_security` job message, and continues to the main commit without `fail()`. The extended-metadata path reports the same errors through `set_metadata.py`. Step 5b of the walkthrough should mention this.

## Post-merge activities

If #25005 merges (and once it reaches `dev`), update `Component - Job Completion Lifecycle.md`:

- Step 4 "Move outputs (ordinary path)": now preceded by `_ensure_outputs_in_job_directory()` (named `false_path`s and `from_work_dir` sources), skipped on a security error, and done through `_move_working_directory_output()`, which copies the target of an in-root symlink instead of moving the link.
- Add a step (before 4) for the containment check: on `OutputCollectionSecurityError` the job goes to `ERROR` and an `output_collection_security` message is appended after import/discovery, since those replace `job.job_messages`.
- Failure boundaries / `fail()`: outputs are moved back via `_move_working_directory_output()`; rejected outputs are logged and not moved.
- Re-verify line numbers against the new SHA.

Fold the shell-side `from_work_dir` guard (`command_factory.__copy_if_exists_command`) and `ensure_job_path_in_job_directory` into the queued trust-boundary note (`vault/agents/gx_research/todo/job_output_collection_trust_boundary.md`) when it's written.
