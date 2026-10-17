You'll be given a branch whose BRANCH directory contains a `scope_evaluation.md` and a `baseline_refactor.md` describing its leading baseline test and refactoring commits.

Please create a branch for the baseline commits as `<branch_name>_baseline`.

The baseline branch is the leading run of "Baseline tests" and refactor commits that `baseline_refactor.md` describes, cut at its last commit. Don't reorder or split commits to build it. If those commits aren't a clean prefix of the branch, stop and report it, since restructuring history is the Refactor Baseline Process's job. Ignore the "Possible Decompositions" in `scope_evaluation.md` here; that split is for John to choose.

Run a full, regular `./POLISH_BRANCH.md` process for `<branch_name>` and run a lighter version of that process for the `<branch_name>_baseline`.

If the main branch's polish process touched the baseline refactorings or tests, backport those changes to the baseline branch.

Do the checklist agent and fix issues from that list and write out the PR tags file - but skip strengthen subagent and PR generation. The PR description and title will be as follows. 

The PR title should be one of:

- Branch refactoring and tests to enable (blah)
- Branch refactoring to enable (blah)
- Branch tests to enable (blah).

Blah could be a very short, punchy description of the branch or just the issue number if that works. Open with the `Refactor ahead of 🌿<branch_name_and_link>` opener from [`GX_PR_DESCRIPTIONS.md`](../_shared/GX_PR_DESCRIPTIONS.md), then the second paragraph should be:

```
<details><summary>This shouldn't change Galaxy's behavior - ***this only adds tests and refactoring aimed at making our main PR easier to review***.</summary>

I'm so sorry to give you more to review but John (the human) has deemed the base branch complex and thinks the quality of the main and more important review will go up if we get these more mechanical changes out of the way ahead of time. 
</details>
```

Match "adds tests and refactoring" to what the commits contain: "adds tests", "adds refactoring", or "adds tests and refactoring".

The third paragraph should be:

```
<details><summary>The main PR for (branch link here) will have the sales pitch for the feature and approach but some details are here.</summary>

(Place a short list of facts about the full branch here - at least one about implementation, at least one about scope.)
</details>
```

If the branch contains refactorings - add a "## The Refactorings" section that contains just a simple list of the refactorings - (Short description of the refactor) is used by 🌿<branch_name_and_link> to (how it cleans up).

Then include all of these lines that make sense for the branch under a "## Process" section containing only these.

```
These baseline tests were written ahead of the main change by [John's Implementation Agent](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_workhorse/AGENTS.md#baseline-tests).
```

```
Base branch refactoring and rebasing happens automatically during implementation using [John's Refactor Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)
```

```
This branch was created during John's normal branch polishing process using the [Decompose Baseline Process](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/gx_branches/DECOMPOSE_BASELINE_CHANGES_AND_POLISH.md)
```

The rest of the PR should match the normal PR description for Galaxy - context, risks, (probably skip ## Agentic Checks), checklists, license, etc.. Keep "## Risks" - whether the refactorings really preserve behavior is the risk to assess.
