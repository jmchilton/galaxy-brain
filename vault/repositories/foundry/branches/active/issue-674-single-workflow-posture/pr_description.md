Toward 🎯 #674 - state that a tool choice doesn't need a second workflow, so runs stop splitting or cutting source choices over missing IWC precedent.

The note that Nextflow runs load for conditionals argued against itself. It told them to produce one workflow, then agreed with sibling workflows and told briefs to warn about pushback:

| | Before | After |
|---|---|---|
| Stance on siblings | "IWC reviewers historically prefer sibling workflows… and we agree" | "A second workflow just for a tool choice is not a goal." |
| Runtime tool selection | "a reviewer may push back toward sibling workflows" | "the missing precedent is not a reason to cut the choice or split the workflow" |
| Sarek's `tools` selector | "Maybe the right answer here is sibling Galaxy workflows after all" | "Flag that wiring for the human reviewer rather than splitting the workflow." |

The engine already supports this. `when:` plus `pick_value` is documented in the same note, and `conditional-route-between-alternative-outputs` covers one-of-N routing.

`nextflow-conditional-to-galaxy-subworkflow-when` carries the rule for runs, through the data-flow and template casts. The Corpus-First section of `guiding-principles` carries it for people and agents changing the Foundry, since it's the principle most likely to be cited against this pattern and no Mold loads that page. The rest of the diff is regenerated casts, `Dashboard.md` and `Index.md`.

This doesn't change the CWL branching note, which prefers siblings when IWC already publishes a pipeline that way or when branches diverge structurally. That's a narrower case than splitting over a tool choice. It also doesn't change `pattern-authorship`: pattern pages are still written from the corpus, and the new principle is about the workflows we build.

#674 stays open for the params rule, the interface Mold's reference to this note, and `nextflow-workflow-io-semantics`.

Local `make -k check` passes except `check-vendored`, which compares against local upstream checkouts and fails on this machine for files this PR doesn't touch.

## Risks

Risks are minimal - this changes guidance text and regenerated casts, and doesn't lock the project into a difficult-to-change choice (a two-way door).

## Context

Records [the design direction on #674](https://github.com/galaxyproject/foundry/issues/674#issuecomment-6697972255). The other parts of #674's revised scope moved to 🎯 #757 and 🎯 #758.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
