# Review: Marius follow-up PR #11 for upstream #1706

- Reviewed 2026-10-11.
- Follow-up: https://github.com/jmchilton/planemo/pull/11
- Upstream feature: https://github.com/galaxyproject/planemo/pull/1706
- Reviewed head: `558441af9da33b2984654c2b8f65dcb9a9b5e863`.
- First parent / original feature head: `e13921592cdfa6e7203bcc868da1210cec88f6e6`.
- Merged master parent: `48725d692ee3371ace6a042b70ec3dc84a3b0ba6` (upstream #1729 merge).
- Recommendation: **approve and merge #11 into `modern-linters-rebased`**. No ordinary blocking findings in the follow-up. Coordinator handles remote mutation and records actual merge/push status.

## What was verified

Marius is right about the legacy skip regression. `requirements_in_conda` and `tool_urls` are accepted skip names but, on the original feature head, do not match the new class names or module names. The follow-up expands each legacy name into all locally defined `Linter` subclasses in its replacement module, preserving old skip lists and skip files. It also accepts the modern `doi`, `urls`, and `conda_requirements` module names. The expansion excludes imported base classes and unrelated classes.

The merge resolution retains one definition each of `lint_doi_option()` and `lint_conda_requirements_option()` from upstream #1729. Both CLI commands compose those helpers through `lint_planemo_defined_tool_linters_options()`. Runtime inspection found exactly one occurrence of each DOI, Conda, URL, and BioContainer option/alias per command; help generation and DOI forwarding through `shed_lint --tools` pass.

The first-parent diff is large because master was merged. Of its 41 changed files, 37 match the master parent byte-for-byte. The four exceptions (`planemo/lint.py`, `planemo/options.py`, `planemo/shed_lint.py`, `tests/test_lint.py`) preserve the original linter feature or contain the intended alias/option reconciliation. Existing original-feature command/linters files remain present even where they do not appear in the first-parent diff. The unrelated merged CI, docs, CI-selection, Galaxy configuration, run-error, metadata, and training changes were not treated as new follow-up changes.

## Validation

Used the existing `/Users/jxc755/projects/repositories/planemo/.venv/bin/python` (Python 3.12.12), with `PYTHONPATH=$PWD`, from isolated checkout `/tmp/planemo-marius-oct11/pr-11`; no original feature worktree edits or test weakening.

- Full focused suite: `tests/test_lint.py tests/test_planemo_linters.py tests/test_shed_lint.py` → **31 passed, 6 skipped**. `PLANEMO_SKIP_SLOW_TESTS=1`; an external `responses` context returned an empty Tool Shed repository search and 404 DOI responses for tests lacking their own mocks, with no passthrough network. Existing DOI-specific tests retain their own declared mocked response behavior. This validates local behavior, not live Tool Shed/version comparison or external service availability.
- Supplementary external CLI harness → **38 checks passed**: option uniqueness and help; failing optional-linter baselines; direct `--skip` and `--skip_file` suppression for legacy Conda/URL names and module DOI/Conda/URL/BioContainer names across both `lint` and `shed_lint --tools`. All external linter lookups were mocked; skipped linters made no mocked lookups.
- Mutation check: temporarily replaced `_expand_legacy_skip_types` with an identity function via `mock.patch`; the new CLI regression test fails at `-s requirements_in_conda`, proving it detects the repaired regression. The patch was process-local and did not change files.
- Flake8, Black check, isort check, and `git diff --check` pass on the five directly affected alias/option/test files. Ruff is unavailable in this existing virtualenv, so its claimed author-side result was not independently rerun. `pytest-timeout` is also absent; the successful runs did not use that plugin.

## Decisions / follow-ups for John

These do not block the follow-up merge:

1. **Release notes for upstream #1706.** Marius notes that class-based checks change message grouping and text, including “Conda”/best-practice-channel wording and `doi.org` rather than `dx.doi`. Add a HISTORY entry before releasing this feature so consumers grepping lint output know about it. Follow-up #11 currently includes only already-merged master HISTORY additions, not a modernization entry.
2. **Public helper compatibility.** Upstream #1706 removes `planemo.lint.lint_dois`, `is_doi`, and `find_dois_for_xml`. Decide whether these unsupported-but-importable functions merit deprecated forwarding shims or whether a release-note migration notice is sufficient. This is an original-feature API compatibility decision, not a new #11 regression.
3. **Multiple `<citations>` blocks.** The modern DOI implementation checks the first block rather than all blocks. Multiple blocks are invalid according to the tool XSD, so retaining this behavior is reasonable; explicitly accept it unless compatibility with invalid tool XML is required. No expansion of #11 needed.
4. **Existing global `lint_skip` fallback bug.** Supplementary CLI testing found that a global config with `lint_skip: [requirements_in_conda]` still performs the Conda check when no CLI `--skip` is supplied. `build_lint_args` uses `kwds.get("skip", ctx.global_config.get("lint_skip"))`; Click supplies `skip=None`, so `.get` never uses its default. The expression is unchanged on the original feature parent, so this is pre-existing and should not block #11. A follow-up should select the global config when `skip is None`, retain explicit CLI override precedence, and cover legacy/module names from config in both CLI commands. Direct CLI and skip-file behavior is verified above.

## Coordinator outcome

Companion #11 merged into modern-linters-rebased as 238247f5e2305db613d84e6b5254560e00bac5fe. Focused suite: 31 passed/6 expected skips; 38 supplementary CLI checks passed.
