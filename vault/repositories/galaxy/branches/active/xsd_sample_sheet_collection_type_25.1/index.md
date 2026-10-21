# xsd_sample_sheet_collection_type_25.1

Status: `ready` — PR #24206 (undrafted by John by 2026-10-20) opened as draft at John's explicit request on 2026-10-17; PR CI greenish (two unrelated reds, see CI diagnosis); undraft is John's call. Base: `release_25.1` (`2ae14b0eac3`). Head: `93253fe4197`. Fork: `jmchilton/xsd_sample_sheet_collection_type_25.1`. Worktree: `~/projects/worktrees/galaxy/branch/xsd_sample_sheet_collection_type_25.1`.

The tool XSD rejected `collection_type="sample_sheet..."`, which core `lib/galaxy/tools/sample_sheet_to_tabular.xml` uses. No upstream issue. Found as a follow-up in [issue_23978_parameter_tools_xsd](../issue_23978_parameter_tools_xsd/scope_evaluation.md).

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Re-scope](implementation_rescope_debrief.md) · [Normal review](subagents/normal_review.md) · [Re-scope review](subagents/rescope_review.md) · [Codex review](codex_review.md) · [Baseline refactor](baseline_refactor.md) · [Scope evaluation](scope_evaluation.md) · Alt: [original scope](alts/original_scope.md) · Round 1 hardening: [earlier_drafts/1/](earlier_drafts/1/)

## Decisions

- Base `release_25.1`: oldest supported release with the sample sheet tools (added in 25.1, released 2025-12-12). Simple fix; XSD ships in `galaxy-tool-util` used by `planemo lint`.
- Legal values mirror the runtime `COLLECTION_TYPE_REGEX` (`type_description.py`): `sample_sheet` only outermost, optional `:paired|:paired_or_unpaired|:record`. Settles the "which nestings" question raised in 23978's scope evaluation.
- Re-scoped (first scope evaluation): XSD self-lint at its real path, and `convert_sample_sheet.xml` duplicate `sample_sheet` removed. Converter doesn't declare `sample_sheet:record` (John, 2026-10-21, after mvdbeek review): `copy_elements` drops nested-record `fields`, so conversion would fail. Nested-record conversion is a dev follow-up.
- Kept the 3-commit history from the refactor subagent (John, 2026-10-16), even though that subagent got around a blocked `git reset --hard`.
- Testing per John: only lint coverage. `.ci/validate_test_tools.sh` now also validates core `lib/galaxy/tools/*.xml` that aren't internal `<type class=…>` tools (today: `data_fetch.xml`, `sample_sheet_to_tabular.xml`). Rule-based, not a hand-kept list.

## Dependencies

- Merge-forward conflict with `issue_23978_parameter_tools_xsd` (dev) in `.ci/validate_test_tools.sh`; both now use the same `set --` loop shape. Resolution: keep 23978's `*/*.xml` loop and xsd path fix, append this branch's core-tools loop.

## Polish — 2026-10-17

Actual base `release_25.1` at `2ae14b0eac33c47cc87cc8941cae6270a3c10a01`; published head `5d35c8c7db348d5c9e2850876a7145ccb06976a8`. Fetch/rebase found branch current; no code or history changes. Fresh independent general checklist passes, human-read unchecked. Workflow checklist is not applicable to this schema/tool declaration/lint change.

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Checklist](checklist_evaluation.md) · [Strengthening review](strengthening_review.md) · [Polish debrief](polish_debrief.md).

Fresh lint reproduction using the existing macro-expanding loader and xmllint: release baseline 280/281 passes, rejecting only sample_sheet_to_tabular.xml; current XSD 281/281 passes. Schema syntax, shell syntax, ShellCheck and whitespace pass. Lint-only scope per John's instruction; no conversion execution claimed. Description explicitly retains nested-record conversion as a follow-up and calls converter edit declaration parity. Fresh fork CI pending; no observed failures. Exactly one strengthening round: nothing to add. Final CI snapshot: 17 queued, 4 pending, 1 skipped; no observed failures. CI validation is pending, not a passing result. Vault validation passes (0 errors, 15 advisory warnings). No PR opened, approval SHA or title assigned; human-read remains unchecked.

## Draft PR opened — 2026-10-17

John explicitly requested a draft. Opened [#24206](https://github.com/galaxyproject/galaxy/pull/24206) against `release_25.1` at published head `5d35c8c7db348d5c9e2850876a7145ccb06976a8`, using the first polished title: `[25.1] Accept sample-sheet collection types in the tool XSD`. Used `pr_description.md` verbatim, including John's existing checked human-read item. Applied `kind/bug`, `area/tool-framework`, `area/dataset-collections`; no mentions. No code/history changes needed.

Fork CI snapshot at creation: 17 queued, 4 pending, 1 skipped; no observed failures. Relevant CI validation is pending, not a passing result. **Keep this PR draft as explicitly requested by John; do not automatically undraft on green CI without a later instruction.** Authorization covers opening the draft at this SHA. Tracking record supersedes the pre-PR status above.

## CI diagnosis — 2026-10-19

- Converter tests: `CONVERTER_ref_to_seq_taxomony (Test #1)` failed. Branch changes only `convert_sample_sheet.xml` among converters. Unrelated.
- Selenium shard 1: `test_histories_published.py` tag click / advanced search, timeout waiting on `.history-card-list`. Unrelated UI.
- Both failed jobs rerun.

## TICK — 2026-10-20

John undrafted #24206. CI green (53 pass, 1 skipped), MERGEABLE. Moved to `ready`.

## Review response — 2026-10-21

mvdbeek asked why the converter declares unimplemented `sample_sheet:record`. Per John, amended `5d35c8c7db3` → `93253fe4197`: dedupe only, no record. `pr_description.md` updated to match; GitHub PR body not yet synced.
