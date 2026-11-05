**Does it belong on the comparisons page?** Yes, as a Part A contrast: "Versus one detailed prompt to a coding agent" ([#750](https://github.com/galaxyproject/foundry/pull/750)). It doesn't belong in Part B, because it evaluates prompt-driven construction and has no knowledge-base-to-skill design. Its related work names ClawBio, a versioned bioinformatics skill library, which the log records as an unassessed candidate for the next Part B sweep.

**Is anything valid and validated?** The failure modes are worth acting on, but the remedies are untested. The sharpest lesson is that a requirement can vanish between a correct intermediate and the final report while everything still looks fine, and today's Foundry checks can miss that, as a small probe below shows.

## The study

[Munn and Grenier](https://doi.org/10.64898/2026.09.11.751004) gave Biomni, Claude Code and Codex a long prompt for a Nextflow CUT&Tag pipeline, modified the results until they ran, then compared their MultiQC reports with a hand-coded reference. All three needed debugging. All three merged by group, but none produced the merged-group reports the prompt requested, and none fully agreed with the reference.

## How much weight it can bear

The observations are credible but thin. It's one task in an unreviewed preprint, with no agent versions, repeat runs, dataset size or statistics reported. Documentation and debugging difficulty were judged subjectively, and the test data is unpublished. "Correct" here means agreement with the authors' own reference, which they say isn't an independent truth set.

Two further limits matter when reading the results:

- **The agents were told not to run the pipeline automatically.** The paper lists this among the prompt's constraints. The prompt files in the Biomni and Codex repos ask for a testing strategy and an internal check, not an executed test. Biomni's [trace](https://github.com/paulmunn/Biomni_CUTnTag_pipeline/tree/main/execution_trace) shows static checks and fixes but no pipeline run, though I can't confirm it covers the whole session. So the study doesn't measure an agent iterating to green, which is the condition its first recommendation asks for.
- **The prompt isn't pinned down.** The paper says each agent got the same specification, yet its Methods distinguish an "initial prompt" from a "final specification". The Biomni and Codex files differ on the subdirectory scan, the genome filter and the Picard command, and the Claude repo has no such file. I couldn't reach Supplemental File 1, so I can't say which version each agent received.

The 12 recommendations are framed as what "would likely reduce debugging burden". None was tested, and there's no control arm. Their agreement with the Foundry's design (contracts, staged work, reusable skills) is encouraging but isn't validation.

## Actions from what it observed

The failures in the first column were observed. The actions are my proposals, some echoing the paper's recommendations, and none has been tested. The "Foundry today" column comes from reading `main` at `618853f0`.

| Observed | Foundry today | Proposed action |
|---|---|---|
| An explicit requirement was lost on the way to the final report: merging happened, but merged groups never reached the reports. | The data-flow brief records intended wiring as Markdown, but nothing checks the finished workflow against it. A wrong but type-compatible input passes `gxwf` validation, and a test passes unless an assertion tells the two inputs apart. I [probed this](https://github.com/jmchilton/galaxy-brain/blob/main/vault/repositories/foundry/branches/active/issue-568-review-agent-benchmark-paper/probe/results.md) on our CUT&RUN workflow by rewiring the final flagstat step to the filtered BAMs, so FRiP and MultiQC read the wrong stage. Validation gave identical results, and none of the run's assertions tells the stages apart on kept outputs (Planemo not rerun). | In `workflow-brief-to-galaxy-test-plan`, for each output with a named upstream in the data-flow brief, plan an assertion on a value that differs from its nearest type-compatible alternative, or record why not in `omissions[]`. In the probe, an exact control count would catch it: 438 final, 442 filtered. Add an LLM-judged `eval.md` property to match. |
| A self-check can pass over the omission. Biomni's trace reports `Passed: 78/78` and "All requirements covered" from a string-presence audit, and the merged-group requirement was still missed. | Brief acceptance criteria are optional free text. The test-plan eval asks an LLM judge whether the plan tests them, and intentional gaps go in `omissions[]`, but no artifact maps each criterion to its evidence. | New issue: at run close, write a table of acceptance criterion → output → test case → result or recorded surrender. Each row must cite a test result, since a row-exists check would repeat Biomni's mistake. Criteria need stable ids first. [#332](https://github.com/galaxyproject/foundry/issues/332) could host this only if finalize moves after `run-workflow-test`. |
| A clean report can be wrong. Duplication landed within about 2.2 percentage points of the reference, while mapped-read counts, whose meaning depends on the BAM stage, differed by up to about 26 million reads in the worst pipeline. The authors infer that metrics needing stage labels or custom aggregation are more fragile. | Test-plan Molds carry general guidance to assert a stable section or value in a report, but nothing requires per-sample identifiers or stage labels. Our [CUT&RUN run](https://github.com/jmchilton/galaxy-brain/blob/main/vault/repositories/foundry/pipeline_runs/2026-10-31-wb2g-golden-cutandrun-v0/index.md) went green with MultiQC rows that overwrite each other across libraries, recorded but not fixed. | Add to the test-plan Molds, `planemo-asserts-idioms` and an `eval.md` property: when a workflow output is a report, assert sample identifiers and key values in its tables, targeting stage-labelled values first. [#90](https://github.com/galaxyproject/foundry/issues/90), an IWC survey, can supply the conventions. |
| Neither documentation quality nor report breadth tracked agreement with the reference. | Pipeline evals don't separate the two. | Write them as separate `eval.md` properties, so the independent grading planned in [#476](https://github.com/galaxyproject/foundry/issues/476) reports each on its own. |

## Ideas worth testing

These are hypotheses, not findings.

- **Require a pass to finish.** A pipeline run closes `complete` "when every intended phase is done". For Pipelines with a `run-workflow-test` phase, make `complete` require `status: pass` or a recorded deferral. The Mold's status set is enough to start, and [#49](https://github.com/galaxyproject/foundry/issues/49)'s schema would make it checkable.
- **Run earlier.** Each draft step gets static validation, but nothing executes until the whole workflow exists. The CUT&RUN run took 6 attempts and about 10 hours of Planemo time to reach green. Try running a `draft-extract` prefix through Planemo at a few milestones on one golden brief, then compare attempts and hours to green. This needs test data and a small test file before the loop, which today come after it.
- **Allow negative tests in plans.** The tests format accepts `expect_failure`, but the test-plan schema has no field for it, so our CUT&RUN plan had to write "Negative case (tests-format expect_failure: true)" in a `doc` string. When a brief promises to reject bad input, the plan should be able to say so.
- **Check thread use in authored tools.** All three pipelines ran Bowtie2 on one core until corrected, with no crash to signal it. Our authoring note says to use `$GALAXY_SLOTS`, but no eval checks it. The critique note also flags "a BWA tool with no `-t` threads input", while the help note says "CPU allocation is not a tool input". This doesn't affect existing Tool Shed wrappers, and the CUT&RUN run used no authored tools, so it's low priority.
- **Benchmark against a single prompt.** Supplemental Figure 2 proposes a locked task package, then static checks, a smoke test, a fixed dataset and concordance with a reference, ending in hard pass/fail results and a scorecard. This would be a new issue reusing #476's runner, whose planned `--trials N` answers the repeat-run gap. A single-prompt arm needs separate work, because #476 workers load one published skill. We can't repeat this exact task because the data and reference aren't available, but we already have a `nf-core/cutandrun` golden brief and run to compare against.

Separately, and not from the paper: `--connections` isn't named in the per-step validation command or in any Mold or Pipeline. The `gxwf validate` manual page recommends it for collections and map-over, and the CUT&RUN terminal pass ran it anyway. Naming it per step looks like a cheap fix.

## What I'd skip

- **The agent ranking.** One task with no reported repeats can't settle which agent is best. Claude Code is one of the agents compared and this comment was written by a Claude model, so weigh my read accordingly.
- **Nextflow- and site-specific recipes**, such as `--help`, `--validate_only`, MultiQC custom-content filenames and Docker rules.
- **CRAFT as a technique.** The authors say it wasn't sufficient by itself, and nothing compares it with another prompt structure.

I didn't assess recommendations 2 and 3 (named BAM stages, a formal sample metadata schema) beyond the above. They're worth a separate look if report assertions prove too weak.

I haven't filed any follow-ups. Tell me which of these you'd like opened as issues.

***Posted by agent [wf_foundry](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/wf_foundry/CLAUDE.md) using model claude-opus-5-5 on John's behalf.***
