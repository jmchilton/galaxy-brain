# Normal review 1

Acted on the stale `.sample` fidelity bug, metadata errors after the commit, `app.tool_data_tables` pollution, the missing `.sample` test coverage and the wrong revision in the invalid-tool message. Also had `set_repository_metadata` branch on `plan.creates_new_revision` and switched to `default_factory`. Fixes folded into the refactor and feature commits (head `699d40daee8`). Unit suite and the dry-run/reset_metadata functional tests are green.

Changes:
- `BaseMetadataGenerator.prefer_install_dir_sample_files` (default True). The dry run sets it False so reset-mode metadata reads `.sample` files from the clone. Red test: `test_dry_run_reads_uploaded_sample_files` (modified `tool_data_table_conf.xml.sample`).
- Invalid tools and "no utilities" are errors a real upload raises after committing. The dry run now returns them as `ok: false` + `message` with the plan. Pre-commit rejections still raise. `generate_message_for_invalid_tools(changeset_revision=)` names the dry run's tip instead of the real one. Test: `test_dry_run_reports_metadata_errors_with_its_plan` (bismark rev 0, parity with the real upload's error and rows).
- `handle_sample_tool_data_table_conf_file(tool_data_tables=)`. Dry runs validate against a throwaway `ToolDataTableManager`. Test: `test_dry_run_leaves_app_tool_data_tables_alone`.
- The unit test app gained `tool_data_path`, `shed_tool_data_*` and `tool_data_tables`, so repos with samples (bismark) upload in unit tests.

Not acted on:
- 5 (dependency-change tests in unrestricted repos, orphan message): the decision path is shared with real uploads and pinned by the parity tests. The orphan message is moved code. Left for the test-challenge step.
- 6 (`new_data_manager_required` compares the wrong key, so data manager changes never force a new revision): pre-existing. The dry run mirrors it faithfully. Flag for a separate issue.
- 8 (`creates_new_installable_revision` ignores `is_downloadable`): it reports the row decision `set_repository_metadata` makes. A readme-only new row is an edge case.
- 9 (recursive `upload_tar` call): an ExitStack/nullcontext version would re-indent the whole body. Kept.
- 10 (`temporary_clone` reuse in `reset_all_metadata_on_repository_in_tool_shed`): that path clones from a caller-supplied URL and logs-and-returns on failure. The semantics differ.
- 11 (`_hg_output` vs the other hg_util error wrappers): kept local. Folding the existing wrappers is unrelated churn.
- 13 (symlink rejection pinned at 500): it matches the real upload (pre-existing).

<details><summary>Full review</summary>

**Verdict: needs changes.** The structure is sound, the `set_repository_metadata` refactor looks behavior-preserving, and the 24 unit tests pass. One fidelity bug was confirmed by experiment, and it hits exactly the file class the issue is about. No security issue.

Bugs
1. **Dry run reads stale `.sample` files** (`repositories.py:852` with `metadata_generator.py:781-800`). In reset mode, `get_sample_files_from_disk` prefers `relative_install_dir/<path>`, which is the real repo at the old tip, whenever that file exists. A modified `*.loc.sample` or `tool_data_table_conf.xml.sample` is therefore validated with its pre-upload content. Experiment: v1 uploaded, dry run of v2 saw "content v1". Don't fix this by setting `relative_install_dir=clone_dir`, because data manager `tool_config` matching against `repo_path` would break. Stop preferring the real-repo file in the dry run instead, and add a red test.

Should-fix
2. No unit test touches `.sample` files. `TestToolShedConfig` lacks `tool_data_path`.
3. Post-commit metadata errors are reported as rejections. A real upload with invalid tools or no utilities commits, then returns 500. The dry run raises and drops the plan. Return the plan plus `ok=false`. Untested.
4. `app.tool_data_tables` side effect in `commit_util.handle_directory_changes`. Validate against a throwaway manager in dry runs.
5. Test gaps: tool-dependency and repository-dependency changes in an unrestricted repo; the orphan-tool-dependency message.

Pre-existing
6. `repository_metadata_manager.py:727`: `new_data_manager_required` passes whole metadata dicts to `compare_data_manager`, which reads top-level `data_managers` while the key is nested under `data_manager`. The comparison is always EQUAL.

Refactor check: equivalent. Same query order, TipOnly short-circuit and new-repo alert condition; invalid-tools message precedence unchanged. One extra `get_latest_repository_metadata` query.

Nits
7. `creates_new_revision` re-encodes the else/else decision in `set_repository_metadata`; branch on the plan instead.
8. `creates_new_installable_revision` ignores `is_downloadable`.
9. The recursive `upload_tar` call forwards 11 args.
10. `temporary_clone` duplicates the clone pattern in `reset_all_metadata_on_repository_in_tool_shed`.
11. `_hg_output` duplicates the existing hg_util error wrapping.
12. Use `default_factory` for `files`.
13. The functional test pins 500 for a client-side rejection.

</details>
