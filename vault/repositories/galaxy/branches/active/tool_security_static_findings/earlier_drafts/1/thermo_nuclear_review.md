Run via Claude Opus at high effort.

# Thermo-nuclear code quality review: tool_security_static_findings

**Verdict: the port framing passes after three small commits. mvdbeek's analyser does not meet this review's approval bar, and that stays a NEEDS-DECISION follow-up, as scoped.**

The analyser's problems:
- `interp.py` is a new 1972-line file.
- Its function models are about 250 lines of `if name == ...` chains.
- Its value and rule vocabularies are bare strings.
- The job-check bookkeeping is threaded through the interpreter by a thread-local side channel.

None of these is a regression the port introduced. All of them were here before the port.

## Acted on (worktree, 3 commits on top of `c3c42715fdd`)

- **`5ffe663a487` Drop runtime leftovers from the report helpers:**
  - Removed `SourceRef.param_path` and its test `test_param_path`. Its only consumer was the stripped runtime `_resolve(param_dict, ref.param_path)`, and it has zero callers in `lib/`. This removes dead code; it does not weaken a test.
  - Inlined `REFLECTION_RULE`. It was used only inside the `CODE_CAPABILITIES` literal, and only the runtime imported it.
  - Renamed `CHECKED_SEVERITIES` to `SERIOUS_SEVERITIES`.
  - Reworded the job-check wording in the framing parts only: the `report.py` comments and docstrings, `patterns.access_patterns`, and the `test_sources.py` module docstring.
  - Typed `spec._matches` with `Finding` instead of `Any`.
  - The CLI's `prog` is now `galaxy-tool-security-review`, matching the console script, and its docstring was fixed.
- **`180c8ad7479` isort fix in `charsets.py`.** `import re._constants` / `import re._parser` (from port commit `e9e1d8eb1a5`) fail `isort --check` with isort 9.0.2 on Python 3.14.
  - CI's format job runs on 3.11 and 3.14 with an unpinned isort, so the 3.14 job likely hits this. I did not check 3.11.
  - `initial_implementation_debrief.md` reported isort clean; that was wrong for this file.
  - Changed to `from re import (_constants as sre_constants, _parser as sre_parse)`, which sorts as stdlib on any Python.
  - The `type: ignore[attr-defined, unused-ignore]` on it is still needed: mypy errors without it.
- **`92320a751cb` Test helpers and a packaging guard:**
  - Moved `INPUTS`, `CONFIG`, `review()` and `rules()` out of `test_review.py` into `test/unit/tool_util/security/_util.py`. `test_sources` and `test_known_helpers` used to import them from a sibling test module. `test_review.py` drops from 1066 to 983 lines.
  - Added `test_spec_files_are_packaged`, which checks that `MANIFEST.in` lists `cases.yml` and every spec tool. It skips outside the Galaxy tree. Red-checked by deleting one MANIFEST line, which made it fail.

**Verification:**
- `pytest -q test/unit/tool_util/security`: 556 passed.
- ruff, black, isort and `mypy lib/galaxy/tool_util/security` (18 files) are clean. Pre-commit passed.
- `review_tool_source(get_tool_source(p)).to_dict()` is byte-identical before and after on all 386 tools (39 spec + 347 `test/functional/tools`). Checked with `PYTHONHASHSEED=1` and with a random seed.

**Oracle note.** I checked stability in two ways:
- Full `to_dict` dumps of all 386 tools matched across seeds 0, 1, 2, 3, 7, 11 and 42 and three random-seed runs.
- `closers`-only probes of the 13 tools that had differed matched across seeds 100–140 and 40 random-seed runs.
- The only outlier was my very first baseline dump. Its `closers` were empty for 13 tools.
- File mtimes show that `interp.py` and `report.py` were rewritten at 21:23 and then restored to HEAD. The concurrent test-challenge commits `b970901b002`/`c3c42715fdd` landed at 21:20 and 21:21, so this looks like that session's red-check mutations overlapping my dump.
- I found no nondeterminism in the analyser. The baseline used is the clean seeded dump.
- Coordinator: identity checks should not overlap mutation-style red checks in the same worktree.

## Not acted on, and why

All of the following are analyser restructurings (out of scope: output must stay identical, and this branch does not restructure mvdbeek's code), or decisions that belong to John or mvdbeek.

1. **NEEDS-DECISION: split `interp.py` (1972 lines) along its seams.** The seams are: walker, call models, sinks, and the job-check ledger. Details in F1.
2. **NEEDS-DECISION: turn `call_python` and `call_bound` into a registry** of the `BoundCall` transfer functions that already exist. Details in F2.
3. **NEEDS-DECISION: give `AV.quoted` and rule names a `StrEnum` each.** JSON output stays identical, because a StrEnum dumps as its string. Details in F3.
4. **NEEDS-DECISION: the job-check ledger and the thread-local `recording()`.** This is tied to John's keep-the-job-check-data decision. Details in F4.
5. **Follow-up: dedupe the Cheetah-name and codec tables** into `template.py` / `charsets.py`. Details in F5.
6. **Follow-up: `unanalyzed: list[str]` is parsed back with `partition(": ")`.** It should be a typed note. Details in F6.
7. **Follow-up: `patterns.pattern_of` re-parses `Finding.expr` strings** to recover a category the audit already decided. Details in F7.
8. **Comment-only job-check wording left in the analyser.** About 20 sites remain in `interp`, `values`, `nodes`, `charsets` and `capabilities`. This was already deferred to the history squash/reword pass by `subagents/review_port.md`, and that decision stands.
9. **Docs home.** With the runtime gone, `doc/source/admin/` is arguably the wrong section; a tool-author or dev section fits better. Small CLI gaps: `--min-severity` does not filter `--json`, and one unparsable path aborts the whole run. Left for John to decide.
10. **Kept on purpose:** the `Report.writes/closers/reads/rewritten` fields, the `Finding` breakout fields, `level`/`LEVELS`/`DATA_HARM`, and the `Node.sources` / `Model.sources` protocol. All of them are emitted in `--json`, so they fall under the existing keep decision.

<details>
<summary>Full review</summary>

## Scope

The diff is `git diff origin/dev...HEAD`: 76 files, about 11.5k lines.
- The analyser package is `lib/galaxy/tool_util/security/` (~7.8k lines).
- The spec is 39 synthetic tools plus `cases.yml`.
- The docs page is 963 lines, ~900 of them generated.
- The tests are ~2.2k lines.

The review covered the whole package. Code changes were limited to port and framing parts, and to dead code left by stripping the runtime.

**Dead-code sweep.**
- An AST pass listed every top-level function, class, method, module constant and `self.` attribute in the package. Each was word-grepped across `lib/`, `test/` and `doc/`.
- Nothing outside the package imports it, apart from docs, `MANIFEST.in` and `pyproject.toml`.
- Names with no reference beyond their definition:
  - Cheetah overrides: `findBOL`, `setCompilerSetting(s)`, `lineNum`, `parserClass`.
  - Pydantic `model_config`.
  - `SourceRef.param_path`, used only by its test. Removed.
- Name with no consumer beyond a literal: `REFLECTION_RULE` (inlined).
- Everything else has a static caller, or is job-check data emitted in `--json`.

## F1. `interp.py` is 1972 lines and mixes four concerns (structural; NEEDS-DECISION)

This is a new file far past the 1k bar, and the size is not cohesion. `TemplateAnalysis` holds:

1. **An abstract interpreter over Cheetah's generated Python**: `block`, `statement` (108 lines), narrowing, `ev` (88 lines), `resolve`, helpers and inlining.
2. **Python library models**: `call_python` (107 lines) and `call_bound` (141 lines), plus about 25 module-level name tables (`_STRING_FUNCTIONS`, `_PRESERVING_METHODS`, `_DECODERS`, ...).
3. **Sinks**, which judge where text lands: `write_value`, `judge_shell` (94 lines), `judge_config` (74 lines), `server_sink`, `finding`, `_breakout`, `_unquoted_harm`.
4. **A job-check ledger**: `_introduced`, `_escapes`, `_written`, `_closers`, `_rewritten`, `_judged`, `_not_judged`, `_record*`, `_judge_rewrite`, `_mark_unchecked` (50 lines).

Each concern has a natural module:
- `interp.py`: the walker and `Env`.
- `pycalls.py`: the call models, see F2.
- `sinks.py`: shell and config judging, beside `shell.py` and `sed.py`, which already own the lexers.
- `ledger.py`: a `CheckLedger` object passed to the sinks, see F4.

The walker would land well under 1k lines, and each piece could be tested on its own. Most of `test_review.py` already tests through `review()` end to end, so the split needs no test rewrite.

## F2. `call_python` / `call_bound` re-implement a dispatcher that already exists (code judo; NEEDS-DECISION)

`values.BoundCall` already lets a value carry "what calling it does". `returns_receiver`, `joins_arguments`, `gets_attribute` and `nodes.gets_preference` are transfer functions, and `call_bound` tries them first. The remaining ~250 lines are `if name == "...":` / `if name in (...)` arms that do the same job inline:
- `open`, `int`/`float`, `getVar`, decoders, `re.*`, `shlex.quote`, `json.dumps`, encoders and `os.path.*`
- `split*`, `replace`, `lstrip`, `join`, `format`, `encode`/`decode`

Moving each arm into a `{name: transfer}` registry, keyed by the dotted name or by the method name, would:
- delete the two chains, leaving a lookup plus the existing fallback;
- make "which Python the review models" a table that docs or tests can list;
- remove duplicates:
  - The "group children" computation is copied in two adjacent `call_bound` arms.
  - The `.{name}()` arm open-codes the `self.note()` dedupe with `if note not in self.report.unanalyzed`.
  - `block()` appends "too many shell contexts" with no dedupe at all.

The arms that need analysis state (`_introduce`, `_judge_rewrite`, narrowing) take the analysis as an argument, as the helpers already take `nodes`.

## F3. Stringly-typed vocabularies (boundary and type; NEEDS-DECISION)

- **`AV.quoted`** takes 5 magic values: `"sq-escaped"`, `"dq-escaped"`, `"shlex"`, `"json"` and `"pyrepr"`. They are compared or set as literals about 20 times, mostly in `interp`, and the field comment lists only 3 of the 5. A `StrEnum Escaping` would fix the comment drift and make every comparison checkable.
- **Rule names** are about 36 bare strings across `interp`, `capabilities`, `charsets`, `sed` and `__init__`. `"template-reflection"` alone appears 12 times.
  - `report.py` has a few constants (`SANITIZE_OFF`, `RUNS_TEXT_RULES`, `CODE_CAPABILITIES`); `patterns.pattern_of` uses literals.
  - A `Rule` StrEnum, with kind and doc beside it as `PatternCode` and `DESCRIPTIONS` already do, would let `FindingExpectation.rule` validate (it is `str` today), so a typo in `cases.yml` fails loudly.
  - It would also let the docs list every rule, and give `CODE_CAPABILITIES` / `RUNS_TEXT_RULES` a typed home.
- **Severity** is a string, ranked by `SEVERITIES.index(...)` arithmetic. Examples: `finding()` downgrades a conditional finding with `SEVERITIES[index - 1]`, and there are `worst`, `max_severity`, `--min-severity` and `judge_report`. An ordered enum would delete that arithmetic. Severity also lives in `charsets.py`, the character-class module, rather than `report.py` beside `Finding`.
- **Locations** are `"command"`, `"configfile:<name>"`, `"tool"` and `"outputs"` strings, parsed with `startswith`. That parsing is in `report.rendered`, `nodes`, `interp.note_reader` and `_mark_unchecked_locations`.

All of these keep JSON identical, because a StrEnum serialises as its string.

## F4. The job-check ledger is woven in through hidden global state (structural; NEEDS-DECISION)

- **The thread-local side channel.** `values.recording()` installs a thread-local callback, and the free function `values.introduced()` reports through it to whichever `TemplateAnalysis` is running. That is generic magic: a reader of `stringify` or `call_python` cannot see that `introduced(...)` mutates analysis state. An explicit `CheckLedger`, passed to the call models (F2) and sinks (F1), makes the data flow visible and deletes `recording()`.
- **The ledger exists only for job-check data.** Seven dicts and sets on `TemplateAnalysis`, plus `_mark_unchecked` and `_judge_rewrite`, feed only:
  - `Finding.unchecked` and `checkable`, which the spec does read;
  - `Report.writes`, `closers`, `rewritten` and `reads`;
  - `Report.rewrites`, which is static and read by the spec. Only the `_judged` / `_not_judged` decision feeds it.
- **The `sources()` protocol.** `sources()` on `Node`, `Group`, `Repeat`, `Value`, `Data` and `Collection`, together with `nodes.dataset_sources` and `Model.sources`, exists only to fill `Report.reads` for not-analysed locations (`__init__.review_tool_source`).

Isolating the ledger is the code-judo move. It turns "keep the job-check data or not" into one object and one module, which is exactly the decision John deferred. Until then, the data is kept as decided.

- **`Source(str)` smuggles a `SourceRef`** through string sets: `AV.sources: frozenset[str]`, recovered with `isinstance(s, Source)` in `source_refs`. The docstring explains this, but `sources: frozenset[Source]` would make the invariant explicit.

## F5. Duplicate tables (canonical home; follow-up)

- **Cheetah-generated names are kept by hand in three places:**
  - `interp.PY_NAMES` / `TEMPLATE_NAMES`;
  - `capabilities._GENERATED_NAMES` / `_GENERATED_SELF`;
  - `known_helpers._GENERATED` / `_LOOKED_UP`.

  `template.py` already owns Cheetah's compiled shape (`NAME_MAPPER`, `NAMESPACE_LOOKUPS`, `BODY_START`), so it is the canonical home.
- **Codecs that keep characters:**
  - `capabilities._KEEPING_CODECS` lists `utf_8` explicitly.
  - `interp.call_bound` normalises `_` to `-` against its own inline tuple.

  They agree today but can drift apart. Move them to one `charsets` helper.
- **`_IDENTIFIER` is defined twice with different patterns:**
  - `judge.py`: `[A-Za-z_]...`
  - `known_helpers.py`: `[A-Za-z]...\Z`

  This one is intentional, but it deserves distinct names.
- **Three "add a capability finding" helpers:** `PythonAudit.add`, plus local `add` closures in `audit_shell_events` and `audit_tool`. One `capability(rule, severity, ...)` factory would do.

## F6. `Report.unanalyzed` is `list[str]` parsed back (type boundary; follow-up)

Notes are written as `f"{location}: {message}"` in 9 places. `_mark_unchecked_locations` then recovers the location with `note.partition(": ")` plus `rendered(location)`. A `Note(location, message)` record, with `to_dict` rendering the same strings, would remove the parse and the dedupe-by-string checks. JSON output stays identical.

## F7. `patterns.pattern_of` re-derives what the audit decided (framing; follow-up)

`PythonAudit.judge` decides, branch by branch, whether an access is:
- `__app__.config` or `security` (server config);
- `__app__.*` (app access);
- `__user__` (user object);
- `creating_job[.tool_id|.tool_version]` (job metadata).

`pattern_of` then splits `finding.expr` on `.` and regex-matches it to recover the same category. That couples patterns to the exact expression formatting in `judge` (`".".join(chain).replace("$.", "$")`).

The clean fix is for the audit to attach the pattern code when it creates the finding. That needs a new `Finding` field, which changes `to_dict`, hence a decision. A cheaper variant: give the rules finer names, e.g. `template-app-config` vs `template-app-access`, which would also change output.

`test_patterns.py` pins the current mapping, so either change is safe to make.

## F8. Smaller framing observations

- `__init__.review_tool_source`:
  - `audit_shell_events` is called in two places, once after the command and once in the configfile shell branch. It could move into `_analyse` when `language == "shell"`.
  - `_include_templates` uses a magic `range(10)` expansion bound without a named constant.

  This is mvdbeek's orchestration, so I left it.
- **`judge_report(min_severity=...)`** is passed only by tests. The CLI always uses the default.
- **The spec runner** mirrors `parameter_specification.yml` and its test without sharing code. That is fine at this size, as `review_port.md` already noted.
- **`MANIFEST.in` lists 39 tool files explicitly**, in dev's style. The new packaging test now catches a missed entry.
- **`test_review.py` / `test_sources.py`** still use different `get_tool_source` import paths (`parser.factory` vs `parser`). This is a nit, left alone.

## Approval bar

- **Framing** (spec, docs generator, patterns, CLI, packaging, tests): passes after this round.
- **Analyser:** presumptive blockers stand, all pre-existing:
  - a new file past 1k lines (`interp.py`);
  - incidental complexity with a visible code-judo path (F2, F4);
  - stringly-typed contracts (F3).

  Recommend that John and mvdbeek decide F1–F4 together with the history squash. F4's ledger isolation is the one that also settles the keep-the-job-check-data question.

</details>
