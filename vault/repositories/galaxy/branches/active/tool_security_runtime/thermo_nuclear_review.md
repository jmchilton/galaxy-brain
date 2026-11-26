Run via Claude Opus at high effort.

# Thermo-nuclear review: tool_security_runtime

Reviewed `git diff d4e4f68dd25 HEAD` (head `c846af20490`) per `_shared/prompts/thermo-nuclear-code-quality-review.md`.

**Verdict.** There is no structural regression. No hand-written module crosses 1k lines: `security_review.py` is 875 lines and new. The files over 1k are ported or generated: `test_security_review.py` (about 1159 lines, ported) and the docs. The runtime is placed well:
- One hook, `_check_input_values`, shared by `ToolEvaluator` and `PartialToolEvaluator`.
- An injected reviewer singleton.
- The runner merged into dev's existing rejection tuple.
- `codes.py` built on the `Rule` and `Uncheckable` catalogs.

The real maintainability debt is inside mvdbeek's ported module: level policy spread across conditionals, redundant review state, and repeated log-then-raise branches. Those are his design calls, so they are recorded below as NEEDS-DECISION rather than restructured.

## Acted on

Two commits in WORKING_DIRECTORY, not pushed.

- **`750590845cb`** tidies the job check's level helpers and refusal-code aliases. It changes `security_review.py` only:
  - The module function `_enforced(level, at)` shared its name with the unrelated `ToolReview._enforced(level)`. It is renamed `_refused_at` and reuses the canonical `charsets.stricter` instead of re-deriving `LEVELS.index`.
  - The module aliases `STRAY_QUOTE` and `PATH_LIKE_NAME` (`RefusalCode.X.value` strings) are deleted. `Violation` now takes the `RefusalCode` members, which are StrEnum, so they log and compare identically.
    - `Violation.rule` stays `str` on purpose. The `RefusalCode(v.rule)` at the raise site is what keeps a rule with no code from failing in log mode.
  - The conditionals in `_not_plain_chars(level)` became an `_NOT_PLAIN_AT` table.
  - The stale `check_job` docstring said "``enforce`` mode"; no such mode exists.
- **`9b8b1099b1f`** strengthens the tests (no test or assertion removed):
  - `test_strict_message_lists_what_the_strict_check_lets_through[code|data|all]`. The plain-character lists in `_PLAIN` are hand-written user-facing text. They now must equal what `strict_harm` lets through at each level. A mutation (dropping `/` from DATA's set) turns it red.
  - `test_review_config_offers_the_reviewer_settings`. The `mode` and `when_unsure` Literals in the spec's `ReviewConfig` must equal the reviewer's `LOG + ENFORCING` and `WHEN_UNSURE`. `tool_util` cannot import `galaxy.tools`, which leaves two sources of truth.

## Gates

- **Behaviour diff.** A scratch script ran every spec job through both evaluators in four modes: its own, `log`, `enforce_data` and `enforce_all`. That is 96 jobs (the source's 94 plus `server_python_command`'s 2), 768 outcomes in all. It recorded `rejected`, codes, the full message and every warning, with job ids normalised. The before and after dumps are **identical**: refusal messages and warnings are unchanged, not only the codes the spec pins.
- **Tests.** `test/unit/tool_util/security`, `test_security_review.py` and `test_security_review_spec.py`: 2422 passed (2418 before, plus 4 new).
- **Lint.** ruff, black and isort are clean, and the pre-commit hooks pass.
- **mypy** from `lib/`: 0 errors in `security_review.py`. The 22 errors in 11 unrelated modules are the known baseline.

## Not acted on

NEEDS-DECISION:

- **The level policy is scattered.** The enforcement level decides behaviour in six places:
  - `_LEVELS` (mode to level)
  - `level == DATA` (`data_requires`) and `level != CODE` (path-like names) in `find_violations`
  - `level != CODE` (tilde word) in `strict_harm`
  - `_NOT_PLAIN_AT`
  - `_PLAIN` (the message)

  A per-level policy object (plain chars, tilde, data requires, path-like names, message) would remove the conditionals. That reshapes mvdbeek's core algorithm, so I recommend it only if he agrees. The new `_PLAIN` test at least pins the text against the charset.
- **`ToolReview.status` duplicates `report is None`.** `ANALYSED` holds exactly when a report exists, so `check_job` tests both, and every accessor guards `report is not None`. One fix is to drop `status`, or split the outcome into a reviewed type and a failed type. Both are mvdbeek's API, and tests assert `status`.
- **`_cannot_check` repeats log-then-maybe-raise three times:** refuse, no-plain, and strict-check error or violation. A returned decision (codes, log line, message), raised or logged once by the caller, would collapse them, but the log formats differ per branch. This is a design call, and log lines are behaviour.
- **One reason, two wordings.**
  - `classify.WHY` says "no input carries" and `_JOB_WHY` says "the job does not carry".
  - That one-string difference is the only reason `uncheckable_reasons` has a `why` parameter.
  - Unifying the wording deletes both the parameter and `_JOB_WHY`. It changes either refusal messages or the parent CLI output, so it is John's choice.
- **Two different sets named "unchecked locations".**
  - `ToolReview.unchecked_locations` (the report's own) feeds `_log_summary`.
  - `classify.unchecked_locations() ∪ unchecked_at(level)` feeds `check_job`.

  This is inherited, and it affects the info log only. Unifying them changes log output, and renaming the property touches tests.
- **Splitting `security_review.py`** into orchestration, value extraction, the violation algorithm and messages. It is under 1k lines and in mvdbeek's layout.
  - **Hazard for anyone who does it:** `_FAULTS` in `security_review_spec.py` patches `review_tool_source`, `find_violations` and `strict_violations` on the `security_review` module. Extracted code must still resolve those names through that module.

Left, with reasons:

- **The dash-word-from-added-whitespace rule is spelled two ways:** `added & WHITESPACE` in `find_violations` and `c.isspace()` in `strict_violations`. They are not equivalent: `isspace` also covers `\r\v\f`. Unifying them is a behaviour change.
- **The sweep's string slots.** `_slots` builds dotted paths and `_set` parses them again. The test ids and `slot.startswith("inputs.")` depend on them. A closure-based setter would read as more magic, not less.
- **`_ComputeEnvironment` in `security_review_spec.py`** has 20 trivial overrides. `SharedComputeEnvironment` needs a real `JobIO`, and the other stubs live in test modules that `lib` cannot import. Ported verbatim.
- **Private re-implementations** of the parent's dropped helpers (`_enforced_findings`, `_added_by_rewrites`, `_param_path`). Their canonical home is `charsets`/`report`, which the brief keeps off-limits.
- **Repeated topics.** The `upload1`/`model_attributes` defaults are already parked. `Tool.security_review()` has no production caller (recorded in `review_port.md`). Keeping `uncheckable_evidence` public was already decided there.
- **Evaluator construction paths.** Both production `MinimalJobWrapper` paths (job and task `prepare`) go through `_get_tool_evaluator`, which passes the reviewer. `RemoteToolEvaluator` runs after the Galaxy-side `PartialToolEvaluator` has already checked. `UserToolEvaluator` serves `user_defined` tools, which are an unreviewed type. Nothing that prepares a user's job skips the check.

<details><summary>Full review</summary>

### Structure and placement

- **Wiring.**
  - `ToolEvaluator` gets an optional `security_reviewer` and one `_check_input_values` hook. `build()` calls it before `global_tool_logs`, and `PartialToolEvaluator.build()` calls it too.
  - Optional injection is the right shape, because `MinimalToolApp` (remote eval, tool tests) has no reviewer.
  - The app registers a `ToolSecurityReviewer` singleton, `MinimalManagerApp` gains a typed attribute, and `MockApp` defaults to `OFF`.
  - The diff adds no stray conditionals to shared flows.
- **Runners.**
  - `ToolInputRejected` joins dev's `(ParameterValueError, ExpressionTemplateError, InsufficientPermissionsException)` tuple, with no parallel `except`.
  - Pulsar extends the existing `isinstance` branch. That branch now logs "rejected while preparing" for `ParameterValueError` too, a small log wording drift from dev.
- **`codes.py`.**
  - It builds `RefusalCode` values from `Rule`/`Uncheckable` and reuses their descriptions. Only the 6 runtime-only codes carry new text.
  - Its relative imports match the package's other modules.
- **`classify.py` split.**
  - `classify()` = gate (`unchecked_locations`) + `uncheckable_reasons`, and `uncheckable_reasons` = format(`uncheckable_evidence`).
  - It is clean, and it is what lets `_no_plain_value` become one line instead of a 45-line copy of the parent's logic.
  - The only wart is the `why` parameter, which exists for one string (see NEEDS-DECISION).
- **`spec/__init__.py` and `docs.py`.**
  - The job models are small, typed pydantic models with `extra="forbid"`.
  - `expected_codes`/`expected_warnings` hold the defaulting rule in one place.
  - The docs gain `_refusals` and per-job blocks through the existing `_described` helper.
- **`security_review_spec.py`.**
  - It is a focused harness: models to ORM objects, a real evaluator, a log capture and a fault injector.
  - `_FAULTS` patching module globals couples it to `security_review`'s namespace (see the split hazard).

### `security_review.py`

- **Size.** 875 lines, the largest new non-test module. It has four seams:
  1. Review cache and orchestration (`ToolSecurityReviewer`).
  2. The violation algorithm (`find_violations`, `strict_violations`, `strict_harm`).
  3. Value extraction (`source_values`, `_resolve`, `_accessor_values`, `_file_text`, `_identifiers`, `_datasets`, `_expanded`, `_preferences`).
  4. User messages (`_describe`, `*_message`, `_PLAIN`).

  Extracting value extraction (about 200 lines) would be the cleanest cut. Not required under 1k.
- **Level policy.** See NEEDS-DECISION. It is the main "missing model" smell. Acted on: one of its conditional helpers became a table, and the message text is now pinned to the charset.
- **`ToolReview`.**
  - Its state is redundant (`status` with an optional `report`).
  - `checked_findings` and `unchecked_findings` are thin aliases of `checked_at(CODE)` and `unchecked_at(CODE)`, used by tests and `_log_summary`.
  - Acceptable, but the type would be simpler as reviewed-or-failed.
- **`check_job`.**
  - The gate `review.checked_at(self.level) or review.report.writes or self.level != CODE` is a skip-work optimisation, and it is readable with its context.
  - `job_id` is read before the `review is None` early return. Trivial.
- **`_cannot_check`.**
  - It handles three outcomes, each "log, then raise if refusing".
  - `refuses = self.enforcing and self.when_unsure != LOG` is computed once, which is good.
  - The repetition is real but bounded.
- **`find_violations`.**
  - It is dense: closures `chars_of`, `own` and `first`, with four passes.
  - Each pass is commented and is algorithmically distinct.
  - I saw no simplification that keeps behaviour provably identical without a much larger equivalence harness.
- **Naming.** `_enforced` (module) versus `ToolReview._enforced` (method) was a real legibility trap. Fixed.
- **Aliases.** `STRAY_QUOTE` and `PATH_LIKE_NAME` re-exported enum values as strings for no gain. Fixed.
- **Typing.** It is fully typed. `from_config(config: Any)` could name `GalaxyAppConfiguration` under `TYPE_CHECKING`. A nit.

### Tests

- `test_security_review.py` is 1143 lines, new and ported from the source; it is over 1k but kept as ported. The `SimpleNamespace` evaluator stub was noted in the test challenges.
- The two strengthening tests above close two places where nothing tied hand-written text or Literal types to their source of truth.

### Security

There are no security findings. Both production evaluator construction paths pass the reviewer.

</details>
