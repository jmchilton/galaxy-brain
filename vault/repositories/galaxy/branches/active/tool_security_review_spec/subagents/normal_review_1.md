# Normal review 1: debrief

Acted on findings 1–5, 7, 8 (sorting, comments, descriptions) and the `serious_findings` part of 9, in `40a8960e80c`. Codes now lead the message (`[code] This job was not run: ...`). Codes are mapped at the raise site, so a missing code fails the job closed. Each runner keeps one user per email. Green harm checks require exit 0, and the lone-quote green no longer claims a harm check. The preference doc is reworded. A two-code case was added, and the content and tag greens moved closer to their reds. `serious_findings` / `CHECKED_SEVERITIES` moved to `tool_util/security/report.py`. The suggested unsanitized-preference red was tried and dropped; the reason went to John privately.

Not acted on:
- 6, Cheetah not in `galaxy-tool-util`'s requirements: mvdbeek's packaging call (adding `galaxy-util[template]` or a `security` extra); raised as an open question.
- 8, `ToolInputRejected` pickling: `codes` now defaults to `()`, so it unpickles; no further change.
- 9, reusing the runner in `test_evaluation.py` / `test_security_review.py`: out of scope for a branch stacked on someone else's; noted for follow-up.
- 10, `UserToolEvaluator` and path fidelity: no spec tool is a user-defined tool, and the paths don't change outcomes today.
- `Job.job_messages` as the code carrier: needs schema and client work; open question.

<details><summary>Full review</summary>

Run via Claude Opus 5.5. Scope: `git diff mvdbeek/tool-security-review-on-load...HEAD` (3 commits).

**Verdict: the approach is sound. Fix 4 issues before handoff.** The spec format, the two runners, the packaging and the docs drift guard are good, reusable abstractions. Tests (35 + 230), ruff/black/isort and mypy all pass on the changed files. The wheel built from `packages/tool_util` ships `spec/cases.yml` and `spec/tools/*.xml`. The red/green cases mostly do what they claim. The biggest problem: the refusal codes never reach the stored job message, which the docs promise they do.

## Real bugs

1. **Codes are always cut off the stored message.** `job.info` and `dataset.info` are `TrimmedString(255)` (`lib/galaxy/model/__init__.py:1599`, `:2465`, `:12492`). `JobWrapper.fail()` writes the message only to `info`, and Pulsar's `fail_message` goes the same way. I measured every red job's message: 338-520 chars, with `Refusal codes:` starting at char 297-479. So no code ever reaches the UI or API. Only the server log has them.
   - This makes `doc/source/admin/tool_security_review.md:30` ("the message of the failed job ends with them") false for what users and admins see.
   - Fix: prefix the codes, e.g. `[shell-injection] This job was not run: ...` in `ToolInputRejected.__init__` (`security_review.py:120-122`), and update the docs line.
   - `Job.job_messages` is a better structured carrier long-term. But `AnyJobMessage` is a typed union (`tool_util/output_checker.py:62`) that the client renders by type, so a new message type means schema and client work. Leave it as a dev follow-up, not part of this release_25.1-based branch.

2. **`SpecJobRunner` supports only one job per instance.** `_job()` inserts a new `User` with the case's default email every time (`app_unittest_utils/security_review_spec.py:186`). A second `run()` or `harms()` on the same runner raises `IntegrityError: UNIQUE constraint failed: galaxy_user.email`. I reproduced this with `run()` followed by `harms()`, which is the natural API for Planemo or the Tool Shed. The tests only avoid it because the fixture builds a new runner (and a new MockApp) for each call.
   - Fix: look up or create the user once per runner, keyed by email, or give each job its own email.

3. **Code mapping sits inside the "never fail a job" `try` and can fail open** (`security_review.py:298`). `codes = [RefusalCode(v.rule) for v in violations]` raises `ValueError` for any rule without a code. That error is logged as "checking values ... failed" and sent to `_cannot_check(NOT_PLAIN_CHECK_ERROR)`. With `strict_when_unsure: false`, a real violation is then dropped and the job runs in enforce mode. With strict on, the refusal gets the wrong code.
   - It is not reachable today. The only rules that can be HIGH/CRITICAL and checkable are `shell-injection`, `nested-interpreter`, `configfile-injection` and `stray-quote`. `command-position` and `server-injection` carry an empty breakout, so `Finding.checkable` is false for them (`report.py:136`, `interp.py:1060,1200`). But mvdbeek's analyzer is still changing, and the inline comment calls this "handled as a bug" when it is actually fail-open.
   - Fix: compute codes outside the `try` (let a missing code raise loudly), or map with a fallback that still refuses. Better still, have the analyzer's rule strings and `RefusalCode` share constants. `STRAY_QUOTE = "stray-quote"` at `security_review.py:415` already duplicates the enum value.

4. **Green harm check can pass without running anything.** The `element_identifier_shell_injection` green job (`cases.yml:54-59`, with "Bob's reads" and `harm: true`) produces a command that bash rejects with a syntax error (rc 2, unmatched `'`). Nothing runs, so "no marker" proves nothing. I checked every other harm job: the greens exit 0, and the reds exit 0 or 127 with the marker present.
   - Fix: have `harms()` return the exit code too, and require rc 0 for green harm jobs (`security_review_spec.py:169-182`, `test_security_review_spec.py:49-51`). Then split that green: keep the lone quote without `harm`, and harm-check `sample 1/reads.fq`. This strengthens the test, so it needs no sign-off.

## Case correctness (red/green)

- The reds exercise the named code. Fault cases correctly patch the `security_review` module globals.
- Over-approximation greens:
  - `dataset_name_stays_quoted` and `wrapped_names_stay_quoted` are right. `DatasetFilenameWrapper` always wraps the dataset with `wrap_with_safe_string` (`tools/wrappers.py:389`), and `MetadataWrapper` wraps its values too (`:330`), even with `sanitize="false"`. The bash run confirms it (rc 0, no marker).
  - **`user_preference_stays_quoted` overstates** (`cases.yml:136-148`). `__user__` is sanitized only by `__sanitize_param_dict`, which is skipped when the tool sets `sanitize="false"` (`tools/evaluation.py:714`). I probed a copy of `user_preference.xml` with `<options sanitize="false"/>`: the job check refuses it with `shell-injection`, which is correct behaviour. Reword the doc to "under the default sanitizer". Consider adding that tool as the red sibling, so the case pins both sides.
- "Nearest safe value" nits:
  - `dataset_content_shell_injection` (`chr1 100 200`) and `group_tags_shell_injection` (`group:treated`) use greens with no command characters at all. `a;touch harm-marker` (no quote) inside single quotes would be a nearer green, as `raw_text_shell_injection` already does.
  - `sed_program` red: newlines are collapsed to spaces by `_build_command_line`, and the `/` alone ends the `s` command, so the `\n` in the value is not needed. `y/;e touch harm-marker;s/x/` reads more clearly. No `harm` is fine here, since `e` is GNU-only.
- `JobExpectation.codes` is never used by any case. No case pins a refusal with several codes, although `_no_plain_value` produces them (e.g. a tool hitting both template code and letters-are-code). Add one such case or drop the field.

## Runner fidelity / CI safety

- It mirrors `JobWrapper.prepare` → `set_compute_environment` → `build()` closely: real model rows, `params_to_strings` → `job.add_parameter`, and the real `ToolEvaluator`/`PartialToolEvaluator`. Gaps, none of which change today's outcomes:
  - `UserToolEvaluator` (picked for `base_command`/`shell_command`) is not offered.
  - `env_config_directory` is the configs dir rather than `$_GALAXY_JOB_DIR`.
  - `tool_directory` is the working directory rather than the tool's directory. This matters once a spec tool uses `$__tool_directory__`. `os.path.dirname(path)` is the faithful value.
  - Inputs use `file_name` rather than a `job_io` path.
- Running bash in CI is fine. The marker path is relative to a fresh temp cwd, output paths are temp, there is a 30s timeout, and it needs only `bash`, `touch` and `python3`. `directory or tempfile.mkdtemp()` leaks a directory when no directory is passed (nit).

## Codes

- The mapping is complete for every refusal branch: review failed, check error, unchecked place, strict-check error, the three `_no_plain_value` reasons, and the four violation rules.
- Taxonomy nit: `UNCHECKABLE_STRICT_CHECK_ERROR` is a per-job check error. It sits under the comment "No value of the tool can be checked" (`codes.py:16-21`), which doesn't describe it. `not-plain-check-error` and `uncheckable-strict-check-error` are hard to tell apart. Consider `check-error` / `strict-check-error`.
- Log and message disagree on order. The exception sorts codes, but the `_cannot_check` warning joins them in insertion order (`security_review.py:355-358`). It also joins enum members directly, while everywhere else uses `.value`.
- `ToolInputRejected` with a required second `__init__` argument no longer survives a pickle round trip, because `args` holds only the formatted string. Low risk, since it doesn't cross processes today.

## Packaging / Python 3.8

- `MANIFEST.in` plus `include_package_data` work. I built the wheel in the scratchpad and both the yml and the xml files are in it.
- The tool_util pieces are Python 3.8-safe: `typing` generics in pydantic fields, `tuple[...]` only in a lazily evaluated annotation, `Literal` from `typing_extensions`.
- Interaction with mvdbeek's code: `galaxy.tool_util.security` imports Cheetah at module top. `galaxy-tool-util` depends only on `galaxy-util[image-util]`, and CT3 lives in the `galaxy-util[template]` extra. So `import galaxy.tool_util.security.spec` fails in a plain `pip install galaxy-tool-util`. This undercuts the "distributable for Planemo/Tool Shed" goal. Add the `template` extra (or a `security` extra), here or on mvdbeek's branch.

## Reuse / abstractions

- `_ComputeEnvironment` (`security_review_spec.py:71`) duplicates `test/unit/app/tools/test_evaluation.py:248`, and `_hda`/`_hdca` duplicate mvdbeek's `hdca()` (`test_security_review.py:101`). Now that a lib-side helper exists in `app_unittest_utils`, those tests could use it.
- `review_problems` re-implements `serious_findings` with string literals (`spec/__init__.py:165-167`). It can't import it, because it lives in `galaxy.tools`. Moving `serious_findings` and `CHECKED_SEVERITIES` into `galaxy.tool_util.security.report` would let both share it, and the spec should at least use the `VULNERABILITY`/`HIGH`/`CRITICAL` constants.

## Test nits

- The `test_security_review_spec.py:46` OR-substring check could assert the exact `Tool security review (<codes>)` prefix instead.
- `message_contains: ["...", "plain"]` (`cases.yml:252`) is a weak fragment.
- Imports are at module top everywhere. Comments and docstrings are short.

## Not security-sensitive

Nothing here concerns deployed Galaxy beyond this unmerged analyzer.

</details>
