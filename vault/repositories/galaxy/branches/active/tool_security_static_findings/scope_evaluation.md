Run via Claude Opus at high effort. **Recommendation: keep the scope as implemented.** This is the second evaluation. The re-scope delivered every item the first one approved (`earlier_drafts/1/scope_evaluation.md`), and went a little further with `--fail-on unchecked` and XML-only gating. The approved items were a `Rule` catalog with typed spec rules and a generated docs section, a pure `classify(report)` with spec `codes`, and the CLI work: directory walks, per-tool load errors, tool id and version, and `--fail-on`. No review since the re-scope raised a capability or use case beyond that scope. Everything still open is one of three things: (a) unfinished in-scope work that is John's call, namely whether spec cases also pin `classify`'s set (`uncheckable_locations`), and whether `path_like_name` folds into `element_identifier_shell_injection`; (b) behaviour decisions, namely non-XML tools exiting 1, the `unchecked`/`uncheckable` naming, and `--judge` not affecting `--fail-on`; or (c) changes to mvdbeek's analyser. The analyser exclusion has held through both evaluations and still holds: the byte-identical `to_dict()` and his unmerged runtime branch stacking on this one. That rules out `Rule` at the emit sites, the `interp.py` split, dropping the job-check data, real YAML review and static `stray-quote` detection. The toolbox walk and the lint adapter stay follow-ups, as before. Any other recommendation here would park the branch as BLOCKED rather than re-scope it. Nothing on the list earns that. The history choice (squash or reword) is a PR-shape decision and is listed under Possible Decompositions, not here.

## Possible Decompositions

Size vs `origin/dev` (merge-base `ce63095e7a8`): 101 commits (63 mvdbeek, 38 John), 83 files, +12,690/−12.
- **Analyser:** about 6,970 lines, mvdbeek's series plus John's analyser follow-ups. `judge.py` is not counted here.
- **Judge:** about 370 lines (`judge.py` and `test_judge.py`).
- **CLI, catalog, classify:** about 570 lines (`__main__.py`, `rules.py`, `classify.py`).
- **Spec:** about 640 lines of models, runner, docs generator and `cases.yml`, plus about 480 lines of synthetic spec tools (40).
- **Tests:** about 2,360 lines under `test/unit/tool_util/security/`.
- **Docs:** about 1,250 lines, of which about 1,180 are generated.
- **Other:** about 50 lines: the sanitizer move, the `basic.py` import, `mypy.ini`, `MANIFEST.in`, `pyproject.toml` and the rst stubs.

Constraints that apply to every option:
- **The child branch.** `tool_patches_static_findings` lands last, on whichever PR carries `review_tool_source` and `__main__.py`.
  - The local child already contains this branch's head (`d4ae281e442`). The pushed child is the older one, from before the re-scope.
  - Its patch-regression exit has to be ORed into the `FailOn`/`Reviewed` structure of the rewritten `__main__.py`.
- **The sanitizer move** (`ToolParameterSanitizer` to `galaxy.tool_util.parser.sanitize`) lands in or before the analyser PR, because `charsets.py` imports it.
- **History (PR shape, John's decision).**
  - Keep the picks and reword them, or squash per author with `Co-authored-by` trailers.
  - Either way, the two cherry-picked "Baseline tests:" commits lose that prefix. They test a package dev doesn't have.
  - `6b5beb2924b` (CLI pins) is the only commit that really is a baseline, and only relative to `92320a751cb`.

**Option A: one PR.** Everything, with the history shaped however John decides. It is one review of a cohesive module, at about 12.7k lines, about 1.2k of them generated docs.

**Option B: sanitizer move first, then the rest.**
1. The sanitizer move, about 20 lines with no behaviour change. It can land on dev alone.
2. Everything else, as in A.

This takes the only edit to existing Galaxy code out of the big review.

**Option C: the port, then the re-scope.** This cut is new since the first evaluation.
1. Up to `92320a751cb` (the `_alt_original_scope` head): the sanitizer move, analyser, spec cases, the original files-only CLI that exits 0, and the docs.
2. `92320a751cb..d4ae281e442`, +1,214/−64: the CLI pins, the `Rule` catalog, `classify` and spec `codes`, the CLI's directories, errors and `--fail-on`, the test challenges and the thermo split. It is all John's.

Each PR has one theme: "port of the static review", then "make it a usable offline gate". PR 2 is small and reviewable alone. The cost is that PR 1 ships a CLI that PR 2 changes at once: the JSON envelope gains keys, and the exit codes change.

**Option D: analyser, then spec, docs and CLI.**
1. The sanitizer move, the analyser, the judge, a minimal CLI and the analyser unit tests (mvdbeek-led): about 7.3k lines of library code and about 2k of tests.
2. The spec package and cases, `rules.py`, `classify.py`, the CLI rework, the docs page and packaging (John-led): about 1.7k lines plus about 1.2k of generated docs.

Authorship matches the PRs. But PR 1 has no user-facing docs, and its CLI changes in PR 2.

**Option E: Option D with the LLM judge held back.**
- PR 1 drops `judge.py`, `--judge` and `test_judge.py` (about 370 lines). Only `__main__` imports `judge`.
- A third PR adds them back.

This isolates the optional network/LLM dependency, the part a Galaxy reviewer is most likely to question.

**Option F: three PRs by layer.**
1. The sanitizer move.
2. The analyser, with the judge or without it, as in E.
3. The spec, catalog, classify, CLI and docs.

These are the smallest reviews, but three PRs must merge in order before the child can open.

Splitting inside the analyser (for example, the capability audit apart from the vulnerability analysis) is still not offered. `review_tool_source` runs both inline, so a split would need the restructuring this branch avoids.

## Scopes considered

### As implemented (recommended)

The branch holds:
- the static analyser (mvdbeek's series plus John's follow-ups) and the sanitizer move;
- 40 synthetic spec cases and tools;
- the `Rule` catalog and `classify(report)`, with uncheckable codes;
- the offline CLI and the `galaxy-tool-security-review` console script, which walks directories, records per-tool errors, reviews XML only and has `--fail-on <severity|uncheckable|unchecked>`;
- a docs page with generated cases, rules and codes sections.

All runtime is stripped, and analyser output is byte-identical to the source over 387 tools.

| Pros | Cons |
|---|---|
| <ul><li>Covers the original request and the whole first-round expansion</li><li>"Codes" is a typed, documented vocabulary, and a typo in `cases.yml` fails to load</li><li>The CLI works as a CI or sweep gate, and its exit code composes with the child's</li><li>Authorship is kept, and mvdbeek's analyser is untouched, so his runtime branch can still stack</li><li>589–590 tests pass; the CLI output and the generated docs are pinned by oracle and freshness checks</li></ul> | <ul><li>About 12.7k lines in one branch (see the decompositions)</li><li>`classify`'s set is pinned by CLI tests, not by spec cases</li><li>Rule names exist as both `Rule` and bare strings in the analyser and in `report.py`'s sets (a test keeps them in sync)</li><li>The "unchecked" and "uncheckable" names are close</li><li>Non-XML tools make a run exit 1</li></ul> |

<details><summary>Details</summary>

- **What the re-scope delivered, against the first evaluation's list:**
  - The `Rule` catalog, with `FindingExpectation.rule` typed: done (`7badc4ede48`).
  - A generated rules section: done.
  - A `server-injection` spec case: done (`server_python_command.xml`).
  - `classify` and spec `codes`: done (`9922001d901`); about 18 cases carry a `codes` expectation.
  - Directory walk, load errors, id and version, and `--fail-on`: done (`4daf7ef43ca` onwards).
  - Beyond the list: XML-only gating (fixing a review bug), `--fail-on unchecked`, the `uncheckable_locations` JSON key, realpath dedupe, and a "no tools found" error.
- **Changes since then were hardening, not scope:**
  - The test-challenge commit `e067cc3dd2a` added `ReviewExpectation.rules` and stricter catalog, classify and spec checks.
  - The thermo commit `d4ae281e442` split `main()` into `FailOn`, `Reviewed` and `NotReviewed`, made `classify` reuse `access_patterns()`, and validated the spec's `severity`.
  - Neither changed the CLI's output or the generated docs.

</details>

### Residual in-scope polish: the spec pins `classify`'s set, and `path_like_name` is settled

Two small John-side items, both in code the branch already touches.
- **Spec expectation.** Add an `uncheckable_locations` expectation beside `unchecked_locations`, or redefine the latter as the classified set, so the spec pins everything the CLI reports.
- **`path_like_name`.** Fold it into `element_identifier_shell_injection`, or rewrite its `doc` to say what it pins that the other case doesn't.

| Pros | Cons |
|---|---|
| <ul><li>The spec would then cover `classify`'s whole output, not just its codes</li><li>Each is a few lines of spec model plus a few `cases.yml` entries</li><li>The first evaluation already put the `path_like_name` call inside the expansion, so this would finish it, not widen it</li></ul> | <ul><li>Neither adds a capability. Today the CLI tests pin the classified set</li><li>Redefining `unchecked_locations` changes the meaning of an existing expectation, while adding a sibling adds another near-twin name</li><li>Both reviews already left these as decisions for John</li></ul> |

This doesn't count as a scope change. It is a decision John can take or decline at handoff, with no re-scope. If he takes it, the sibling expectation is the safer form.

### Behaviour decisions inside the scope (not scope changes)

- **Non-XML tools.** They exit 1, so a run over a mixed directory fails. The alternative is to list them as "not reviewed" and exit 0 unless `--fail-on` says otherwise.
- **Naming.** `unchecked` vs `uncheckable`, for both the `--fail-on` choices and the JSON keys.
- **`--judge` and `--fail-on`.** Should a "not real" judge verdict exclude a finding from `--fail-on <severity>`? It doesn't now, and the docs say so. An LLM-dependent CI gate is nondeterministic, so the current choice is defensible.

| Pros | Cons |
|---|---|
| <ul><li>Each is a one- or two-line change in `__main__.py` and its docs and tests</li></ul> | <ul><li>None changes the scope, only the defaults</li><li>Exit-code changes also move the child's composed exit</li></ul> |

These are listed for John at handoff.

### Expanded: use `Rule` at the analyser's emit sites and in `report.py`'s rule sets (thermo NEEDS-DECISION 1)

Replace the bare strings in `self.add("...")`, `Verdict(...)`, `CODE_CAPABILITIES`, `RUNS_TEXT_RULES` and `SANITIZE_OFF` with `Rule` members.

| Pros | Cons |
|---|---|
| <ul><li>One vocabulary, so `test_report_rule_sets_are_catalogued` can go</li><li>JSON is unchanged, since `Rule` is a `StrEnum`</li></ul> | <ul><li>It touches every emitter in mvdbeek's analyser and diverges from his runtime branch</li><li>`accessor` constants raise the same question, and it grows from there</li></ul> |

Excluded by the analyser rule. Do it with mvdbeek, together with thermo items 2–7 (the `interp.py` split, the call-model registry, the `recording()` ledger, typed `unanalyzed` notes, the pattern on the finding, and the shared Cheetah name tables).

### Expanded: review YAML tools

Analyse the Cheetah `command` of YAML tools, instead of listing them as not reviewed.

| Pros | Cons |
|---|---|
| <ul><li>The CLI's "not reviewed" category gets smaller</li></ul> | <ul><li>The analyser reads XML template structure and configfiles. The review found that YAML/CWL sources gave reports that misled, so they were gated out</li><li>It is new analysis work in mvdbeek's code, with its own spec cases</li><li>Few deployed tools are YAML. User-defined YAML tools have a separate trust model</li></ul> |

Follow-up.

### Expanded: static `stray-quote` and `path-like-name` rules

The same as in `earlier_drafts/1`: new detection over the kept `writes`, `closers` and `reads` data.

| Pros | Cons |
|---|---|
| <ul><li>Brings back two codes the port lost</li><li>Gives the kept job-check data a static consumer</li></ul> | <ul><li>New detection logic, not a port, with its own false-positive work</li><li>It changes analyser output</li><li>Its semantics should be settled with mvdbeek</li></ul> |

Follow-up, unchanged.

### Expanded: toolbox / `tool_conf` walk, and a lint adapter

The same as in `earlier_drafts/1`.

| Pros | Cons |
|---|---|
| <ul><li>Direct target discovery on a real server</li><li>Planemo users would get the findings in lint</li></ul> | <ul><li>A toolbox walk needs conf parsing and `tool_path` resolution beyond `loader_directory`</li><li>Lint changes output for every tool author and needs profile gating</li></ul> |

Follow-up, unchanged. The directory walk covers checkout and shed-tree sweeps.

### Contracted: back to the original scope (`_alt_original_scope`)

Drop the re-scope: the catalog, `classify`, the CLI rework and `--fail-on`.

| Pros | Cons |
|---|---|
| <ul><li>About 1.2k fewer lines</li><li>The CLI and docs end exactly where the port did</li></ul> | <ul><li>Brings back the gaps the first evaluation found: no codes vocabulary, an abort on one bad tool, no exit code, and YAML/CWL reports that mislead</li><li>The child's regression exit loses the gate it composes with</li></ul> |

Rejected. It survives as Option C's first PR, if John wants that split.

### Contracted: drop the job-check data, or drop the LLM judge

The same as in `earlier_drafts/1`.

| Pros | Cons |
|---|---|
| <ul><li>Smaller JSON, or no optional network dependency</li></ul> | <ul><li>Dropping the job-check data is surgery on mvdbeek's ledger, and the test challenges now pin those fields</li><li>The judge is part of his design. Its import is lazy and optional</li></ul> |

Both rejected again. The judge split is available as Option E.

### Smaller items carried forward

- **`FindingExpectation.level`.** Optional, and not added. It would sit beside `codes` if John wants it.
- **The `test_review.py` subset checks.** They stay as they are; they are mvdbeek's tests.
- **The docs home** (`admin/` or a tool-author section). John's call, with no scope impact.
- **About 20 "job check" comments in the analyser.** Fold them into whichever history shape John picks.
