Run via Claude Opus at high effort.

# Test challenges: tool_security_static_findings

I added two commits to `test/unit/tool_util/security/`. Neither touches the analyser: `git diff --stat e9e1d8eb1a5 HEAD` lists only `test_sources.py` and `test_review.py`. The suite went from 535 to 556 passing (`PYTHONPATH=lib pytest -q test/unit/tool_util/security`), and ruff, black and isort are clean.

- `b970901b002` **Pin closers, needs_closer, level and data_requires of static findings.** This answers the port reviewer's Nit 3 caveat. These fields ship in `--json`, but only the dropped runtime tests exercised them.
- `c3c42715fdd` **Assert the shell finding of a configfile a shell runs, not either rule.** This replaces an OR-check in `test_a_configfile_any_shell_runs_is_a_script` with the exact high finding and its location: `{("shell-injection", "configfile:script")}`. It is a strengthening only.

## Process items

- **`doc/source/dev/writing_tests.md`.** I read it. These are plain pytest unit tests of a library with no app, so the decision tree puts them at the unit layer.
- **API, integration and E2E layers.** Not applicable. Nothing in this branch wires the review into Galaxy at runtime: no config, evaluator or API. No E2E test is warranted.
- **Mocks.** `test_judge.RecordingJudge` is already a small, reusable stand-in rather than a mock. `test_patterns._finding` builds real `Finding` dataclasses. No `SimpleNamespace` or `mock` is used anywhere in the package, so I rewrote nothing.
- **Red check.** The package does not exist on dev, so "fails without the branch" would only fail at import, and that proves nothing. Instead, each new test was shown red under a temporary one-line mutation of the field it pins, and each mutation was reverted. The table below has the details.
- **"Baseline tests" prefix.** Not used. There is nothing on dev for these tests to pin.

| Mutation (temporary) | Went red |
|---|---|
| `interp.finding`: `needs_closer=False` | `test_a_value_after_one_that_can_end_in_a_backslash_needs_a_closer` (both) |
| `interp.finding`: drop the `closes` override when `needs_closer` is set | same, both params |
| `level=charsets.level_of(severity)` (ignore the verdict's level) | `test_level`: `echo '$text'` option-injection, data-file configfile |
| `level_of(verdict.severity)` (ignore the conditional downgrade) | `test_level`: `$column` loop |
| `Report.add`: `data_requires=first.data_requires` | `test_data_requires[export ...]` |
| `Report.add`: the `data_requires` guard `and` → `or` | `test_data_requires[env ...]`, merge test |
| `Report.add`: `needs_closer` `and` → `or` | `test_findings_of_one_key_merge_into_one_that_holds_when_either_does` |
| `Report.add`: `level=first.level` | merge test |
| `__init__`: skip `report.closers.pop` for unchecked locations | `test_no_closers_...[echo $free \| sh]` |
| `interp`: record writes and closers even when poisoned | `test_no_closers_...[rewrite]`, `test_writes_are_left_out_when_a_value_is_rewritten` |
| `cases.yml`: add a case with only `doc` and `tool` | `test_every_case_expects_something` (and docs freshness) |

Before this branch's tests, every row except the last two passed the whole suite.

## (a) Tests the framing commits changed or added

- **`test_every_case_expects_something`.** Kept. It replaces the job-shape checks and catches a case that asserts nothing (red check above). It is weak in one way: `serious_rules: []` or `rewrites: false` alone satisfies it. That is still an assertion, so I left it.
- **`test_docs_list_the_cases`.** Kept. It compares the generated section byte for byte, and it skips outside the Galaxy tree, which is correct for the `galaxy-tool-util` package test symlink.
- **`test_every_pattern_has_a_case` and `test_every_tool_has_a_case`.** Unchanged, and still meaningful.
- **`path_like_name`: decision for John.** The rewritten case asserts the same thing as `element_identifier_shell_injection`: shell-injection on an element identifier in single quotes. The only difference is that it uses `sort -o`. Its original purpose was the path-like identifier refusal under `enforce_data`, and that has no static assertion left.
  - Option 1: keep it as a placeholder for when the runtime piece lands.
  - Option 2: fold it into `element_identifier_shell_injection` and drop `sort_to_named_file.xml`.

  I did not embellish it (for example by adding `severity: high`), so the spec and docs stay as the framing commit left them.

## (b) Static behaviour that lost tests with the runtime drop

These are covered now, all in `test_sources.py` and all through `review(...)` of synthetic templates except the merge test:

- `Report.closers`: positive cases (unquoted, double quotes with a trailing backslash, `repr()`), and none for single quotes, a pipe to a shell, or a rewritten value.
- `Finding.needs_closer` together with its `closes` override, contrasted on the same ref, for both shell and python configfile.
- `Finding.level`: the defaults, the two verdict overrides, the python script at `all`, and the conditional-source downgrade.
- `Finding.data_requires`: `DATA_HARM`, empty, `env`, and the `export` merge with `=`.
- `Report.add` merging two findings of one key. This builds `Finding`s by hand, like `test_patterns` does. No template I found makes same-key findings that differ in `level` or `needs_closer`, so this is the only way to pin that code.
- The `--json` shape: a finding's `breakout`, `requires`, `closes`, `needs_closer`, `level` and `data_requires`, and the `closers`/`writes` entries `{location, ref, chars}`. This replaces the bare `json.dumps(report.to_dict())` in `test_writes_record_what_does_harm_outside_quotes`.

Still not asserted directly: the contents of `Report.reads` for configfiles, and `Report.rewritten` beyond the four existing literal-rewrite cases. Both are adequate for now.

## (c) Weak or trivial assertions: suggestions, not rewritten

- `test_review.py` has 28 subset checks (`expected in rules(...)`). Many are parametrized "this template reports at least X" checks. Exact `rules(...) ==` sets would catch spurious extra findings, but they would also churn whenever an unrelated low finding (`option-injection`) appears. I suggest a helper that ignores `option-injection` low and compares exactly; lines 150, 256 and 303 already do this inline.
- `test_sources.py` checks CPU time with `time.thread_time() < 5`. On a loaded CI box this is a possible source of flakes; it is a performance guard, not a behaviour guard. Keep it, but note it if it ever flakes.
- The `test_sources.py` module docstring ("which let Galaxy check the values of a job") still uses job-check framing. It is ported text; I suggest rewording it in the comment-cleanup pass (port review Nit 2).
- Docs: `checkable` is a `@property`, so `--json` does not emit it. The docs page does not claim it is a JSON key, but a reader could infer that from the generated `checkable: true` lines, which are spec expectations. Optional: add one clause saying it is computed, not emitted.
- The spec's `FindingExpectation` cannot express `level`. Adding an optional `level` field would let spec cases pin it next to the tools. This is a model and docs change, so it is left for John.

## Status

READY. The changes are test-only, the analyser output is unchanged, and all 556 tests pass.
