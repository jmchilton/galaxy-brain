# Implementation debrief

```
exists .../tool_security_runtime/differential-review/snapshots/20261126T172111Z-hardening-26e15a538bdb.json
  hardening @ 26e15a538bdb vs tool_security_static_findings (merge-base d4e4f68dd259)
  since 20261126T160200Z-implementation-882a9878cd3d:
    commits: 1 same, 0 rebased, 2 changed, 3 new, 0 dropped
    hunks:   79 carried, 13 changed, 0 new, 0 dropped
```

**STATUS: BLOCKED on a defaults decision.** The port is faithful and hardened. But the default `enforce_code` + `strict` refuses Galaxy's own `upload1` (seen on a test server), so CI would be red.

- Head: `26e15a538bd` on `jmchilton/tool_security_runtime`.
- Base: the squashed parent `d4e4f68dd25`.
- Source pin: `tool_security_review_spec` at `d5f7cb05e91`. It was read only; its ref and worktree were not touched.

## Commits

1. `09877fc98d1` Split `classify()`'s reasons from its gate (John). This is the baseline refactor: CLI output is byte-identical to the parent.
2. `9093598f1bc` Runtime job check, config, wiring, runners and unit/integration/API tests (author mvdbeek, Co-authored-by John).
3. `9f1352a6a05` Spec red/green jobs, `SpecJobRunner`, docs (John, Co-authored-by mvdbeek).
4. `a076834baba` Test challenges: coverage of stricter levels and log mode for `unchecked_at(level)`.
5. `3462308c6d6` Thermo tidy, behaviour identical:
   - renamed `_enforced` to `_refused_at`, which now uses `stricter`;
   - dropped the `STRAY_QUOTE`/`PATH_LIKE_NAME` aliases;
   - added an `_NOT_PLAIN_AT` table.
6. `26e15a538bd` Pin `_PLAIN` against `strict_harm`, and `ReviewConfig` literals against the reviewer's constants.

## Choices

- **`_no_plain_value`** is now `classify.uncheckable_reasons(report, _JOB_WHY)`. It is ungated, because a check error or a stricter level needs reasons when no code-level location is unchecked. A red-to-green test covers this.
  - `_JOB_WHY` keeps the user-facing wording "the job does not carry".
  - The unchecked set is `classify.unchecked_locations()` ∪ `unchecked_at(level)`.
  - The reviewer's harness found 0 differences against the source formulas, across all levels and 909 tools.
- **`RefusalCode`** is a `StrEnum` whose values come from `Rule`/`Uncheckable`, with descriptions reused. That leaves 6 runtime-only codes. The 17 values are identical to the pin, and `test_refusal_codes` pins them.
  - Branch 4 copies the pin's literals instead, plus `static-findings`.
- **Job-check helpers** the parent removed are private in `security_review.py`: `_refused_at`, `_enforced_findings`, `_added_by_rewrites`, `_param_path`. The parent's static modules are untouched.
- **Runners.**
  - `ToolInputRejected` joins dev's rejection tuple in `BaseJobRunner`. The line is identical to branch 4's.
  - In Pulsar it keeps the pin's `fail_job` path (resubmission rules apply), with its own log branch; dev's `ParameterValueError` log text is unchanged.
  - Branch 4 fails directly, the way `InsufficientPermissionsException` does. The pin doesn't, so this branch was left different.
- **Spec.**
  - The 94 source jobs and 4 job-only cases are unchanged.
  - `server_python_command` gained red/green jobs.
  - `test_every_case_expects_something` was widened only for cases whose red jobs are all fault jobs.
- **Dev drift.**
  - `app`/`structured_app` are packages now.
  - The `ComputeEnvironment.input_metadata_rewrite` signature changed.
  - New modules are under strict mypy, and lint follows the 3.11 floor.
  - The docstring and `when_unsure` docs gained the untraced reason.

## Gates

- **Unit:** 3231 passed. This covers `test/unit/tool_util/security`, `test_security_review.py`, `test_security_review_spec.py`, `test_evaluation.py` and `test/unit/app/jobs`.
- **Integration:** `test/integration/test_tool_security_review.py` passed 7 of 7.
- **Refusal outcomes match the pin.**
  - The source cases' `code`/`red`/`green`/`doc` are identical.
  - Every job, log-mode, harm and sweep test passes unedited.
  - The thermo pass compared 768 outcomes (96 jobs × 2 evaluators × 4 modes) before and after its changes: identical.
- **Diff against the pin.**
  - `evaluation.py`, `tools/__init__.py`, `jobs/__init__.py`, `config_schema.yml`, `api/test_tools.py`: patch-identical to the pin, except `Optional` → `| None`, and the schema's extra untraced clause.
  - `app`/`structured_app`/`galaxy_mock`: the same hunks, in dev's package layout and import order.
  - Runners: merged into dev's rejection paths (above).
  - `security_review.py`: the adaptations above, pyupgrade and typing, plus thermo's tidy. `_serious` was removed (no callers).
  - `security_review_spec.py`: typing for dev's `ComputeEnvironment`.
  - In `tool_util/security`, every other difference is a parent change: CLI, `rules.py`, `classify.py`, lint, framing in `charsets`/`report`/`patterns`. The rest is this branch's `classify` split, `codes.py` on the catalogs, and the merge of spec models, cases and docs.
- **Static checks:** `make format` is clean. ruff and isort are clean. mypy from `lib/` reports 0 errors in changed modules; the remaining errors are in unrelated modules and match the parent.
- **Hardening:**
  - Normal review: `subagents/review_port.md`.
  - Test challenges: `test_challenges_debrief.md`.
  - Thermo: `thermo_nuclear_review.md`.
  - Baseline refactor: no change; commit 1 is already the refactor.
  - Scope evaluation: keep.
  - Codex: blocked by the classifier (`codex_review.md`).

## Decisions for John

1. **Defaults versus Galaxy's own tools.** Behaviour inherited from the source.
   - With `enforce_code` + `strict`, these are refused on every job:
     - `upload1` (`$getVar('output%i')` is reflection, so `uncheckable-template-code`). Seen on a test server: `test_tools_upload.py::test_upload_posix_newline_fixes_by_default` fails, and library uploads break.
     - `model_attributes` (untraced `$__user__.addresses[0].desc`). Its API test `test_model_attributes_sanitization` is red, and the source's rewrite of that test had already dropped the sanitized-name assertion.
     - `config_vars` and `command_reads_configfile` (new on dev). Their framework tests fail.
   - The 2026-11-26 decision to keep the `enforce_code` default was probably made without knowing about `upload1`.
   - Options (`subagents/review_port.md`):
     - (A) change the default, or set `when_unsure: log`;
     - (B) exempt Galaxy's own tools. Branch 4 already exempts tools under `lib/galaxy`, which would cover `upload1`;
     - (C) fix the analyser or the templates;
     - (D) relax only the test servers, and move the sanitization assertions to an integration class.
   - At `enforce_data` and stricter, `job_metadata.xml` and `__SAMPLE_SHEET_TO_TABULAR__` are also affected.
2. **Convergence with branch 4 (`tool_patches_static_findings`).**
   - Both add `lib/galaxy/tools/security_review.py` (each with `ToolInputRejected`) and `tool_util/security/codes.py`, so the second to land gets add/add conflicts.
   - Branch 4 reviews at load and exempts tools under `lib/galaxy`. This branch reviews lazily at the first job prepare and exempts `tool_type_local`, user-defined and expression tools.
   - With both on, each tool is analysed twice.
   - `RefusalCode` forms differ (catalog-built here, literals plus `static-findings` there); the values agree.
   - Pulsar differs: `fail_job` here, a direct `fail` there.
   - Scope option D: shared refusal plumbing first, then both branches stack on it.
3. **Pulsar refusals.** Keep the pin's `fail_job`, or fail directly like branch 4 and `InsufficientPermissionsException`.
4. **PR shape.** `scope_evaluation.md` options A–E:
   - B folds the classify split into the parent;
   - C splits runtime (mvdbeek) from spec jobs and docs (John);
   - E lands with enforcement off, then flips the default.
5. **Inherited nits.**
   - `Tool.security_review()` has no production caller.
   - `_log_summary` logs the report's own unchecked locations, not the classified set.
   - Celery `setup_fetch_data` `prepare()` has no `ToolInputRejected` handler (practically unreachable).
   - Two wordings: `WHY`/`_JOB_WHY`.
   - Thermo's NEEDS-DECISION restructures are for mvdbeek.
6. **Re-sync.** The source commits `d5f7cb05e91..45231d97bac` are static only (they add a `template-include` capability and spec cases). They go to the parent first. The recipe is in `index.md`.
