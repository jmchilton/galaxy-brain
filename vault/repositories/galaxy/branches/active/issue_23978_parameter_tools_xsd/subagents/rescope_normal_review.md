# Normal review: re-scope (validate every test-tool subdirectory)

Reviewed re-scope commit (`cc77db82608`, amended to `04034197ef7`) on `f66d1f0f97d..HEAD`. No must-fix. Acted on: comment rewrite (said "subdirectories" but glob is one level deep; run-on), narrowed macro exclusion `*macros.xml` → `*/macros.xml | *_macros.xml` (matches repo naming; too-narrow fails loudly, too-broad skips silently), commit message now says `expression_tools/` is symlinked production tools. Re-verified: shellcheck clean, stubbed CI run 431 ok / 0 not ok, exit 0.

Not acted on:
- `test/functional/tools/CLAUDE.md` "all test tools" still slightly overclaims (24 YAML tools aren't XSD-checked) — pre-existing wording; editing triggers whole-file prettier churn.
- Recursive glob (globstar / `find -L`) — no tool sits deeper than one level; would need a `cwl_tools` exclusion. Comment now states the depth.
- PR description line about `expression_tools/` being production tools — no PR description drafted yet; noted for when it is.

<details>
<summary>Full review</summary>

# Re-scope normal review (raw): issue_23978_parameter_tools_xsd

Scope: `f66d1f0f97d..cc77db82608`, focus on `cc77db82608` (glob widened to `"$test_tools_path"/*/*.xml`, exclusion `*/parameters/macros.xml` -> `*macros.xml`). Read-only review, no code changes.

**Verdict: no must-fix. Re-scope is sound and fits the branch.** One should-fix (comment overclaims depth / readability), three nits.

## Verified

- Re-ran validation with stubbed copies of `.ci/validate_test_tools.sh` + `scripts/validate_tools.sh` (common_startup stubbed, worktree `.venv`): **exit 0, 431 `ok`, 0 `not ok`**. 21 nested tools (for_workflows 17, expression_tools 2, deprecated 1, for_tours 1) all in output.
- Glob list identical under `dash` (Ubuntu `/bin/sh`) and `bash` (tox runs `bash .ci/validate_test_tools.sh`): 431 both.
- Excluded set is exactly: 3 `*_conf.xml` + `upload_tool_conf.xml`, `upload.xml`, `expression_tools/expression_macros.xml`, `parameters/macros.xml`. Both macro files have `<macros>` roots; every other nested `.xml` contains `<tool`.
- Symlinked dir `expression_tools -> ../../../tools/expression_tools` is traversed by the glob (POSIX glob follows dir symlinks); git stores it as a symlink (mode 120000) so CI checkout has it. `load_tool` resolves `expression_macros.xml` relative to the symlinked path fine.
- Dot dirs: `.claude/` not matched by `*` (no dotglob in sh/bash); contains only `.md` anyway.
- `data/`, `realtime/` (incl. `realtime/simple/`) have no `.xml` at depth 1, contribute nothing.
- Unmatched-glob behavior: whole `*/*.xml` unmatched would pass the literal pattern -> `load_tool` fails -> exit 1. Fails loud, not silent. Not reachable today (`parameters/` exists).
- Gitignored `test/functional/tools/cwl_tools/` (populated locally by `scripts/update_cwl_conformance_tests.sh`) only has content under `v1.x/` subdirs, so the depth-1 glob doesn't sweep CWL conformance files on dev machines.
- No other CI config lists test-tool dirs for validation: `tox.ini:77-78` just calls the script; `.circleci/config.yml:73-82` just calls tox; `.github/workflows/tool_form_harness.yaml` uses `test/functional/tools/**` as a path trigger only. `sample_tool_conf.xml` is a loader list, not a validation list; it need not agree (e.g. `deprecated/simple_constructs_24_2.xml` isn't in it, it's loaded directly by `test/unit/tool_util/test_test_definition_parsing.py:163`).
- `shellcheck .ci/validate_test_tools.sh`: clean.
- `test/functional/tools/CLAUDE.md:227` "checks all test tools in the directory": now holds for XML tools. Was false for 121 nested tools at the parent tip `f66d1f0f97d`, and for 21 at the pre-re-scope head `ab7999ce965` (410 -> 431). See nit 4 for YAML.
- Precedent for production tools via symlink: top-level glob already validated `export_remote*.xml`, `ucsc_tablebrowser.xml` symlinks before this branch.

## Findings

### Must-fix

None.

### Should-fix

1. **Comment overclaims depth; also a run-on** - `.ci/validate_test_tools.sh:10-12` (glob at :14). Comment says "including those in subdirectories"; glob is `*/*.xml`, one level only. Failure scenario: someone adds `test/functional/tools/parameters/collections/gx_foo.xml` (or `for_workflows/sub/x.xml`); it is silently never XSD-validated, and the comment tells readers it is. Same class of bug as #23978, one level down. The comment is also a run-on ("except *_conf.xml and *macros.xml (not tools) and upload.xml, which uses ..."; "(not tools)" binding ambiguous). One replacement covers both:
   ```sh
   # XSD-validate every test tool at the top level and one subdirectory down.
   # Skip *_conf.xml and *macros.xml (not tools) and upload.xml (its
   # param-less conditional is not XSD-valid).
   ```
   Recursing (bash `globstar` / `find -L ... -name '*.xml'`) would need an explicit `cwl_tools` prune and changes the portability story; not worth it while no tool sits deeper than one level.

### Nits

2. **`*macros.xml` is wider than Galaxy's naming convention** - `.ci/validate_test_tools.sh:16`. Matches any basename ending `macros.xml`, e.g. a tool `gx_text_nomacros.xml` or `test_macros.xml` would be silently skipped. Repo-wide `git ls-files '*macros.xml'` shows only `macros.xml` and `*_macros.xml` names (`tools/maf/macros.xml`, `model_operation_macros.xml`, `expression_macros.xml`, `parameters/macros.xml`). `*/macros.xml | *_macros.xml` matches convention and cannot hide `nomacros.xml`. Asymmetry worth noting: too narrow fails loud (a `<macros>` root fails XSD -> exit 1), too broad fails silent, so erring narrow is the safer direction. Low probability either way.
3. **CLAUDE.md "all test tools"** - `test/functional/tools/CLAUDE.md:227`. 24 YAML test tools (`*.yml`, top-level + nested) are not XSD-checked by this job (can't be). Pre-existing wording, out of scope; leave unless touching the file.
4. **Production-tool gating not mentioned in commit/PR text** - commit message of `cc77db82608` / PR description lists `expression_tools/` among "21 tools" without saying they are production `tools/expression_tools/` via symlink. Effect: an edit to `tools/expression_tools/pick_value.xml` can now turn the `validate_test_tools` CircleCI job red. That's desirable (follows the top-level-symlink precedent) but a reviewer should hear it from the PR description, not discover it. Put one line in the PR description.

## Process note for coordinator

BRANCH_DIRECTORY docs `test_challenges_debrief.md`, `thermo_nuclear_review.md`, `codex_review.md`, `baseline_refactor.md`, `initial_implementation_debrief.md` cite 410 tools / `parameters/*.xml` / `*/parameters/macros.xml`. Expected to be archived by Re-harden; `implementation_rescope_debrief.md` not written yet.

## Fit with the rest of the branch

- `977e2f3971a` (path fix, fail fast, glob + `case`) is what made the re-scope a 2-token change; the `set --` / `case` idiom extends cleanly.
- `8dcdee07d4b` + `ab7999ce965` unaffected; no tool edits needed for the 21 newly covered tools.
- Re-scope addresses the root cause named in the issue (hand-maintained directory list) rather than adding one more entry. Agrees with `scope_evaluation.md` §2.
- With every subdirectory gated, a future deliberately XSD-invalid fixture needs an explicit case arm wherever it lives. Consistent with the issue's no-exclude-list stance. (`deprecated/simple_constructs_24_2.xml` says its test cases "should be invalid" - test-case semantics, not XSD; it validates.)
- Nothing serious found elsewhere in `f66d1f0f97d..HEAD`. XSD `rules` enum + docs and the linter expected-string change look right (expected-string extends a hardcoded enum set; not a weakening).

</details>
