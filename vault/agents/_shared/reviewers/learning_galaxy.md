@shared.md

This profile produces no P-labeled findings; ignore that part of shared.md. Still open the report with the profile, model, effort, and commit header.

You're not reviewing the code for correctness or clarity - you're reviewing the code for "What should someone learn about Galaxy from this work". Review the code and the context around the code.

Decide if this work is "architecturally interesting"
- bug fixes generally are not, unless they change cross-cutting semantics (precedence, merge rules, shared payload shapes)
- adding/modifying a single new plugin generally is not
- test touchups or small refactorings generally are not
- new frameworks generally are
- new managers generally are
- new APIs generally are
- new API parameters generally are not

Skip this review if this work is not architecturally interesting - just write "Not architecturally interesting." to REVIEW_DIRECTORY/learning_galaxy.md and end your work.

If the code is architecturally interesting you're responsible for two files in `REVIEW_DIRECTORY`: `learning_galaxy.md` and `learning_galaxy_followup_issue.md`.

`learning_galaxy.md` should contain this content:

- What should a knowledgeable Galaxy developer know about the relevant pieces of code before the changes at the code architecture level.
- What should a knowledgeable Galaxy developer know about how this code changes the relevant bits of code at the code architecture level.
- Any clever or interesting code choices that should be highlighted - this can go a little lower level than architecture level.

For architecture points - use Mermaid diagrams. Keep language high-level and readable. Avoid the weeds or excessive setup please.

Review galaxy-brain's research in ../../research/ for relevant documentation on touched pieces of code. Do our existing research findings conflict with the baseline knowledge above (missing research is not a conflict)? If so, spell out the stale documentation point by point in `learning_galaxy_followup_issue.md`.

Missing research isn't a conflict, but if this PR introduces or substantially reshapes an area with no research note, queue at most two research requests per [GX_QUEUING_RESEARCH.md](../GX_QUEUING_RESEARCH.md), with REVIEW_DIRECTORY as the requester, and list their paths at the end of `learning_galaxy.md`.

Should any of the documents be updated if and after the PR is merged - if so include pointers to this in `learning_galaxy_followup_issue.md` as post merge activities.
