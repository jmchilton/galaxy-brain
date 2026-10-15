# Polish debrief

2026-10-15. Retargeted to `release_26.2` and polished. Head `46632e4c37c` (one commit), pushed to `jmchilton/invocation_graph_color_swatch`. [Description](pr_description.md) · [Titles](pr_titles.md) · [Checklist evaluation](checklist_evaluation.md)

## Rebase

`89f18bbc2b9` (on dev `c63ffc2ccae`) → `043eea3b218` on `release_26.2` `082605cade0`, no conflicts. `useInvocationGraph.ts` and `NodeInvocationText.vue` are identical between the two bases, so the dev-based screenshots still show the branch's behavior; not regenerated per John. Merges cleanly into current `dev`.

## CI

Fork Client linting on `89f18bbc2b9` was red and branch-caused: vue-tsc `TS2345` on `findComponent(BFormInput).props("value")` in the new `NodeInvocationText` test. The implementation debrief's "vue-tsc clean" claim was wrong. Fixed (`d1381244d75`), then superseded by the strengthening change. Other checks on `89f18bbc2b9` were green. Fresh CI on `46632e4c37c` pending at hand-off.

## Checklist

GENERAL + WORKFLOW_RELATED: all answerable items pass; human-read item left for John. Re-run after the test change: one detail bullet overclaimed the component test failing; corrected (the composable test is the red one).

## Strengthening (one round)

- Applied: swatch test switched to `mount` + rendered `input[type=color]` check (the stub-props version would pass if `type="color"` were dropped). Red with the pre-fix `<b>` value.
- Description fixes: highlighted "not a regression" (since #18615, before #19294's swatch existed); corrected the claim that every non-swatch case stays bold — a color value that isn't `#rrggbb` now shows plain, as in the run graph; clarified the component test passes on base (it pins the branch the fix relies on).
- Left for John (scope questions): `directory_uri` parity, moving HTML out of `nodeText`, shared formatter, E2E or a swatch bullet in `proposed_invocation_graph_no_e2e_coverage.md`, whether non-`#rrggbb` color values should stay bold, unverified `<b>null</b>` for unset optional params.
- Why `release_26.2` (bug dates to 25.0) isn't stated beyond "Targets `release_26.2`" — John's reason not recorded.
