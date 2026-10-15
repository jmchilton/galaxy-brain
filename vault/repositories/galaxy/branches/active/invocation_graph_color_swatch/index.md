# invocation_graph_color_swatch

Status: `ready`. Base: `release_26.2` (`082605cade0`). Fork: `jmchilton/invocation_graph_color_swatch` @ `46632e4c37c`. Draft PR [#24157](https://github.com/galaxyproject/galaxy/pull/24157).

**[PR description](pr_description.md) · [Titles](pr_titles.md) · [Polish debrief](polish_debrief.md)** · [Checklist evaluation](checklist_evaluation.md)

Invocation graph shows a color parameter input as bold hex text instead of the color swatch the run-form graph shows. PR-first fix for [proposed issue](../../../../../agents/gx_issues/internally_managed/proposed_invocation_graph_color_param_swatch_dead.md) ([research debrief](../../../../../agents/gx_issues/internally_managed/debrief_invocation_graph_color_param_swatch_dead.md)); no issue filed.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Normal review](subagents/normal_review.md) · [Test challenges](test_challenges_debrief.md) · [Codex](codex_review.md) · [Scope evaluation](scope_evaluation.md) · [Screenshots](screenshot_debrief.md)

## Decisions

- Decide by the step's declared parameter type (`outputs[0].type === "color"`), not by value shape — per the proposed issue's preferred approach.
- No E2E on this branch; invocation-graph E2E belongs to sibling `proposed_invocation_graph_no_e2e_coverage.md`.
- Scope kept as implemented; `directory_uri` parity and `nodeText` HTML refactor are follow-ups.

## History

- 2026-10-14: handed off BLOCKED (screenshots; ports held by another session). 2026-10-15: John asked for retry; screenshots captured, real-server payload check passed → READY.
- 2026-10-15: John retargeted to `release_26.2`; rebased clean (`89f18bbc2b9` → `043eea3b218`), unit tests 21/21 (node 22.20.0). Screenshots kept from the `dev`-based run, not regenerated (John's call; `useInvocationGraph.ts`/`NodeInvocationText.vue` identical between old `dev` base and `release_26.2`). Polish started.
- 2026-10-15: polish CI check found a branch-caused red on `89f18bbc2b9` Client linting: vue-tsc `TS2345` on `findComponent(BFormInput).props("value")` in `NodeInvocationText.test.ts` (earlier "vue-tsc clean" claim was wrong). Switched to `findComponent({ name: "BFormInput" })` (idiom from `Editor/Index.test.ts`); `pnpm run type-check` exit 0, 21/21. Amended → `d1381244d75`.
- 2026-10-15: strengthening: swatch test now mounts and checks a real `input[type=color]` → `46632e4c37c`. Polished → READY for John's final review. Fresh fork CI pending.
- 2026-10-15: John asked for a draft PR. Opened [#24157](https://github.com/galaxyproject/galaxy/pull/24157) against `release_26.2` at `46632e4c37c`, title option 1, `pr_description.md` verbatim except screenshots hosted on fork branch `pr-assets-invocation_graph_color_swatch`. Draft, mergeable, CI pending.

## TICK — 2026-10-15

All 22 prior-head checks passed, including client tests/lint and browser coverage. Rebased without conflicts onto actual `origin/release_26.2` at `0c70fdd5182c7425efecf7c8e76d6bd313de88b9`; range-diff confirms the patch is identical. Published `12b3c4bfb49722eea89bc07d03bc8d34d6442c1a` only to jmchilton with an exact old-head lease, and undrafted under standing TICK authorization. Move to `ready`; fresh CI belongs to the rebased head and is pending.
