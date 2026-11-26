# Implementation debrief

```
exists .../tool_patches_static_findings/differential-review/snapshots/20261126T170542Z-hardening-cab486f13a1c.json
  hardening @ cab486f13a1c vs tool_security_static_findings (merge-base d4e4f68dd259)
  since 20261126T051834Z-hardening-9fc1faf4440f:
    commits: 0 same, 37 rebased, 0 changed, 9 new, 0 dropped
    hunks:   70 carried, 27 changed, 25 new, 5 dropped
```

**STATUS: BLOCKED** on a scope decision. The third scope evaluation recommends a capability-findings switch. The branch is otherwise ready.

- Head `cab486f13a1` on `jmchilton/tool_patches_static_findings`.
- Parent: `tool_security_static_findings`, squashed to `d4e4f68dd25` (same tree as `d4ae281e442`).
- Carries the 25 `tool_patches` commits (`d4e4f68dd25..a62581cfdd0`).
- Its own work: `a62581cfdd0..HEAD`. This round is `817454ed1e8..HEAD`, nine commits.
- Alts:
  - `_alt_original_scope` (`812703c96b6`);
  - `_alt_report_only` (`9fc1faf4440`, the pre-refusal head).

## What it is

This is branch 4: static review, tool patches, and refusal of tools that keep static findings after patching. The offline `review_patches`/CLI integration is unchanged. This round adds the refusal.

- **Config.** `tool_security_refuse_static_findings` (default off) and `tool_security_refuse_static_findings_severity` (`critical`/`high`/`medium`/`low`, default `high`). The severity is validated in `GalaxyAppConfiguration`.
- **At load.** `review_tool_source` runs on the patched source, which is `PatchReview.after`. `StaticReview` (worst severity per rule plus Galaxy version) is kept on the `ToolSource`, the `Tool` and the cached toolbox's `ToolIndexEntry`.
  - Seams: both returns of `ToolBox.get_expanded_tool_source`, and the populator's `process_tool`.
  - The populator's carry-forward and the freshness token require a current review. Materialization re-reviews a stored source whose entry lacks one (read-only stores).
  - A review that raises is logged, and the tool still loads.
- **At job preparation.** `JobWrapper.prepare` raises `ToolInputRejected` with `[static-findings] This job was not run: the security review of this tool reports <rule ids>, and this Galaxy server does not run such tools. Please contact the administrators of this server. Tool '<name>' (<id> version <v>).`
  - The base runner and Pulsar fail the job as they do for `InsufficientPermissionsException`, without a traceback.
  - The tool still loads and shows in the panel.
- **Library.** `galaxy.tool_util.security.refusal.StaticReview.refused_rules(threshold)`; `charsets.at_or_above`, which `--fail-on` shares; `codes.RefusalCode`, ported from `d5f7cb05e91` plus `static-findings`.
- **Docs.** `tool_security_review.md` gains "Refusing tools with findings". Config docs regenerated.

## Decisions

- **Compute at load on the patched source.** `review_tool_source(patched)` is used, not `review_patches()`, which would re-apply patches, double-count states and run the analyser twice. Lowered findings refuse at their new severity by construction.
- **Severity-free storage.** The threshold is applied at prepare.
- **What doesn't refuse.** Uncheckable codes, unchecked locations and a failed review refuse nothing, and there is no option to make them refuse. The legacy `upload1` would trip an uncheckable option.
- **Exempt.** Tools under `lib/galaxy`: `set_metadata_tool.xml` has a HIGH finding on a hidden param. Dynamic tools are not reviewed either.
- **Freshness.** `REVIEW_VERSION = galaxy.version.VERSION`. `INDEX_SCHEMA_HASH` is bumped.
- **Flag.** `Tool.static_review`. No API or UI change.
- **Matching the pin.**
  - `ToolInputRejected` is verbatim; `RefusalCode` is changed to a `StrEnum` (ruff UP042).
  - The runner catch joins the existing exception tuples.
  - Branch 3 already builds its codes differently, from `Rule`/`Uncheckable` (`baseline_refactor.md`), so merging 3 and 4 needs reconciling.

## Hardening

- **Normal review** (`subagents/review_rescope_refusal.md`):
  - fixed isort, ruff UP042, and a bad severity breaking every load;
  - renamed `patch_and_review_tool_source`;
  - documented that capability findings count.
- **Test challenges.** Fixed 14 test mypy errors and replaced `SimpleNamespace` with dataclasses. The lowered test now goes through the load seam. Assertions are stricter. Each of 15 single-line mutations of the code turns at least one test red.
- **Codex** (gpt-6-sol, medium). One finding, macro-only edits, refuted for this branch: the stored source and its review go stale together. It is an existing store gap.
- **Thermo.** Folded the freshness rule into `with_static_review(kept=)`, replaced the nullable `expected_review_version` with a `reviews_tool` predicate, inlined single-caller helpers, and moved severity validation into config. `info` is now rejected.
- **Refactor baseline.** Split `--fail-on`'s severity-by-name change into `3731a0b6c40`, ahead of the round. Optional hoist of `at_or_above` into `tool_security_static_findings`.
- **Scope evaluation (third).** Expand modestly; this is what parks the branch.
- **Check.** `make format` clean. mypy on changed files: only the existing `managers/notification.py:995` error.

## Tests

- **Unit.** About 1,800 related tests pass: security, toolbox, cached tool, populate store, freshness, index versions, jobs, config.
- **Integration.** `test_tool_static_findings_refusal.py` passes 6/6, under both the eager and the cached toolbox: a refused tool that still loads, a tool patched clean that runs, and a lowered tool still above the threshold that is refused. With the prepare check removed it goes red. `test_tool_patches.py` passes 12/12.

## Decisions for John

1. **Scope (the BLOCKED reason).** Add `tool_security_refuse_static_findings_capabilities`, defaulting to vulnerabilities only?
   - At `high`, 49 of the 54 stock `tools/` refusals are on capability findings only. Patches can't clear those.
   - It is about 10 library lines, one config entry, docs and tests. No storage change.
2. **`REVIEW_VERSION`.** It doesn't change between dev commits. An analyser constant or a package hash is the alternative.
3. **`INDEX_SCHEMA_HASH` bump.** It discards deployed indexes on upgrade, even with the option off.
4. **Breadth of the `lib/galaxy` exemption.** The alternative is `hidden_lib_tool_paths()` plus the converters directory.
5. **Reconciling with branch 3.** Its codes and runner catches differ. It reviews lazily at prepare and exempts by `tool_type_local`.
6. **Hoist `at_or_above` into `tool_security_static_findings`?**
7. **Still open:**
   - the `lowered` reporting expansion. With refusal on, a patch that lowers a finding below the threshold now silently lets the tool run;
   - the `uncleared` flag rename;
   - the store's macro-edit staleness, which is outside this branch.
