Run via Claude Opus at high effort.

# Test challenges: tool_security_runtime

I added one commit, `c846af20490`: three new tests and one stronger assertion in `test/unit/app/tools/test_security_review.py`.
- No test was dropped or weakened.
- I did not touch runtime code or spec data.
- `test_security_review.py`, `test_security_review_spec.py` and `test/unit/tool_util/security`: 2418 passed. black, ruff, isort and flake8 are clean.

## Method

I mutated the seams this branch wrote, ran the three security test sets against each mutation, and reverted with `git checkout` (the tree is clean). No Galaxy server was started.

| Mutation in `security_review.py` | Killed before | Killed after |
|---|---|---|
| Drop `unchecked_at(level)` from the unchecked-location union | **nothing (2415 passed)** | the 3 new tests |
| Use `ToolReview.unchecked_locations` instead of `classify.unchecked_locations` (drops reflection) | spec jobs and log-mode tests for `reflection_bypass` and `getvar_user_name` | same |
| Gate `_no_plain_value` on `classify.unchecked_locations` (naive `classify()` swap) | only `test_strict_when_unsure_refuses_plain_values_when_the_check_fails_on_a_rewriting_tool` | that test plus the 3 new ones |
| `_JOB_WHY = WHY` (drops the "job does not carry" wording) | 9 tests: `test_strict_when_unsure_refuses_every_job_when_no_value_can_be_plain[open]` plus 8 spec jobs | same plus the 3 new ones |
| Remove `ToolInputRejected` from `BaseJobRunner`'s rejection tuple | nothing in unit tests (reasoned, see below) | not addressed |

## Changes

- **New: `test_stricter_level_refuses_plain_values_of_a_tool_with_template_code[enforce_data|enforce_all]`.**
  - The tool echoes `$e.creating_job.tool_version` (`ECHO_ONE` variant).
  - At `enforce_code` nothing is unchecked and the job runs.
  - From `enforce_data` on, its `option-injection` finding on an opaque value is not checkable. That makes `command` unchecked, and classify() gives no code for it.
  - The ungated `uncheckable_reasons(report, _JOB_WHY)` must still refuse plain values with `uncheckable-template-code`.
  - This covers the second half of the "Ungated, unlike classify()" comment, the stricter level. The existing red-to-green test covers only the check-error half.
  - Red under both the union and the gate mutations, at its own assertion.
- **New: `test_log_warns_of_what_a_stricter_level_refuses`.** Log mode uses the `all` level, so it must warn `uncheckable-template-code` for the same tool. It is red under the union and gate mutations.
- **Stronger red-to-green test.** `..._when_the_check_fails_on_a_rewriting_tool` now also asserts the reason text: "security review failed, and its templates change values with .replace."
- **Red-to-green evidence.** Each of these tests is new behaviour on top of the parent, so on the parent it fails at import. The evidence is the mutation reds above.

## Challenged and kept

- **`test_refusal_codes`.**
  - It is a change detector, and a Rule rename would also break `cases.yml` loading and the docs test.
  - I kept it because `RefusalCode` values are user-facing (they start job info and log lines) and are now built from the static catalogs' `Rule`/`Uncheckable` values. Without it, a rename in the parent's catalog would silently rename a public refusal code.
  - Its comment says so.
  - Checked: the vulnerability rules with no `RefusalCode` are `command-position`, `variable-name` and `server-injection`. The analyser builds all three with an empty breakout, so they are never checkable and never reach `RefusalCode(v.rule)`. Spec cases pin `checkable: false` for two of them.
- **Narrowed `test_every_case_expects_something`.** Exactly 3 cases need the fault clause: `review_failed`, `check_failed` and `strict_check_failed`, all fault-only red jobs. It cannot be narrower without changing source case data.
- **Restored `test_every_case_has_jobs`, `test_every_code_has_red_and_green_jobs` and `test_known_bypasses_are_documented_as_such`.** These are verbatim from the source pin and are the structural gates of the spec. Kept. The source's `test_docs_list_the_codes_and_cases` became the parent's `test_docs_list_the_cases`. I checked `spec_cases_markdown` still includes `_refusals`, so the refusal-code table is still regenerated and compared.
- **`server_python_command` red and green jobs.**
  - Correct: the red job is a plain value refused with both codes, and the green job (`when_unsure: log`) warns both.
  - It has no `harm` job on purpose. Its side effect runs in the server process (template `subprocess`), not in the job's working directory, so `harms()` and the sweep cannot observe it. A payload run during the log-mode test would run in the pytest cwd.
  - The red doc's claim "refused before the template runs" is true (`_check_input_values` runs first in `build()`) but is not asserted. Asserting it would need a payload, with the same cwd problem.
- **Ported tests** (`test_security_review.py`, `test_security_review_spec.py`, the integration tests): not churned, per the brief.
  - Their `SimpleNamespace` evaluator stub (`evaluator()`, the `OPEN_FILE` branch) would read better as a small dataclass. Ported verbatim, so left.
  - The integration `_run` helper already wraps the repeated populator calls.

## Not addressed

- **Runner path.**
  - If `ToolInputRejected` is dropped from `BaseJobRunner`'s tuple, the job goes to the generic `except` and `job_wrapper.fail(message, exception=True)`. The state and `misc_info` are the same, so the integration tests (which check only those) stay green. The only differences are `job.traceback`, which is admin-only via `full=True`, and `log.exception`.
  - No unit test of `BaseJobRunner.prepare_job` exists to parametrize.
  - Not worth two integration-server runs for an admin-only field.
- **Pulsar.** `ToolInputRejected` goes through `fail_job` (resubmission rules), matching the source. Dev's `InsufficientPermissionsException` branch now fails directly "without fail_job's resubmission rules". A refusal is just as deterministic, so that branch may suit it better. This is a product choice for John, and the review already noted it. The merge also changed dev's `ParameterValueError` Pulsar log line to "rejected while preparing".
- **Fallout (neutral note).** Under `enforce_data`/`enforce_all`, Galaxy's own `__SAMPLE_SHEET_TO_TABULAR__` gets the stricter-level unchecked location `configfile:out_config`, and so the strict check. This is the same seam the new tests pin. Separately, the spec's `job_metadata.xml` tool is refused on every job from `enforce_data` on (`uncheckable-template-code`, for reading `$creating_job`). Both are inherited source behaviour.
- **E2E.** None needed: there is no UI.
