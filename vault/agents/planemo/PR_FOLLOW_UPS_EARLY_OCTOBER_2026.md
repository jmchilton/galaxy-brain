# Planemo PR follow-ups — early October 2026

Sweep completed 2026-10-11. Scope: Marius (`mvdbeek`) reviews posted October 10 and 13 companion PRs against `jmchilton/planemo`. Companion merges update John’s feature branches and therefore the existing upstream PRs; they do not merge those upstream PRs into `galaxyproject/planemo/master`.

## Companion fix status

| Fix PR | Upstream PR | Branch | Status |
| --- | --- | --- | --- |
| [#4](https://github.com/jmchilton/planemo/pull/4) | [#1703](https://github.com/galaxyproject/planemo/pull/1703) | `list-all-invocations-rebased` | Merged #4 `5c4a6defd60b5`; 9 passes + filtered/unfiltered raw JSON/stderr probes |
| [#5](https://github.com/jmchilton/planemo/pull/5) | [#1733](https://github.com/galaxyproject/planemo/pull/1733) | `publish-planemo-cli` | Merged #5 `bc6e1a7bbe19`; Makefile/source/lock checks pass |
| [#6](https://github.com/jmchilton/planemo/pull/6) | [#1710](https://github.com/galaxyproject/planemo/pull/1710) | `shed-lint-fail-fast` | Merged #6 `cac00fc00b18`; 23 passes/7 skips + 2 sibling CLI probes |
| [#7](https://github.com/jmchilton/planemo/pull/7) | [#1700](https://github.com/galaxyproject/planemo/pull/1700) | `anonymous-external-galaxy-api` | Merged #7 `b6f5af76209b`; 9 focused passes |
| [#8](https://github.com/jmchilton/planemo/pull/8) | [#1725](https://github.com/galaxyproject/planemo/pull/1725) | `test-data-option-fix` | Merged #8 `c95fd681c979`; 48 passes/3 skips + 6 client/config probes; managed-Galaxy CI pending |
| [#9](https://github.com/jmchilton/planemo/pull/9) | [#1709](https://github.com/galaxyproject/planemo/pull/1709) | `python-gc-doc-example` | Merged #9; XML requirement/script smoke checks pass; base/head lint findings unchanged |
| [#10](https://github.com/jmchilton/planemo/pull/10) | [#1723](https://github.com/galaxyproject/planemo/pull/1723) | `collection-output-assertions` | Merged #10 `0f99b440bcb7`; correction pushed `b7567c0e1818`; 12 passes each on tool-util 25.1/26.0.1/26.1 |
| [#11](https://github.com/jmchilton/planemo/pull/11) | [#1706](https://github.com/galaxyproject/planemo/pull/1706) | `modern-linters-rebased` | Merged #11 `238247f5e230`; 31 passes/6 expected skips + 38 CLI checks |
| [#12](https://github.com/jmchilton/planemo/pull/12) | [#1726](https://github.com/galaxyproject/planemo/pull/1726) | `skip-tests-when-external-services-down` | Merged #12 `8b63b8cc8c08`; 8 online passes; offline 3 passes/5 expected skips |
| [#13](https://github.com/jmchilton/planemo/pull/13) | [#1704](https://github.com/galaxyproject/planemo/pull/1704) | `pin-supported-galaxy-python-rebased` | Merged #13 `c38e6c179149`; 15 focused tests + 7 probes passed |
| [#14](https://github.com/jmchilton/planemo/pull/14) | [#1714](https://github.com/galaxyproject/planemo/pull/1714) | `config-option-conversion` | Merged #14; 35 tests passed; merge `6a9c35a56c1e` |
| [#15](https://github.com/jmchilton/planemo/pull/15) | [#1707](https://github.com/galaxyproject/planemo/pull/1707) | `test-job-files-in-tmpdir` | URI fix committed/pushed `f87c2c58e457`; 18 engine tests passed; #15 left open because its >=3.14 skip weakens coverage |
| [#16](https://github.com/jmchilton/planemo/pull/16) | [#1724](https://github.com/galaxyproject/planemo/pull/1724) | `sanitize-invocation-test-data-paths` | Merged #16; 23 tests + supplemental output checks passed; merge `4ba96f396f0a` |

Twelve companion PRs were merged into their feature branches. For #15, the URI correction was committed and pushed separately while preserving the original secondary-file integration tests. A further source correction for #10 was pushed after testing against Galaxy tool-util 25.1, 26.0.1, and 26.1. No upstream PR was merged into master during this sweep.

## Decisions and follow-ups

### [#1733: Publish pinned planemo-cli in parallel to planemo](https://github.com/galaxyproject/planemo/pull/1733)

Source: Marius’s review submitted 2026-10-10T12:27:00Z on the linked PR; reviewed parent `2401396b00e4f7b5a4ddf6d05ef90985a601f504`.

**John’s decision/status (2026-10-11):** [John’s reply](https://github.com/galaxyproject/planemo/pull/1733#issuecomment-6111222352) confirms the pending PyPI trusted publisher was configured before opening the PR, keeps the submitted `planemo-cli` naming, and leaves remaining publishing details for after merge. This is back with reviewers; naming is no longer a pending decision. **Before first release:** verify the publisher is still pending/valid and ready for the first tag; its lifetime was not checked against John’s PyPI account. The existing upload order publishes `planemo-*` before `planemo_cli-*`, so an invalid publisher can leave a half-published release; `skip-existing` helps recovery. **Docs:** recommend a supported Python explicitly for pinned installs (e.g. `uv tool install --python 3.13 planemo-cli`) because future interpreters may lack wheels for exact pins.

Branch: [publish-planemo-cli](https://github.com/jmchilton/planemo/tree/publish-planemo-cli).

### [#1726: Skip tests relying on quay.io, the Tool Sheds, Dockstore and usegalaxy.eu when they are down](https://github.com/galaxyproject/planemo/pull/1726)

Source: Marius’s review submitted 2026-10-10T12:27:22Z on the linked PR; reviewed parent `ba91257527413d829d0f97b0b20ff899358284d0`.

**Follow-up:** the Quay availability decorator probes its homepage, while the original failure was a Quay API read timeout. Decide whether to probe the actual API endpoint; a live homepage does not prove the API works. **Dependency cleanup:** local site-probe helpers are a stopgap until the required Galaxy `unavailable_pattern` support is in the pinned `galaxy-util`; replace them after that release without dropping offline test coverage. **Optional test isolation:** version-comparison tests still invoke tool-ID validation first and can wait for network failures; isolate that unrelated lookup so the offline comparison tests stay fast.

Branch: [skip-tests-when-external-services-down](https://github.com/jmchilton/planemo/tree/skip-tests-when-external-services-down).

### [#1725: Make --test_data resolve tool test inputs](https://github.com/galaxyproject/planemo/pull/1725)

Source: Marius’s review submitted 2026-10-10T12:27:15Z on the linked PR; reviewed parent `72eb17b232c961aa31574a56118f6b3575199154`.

**PR description follow-up:** rewrite #1725 around the final client-only change; it still describes the now-reverted server override. **Validation:** the fix restores the old server config and keeps client-side `test_data` fallback. Managed-Galaxy `test_test_data_option` needs CI confirmation; local code review alone is not an end-to-end run. Also verify a tool using stock Galaxy data such as `1.bed` still resolves without `--test_data`.

Branch: [test-data-option-fix](https://github.com/jmchilton/planemo/tree/test-data-option-fix).

### [#1724: Sanitize invocation labels used as filenames](https://github.com/galaxyproject/planemo/pull/1724)

Source: Marius’s review submitted 2026-10-10T12:32:00Z on the linked PR; reviewed parent `393bbfaf2eb94eb6089b258069713c67d788e100`.

**Correctness follow-up:** unique-name allocation currently has separate scopes for job inputs and expected outputs. `workflow_test_init --from_invocation` builds both, so collisions across those scopes can still overwrite data. Decide whether to share one allocator across the whole generation operation; add coverage combining an input dataset and output collection/dataset whose names sanitize identically. **Existing behavior:** `_job_outputs_template_from_invocation` sends `definition_style="outputs"`, whereas the element helper’s truncation branch checks `"output"`; decide the intended output-stub cardinality before changing this. **Docs/HISTORY:** filename changes affect `workflow_job_init --from_invocation` as well as `workflow_test_init`, and sanitization also rewrites `: * ? " < > |`. **Integration coverage:** invocation end-to-end coverage is skipped under #1721; restore after its dependency is repaired.

Branch: [sanitize-invocation-test-data-paths](https://github.com/jmchilton/planemo/tree/sanitize-invocation-test-data-paths).

### [#1723: Fix silently skipped collection output assertions in workflow tests](https://github.com/galaxyproject/planemo/pull/1723)

Source: Marius’s review submitted 2026-10-10T12:27:16Z on the linked PR; reviewed parent `d7dc4ec9cd083a1a36ab567d26d4f57044aac1b5`.

**Completed compatibility correction:** Marius’s new dataset-vs-collection test failed with tool-util 26.1 because its diagnostic changed. Commit `b7567c0e181853b2ca1704381a1e2a36dd3a6c53` validates the collection shape before Galaxy verification, preserving existing assertions and avoiding a broad catch that could mislabel nested KeyErrors. **Release note:** workflow test assertions for collection type/element count now actually run, so incorrect tests that previously passed silently can fail (including IWC). This is the intended correctness change, but should be called out before release.

**IWC checked (2026-10-11):** audited current main `ba4db4f579cb43fe96c08fa16292dd46048e0d53`, using Planemo’s real test loader: 127 workflows, 145 cases, 802 output expectations, 247 collections. No output changes checker selection or parsed type/count/element assertions under #1723, so the specific previously-silent assertion concern does not affect current IWC. This was a definition compatibility audit, not a scientific workflow rerun. **Separate coverage follow-up:** five outputs across average-bigwig, fastq-to-matrix-10x-v3, and fastq-to-matrix-10x-cellplex put the type under `attributes.collection_type`, which both parsers ignore. Normalize to top-level `collection_type` (or `attributes.type`) in a separate IWC change and validate those three workflows against real outputs. [Full audit, exact outputs and reproduction](../../repositories/planemo/reviews/active/1723/iwc_compatibility_2026-10-11.md).

Branch: [collection-output-assertions](https://github.com/jmchilton/planemo/tree/collection-output-assertions).

### [#1714: Apply Click conversion to configured option values](https://github.com/galaxyproject/planemo/pull/1714)

Source: Marius’s review submitted 2026-10-10T12:30:18Z on the linked PR; reviewed parent `a9162611cac9b593e9cc7f8d88b8a3ee536c6396`.

**Broader design follow-up:** [#1739](https://github.com/galaxyproject/planemo/issues/1739) records the researched gaps remaining after this conversion fix; use existing Click option definitions for whole-file config linting and define safe profile callback validation.

**Release notes/PR description:** configured paths are now validated like CLI options; stale `default_conda_exec` and other paths can exit 2 for commands that expose them. The merged fix should name the config/profile/default source. Explain that omitted repeatable options now allow profile overrides. **Deliberate behavior:** `--tool_dependency_dir` no longer requires an existing directory; Galaxy creates it. **Optional API cleanup:** `_setup_profile_options` calls `click.get_current_context()` without `silent=True`; decide whether it is strictly internal to Click or should accept explicit context/fallback for library callers.

Branch: [config-option-conversion](https://github.com/jmchilton/planemo/tree/config-option-conversion).

### [#1711: Use galaxy.util.wait.wait_on](https://github.com/galaxyproject/planemo/pull/1711)

Source: Marius’s review submitted 2026-10-10T12:27:02Z on the linked PR; reviewed parent `2331348d88ed7bcf63828877be9953965a72e225`.

**Decision:** using `galaxy.util.wait.wait_on` raises `galaxy-util` from >=24.1 to >=26.0. Marius notes `galaxy.tool_util.verify.wait.wait_on` already exists in required `galaxy-tool-util>=25.1` with the same signature; choose that route to avoid a floor bump or document the deliberate bump, including bioconda impact. **Compatibility:** removing public `planemo.io.wait_on` can break external imports; decide between a re-export shim and an explicit release note. **Stacking:** once #1733 lands, dependency constraints live in `pyproject.toml`/`uv.lock`, so rebase/update this PR there. No companion fix PR was opened for #1711.

Branch: [deduplicate-wait-on](https://github.com/jmchilton/planemo/tree/deduplicate-wait-on).

### [#1710: Fix shed_lint fail-fast behavior](https://github.com/galaxyproject/planemo/pull/1710)

Source: Marius’s review submitted 2026-10-10T12:25:56Z on the linked PR; reviewed parent `63736179136c926f934cd9f9f31ed42a3186be46`.

**Completed on 2026-10-11:** finding one was fixed by merged companion #6. Findings two and three are finished in pushed commit `605533257f7573ac258125270464fe9c94574a8f`: regenerated `--fail_fast` help in all 11 affected command references and added the unreleased `HISTORY.rst` entry. At default `--fail_level warn`, the first warning stops `shed_lint --fail_fast`; `--fail_level error` continues past warnings until an error. Other shed commands continue visiting repositories unless they opt into `stop_on_failure`. All four existing fail-fast tests pass, and all 11 help references match current CLI output. Status: back with reviewers/CI. **Separate pre-existing bug:** recursive `shed_diff` stores its first temporary output filename in shared `kwds["output"]`; later comparisons run but stdout can show only the first diff. Repair output-file ownership separately with a two-repository CLI regression.

Branch: [shed-lint-fail-fast](https://github.com/jmchilton/planemo/tree/shed-lint-fail-fast).

### [#1709: Replace Perl documentation example with Python](https://github.com/galaxyproject/planemo/pull/1709)

Source: Marius’s review submitted 2026-10-10T12:27:05Z on the linked PR; reviewed parent `7ca73d0e8a12825f1d0f7db463f319c1a42cfefc`.

**Optional example robustness:** a FASTA header with no following sequence still produces `ZeroDivisionError`; the Perl example did too. Current decision: preserve this existing behavior while merging the declared Python requirement. If improving it later, choose an explicit empty-sequence output/error and test that example.

Branch: [python-gc-doc-example](https://github.com/jmchilton/planemo/tree/python-gc-doc-example).

### [#1707: Write inline test jobs outside source directories](https://github.com/galaxyproject/planemo/pull/1707)

Source: Marius’s review submitted 2026-10-10T12:30:32Z on the linked PR; reviewed parent `8e8ca0e4b2c1f1ab1bcf90ff803da17d01e59535`.

**Galaxy follow-up:** `galaxy.tool_util.cwl.util.replacement_file` writes a secondary-files tar to `NamedTemporaryFile` and uploads `tmp.name` without flushing/closing. Marius reproduced empty uploads on Python 3.14 with Galaxy tool-util 25.1 and 26.1.1; independent stdlib reproductions confirmed 0 bytes before flush on 3.14 and 10240 bytes after flush. Review also found the same omission in `replacement_directory`, so fix both sibling upload paths; raising the dependency floor does not fix it. Preserve the existing secondary-file tests rather than adding a permanent >=3.14 skip. Implement flush/close and an integration regression in Galaxy through the standard Galaxy implementation handoff if John prioritizes this. **Inline references:** relative CWL `$import`/`$include` values are not rewritten with `path`/`location` and can resolve against the generated temporary job directory; decide between rebasing those references and documenting the limitation.

Branch: [test-job-files-in-tmpdir](https://github.com/jmchilton/planemo/tree/test-job-files-in-tmpdir).

### [#1706: Modernize Planemo-specific tool linters](https://github.com/galaxyproject/planemo/pull/1706)

Source: Marius’s review submitted 2026-10-10T12:27:17Z on the linked PR; reviewed parent `e13921592cdfa6e7203bcc868da1210cec88f6e6`.

**Release notes:** linter wording and per-class aggregation change ("best practice conda channel" -> "Conda", "dx.doi" -> "doi.org"); users parsing lint output need notice. **Public API:** removed `planemo.lint.lint_dois`, `is_doi`, and `find_dois_for_xml`; decide deprecation shims versus documenting removal. **No immediate action:** DOI linter reads only the first `<citations>` block; multiple blocks are invalid per XSD, so Marius’s observation does not require support for invalid XML. **Separate pre-existing configuration bug:** `build_lint_args` receives `skip=None` from CLI and that can override the global `lint_skip` fallback; decide whether to repair it separately, with a regression covering global config as well as direct `--skip` and skip files.

Branch: [modern-linters-rebased](https://github.com/jmchilton/planemo/tree/modern-linters-rebased).

### [#1704: Pin Galaxy virtualenvs to an explicit Python version](https://github.com/galaxyproject/planemo/pull/1704)

Source: Marius’s review submitted 2026-10-10T12:29:10Z on the linked PR; reviewed parent `7ef7473a9205876381ce6cdb2a9bda45b800a5b3`.

**Compatibility design follow-up:** tracked in [#1738](https://github.com/galaxyproject/planemo/issues/1738), filed at John’s request on 2026-10-11 for Marius’s second finding. Default Python 3.14 can break older Galaxy checkouts such as `release_25.0` when that interpreter exists on PATH. Decide between checkout-aware defaults and a fixed default with documented `--galaxy_python_version` overrides; establish supported combinations and cover local checkouts, explicit selections, unavailable/incompatible interpreters, and cache reuse. The merged fallback-warning fix addresses a missing interpreter, not an available incompatible one. [Issue design context](../../repositories/planemo/issues/needs_decision/1738/index.md). **Release notes:** cache naming changes from `gx_venv_3` to a specific/actual version, requiring a one-time rebuild and leaving the old cache behind. **Entry-point consistency researched (2026-10-11):** #1714 already supplies shared Click type validation. Its helper with #1704’s choice list rejects `3` from CLI, global config, and profiles; this is a focused composition probe, not a full branch integration run. Filed [#1739](https://github.com/galaxyproject/planemo/issues/1739) for remaining config shape/unknown-key linting, offline whole-file validation, and a pure-validator contract for profile callbacks. [Research and reproduction](../../repositories/planemo/issues/needs_decision/1739/research_2026-10-11.md). **Future Python:** serve tests construct the current interpreter version; Python 3.15 needs a supported-version guard or explicit support.

Branch: [pin-supported-galaxy-python-rebased](https://github.com/jmchilton/planemo/tree/pin-supported-galaxy-python-rebased).

### [#1703: List invocations across all workflows](https://github.com/galaxyproject/planemo/pull/1703)

Source: Marius’s review submitted 2026-10-10T12:24:49Z on the linked PR; reviewed parent `8da2c41046a54da18d0a5d0cc8dc107d70968edf`.

**Status (2026-10-11):** [John thanked Marius for the fix](https://github.com/galaxyproject/planemo/pull/1703#issuecomment-6111092038); the companion is merged and this is back with reviewers. Suggestions below remain informational follow-ups rather than new prerequisites.

**Actor-selection decision:** when a profile has admin and user keys belonging to different accounts, the command still prefers the admin key and scopes to that admin account in both filtered/unfiltered modes. The fix stops listing every user, but does not switch to the explicit user account. Choose whether to prefer the user key for user-facing listing or document current admin preference. **Display decision:** output groups by workflow instance/version ID; multiple versions can appear as separate headings with the same workflow name. Decide between grouping by stored workflow ID and showing version/instance identity in headings. **Validation:** rerun the external-Galaxy list-invocations integration after the fix, including the no-workflow call and raw JSON with pagination warning; autospec unit tests cover the unsupported-keyword regression. The external test class is currently skipped, so the added call does not supply active live-Galaxy coverage.

Branch: [list-all-invocations-rebased](https://github.com/jmchilton/planemo/tree/list-all-invocations-rebased).

### [#1700: Allow anonymous access to external Galaxy instances](https://github.com/galaxyproject/planemo/pull/1700)

Source: Marius’s review submitted 2026-10-10T12:27:04Z on the linked PR; reviewed parent `b8144e30f5fa1bac08f2a1e718c1a4c4ddf5ed4b`.

**Optional diagnostics:** with a user key but no admin key, admin-only calls now fail anonymously rather than with a fabricated invalid key. Consider clearer permission messages without removing intentional anonymous access. **Accepted behavior:** tool test-data downloads may now succeed anonymously; this fits the feature and needs no immediate fix.

Branch: [anonymous-external-galaxy-api](https://github.com/jmchilton/planemo/tree/anonymous-external-galaxy-api).

## Handoff state — 2026-10-11 16:07 UTC

All 13 companion fixes were independently reviewed. Fork PRs #4–#14 and #16 are merged; #15 remains open with the URI change separately pushed and its permanent Python >=3.14 test skip unaccepted. The original change-request reviews on upstream #1703, #1706 and #1725 still show on GitHub and were written against earlier heads; their identified companion fixes are now present. Upstream #1733 remains approved. New upstream CI runs are pending on all 13 changed PRs, with no failed checks at the final snapshot; a pending run is not a completed end-to-end validation. #1711 had no companion and its dependency/API decisions remain above.

Eleven clean authoring worktrees were fast-forwarded to their updated fork branches. The main checkout on `sanitize-invocation-test-data-paths` was left untouched because it has an untracked `.DS_Store`; its remote references were refreshed to merged commit `4ba96f396f0a1e870322b16213fe0022a16c89d3`. No worktree was removed. There is no existing authoring worktree for `collection-output-assertions`; its corrected branch is pushed. Unrelated galaxy-brain staged/unstaged work was preserved.

Validation: focused tests/checks are listed in the table and individual review notes. Actual collection-checker dependency variants passed on 25.1.0, 26.0.1 and 26.1.0. Managed-Galaxy/live invocation tests were not rerun locally; skipped integration coverage and remaining decisions are recorded above. Vault validation passed with zero errors and 15 existing advisory warnings.
