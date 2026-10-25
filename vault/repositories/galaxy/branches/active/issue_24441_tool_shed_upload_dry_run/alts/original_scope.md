# original_scope

Branch `issue_24441_tool_shed_upload_dry_run_alt_original_scope` at `6a0913cf62a` (pushed to `jmchilton`).

The dry run as first hardened: tests challenged, Codex and thermo-nuclear fixes applied, baseline refactors split out. Sample isolation is a dry-run-only flag (`isolate_files_dir=True` passed by `upload_tar_dry_run`). `creates_new_installable_revision` reports the row decision only.

How it differs from the parent: the parent adds the scope-evaluation expansions. Tool shed reset mode always isolates sample files, which fixes `reset_metadata` for sample-only tools, staged copies leaking across revisions and stale samples. The dry run also reports whether the new or overwritten row would be downloadable.
