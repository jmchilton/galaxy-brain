Run via Claude Opus at high effort.

# Thermo-nuclear code quality review: tool_security_static_findings (re-harden)

**Verdict: the John-side code passes after one behaviour-preserving commit. mvdbeek's analyser still falls short of the approval bar, and that stays NEEDS-DECISION as scoped.**

## Acted on

All in commit `d4ae281e442`, on top of the test-challenge commit `e067cc3dd2a`.

- **`__main__.py`: `main()` split into orchestration and small typed pieces.**
  - Before, one 70-line function parsed arguments, reviewed, judged, classified, decided failure and printed. Errors came from two sources: `_tool_sources` yielded `(path, ToolSource | None, str | None)`, and `main` caught review exceptions itself. Both fed one `if tool_source is None or report is None` branch.
  - Now `_tool_sources` yields `ToolSource | str`, and `_reviews` wraps it, yielding either `Reviewed(tool_source, report)` or `NotReviewed(error, tool_source)`. `NotReviewed.to_dict()` owns the error entry.
  - `--fail-on` is parsed once into a frozen `FailOn(severity, uncheckable, unchecked)` with `met(report, classification)`. This replaces a severity index, a `min()` over a list, and three inline `if`s against sentinel strings.
  - The JSON entry is built in one dict literal, instead of being created and then mutated twice.
  - Argument parsing moved to `_parser()`.
  - The file grows from 191 to 237 lines, but the number of concepts `main()` holds falls.
- **`classify.py`: the template-code reason reuses `access_patterns()`.**
  - `classify` had its own copy of "which capability findings read data no input carries": `CODE_CAPABILITIES`, the `SANITIZE_OFF` scan, and a `startswith("__user__")` test. `patterns.pattern_of` already decides the same thing, with a slightly different `__user__` test (`lstrip("$").split(".")[0]`).
  - These agree on every `expr` the analyser can emit. `__user__` capability exprs come only from `capabilities.judge`, whose root is exactly `__user__` with no `$`. A `CODE_CAPABILITIES` finding always has an `expr`; `template-compile-exec`'s is `#directive`.
  - One definition now governs both the spec's patterns and the `uncheckable-template-code` reason. The `CODE_CAPABILITIES` and `SANITIZE_OFF` imports are gone from `classify`.
- **`spec/__init__.py`: `FindingExpectation.severity` is validated against `SEVERITIES`.** A typo in `cases.yml` now fails to load instead of failing later as "no finding matches". New test `test_spec_rejects_an_unknown_severity`, shown red with the validator disabled.

**Verification:**
- `pytest -q test/unit/tool_util/security`: 590 passed.
- ruff, black and isort are clean. `mypy galaxy/tool_util/security` (from `lib/`) reports 0 errors in the package. The 22 errors in 11 other files are the same as on the base.
- The CLI oracle was captured before any edit, from the worktree root with `PYTHONHASHSEED=1`. It covers:
  - `--json` and text over `spec/tools` and `test/functional/tools`;
  - `--min-severity high --fail-on unchecked`;
  - the exit code of each spec tool under `--fail-on` critical, high, uncheckable and unchecked;
  - `python -m galaxy.tool_util.security.spec.docs`.

  After the commit, every file was byte-identical: stdout, stderr and exit codes alike.
- The analyser `review_tool_source(...).to_dict()` dump over 387 tools is byte-identical (`cmp`). All mutation red checks were reverted before both dumps ran.

## Not acted on

1. **NEEDS-DECISION: `report.py`'s rule constants duplicate `Rule`.** `CODE_CAPABILITIES`, `RUNS_TEXT_RULES` and `SANITIZE_OFF` are string sets, and the analyser passes rule names as bare strings (`self.add("template-exec", ...)`). Using `Rule` members everywhere would remove the parallel vocabulary and `test_report_rule_sets_are_catalogued`. JSON stays the same because `Rule` is a `StrEnum`, but it touches every emitter in mvdbeek's analyser.
2. **NEEDS-DECISION: split `interp.py` (1972 lines) along its seams:** walker, call models, sinks, and the value-check ledger.
3. **NEEDS-DECISION: the 24 `if name == ...` call models in `interp.py`** become a registry of the `BoundCall` transfer functions that already exist.
4. **NEEDS-DECISION: the thread-local `recording()` side channel** (`interp.py:511`) that carries writes and closers. It is tied to the keep-the-value-check-data decision.
5. **NEEDS-DECISION: `Report.unanalyzed: list[str]` is parsed back with `note.partition(": ")`** (`__init__.py:178`) to recover the location. A typed note `(location, why)` would end the round-trip, but it changes `to_dict()` unless it is serialised back to the same string.
6. **NEEDS-DECISION: `patterns.pattern_of` re-derives a category from `Finding.expr` strings** (the `__app__`/`__user__` prefix, the `creating_job` regex) that `capabilities.judge` already decided. The clean fix is for the analyser to put the pattern on the finding.
7. **Follow-up (analyser): the `getVar`/`varExists`/`hasVar` name tables** are repeated in `capabilities._GENERATED_SELF`, `known_helpers._LOOKED_UP` and the literals in `interp.py:1633`.
8. **Kept: the three `DESCRIPTIONS` dicts** (`Rule`, `Uncheckable`, `PatternCode`). Putting descriptions on the enum members needs a custom `__new__`, which is more magic than a dict. The set-equality tests already catch drift.
9. **Kept: the explicit `MANIFEST.in` list** of the 40 spec files. On dev, `packages/tool_util/MANIFEST.in` has 493 explicit `include` lines and no globs, and `test_spec_files_are_packaged` guards it.
10. **John's decisions, unchanged:**
    - the `unchecked` / `uncheckable` naming;
    - non-XML tools exiting 1;
    - spec `unchecked_locations` comparing the report's own set rather than the classified one;
    - the history squash or reword, including the "Baseline tests" prefix and about 20 "job check" comments in the analyser.

<details>
<summary>Full review</summary>

## Scope

The diff is `git diff origin/dev...HEAD`: 83 files and about 12.6k lines, 7.9k of them the analyser package. Code changes were made in John-side code only: `__main__.py`, `classify.py`, `rules.py`, `spec/`, the docs, tests and packaging. The analyser was reviewed fresh for the NEEDS-DECISION list; the line counts and sites above were re-measured at `79f7da40312`.

## John-side findings

### F1. `main()` was the busiest function in the John-side code (acted)

- **Responsibilities.** It held seven:
  - argument parsing;
  - judge setup;
  - review with an exception catch;
  - error entry construction;
  - judging and classification;
  - three failure predicates;
  - dual output.
- **Two error sources merged late.** `_tool_sources` returned a triple with two optionals whose valid combinations (`(ts, None)` or `(None, err)`) were implicit. `main` then added a third shape, `(ts, err)` after a review exception, by reassigning `error`.
- **Sentinels in the failure check.** `--fail-on` values mixed severity names with the sentinels `uncheckable` and `unchecked`, and were turned into an index plus `in args.fail_on` checks scattered through the loop.
- **The fix.** It is code judo, not a rearrangement:
  - The tagged `Reviewed` / `NotReviewed` results make the impossible combinations unrepresentable and delete the `tool_source is None or report is None` branch.
  - `FailOn` turns the three inline conditions into one method.
  - The JSON entry is built once.

### F2. `classify` duplicated `patterns` (acted)

- **Same question, two places.** Both modules asked which capability findings read data no input carries, and each computed "is the sanitizer on" by itself. Their `__user__` tests had drifted apart in form, though they agree on every expression the analyser emits.
- **The fix.** Building the `TEMPLATE_CODE` reason from `access_patterns()` gives that classification one owner. Only the `classify`-specific rule (reflection outside a rendered location) stays in `classify`.

### F3. The spec's string-typed fields (partly acted)

- **`severity`** is now validated.
- **`accessor`** is still `str | None`. Its vocabulary is the bare constants in `report.py` (`TEXT`, `RAW`, ...), which belong to the analyser, so typing it is part of NEEDS-DECISION item 1.
- **`location`** is free-form by design (`command`, `configfile:<name>`, ...).

### F4. `docs.py` and the spec helpers (acted in the test-challenge commit)

`docs._case_rules` and `test_rules`' inline "rules a case names" were the same computation. They became `ReviewExpectation.rules`.

### F5. Things that are fine

- **`rules.py`** is a flat catalog. `VULNERABILITY_RULES` repeats nine members, but it is the classification itself, and `test_emitted_rules_are_catalogued` checks it against emitted kinds.
- **`Classification`** is a small frozen dataclass, and `codes` is derived from `reasons`, so the two cannot disagree.
- **`spec._matches`** loops over two field names with `getattr`. That is mildly generic, but short and local.
- **The docs page** has about 75 hand-written lines and is otherwise generated, and the freshness test guards the generated part.
- **Packaging:** the `galaxy-tool-security-review` console script, `MANIFEST.in`, and the dependencies already in `galaxy-tool-util`.

## Analyser findings (NEEDS-DECISION, not changed)

These are re-measured at HEAD:

- **File size.** `interp.py` has 1972 lines. Next largest are `charsets.py` (761), `capabilities.py` (650), `shell.py` (571) and `values.py` (503). Only `interp.py` is past 1k, and it is new in this diff, from mvdbeek's series.
- **Call models.** `interp.py` has 24 `if name == ...` / `elif name == ...` call-model branches.
- **Side channel.** `recording(self._record)` is a thread-local that collects the value-check ledger.
- **String round-trip.** `__init__._mark_unchecked_locations` parses `unanalyzed` notes back with `partition(": ")`.
- **Re-derived category.** `patterns.pattern_of` recovers a category from the `expr` text.
- **Repeated tables.** The Cheetah lookup-name tables appear in three modules.
- **Bare-string vocabulary.** Rule names and accessor names are bare strings throughout the analyser, and `rules.Rule` and the `report.py` sets mirror them.

Each would make the analyser simpler. Each would also change mvdbeek's code, and items 1 and 5 risk the byte-identical `to_dict()` guarantee unless they are done carefully. The branch's scope says leave them; they belong in a follow-up agreed with mvdbeek.

</details>
