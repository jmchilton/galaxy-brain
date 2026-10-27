---
upstream_base_branch: dev
---
# issue_23891_output_reference_resolver

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_23891_output_reference_resolver?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_23891_output_reference_resolver)

Resolves format_source and metadata_source against declared inputs at tool load (#23891).

## Status

Re-hardened, rescoped (metadata_source lint), load errors gated at profile 27.0 incl. shadowed legacy aliases; `branches_implemented_needs_ci`.

No PR open.

Fork CI not yet run on `b28aa18d1b5`.

[Implementation](implementation_debrief.md) · [Rescope](implementation_rescope_debrief.md) · [Scope](scope_evaluation.md) · [Codex](codex_review.md) · [Thermo-nuclear](thermo_nuclear_review.md) · [Baseline](baseline_refactor.md) · [Test challenges](test_challenges_debrief.md) · [Polish](polish_debrief.md) · [PR description](pr_description.md) · [Titles](pr_titles.md) · [Tracking history](tracking_history.md)
