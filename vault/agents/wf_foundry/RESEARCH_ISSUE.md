You'll be given a Foundry issue to research.

If the issue isn't labeled `work/ready-research` (or `work/in-progress` on a resumed run), refuse the work and ask John to re-label it.

Read the issue and its comments. Check for open PRs, branches and earlier research comments that address it - don't redo work.

Claim the issue: swap `work/ready-research` for `work/in-progress` and comment that an agent picked it up. Move its line in [MY_ISSUES.md](../../repositories/foundry/issues/MY_ISSUES.md) to `wip` and its record directory to `vault/repositories/foundry/issues/wip/<number>/`. If it has no record yet, create one per [TRIAGE_ISSUE.md](TRIAGE_ISSUE.md) step 5. If you give up, restore `work/ready-research` and move the record back.

1. Have a subagent research the problem and draft a concise, readable comment answering the issue's questions. Use `<details>` for long evidence. Save the draft in the record as `research_comment.md`.
2. Have a fresh subagent review the draft for correctness and clarity against the code and the cited issues and PRs. Fix what matters; keep it concise. One review round only.
3. Post the comment with an agent marker ([AGENT_MARKERS.md](../_shared/AGENT_MARKERS.md)) and swap `work/in-progress` for `work/needs-review`.
4. Move the record to `needs_decision/` and its line to "Research to review" (`needs_decision_review`), with a link to the comment. Note in `index.md` what was verified and what wasn't.
