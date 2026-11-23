Run via Claude Opus 5.5 at low effort.

# Test challenges debrief

Scope: the tests this branch added or changed on top of `mvdbeek/tool-security-review-on-load`. That is `test/unit/tool_util/security/test_spec.py`, `test/unit/app/tools/test_security_review_spec.py`, `spec/cases.yml`, and the updated asserts in `test/unit/app/tools/test_security_review.py`. While checking, I found that the branch broke mvdbeek's integration test, and I fixed it.

## Commits

Coordinator note: `3b04510e4c8` was folded into `40a8960e80c` (now `3f57f4f7d0b`), the commit that moved the codes to the front of the message; at `e3be4c68953` the codes were still a suffix. `05e9edba101` is now `6c6db8fd3ea`.

- `3b04510e4c8` **Integration test fix.** `e3be4c68953` moved the codes to the front of the message, which broke two `startswith("This job was not run: ...")` asserts in `test/integration/test_tool_security_review.py` (`TestToolSecurityReviewDefaults`, lines 162 and 171). Both now expect the exact prefix: `[not-plain-unchecked-place]` and `[uncheckable-letters-are-code]`. I also tightened the enforce test from `"This job was not run" in message` to `startswith("[shell-injection] This job was not run: ")`.
  - This is the only test that covers review-1 bug 1 end to end: the code survives in the stored `misc_info`, which is trimmed to 255 characters.
  - The whole file passes: 7 passed in 90s.
  - I reasoned that the two broken asserts fail on `40a8960e80c` rather than running them: the unit output shows every refusal message starts with `[`. So the intermediate commits `e3be4c68953` and `40a8960e80c` leave this file red, and folding this commit into the codes commit would keep every commit green. That is a coordinator call.
  - Grepped `lib`, `test`, `client/src` and `doc` for other exact matches on `This job was not run` or `Tool security review:`. None are left besides the ones updated here.
- `05e9edba101` **Spec test tightening.** All of these strengthen checks:
  - `test_job`, enforce mode, red and green jobs:
    - The codes in the warnings must equal the expected codes. Before, it only checked that some warning existed.
    - A refused message must start with `[<codes>] This job was not run: `.
  - `test_log_mode_runs_and_warns` is now `test_log_mode_runs_and_warns_with_the_codes`. It covers green jobs too, so a green job in log mode must warn with no codes.
  - `test_every_case_has_jobs` now also requires that every red job expects a refusal and that no green job expects a refusal or codes. Before, a red job written as `rejected: false` passed silently.
  - `test_strict_when_unsure_refuses_every_job_when_no_value_can_be_plain` had the regex `\[uncheckable-[a-z-]+\]`. It is now an exact code for each parametrize row (rewrites, template-code, letters-are-code ×2), and the now-unused `import re` is gone.
  - In `cases.yml`, the weak fragment `"plain"` in `not_analysed_strict` became `"allows only plain names and values for tool"` plus the reason fragment. `expect` is not rendered in the docs, so the docs test still passes.
  - `iter_jobs` yields a `SpecJob` NamedTuple instead of a bare tuple. The field is named `position`, because `index` clashes with `tuple.index`, which mypy flags. The test now uses `j.job.harm` / `j.job.expect` instead of `j[3]`.

## Red/green evidence

- **Baseline commit.** I checked out `29a73ee27ef` in a temporary worktree and ran `test_spec.py` and `test_security_review_spec.py` there: 156 passed. I confirmed the imports came from that tree's `lib`.
- **Non-baseline tests.** On the base, the codes and docs tests fail at import, because `codes.py` and `docs.py` are new. So I mutated the code in the worktree and restored it with `git checkout` after each run:
  - Code prefix removed from `ToolInputRejected`: every red `test_job` (44) fails, plus the updated asserts in `test_security_review.py` (the 4 no-plain-value rows; output was truncated, so the count for the other updated asserts was not recorded). Before this change, nothing in the spec suite pinned the prefix.
  - Every violation mapped to `shell-injection`: the red `test_job` cases for `stray_quote`, `nested_shell`, `sed_program` and `configfile_python` fail.
  - `harm: true` put back on the "Bob's reads" green: `test_harm[element_identifier_shell_injection-green-1]` fails on returncode.
  - Green of `review_failed` removed: `test_every_case_has_jobs`, `test_every_code_has_red_and_green_jobs[uncheckable-review-failed]` and the docs test fail.
  - One code description edited: the docs test fails.
  - A red job flipped to `rejected: false`: `test_every_case_has_jobs` fails. It passed before this change.
  - Code dropped from the strict-check warning: enforce `test_job` and log-mode tests fail for `not_analysed_strict` and `check_failed`. Before, enforce mode would have passed.

## Challenges considered, not acted on

- **Layer.** The spec stays at the unit level. It is meant to be loaded by Planemo or the Tool Shed without a server, and each job needs only MockApp and sqlite. The one claim that depends on a server, the stored message prefix, is now pinned in the integration test. No Selenium test: no UI changed. The code is plain text in the existing job info.
- **Mocks.** `_fault` uses `mock.patch.object` on `security_review` functions. It is the only way to reach the refusal codes that only a bug can cause. Removing it would mean restructuring mvdbeek's reviewer, which is out of scope for a stacked branch. There are no other mocks or `SimpleNamespace`s in our tests. The `SimpleNamespace` in the OPEN_FILE row is mvdbeek's and was left alone.
- **`_ComputeEnvironment` duplicates `test_evaluation.py`'s.** There is no reusable one in `app_unittest_utils`. It remains a follow-up, as noted in review 1.
- **Overlap with mvdbeek's `test_security_review.py`.** Some spec cases cover the same paths, such as strict-when-unsure and rewrites. The spec's purpose is a distributable, declarative contract, so the overlap is intended, and his tests are not ours to drop.
- **Format invariants as pydantic validators.** I considered moving the red/green invariants into a `SpecCase` validator. I kept them as a test instead, to avoid churning the format. It's worth revisiting if Planemo loads third-party case files.
- **`sed_program` red value** (review-1 nit). I left it as it is: it is correct, and `e` is GNU-only, so it has no harm check either way.
- The review-1 nit on the `test_security_review_spec.py` OR-substring was already resolved in `40a8960e80c`.

## Checks

- Unit: `test/unit/tool_util/security`, `test_security_review_spec.py` and `test_security_review.py`: 632 passed.
- Integration: `test/integration/test_tool_security_review.py`: 7 passed.
- black, isort, ruff and mypy are clean on the changed files.
- No values were found that get past the job check.
