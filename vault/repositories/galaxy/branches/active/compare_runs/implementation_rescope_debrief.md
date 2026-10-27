# Re-scope debrief

Hardening iteration 1 ran test challenges, Codex, and the scope evaluation. The [scope evaluation](earlier_drafts/1/scope_evaluation.md) recommended a modest "finish the abstractions" expansion, and that was implemented. The pre-expansion branch is kept as `compare_runs_alt_original_scope` (`548c8bebcc3`); see [alts/original_scope.md](alts/original_scope.md).

**Added** (see [subagents/rescope_implementation.md](subagents/rescope_implementation.md)):
- **Shared helpers get second consumers.** About 12 client `total_matches` parsers now use `totalMatches`. `useMappingJobs` now runs on `useExecutionJobs`, with a baseline test that pins its order.
- **Dataset metadata keys.** `?keys=metadata_<name>` returns that single element, through `serialize_metadata(included=)`, with a baseline API test. The change only adds behaviour; unknown keys were dropped before.
- **Mode 2 version filter.** `output_runs` gets the same `versions` filter as mode 1, plus its filter UI.
- **New entry point.** DatasetDetails links to "Other runs of this tool", hidden for internal `__…__` tools.
- **Codex follow-ups.** A skipped step's outputs show `Missing(skipped)`. Mode 1 works out each version's columns from that version's step definition, not from the rows on the page.
- **CI fix.** The selenium `framework.__all__` export is fixed; mypy was failing on every selenium test that imports the moved helper.

**Not added:** graph run-count badges, which conflict with #24307; mode 1 for steps inside subworkflows, which has no design for matching them across versions; and the tool-form panel, which is waiting on John.

**Review:** [subagents/rescope_review.md](subagents/rescope_review.md) approved it with small follow-ups, and all of them were addressed. The history was folded again, with the new baseline commits moved to the front; the pre-fold backup is `compare_runs_pre_fold2`.

**Next:** re-harden. Iteration 1's debriefs are in `earlier_drafts/1/`, and iterations 2 and 3 rerun every step from scratch.
