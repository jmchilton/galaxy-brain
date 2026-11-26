Run via Claude Opus at high effort. **Recommendation: expand (modestly), in John-authored code around the analyser, and leave mvdbeek's analyser as ported.** The port does what was asked: the analyser, spec cases, CLI and docs are in, and nothing runs at job time. mvdbeek's ~7.3k-line analyser, including the 1,972-line `interp.py`, should come over whole. Restructuring it (thermo F1–F4) or stripping its job-check data would break the byte-identical output and pull it away from his unmerged runtime branch. Those stay decisions for John and mvdbeek, and the job-check data stays, since the test-challenge commits now pin it. Two parts of the request fell short, though. (1) **Codes.** Deleting `codes.py` left about 36 bare-string rule ids with no catalog. Add a `Rule` StrEnum with descriptions, mirroring `PatternCode`/`DESCRIPTIONS`. Validate `FindingExpectation.rule` against it and generate a rules section in the docs. Also port the source branch's `_no_plain_value(report)` as a pure `classify(report)`; it already reads only a `Report`. It returns the `uncheckable-*` codes that don't need job values (rewrites, template code, letters-are-code, untraced value), plus unchecked locations, and spec cases get a `codes` expectation. (2) **Offline gaps.** The CLI should take directories through `loader_directory`, report a tool that fails to load instead of aborting the run, print the tool id and version (in the CLI's per-tool entry, not `Report.to_dict()`), and exit 1 with `--fail-on <severity|uncheckable>`. That exit code combines with the child branch's patch-regression exit. Static `stray-quote`/`path-like-name` detection, a toolbox or `tool_conf` walk, a lint adapter and the analyser restructuring are follow-ups. On history, squash the 90 commits (63 mvdbeek, 27 John) into about six commits that keep authorship rather than shipping 84 picks, about 40 of which describe runtime behaviour that is gone. PR splits are laid out under Possible Decompositions, without a recommendation.

## Possible Decompositions

Size vs `origin/dev` (merge-base `ce63095e7a8`, 90 commits, 77 files, +11,540/−12):
- **Analyser:** about 7,300 lines (`lib/galaxy/tool_util/security/*.py`), almost all mvdbeek's, plus John's analyser follow-ups.
- **Spec:** about 990 lines: `cases.yml` (346), the models and runner (114), the docs generator (62), and 39 synthetic tool XMLs.
- **Tests:** about 2,200 lines under `test/unit/tool_util/security/`.
- **Docs:** 963 lines, of which about 900 are generated from `cases.yml`.
- **Other:** about 60 lines: the sanitizer move, `basic.py` import, `mypy.ini`, `MANIFEST.in`, `pyproject.toml` and the rst stubs.

Constraints that apply to every option:
- `tool_patches_static_findings` lands last, on whichever PR carries `review_tool_source` and `__main__.py`.
- The two "Baseline tests:" commits (`01ee2bd184c`, `516aa1eb122`) can't be pulled out first under the workhorse rule, because they test a package that doesn't exist on dev. Whatever the split, they should lose the prefix.
- The sanitizer move (`7ea120eef20`) is a prerequisite of `charsets.py`, so it lands in or before the analyser PR.

**Option A: one PR, history squashed (about 6 commits).**
1. Sanitizer move (mvdbeek).
2. Analyser and its tests (mvdbeek). This folds in the py3.8 add/remove pair, the timeout add/remove pair and the `ANALYSER_VERSION` residue.
3. John's analyser changes as 3–4 topical commits: user preferences, literal rewrites, pipe-to-shell, levels/reads/assignments, and reflection/getVar.
4. Spec, docs, patterns and packaging (John).
5. The recommended codes and CLI expansion (John).
6. Test hardening (the test-challenge and thermo commits).

One review with readable history. Large (~11.5k lines), but most of it is a single cohesive module.

**Option B: sanitizer move first, then everything else.**
1. `ToolParameterSanitizer` to `galaxy.tool_util.parser.sanitize`. About 20 lines plus rst and `mypy.ini`, with no behaviour change. It can land on dev on its own.
2. The rest, shaped as in Option A.

This takes the one change to existing Galaxy code out of the big review.

**Option C: analyser, then spec, docs and CLI.**
1. Sanitizer move, analyser, CLI and unit tests (mvdbeek-led). About 7.4k lines of library code plus about 1.9k of tests.
2. Spec package, cases, docs page, packaging and the codes expansion (John-led). About 1k lines, plus 0.9k generated docs and the spec tests.

This matches authorship to PRs, so each author answers for their own code. But PR 1 ships with no user-facing docs, and the CLI's docs arrive later.

**Option D: Option C with the LLM judge held back.**
- PR 1 drops `judge.py`, `--judge` and `test_judge.py` (~370 lines). Only `__main__` imports `judge`.
- A third PR adds them back.

This isolates the one part a Galaxy reviewer is most likely to question: an optional network/LLM dependency in a core package.

**Option E: three PRs by layer.**
1. Sanitizer move.
2. Analyser and CLI.
3. Spec, docs and the codes expansion, with the judge folded into 2 or held back as in D.

This gives the smallest reviews, but three PRs must merge in order before the child branch can be opened.

Splitting the analyser itself (for example, vulnerabilities apart from `capabilities.py`) is not offered. `__init__.review_tool_source` and `interp` call the capability audit inline, so a split would need the restructuring this branch avoids.

## Scopes considered

### As implemented

The static analyser (mvdbeek's series plus John's follow-ups), the sanitizer move, the spec with 39 cases and tools, the offline CLI and console script, and the docs page. All runtime is stripped. `codes.py` is gone, the job-check data stays in `--json`, and the CLI exits 0.

| Pros | Cons |
|---|---|
| <ul><li>Meets the strip-the-runtime constraint, and the reviewers confirmed it</li><li>Output is byte-identical to the source analyser on 386 tools</li><li>Authorship is preserved commit by commit</li><li>556 tests pass, the spec is packaged, and a test guards the packaging</li></ul> | <ul><li>The request's "codes" became a prose list. There is no rule catalog, and a typo in `cases.yml` is not caught</li><li>The `stray_quote` and `path_like_name` cases describe concepts that no longer have a code</li><li>The CLI can't walk a directory, gives no verdict or exit code, and aborts on one bad tool</li><li>About 40 commit messages describe runtime behaviour that is gone</li></ul> |

### Recommended: catalog codes, a static classification, and closing the offline CLI gaps

Additions, all John-authored. None of them edits mvdbeek's emit sites, so `Report.to_dict()` stays byte-identical.

- `rules.py`: a `Rule` StrEnum with a description for each rule, mirroring `patterns.PatternCode`/`DESCRIPTIONS`.
  - `FindingExpectation.rule` becomes `Rule`.
  - A generated rules section in the docs.
  - Tests: every rule emitted over the spec tools and `test/functional/tools` is in the catalog, and every vulnerability rule has a spec case.
- `classify(report)`: the pure part of the source branch's `_no_plain_value`.
  - It needs no `level` or `when_unsure` parameters.
  - It keeps the source's code strings where the meaning carries over, so the runtime branch could import them.
  - Spec cases get an optional `codes:` expectation.
- CLI changes:
  - directories via `loader_directory`;
  - per-tool load and review errors;
  - tool id and version in the output;
  - `--fail-on`.

| Pros | Cons |
|---|---|
| <ul><li>Delivers "codes" as a static vocabulary and puts back a code on spec cases</li><li>`classify` is about 50 lines that already depend only on `Report` and `report.py` constants. It answers "which tools does the review fail to vet", the question for target discovery and the patch database</li><li>The walk reuses Planemo's walker (`loader_directory.load_tool_sources_from_path`), not new code</li><li>The exit code makes the CLI usable in CI and IUC sweeps, and it matches the child's regression gate</li><li>Fixes the abort-on-one-bad-tool bug in touched code</li></ul> | <ul><li>About 400–500 more lines including tests</li><li>Brings back `REFLECTION_RULE`, which the thermo commit inlined</li><li>`classify`'s "checkable" framing assumes a value-level check that dev doesn't have, so its docs must word it as "findings the review cannot decide from the template"</li><li>Changes `__main__.py`, which the child branch rebases over</li></ul> |

<details><summary>Details</summary>

- **What `codes.py` held.** The 17 `RefusalCode`s fall into three groups:
  - **Rule descriptions** (`shell-injection`, `nested-interpreter`, `configfile-injection`, `path-traversal`, `option-injection`, `argument-injection`). These are static and belong in the rule catalog.
  - **Report-only reasons** (`uncheckable-rewrites`, `-template-code`, `-letters-are-code`, `-untraced-value`, and `-review-failed` as the CLI's load-error code). `_no_plain_value` in `lib/galaxy/tools/security_review.py` on the source branch computes these from `report.rewrites`, `CODE_CAPABILITIES`, `SANITIZE_OFF`, `RUNS_TEXT_RULES`, `serious_findings`, `OPAQUE` and `rendered`, all of which already live in `galaxy.tool_util.security.report`. `NOT_PLAIN_UNCHECKED_PLACE` has a static half: `report.unchecked_locations` is non-empty.
  - **Job-only codes** (`stray-quote`, `path-like-name`, `not-plain-check-error`, `uncheckable-strict-check-error`, `uncheckable-when-unsure`). These are dropped, correctly.
- **Codes left as bare strings.** About 36 rule ids are bare strings today. The vulnerability rules are `shell-injection`, `nested-interpreter`, `configfile-injection`, `command-position`, `variable-name`, `path-traversal`, `option-injection`, `argument-injection` and `server-injection`; the rest are the `template-*`, `tool-*` and `capability-*` capabilities. The spec pins only 11 of them by rule; it pins others through `patterns` and through `test_review.py`.
  - A catalog test can review the spec tools and `test/functional/tools` and assert that every emitted rule is in the catalog. That needs no change to `interp.py`'s literals.
  - Converting the emit sites to the enum is thermo F3. It is left for the analyser decision.
- **Exit codes that compose with the child.**
  - The parent exits 0 by default.
  - It exits 1 when `--fail-on <severity>` is met, when `--fail-on uncheckable` and `classify` returns codes, or when a tool fails to load or review. The failed tool is reported in its entry, with code `uncheckable-review-failed`.
  - The child already exits 1 on a patch regression; that check is ORed in.
  - 2 stays argparse's usage error.
- **Identity.** Use `tool_source.parse_id()`/`parse_version()` in the CLI's per-path entry and in the text header. Leaving `Report.to_dict()` alone keeps the identity check and the child's `PatchReview.to_dict()` stable. A guid isn't knowable offline; the child's `--guid` covers that.
- **`--min-severity` and `--json`** (thermo item 9): JSON stays full. Say so in `--help`, or apply the filter to `findings` only. Either way is small, and the choice belongs with the CLI change.
- **Red-to-green.** Each step has a test that fails first:
  - the catalog test fails on an unknown rule;
  - a `codes:` expectation fails before `classify` exists;
  - a CLI test runs a temp directory holding one good tool and one broken one, asserting both entries and exit 1;
  - `--fail-on high` is checked against `stray_quote.xml`.
- **What happens to `stray_quote` and `path_like_name`.** With the catalog in place, each case should either say what it pins now, or `path_like_name` folds into `element_identifier_shell_injection`. This is the test-challenge decision, and it belongs with this change.

</details>

### Expanded further: static `stray-quote` and `path-like-name` detection

The source refused these per job from `writes`, `closers` and `reads`. A static rule could fire where one value can leave quotes open and another value's harmful characters land after it, or where a name is written as a path or an operand.

| Pros | Cons |
|---|---|
| <ul><li>Brings back the two codes the port lost</li><li>Gives the kept job-check data a static consumer</li></ul> | <ul><li>New detection logic, not a port: it has its own false-positive work, and new spec tools</li><li>It changes analyser output</li><li>The rule semantics should be settled with mvdbeek</li></ul> |

Follow-up.

### Expanded further: toolbox or `tool_conf` walk, and a lint adapter

Review an installed toolbox (`tool_conf.xml`, `shed_tool_conf.xml`, `tools_by_id`), and surface findings through `galaxy.tool_util.lint` for Planemo.

| Pros | Cons |
|---|---|
| <ul><li>Direct target discovery on a real server</li><li>Planemo users get it for free</li></ul> | <ul><li>A toolbox walk needs app-layer loading or conf parsing, which is more than `loader_directory`</li><li>A lint adapter changes lint output for every tool author, and it needs its own design and profile gating</li></ul> |

Follow-up. The directory walk in the recommended scope covers checkout and shed-tree sweeps.

### Expanded further: restructure the analyser (thermo F1–F4)

Split `interp.py` into a walker, call models, sinks and a ledger. Turn `call_python`/`call_bound` into a registry, add StrEnums for `AV.quoted`, rules and severity, and replace the thread-local `recording()` with an explicit ledger.

| Pros | Cons |
|---|---|
| <ul><li>Fixes the real maintainability problems a Galaxy reviewer will see first</li><li>F4 turns "keep the job-check data?" into one module</li></ul> | <ul><li>Rewrites mvdbeek's code without him</li><li>Diverges from his runtime branch, which still has to stack on this</li><li>Loses the byte-identical check as a safety net while it is being done</li><li>Large</li></ul> |

Not in scope. Decide with mvdbeek, together with the history squash.

### Contracted: drop the job-check data from the analyser and `--json`

Remove `writes`, `closers`, `reads`, `rewritten`, and the `Finding` breakout fields and levels, plus the ledger that computes them.

| Pros | Cons |
|---|---|
| <ul><li>Smaller JSON and API surface, with no fields that lack a consumer</li><li>Answers thermo F4 by deletion</li></ul> | <ul><li>Surgery on the thread-local ledger in mvdbeek's `interp.py`</li><li>Changes analyser output</li><li>The runtime branch can no longer stack</li><li>Throws away the test-challenge commits that now pin these fields</li><li>`checkable` and `unchecked_locations` are spec-visible, and they come from the same ledger</li></ul> |

Rejected. Keep the data, and describe the fields in the docs as inputs for a value-level check, as they are now.

### Contracted: drop the LLM judge (`judge.py`, `--judge`)

| Pros | Cons |
|---|---|
| <ul><li>No optional network or Anthropic dependency in `galaxy-tool-util`</li><li>About 370 lines less, and a clean cut: only `__main__` imports it</li></ul> | <ul><li>It is part of mvdbeek's design</li><li>The import is optional and lazy, and the tests use a `RecordingJudge` stand-in</li><li>It is useful for triaging a sweep's findings</li></ul> |

Keep, unless John expects reviewer push-back. Option D above shows the split if so.

### Contracted: analyser only, spec and docs later

| Pros | Cons |
|---|---|
| <ul><li>The first PR is a pure mvdbeek review</li></ul> | <ul><li>Ships with no regression spec or docs</li><li>The request named the spec and docs explicitly</li></ul> |

Rejected as a scope. It survives as Option C's ordering.

### History shape (not a scope size, but asked)

The choice is between keeping 84 picks (90 commits now) and squashing per author.

| Keep 90 picks, reword only | Squash to about 6 commits (Option A) |
|---|---|
| <ul><li>Commit-level provenance against mvdbeek's branch</li><li>No rewrite of how his work is presented</li></ul> | <ul><li>Messages describe only static behaviour</li><li>Removes the add-then-delete pairs: `codes.py`, timeout, py3.8, `ANALYSER_VERSION`</li><li>Removes the false "Baseline tests" prefixes</li><li>`Co-authored-by` trailers keep the credit</li></ul> |
| <ul><li>About 40 messages still describe runtime</li><li>Galaxy reviewers will read a refusal story for code that refuses nothing</li></ul> | <ul><li>Rewrites the presentation of mvdbeek's series. Check with him first</li><li>Loses commit-level bisect inside the analyser</li></ul> |

Squash, after checking with mvdbeek. The plan is in `subagents/review_port.md`, plus one commit for the recommended expansion.

### Smaller items noted by the reviews, folded or deferred

- **Comment-only job-check wording in the analyser** (port review Nit 2, about 20 sites). Fold it into the squash.
- **`level` in `FindingExpectation`** (test challenges). A small model and docs addition. It fits next to the `codes:` expectation if John wants it; otherwise a follow-up.
- **Docs home.** With the runtime gone, the page is a CLI and tool-vetting guide. `admin/` still fits admins vetting tools before installing them. A move to a tool-author or dev section is John's call and doesn't change the scope.
- **Thermo F5–F7** (duplicate Cheetah-name tables, `unanalyzed` as parsed strings, `pattern_of` re-parsing `expr`). These are follow-ups with the analyser decision.
