# Implementation debrief

```
created .../tool_security_runtime/differential-review/snapshots/20261127T222503Z-revision-d097f9086864.json
  revision @ d097f9086864 vs tool_security_static_findings (merge-base 53559de55d06)
  since 20261126T235029Z-revision-e3d98e549b74:
    commits: 0 same, 3 rebased, 4 changed, 3 new, 0 dropped
    hunks:   72 carried, 18 changed, 35 new, 5 dropped
```

**STATUS: BLOCKED on the defaults decision, as before.** Some functional test tools are still refused at the default `enforce_code` + `strict`. This revision itself is done and pushed. Head `d097f908686` on `jmchilton/tool_security_runtime` (was `b9cd00f067b`). The earlier debrief is `earlier_drafts/2/implementation_debrief.md`. Everything in it still holds except where this revision changes it.

## Shared plumbing with branch 4 (John, 2026-11-27)

The branch is rebuilt on shared commit S `5659a4db4a4`, on branch 1 `53559de55d0`. `tool_patches_static_findings` carries S unchanged, so S is the two branches' merge base.

S holds:
- **`galaxy.tools.security_refusal`:**
  - `ToolInputRejected`, whose codes are `Iterable[str]`, so `RefusalCode` members still work;
  - `is_galaxy_own_tool(path, *, patched=False)`;
  - the upload helpers;
  - `tool_file()`.
- **`PREPARE_REFUSALS` in `galaxy.jobs.runners`.** A refused job fails at once on every runner. Pulsar now does this too, with no resubmission, and branch 3's old `elif` log branch is gone.
- **`Tool.stored_source_path`**, with its cached-toolbox test.

Commits:
- The classify split and the job-check commit now use S. The job-check commit drops its own exception class and runner hunks.
- The spec commit gives every case branch 1 added since `0ad21214cce` red and green jobs:
  - `file_param_stays_quoted`;
  - `ftpfile_param_shell_injection`. `SpecJobRunner` sets `ftp_upload_dir`, creates the user's FTP directory and its files, and sets the param's `user_ftp_dir` the way a Galaxy form does;
  - `repr_python_literal`, `repr_inside_python_string` and `json_inside_python_string`.

  A `type="file"` param is now a text reference: the check reads `str(wrapper)`, which is sanitized, exactly as `$f` renders. Its spec jobs pin that, and no code change was needed for it. The admin doc's generated section is regenerated.
- "Exempt Galaxy's own tools from the job-preparation review", which was the upload1 exemption.
  - `reviewed_tool_source` exempts `is_galaxy_own_tool(tool_file(tool))`. That covers upload1, set metadata, data fetch and history import/export, by real path.
  - The separate "nothing to review" rule stays: no command, user-defined, expression and `tool_type_local`.
  - The per-job value check skips the same tools, because `review()` returns None for them.
  - Newly unreviewed compared with the old head: set metadata, data fetch and the three history tools. That removes the stricter-level fallout on `__DATA_FETCH__` and `__SET_METADATA__`.
  - Still reviewed: `sample_sheet_to_tabular`, the converters, and stock and spec tools. The collection operations have no command.
  - Config and docs use the shared wording, without "unless a tool patch applies", since this branch has no tool patches.
- New: "Check an ftpfile param's value as Galaxy writes it".
  - Galaxy writes an ftpfile param's names after the user's FTP directory, unsanitized.
  - For that param the RAW accessor now reads the rendered value, directory included.
  - A red job pins this, and it fails without the fix.
- New: "Challenge shared plumbing tests" (`d097f908686`). Every one of Galaxy's own tools is now checked at every level, the tools beside them are reviewed, and the ftpfile case gains a sweep base.

## Review and challenges

- **Normal review.**
  - Acted on:
    - The docs said collection operations are "reviewed", but they have no command. The docs now say so.
    - The lookalike wording says "id and upload action".
    - S now resolves set metadata's `../datatypes` from the real tools directory. In the `packages/` symlink layout the old string-joined path did not exist.
    - The ftpfile value check (above).
  - Not acted on:
    - The unused `patched=` keyword in this branch. S is shared, and item 2 below covers it.
    - Bisectability between the job-check commit and the exemption commit. The order is as on the old branch.
- **Test challenges.** `test_challenges_debrief.md` is regenerated because more than 3 tests changed. The old one is in `earlier_drafts/2/`. Its recommendations for S are applied to S, together with branch 4's.

## Tests (final head)

- Unit:
  - `test/unit/tool_util/security`, `test_security_review.py`, `test_security_review_spec.py`, `test_cached_tool.py`, `test_security_refusal.py`, `test_pulsar_runner.py` and `test_prepare_refusals.py`: 3285 passed.
  - ruff, black and isort are clean on each commit's changed files. mypy shows no new errors in library code against the old head.
- `test/integration/test_tool_security_review.py`, alone under the lock: 11 of 11 on the final head.
- `test_tools_upload.py::TestToolsUpload::test_upload_posix_newline_fixes_by_default` and `test_libraries.py::TestLibrariesApi::test_create_dataset`: both pass. They ran at `b32d12cc35b`, before the last S amendments and the challenge commit. Those only changed tests and how the own-tool set's paths resolve.
- `git merge-tree` with `tool_patches_static_findings`: the only conflict is in `doc/source/admin/tool_security_review.md`.

## Decisions for John

1. **Remaining default refusals (the BLOCKED reason).** These functional test tools are still refused: `model_attributes`, `config_vars`, `command_reads_configfile`, `command_reads_input_size`, `test_data_source` and `ucsc_tablebrowser`. Options A to D are in `earlier_drafts/1/implementation_debrief.md`.
2. **Patched own tools after both branches land.** This branch calls `is_galaxy_own_tool` without `patched`. Once tool patches exist here, a patched upload1 would be exempt from the value check but refused statically by branch 4. The branch that lands second should pass `patched=`.
3. **Refusal wording when the FTP directory is the cause.** A job refused because its FTP directory name holds such characters still gets the message to rename the dataset or change the value, which doesn't help the user.
4. Items 2 to 6 of `earlier_drafts/1/implementation_debrief.md` are unchanged, except that convergence and Pulsar are now settled.
