Implement 🎯 #568 - add the prompt-to-pipeline agent study to the comparisons page, as a contrast with one detailed prompt.

The comparisons page contrasts the Foundry with wikis, skill bundles and generated docs, but not with what many people would try first: give a coding agent one long prompt and ask for the whole pipeline. [Munn and Grenier's preprint](https://doi.org/10.64898/2026.09.11.751004) tested that on a Nextflow CUT&Tag pipeline. Biomni, Claude Code and Codex all needed debugging. All three merged samples by group, yet none produced the merged-group reports the prompt asked for.

**The contrast is one prompt versus staged artifacts, not agents versus no agents.** Foundry Pipelines are run by agents too. The page doesn't rank the three agents in the study.

**This doesn't claim the Foundry does better, and it names a gap the Foundry shares.** No comparable benchmark has been run against it. The template Mold's eval judges a draft's connections against the data-flow brief, but nothing compares the finished workflow with that brief. To check this, I rewired the final flagstat step in our CUT&RUN workflow from final BAMs to the earlier filtered BAMs, so FRiP and MultiQC would read the wrong stage:

| Check on the rewired workflow | Result |
|---|---|
| `gxwf validate --connections --strict` | Passes, identical to the original: 621 connections OK, 0 invalid |
| The run's test assertions, read against kept outputs (Planemo not rerun) | None tells the stages apart: control `in total`, target `6[0-9][0-9] + 0 in total` (668 either way), permissive FRiP checks, sample names in MultiQC |
| An exact control count, which no test uses | Would catch it: 438 final, 442 filtered |

The rewiring is constructed, not a defect in that run, and one case can't say how often this happens. [Probe details](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-568-review-agent-benchmark-paper/probe/results/).

**It's a Part A contrast, not a Part B landscape entry.** Part B tracks when a knowledge base meets a skill, and this study has no such design. The change log records that decision and notes ClawBio, which the preprint names, as an unassessed candidate for the next sweep.

**The study's failure modes are worth acting on, but its remedies are untested.** It covers one task and reports no agent versions or repeat runs. "Correct" means agreement with the authors' own reference. Its prompt told the agents not to run the pipeline automatically, so it can't separate the limits of one prompt from the missing feedback of a run.

The lessons #568 asked for are in [this comment](https://github.com/galaxyproject/foundry/issues/568#issuecomment-6670779147), with follow-ups to choose from. This PR changes no Molds and doesn't close the gap above.

<details><summary>Also changed on the page</summary>

Three framing lines would otherwise have been false or misleading:

- Part A's description notes that a contrast citing a study or a current gap dates it.
- "This doc tracks one axis only" becomes "Part B tracks one axis only".
- The refresh log's rule now covers single-candidate assessments.

</details>

<details><summary>What wasn't verified</summary>

- Supplemental File 1, the published prompt, was unreachable. The prompt claims rest on the paper and the files in the Biomni and Codex repos, which differ from each other.
- The generated pipelines weren't rerun.
- Foundry claims come from reading source at `618853f0`, plus the probe above.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door).

The gap the page names is dated 2026-11 and will need editing when it closes.

## Agentic Checks

### ✅ Normal Review

<details><summary>Corrected a false claim about the Foundry that appeared on the page and in the issue comment.</summary>

The first draft said nothing records which upstream a final output must be built from. The data-flow brief does, so the page now says nothing compares the finished workflow with it. The review also qualified "correctness" as agreement with the authors' reference, and moved proposed actions off issues that couldn't carry them.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-568-review-agent-benchmark-paper/subagents/normal_review/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings on the text it could see, after its sandbox blocked a first attempt.</summary>

Codex's sandbox can't start on this machine, so the first attempt read nothing. The second received the diff, the issue comment, the preprint text and key repository files inline and reported no findings. It couldn't check the glossary, the linked issues, Biomni's trace, the tool-authoring notes, other Pipeline evals or Supplemental File 1. The probe above came later, so it didn't review that either.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-568-review-agent-benchmark-paper/codex_review/). Run via gpt-6.1-sol. Codex reported its reasoning effort as `none`.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
