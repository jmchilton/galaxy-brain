# extract_next_followups

- [Open PR](https://github.com/galaxyproject/galaxy/compare/release_26.2...jmchilton:galaxy:extract_next_followups?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/extract_next_followups)

Fixes notebook-to-workflow extraction, report references and editor behavior after #22860. Base: `release_26.2` (retargeted from `dev` 2026-10-17; #22860 first ships in 26.2).

## Status

`branches_need_decision`: re-hardened and re-scoped (E1–E4) on dev `5ff1e46b8c3`, head `9330c4c8feb`; the second scope evaluation recommends expanding again (E6/E7, optional E8). Retargeting to `release_26.2`, E5 API naming and Codex F2 are also open. See [implementation debrief](implementation_debrief.md).

No PR open.

Fork CI not refreshed since the 2026-10-16 rebase (last green was `113a63bb692`).

## Decisions and references

- Original scope kept as `extract_next_followups_alt_original_scope` ([alt](alts/original_scope.md)).
- John: H3 accept quotes, M7 lock star (C+B), plain-history copies collapse server-side, `rebase -i` approved for this branch's history rewrites.
- [Plan](plan.md) · [Tracking history](tracking_history.md) · [Scope evaluation](scope_evaluation.md) · [Re-scope debrief](implementation_rescope_debrief.md) · earlier debriefs in `earlier_drafts/`.
