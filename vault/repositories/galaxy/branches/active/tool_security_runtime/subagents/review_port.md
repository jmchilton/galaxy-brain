# Review: runtime port

Acted on (folded into `50ca585a37b` and `3f0aef6a491`):

- Issue 3: the module docstring and the `tool_security_review_when_unsure` description now name the untraced-value reason. The sample and rst were regenerated.
- `test_every_case_expects_something`: the widening was narrowed to cases whose red jobs are all `fault:` jobs. This is a strengthening.
- Removed the unused `ToolReview._serious`.
- `red` now uses `Field(default_factory=list)`, like `green`.
- Reflowed the docs line.

Not acted on:

- **Issue 1, `upload1` refused by default** (`$getVar('output%i' % $outnum)` is reflection, which gives `uncheckable-template-code`). This breaks library uploads and the `upload1` API tests. The source behaves the same way. It is a defaults/product decision for John (options A–D below), so the branch is BLOCKED.
- **Issue 2, the `model_attributes` API test is red and weaker.**
  - It is the source's rewrite. John's later "refuse untraced values" commit made every job of that tool refused.
  - Fixing it means changing a test expectation or test tool, which needs John's sign-off.
  - It is tied to the same defaults decision.
- **Moving the private helpers into `charsets`/`report`.** Kept private, so that the parent's static modules are not touched (rebases stay easy, mvdbeek's analyser stays untouched). This is a mild preference, not a bug.
- **`_log_summary` using the report's own `unchecked_locations`** rather than `classify.unchecked_locations`. The behaviour is inherited and affects the log only. Left as at the source.
- **`Tool.security_review()` has no production caller.** Inherited; it is a candidate for the tool show/admin API. Noted for John.
- **`uncheckable_evidence` is public.** It is cheap to keep, and a later CLI JSON could use it.
- **Celery `prepare()` without `ToolInputRejected` handling.** `data_fetch` reviews clean, so the impact is low; noted only.
- **Pulsar refusal through `fail_job`** rather than `job_wrapper.fail`. This matches the source and `ParameterValueError`.
- **Relative vs absolute imports in `codes.py`.** Trivial.

<details><summary>Full review</summary>

Run via Claude Opus at high effort.

## Verdict

The port is faithful and well placed. I found no divergence from the source pin in runtime outcomes or messages. The debrief's "Known CI fallout" list is incomplete, though: **with the default `enforce_code` + `strict`, Galaxy's own `upload1` tool is refused on every job.** That breaks library uploads and the `upload1` API tests. The behaviour comes from the source, so it is a defaults/product decision for John rather than a porting bug. Even so, I would not hand this off as READY without that decision. The `model_attributes` API test rewrite is both red and weaker than before.

## Faithfulness: verified, no differences

- **Equivalence harness.** I wrote a scratch script that copies the source's `_no_plain_value` body and its unchecked-location formula, both built on the branch's `report.py` constants. I compared it with the branch's `_no_plain_value` (`uncheckable_reasons(report, _JOB_WHY)`) and `unchecked_locations(report) ∪ unchecked_at(level)`:
  - Scope: every level in `LEVELS`, over 909 tools (spec tools, `test/functional/tools`, `tools/`, `lib/galaxy/tools/bundled`, `lib/galaxy/tools/*.xml`, datatypes/converters).
  - Result: **0 diffs, 0 review errors.** Codes, ordering and message text are identical.
- **Sanitizer-off user object.** `access_patterns`/`pattern_of` reproduce the source's `not (sanitized and expr.startswith("__user__"))`.
- **Reflection.** Both sides exclude non-rendered reflection, and both add rendered reflection locations to unchecked.
- **Check error, stricter level, review failed.** `_no_plain_value` is ungated in both, which matches. The new red-to-green test pins the case a gated swap would break.
- **Spec cases.** Every source case's `code`/`red`/`green`/`doc`/`tool`/`known_bypass` is identical. The only extra case is `server_python_command`.
- **Files identical to the source (apart from typing):** `security_review_spec.py` and `test_security_review_spec.py`. Unit and integration tests match apart from the one added test.
- **Runners.** `BaseJobRunner` now fails with `exception=False` and no traceback, the same as the source's dedicated `except`. Pulsar goes through `fail_job` as at the source.
- **Test run:** 2415 unit tests passed. ruff and black are clean.

## Real issues

1. **`upload1` is refused by default.**
   - **What happens.** Its command uses `$getVar('output%i' % $outnum)`, which is rendered reflection. That makes the command unchecked and gives `uncheckable-template-code`, so every job is refused.
   - **Verified** at the branch, and against the source's `_no_plain_value` on an archive of the source tree.
   - **What breaks:**
     - production library uploads (`webapps/galaxy/api/library_datasets.py:531`, `actions/library.py:125`)
     - `test_tools_upload.py` (`_upload(api="upload1")`)
     - `populators.py:1306`
   - **Rest of the scan.** `__DATA_FETCH__`, `__SET_METADATA__` and the converters are clean. Two legacy `tools/` wrappers that are not in the sample `tool_conf` are also affected.
2. **The `model_attributes` API test is red and weakened.**
   - **Red.** `$__user__.addresses[0].desc` gives `uncheckable-untraced-value`, which refuses every job. Both the quoted-name assertion and the "cool name" success run fail.
   - **Weakened.** The rewrite also dropped the check that output 0 (`$input1.name`) comes out sanitized.
   - **Stale comment.** The test comment no longer describes the code.
3. **Docs omit the untraced reason** in the `security_review.py` docstring and the `tool_security_review_when_unsure` description.

## CI fallout options (not implemented)

The uncheckable tools in `test/functional/tools` are `model_attributes`, `config_vars`, `command_reads_configfile` and `upload` (= `upload1`).

- **A. Change the default.** Ship with `tool_security_review: log`, or keep `enforce_code` with `when_unsure: log`. This is the smallest change but gives weaker protection out of the box.
- **B. Exempt Galaxy's own tools from blanket refusal.** `GALAXY_LIB_TOOLS_UNVERSIONED` (`tools/__init__.py:343`, which includes `upload1`) is an existing list to build on. A general per-tool admin allowlist would be a re-scope.
- **C. Fix the cause.**
  - Rewrite `upload.xml` to avoid the computed-name `getVar`, or teach the analyser that `getVar('output%i')` reads outputs.
  - For `model_attributes`, treat `$__user__.<attr>` in a sanitizing tool as sanitized. That contradicts the deliberate `untraced_value` decision.
  - Changing test tools needs sign-off.
- **D. Relax only the test servers.** Set `when_unsure: log` in the driver defaults and keep enforcement covered by `test/integration/test_tool_security_review.py`. Move the `model_attributes` sanitization assertions into an integration class with the review off.

## Reuse and abstraction

- **`codes.py` on `Rule`/`Uncheckable`.** This is the right home. `test_refusal_codes` is justified.
- **Private job-check helpers.** Acceptable. Mild preference for `added_by_rewrites`/`param_path` as accessors, and for `enforced` next to `stricter()` in `charsets`.
- **Runner merge.** Correct. In Pulsar, `fail_job` applies resubmission rules; calling `job_wrapper.fail` directly, as `InsufficientPermissionsException` does, may fit a deterministic refusal better. Optional.
- **Sibling-path inconsistency.** `_log_summary` logs the report's own `unchecked_locations`, but `check_job` uses `classify.unchecked_locations`. Inherited.
- **Unused infrastructure.**
  - `Tool.security_review()` has no production caller.
  - `ToolReview._serious` has 0 callers.
  - `uncheckable_evidence` is only used by `uncheckable_reasons`.
- **Celery prepare path** (`celery/tasks.py:508`) has no `ToolInputRejected` handling. Low impact.

## Tests

- **`or case.red` widening.** Narrow it to fault-only red jobs. This is a strengthening.
- **Restored tests** match the source. No weakening apart from issue 2.
- **`server_python_command` jobs** look right.

## Nits

- `red` vs `green` defaults are inconsistent; reflow the long docs line; relative vs absolute imports in `codes.py`. Imports are at module top everywhere, typing is complete, and comments are short.

No security findings.

</details>
