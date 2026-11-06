# foundry#568 — Review New Paper

[Issue](https://github.com/galaxyproject/foundry/issues/568)

Labels at seeding (2026-10-06): `priority/mvp`, `agent/implement`, `roadmap/off`.

Claimed 2026-11-05 on branch [`issue-568-review-agent-benchmark-paper`](../../../branches/active/issue-568-review-agent-benchmark-paper/index.md): `work/ready-implement` swapped for `work/in-progress`. Draft PR [#750](https://github.com/galaxyproject/foundry/pull/750). Lessons [posted to the issue](https://github.com/galaxyproject/foundry/issues/568#issuecomment-6670779147), kept in [research_comment.md](research_comment.md).

Next: John picks which follow-ups in the comment to file. Merging #750 won't close the issue, because the PR has no closing keyword.

## Paper

Munn and Grenier, "From Prompt to Pipeline: A Comparative Evaluation of Large Language Model Coding Agents for Reproducible Bioinformatics Pipeline Construction", bioRxiv, posted 2026-09-17, [doi:10.64898/2026.09.11.751004](https://doi.org/10.64898/2026.09.11.751004). Not peer reviewed.

## Verified

- All 23 pages of the PDF read verbatim, including Methods, Limitations and the supplemental figure captions.
- The prompt's run ban, read in `CUTnTag_context.md` in the Biomni and Codex repos: "Do not run a pipeline automatically".
- Those two files differ on the subdirectory scan, genome filter and Picard command. The Claude repo has no such file.
- `Bug fixes` commits, from the GitHub API: Biomni +811/-202 (388 additions are the context file), Claude Code +336/-134, Codex +335/-39. These include requirement changes as well as defects, for example the genome filter in the Claude changelog.

- Biomni's trace reports `Passed: 78/78` and "All requirements covered" from a string-presence audit, with no pipeline run in that file.
- The Foundry gap, by [probe](../../../branches/active/issue-568-review-agent-benchmark-paper/probe/results.md): a wrong-stage rewiring of the CUT&RUN workflow validates identically, and its assertions don't tell the stages apart on kept outputs.

## Not verified

- Supplemental File 1, the prompt as published. bioRxiv's supplementary page returned the abstract, so the repo files stand in for it and may not be what each agent received.
- Dataset size, agent and model versions, run counts and debugging time. The paper doesn't report them. Repo initial commits date to 2026-04-27 and 2026-04-28.
- The generated pipelines themselves, which weren't rerun or audited.
