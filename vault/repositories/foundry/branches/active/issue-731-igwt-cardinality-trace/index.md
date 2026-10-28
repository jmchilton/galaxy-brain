---
upstream_base_branch: main
---
# implement-galaxy-workflow-test: trace output cardinality, stop overclaiming cross-check

- [Open PR](https://github.com/galaxyproject/foundry/compare/main...issue-731-igwt-cardinality-trace)
- [View on GitHub](https://github.com/galaxyproject/foundry/tree/issue-731-igwt-cardinality-trace)

## Status

Polished, ready for final review; based on `origin/main` `f48c01b6`, head `c1cd15e9` on `origin`; worktree `~/projects/worktrees/foundry/branch/issue-731-igwt-cardinality-trace`. Refs [#731](../../../issues/wip/731/index.md).

No PR yet.

CI on `c1cd15e9` (2026-10-28): unrelated only — `Packages / test` roadmap validation, GitHub-issue-dependent, green on main; rerun failed jobs.

## Evidence

Content-only change, so no committed test. Red/green done as a scratch recipe over the egapx run (`casts/claude/_emulated-runs/ncbi-egapx/` in the egapx worktree, untracked):

- `gxwf validate-tests --workflow` returns `valid: true` for the run's tests (dataset-form `star_bam`) and for `ftype: bam` on the fasta `complete_genomic_fna`.
- Step-3 recipe (`gxwf validate --connections --cache-dir tool-cache --json`, `outputSource` -> `resolved_outputs`): red flags only `star_bam` (`list` vs dataset); the 6 `convert_annotations` outputs land UNKNOWN (step 54 `to_convert` connection `skip`, so its nulls are defaults). Green: `star_bam` as `class: Collection`/`collection_type: list` passes recipe and `validate-tests`.

## Records

[implementation](implementation_debrief.md) · [normal review](subagents/normal_review.md) · [codex review](codex_review.md) · [polish](polish_debrief.md) · [PR description](pr_description.md) · [titles](pr_titles.md) · [tags](pr_tags.md)
