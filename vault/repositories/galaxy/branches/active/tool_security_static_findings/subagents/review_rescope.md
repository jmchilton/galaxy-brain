# Normal review: rescope commits (92320a751cb..HEAD)

**Acted on in `b885cc7e115`, `b98e32ca591`, `0e21279e7f6`, `79f7da40312`:**

- Bug 1: CLI reviews XML tools only.
  - Directories are walked with `find_possible_tools_from_path(..., enable_beta_formats=True)` and `looks_like_a_tool_xml`, and non-XML files are never loaded.
  - Explicit files are gated on `XmlToolSource`.
  - Non-XML tools get the error entry `not reviewed: only XML tools are analysed` with `uncheckable-review-failed`, and the run exits 1, as a load error does.
  - Over `test/functional/tools`, 26 YAML/CWL tools are listed that way, and no CWL findings remain.
- Bug 2: the CLI JSON adds `uncheckable_locations` (the classified set), and `report.to_dict()` keys are unchanged. The text output prints `NOTE     unchecked <loc>: <why>`.
- Decision 3: added `--fail-on unchecked`, which trips on any classified unchecked location, so templates that were never analysed count. `uncheckable` is unchanged. Both are defined in `--help`, in the docs, and in the generated "Uncheckable codes" intro.
  - Tests cover `search_list.xml`, a template that was never analysed, and `reflection_getattr.xml`, whose only unchecked location is the one classify adds.
  - The `uncheckable-review-failed` description now also covers non-XML tools and empty directories.
- Decision 4:
  - `--help` and the docs say `--fail-on <severity>` counts every finding, capabilities included, and that `--judge` verdicts don't change it.
  - New test: `template_code.xml` with `--fail-on critical` exits 1. This is a pin of existing behaviour.
- Nits:
  - 2: set-equality checks plus an all-truthy check for `Rule` and `Uncheckable`.
  - 3: `tool_id`/`tool_version` are filled in when the review raises after load.
  - 4: a tool reached twice is reviewed once, under its first path, deduped on realpath and documented.
  - 5: a directory with no tools gets the error entry `no tools found` and exits 1.
  - 6: uncheckable code lines moved to the 8-wide `NOTE` column.
  - 7: the spec `codes` validator rejects `uncheckable-review-failed`.
  - 8: `docs.py` imports names from `classify`.
  - 9: moot. The `record` callback is gone, along with `load_tool_sources_from_path`.
- Analyser `to_dict()` dump over spec and functional XML tools: byte-identical (387 tools).
- Tests: 604 pass, against 629 before.
  - The 39 per-member description tests (34 `Rule` + 5 `Uncheckable`) became 2 set checks.
  - 1 spec-validator test was added.
  - 11 CLI cases were added: 10 tests plus 1 `unchecked` parametrize case.
- mypy: 22 errors in 11 files, all outside `galaxy/tool_util/security`. The base `091620b9c1a` has the same count.
- Exit-code decision: non-XML tools exit 1, so mixed directories fail. John may want to revisit this.

**Not acted on:**

- Nit 1 ("Baseline tests" title): this is pending John's squash decision.
- Optional: spec `unchecked_locations` still compares the report's own set, not the classified one. The CLI test pins the classified set instead.
- The names `unchecked_locations`/`uncheckable_locations` and `--fail-on unchecked`/`uncheckable` are a near-collision. They were kept as specified and each is defined in one clause in the docs.

<details><summary>Full review</summary>

Reviewed by a normal review subagent (Claude Opus 5.5) at reasoning effort 15 (low). It reviewed the five rescope commits only: CLI pins, the Rule catalog, classify(), the CLI's directories, load errors and --fail-on, and the stricter catalog test.

**Verdict: approve with fixes.** `classify()` is a faithful static subset of the source's `_no_plain_value`, and the Rule catalog is complete. All 629 tests in `test/unit/tool_util/security` pass. mypy, ruff, black and isort are clean on the changed files, and the generated docs section matches `python -m galaxy.tool_util.security.spec.docs`. Two CLI behaviours mislead and should be fixed before handoff. Two `--fail-on` semantics need a decision or at least clearer wording. The analyser itself is untouched.

## Bugs

1. **Directory walks review YAML and CWL tools, and the reports are wrong.**
   - Location: `lib/galaxy/tool_util/security/__main__.py:122`.
   - Cause: `load_tool_sources_from_path` sets `enable_beta_formats=True`, and the analyser reads only `parse_command()`.
     - YAML `GalaxyTool` files with `shell_command` (all 10 YAML functional test tools) come back with 0 findings, no NOTE and no codes, which reads as clean. For example, `collection_creates_pair_y.yml` prints only its header and exits 0.
     - Every CWL functional test tool gets high `command-position` and `shell-injection` findings plus `uncheckable-letters-are-code`, all from Galaxy's own `$__cwl_command` placeholder.
   - Impact: with `--fail-on high`, any directory holding CWL tools fails, and user-defined YAML tools pass without being looked at. The old CLI took "tool XML files" only.
   - Fix (CLI only, analyser unchanged): walk with `find_possible_tools_from_path(directory, recursive=True, enable_beta_formats=False)` and call `get_tool_source` per file. That keeps the loader_directory reuse and the load-error handling. If non-XML tools should be listed, give each an `error`-style entry such as "not reviewed: only XML tools are analysed". Add a directory test containing a `.yml` tool.

2. **`Classification.unchecked_locations` is computed but never surfaced, and the JSON contradicts the gating the docs describe.**
   - Locations: `classify.py:63`, `__main__.py:91-92`, `__main__.py:153`.
   - Where it goes: only `test_classify.py` reads it. The CLI JSON emits the report's own `unchecked_locations`. Spec cases compare only that same set (`spec/__init__.py:95`). The text output prints neither.
   - Effect: `reflection_getattr`, `getvar_user_name`, `command_position`, `export_name`, `upload.xml`, `config_vars.xml` and every CWL tool show non-empty `codes` next to `unchecked_locations: {}`. But the docs, and the gating itself, say codes appear only where a location is unchecked.
   - Under the "Unused Infrastructure" rule, this new piece needs a real consumer.
   - Fix: add the classified set as an additive JSON key, for example `uncheckable_locations`, so the pinned `report.to_dict()` keys stay as they are. Print it in the text output, for example `  UNCHECKED command: it reads objects by name`. Optionally, make spec `unchecked_locations` mean the classified set, or add a sibling expectation. Otherwise drop the field.

## Decisions / semantics to settle

3. **`--fail-on uncheckable` lets templates through that were never analysed.**
   - Check: `--fail-on uncheckable test/functional/tools/cheetah_problem_syntax_error.xml` exits 0. Only a NOTE line shows. The same holds for `not_analysed_strict` (`search_list.xml`), which has `codes: []`.
   - Why: classify faithfully gates on "not even a runtime check that every value is plain could vet it". This branch has no runtime check, so for an offline CI user, "the review did not analyse the command" is arguably the stronger failure signal.
   - Options:
     - (a) Keep the current behaviour and say in the `--fail-on` help, and in the docs at `tool_security_review.md:22` and in the "Uncheckable codes" intro, that `uncheckable` excludes templates that were not analysed, or that only an all-plain value check could vet.
     - (b) Add a `--fail-on unchecked` choice that trips on any classified unchecked location.
   - Recommendation: (b), combined with fix 2.

4. **`--fail-on <severity>` counts capability findings, not only vulnerabilities.**
   - Location: `__main__.py:93`.
   - Scale in the functional test tools:
     - At `high`, 13 tools fail on capabilities alone (`template-app-access`, `tool-code-file`, `capability-api-key`, ...).
     - At `medium`, 28 tools do (`tool-sanitize-off`, `template-import`, ...).
     - At `low`, `capability-network` trips as well.
   - Judgement: probably the right call, since critical `template-exec` should fail CI, but it is not stated. The help says "a finding", and the docs give the `--fail-on high` example without mentioning capabilities.
   - Fix: say "any finding, vulnerability or capability" in the help and docs. Add one test of a tool that fails only on a capability, for example `template_code.xml` with `--fail-on critical`.
   - Also note: `--judge` verdicts are not taken into account by `--fail-on`. That is fine, but say it.

## classify() fidelity (checked; no action)

These match `d5f7cb05e91:lib/galaxy/tools/security_review.py` (`check_job`, lines 362-377, and `_no_plain_value`, line 751):

- **Gate:** codes appear only when there is an unchecked location. That matches `check_job`, which calls `_cannot_check` only when `unchecked` is non-empty.
- **Unchecked set:** `unchecked_at(CODE)` uses `enforced(f.level, CODE)`, which is `level == CODE`, the same as the port's `f.kind == VULNERABILITY and f.level == CODE and not f.checkable`. The set also takes the report's own unchecked locations, plus rendered `template-reflection` locations.
- **`runs`:** the port takes the union of `RUNS_TEXT_RULES` locations and serious locations that have neither breakout nor closes. Since `serious_findings` is a subset of `report.findings`, this equals the source's single comprehension.
- **Capabilities:** the filter is the same: sanitized `__user__`, and non-rendered reflection excluded.
- **Untraced values:** the same rule.
- **Differences:**
  - The `TEMPLATE_CODE` reason text changed ("the job does not carry" became "no input carries").
  - `REVIEW_FAILED` is now set by the caller instead of being triggered by `report=None`.
  - The check is fixed at the code level, where the source used the configured level. That is documented in the module.

None of these differences is misleading.

## Rule catalog (checked; no action)

All 27 rule literals passed to `add(...)`, `Verdict(...)` (multi-line forms included), `rule=` and `_replace(rule=...)` are in `Rule`. A wider grep over prefixed strings found only `template-code` and `server-config`, and those are `PatternCode` values.

`report.py`'s `CODE_CAPABILITIES`, `RUNS_TEXT_RULES` and `SANITIZE_OFF` are covered by `test_report_rule_sets_are_catalogued`. The duplicated string constants are acceptable, because the analyser has to stay byte-identical.

The `VULNERABILITY_RULES` split agrees with the emitted `kind` across the spec tools and the functional test tools. `server_python_command.xml` is synthetic and fills the `server-injection` spec gap.

## Nits

1. `6b5beb2924b` adds only CLI pin tests, which makes it baseline tests. The workhorse rule wants such commits titled "Baseline tests: ...". Rename it in the planned squash.
2. `test_rules.py:50` and `test_classify.py:61` each run one parametrized `DESCRIPTIONS[x]` truthiness test per member. A single `assert set(DESCRIPTIONS) == set(Rule)` (and the same for `Uncheckable`) is shorter, and also catches stale keys.
3. `__main__.py:78`: when `review_tool_source` raises after the tool source loaded, the entry still says `tool_id`/`tool_version: None`. Fill them in from `tool_source.parse_id()` and `parse_version()` when the source exists.
4. `__main__.py:78/91`: the same file given twice, or a file plus its parent directory, silently overwrites `reports[path]`. Dedupe the paths, or accept this and leave it undocumented.
5. A directory with no tools prints nothing and exits 0. A one-line "no tools found" on stderr would help CI users who mistype a path.
6. `__main__.py:153`: the `UNCHECKABLE` text line breaks the 8-column severity alignment that `ERROR`/`NOTE` keep. This is cosmetic.
7. `spec/__init__.py:64`: `codes: list[Uncheckable]` accepts `uncheckable-review-failed`, which `classify()` never returns. Narrow it, or ignore this.
8. Module `classify.py` exports a function of the same name. `docs.py` uses `from galaxy.tool_util.security import classify` to mean the module, which breaks if `__init__` ever re-exports the function. Import `from galaxy.tool_util.security.classify import DESCRIPTIONS, Uncheckable` instead.
9. In `__main__.py`, `record(path, exc_info: Any)` could take the `OptExcInfo` type instead of `Any`.

## Tests

`source .venv/bin/activate && PYTHONPATH=lib pytest -q test/unit/tool_util/security` gives 629 passed in 15.5s.

The new CLI tests do meaningful red-green work: exit codes, load errors in nested directories, and `--min-severity` versus `--fail-on`. The classify tests pin the gate, the user-object sanitizer exception and the two added reasons. No tests were weakened. Imports are all at module top.

</details>
