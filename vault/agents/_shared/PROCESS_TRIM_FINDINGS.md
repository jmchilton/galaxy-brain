Trim a review round's findings after John's edits, follow-up to [PROCESS_INITIAL_REVIEW.md](PROCESS_INITIAL_REVIEW.md). RF is `~/projects/repositories/galaxy-brain/review-factory/bin/review-factory`. A round without `REVIEW_DIRECTORY/review_<N>_findings.yml` started on Markdown files and trims as in the last section.

John drops a finding by setting its `include: false`, and may ask in the launch to reword findings or to re-include an `F` item. Run `RF status --record REVIEW_DIRECTORY`. If it prints no `✂️ Trim:` line and the launch asks for nothing (a launch still reading `<user_input_here>` asks for nothing), ask John.

- **Edits** — re-read the YAML before every write, and never change `include` or `actions`: those are John's.
- **Review branch** — follow the drop and restore list from `RF status`. Create `pr_<PR_NUMBER>_round_<N>_rev_<m+1>` from the reviewed commit (not from the previous branch's tip), cherry-pick the kept commits in order, and cherry-pick restored commits from the earlier revisions they name. A commit `RF status` asks about goes to John. Make code changes the launch asks for as new commits. Run only the tests in commits that are new or didn't apply cleanly, one at a time. Push the branch to John's fork and leave the previous one alone. If no commits remain, create no branch.
- **Manifest** — append the new revision to `branches`, with its commits, `head`, `pr_title` and `description`; leave earlier revisions in place, since a later trim may restore from them.
- **Findings** — keep every id: never renumber, since gaps show dropped findings and John's notes cite ids. Give a re-included `F` item a new `P` id after verifying it, along with full text and any fix commit. Rewording edits the text fields only.
- **Check** — run `RF validate REVIEW_DIRECTORY` and `RF status` again; the status shouldn't print a trim line any more.

Afterwards, update the record's `index.md` status and handle galaxy-brain commits and pushes per [VAULT_SYNC.md](VAULT_SYNC.md).

## Rounds on Markdown

Trim from John's edits to `verified_findings_checklist.md`. Drop unchecked findings, keep checked ones, and carry out anything John wrote under Other Actions or in the launch. If every finding is checked and nothing was asked, ask John.

- **Review branch** — as above, skipping the commits of unchecked findings. An older round named `pr_<PR_NUMBER>_review_<n>` takes the next free `review_<n>` instead. If a kept commit can't stand without a skipped one, ask John. Write the new branch's `round_<N>_rev_<m+1>_branch_details.md` (or `review_<n>_branch_details.md`) from the previous one with the new SHAs, keeping the finding named on each commit.
- **Findings** — move each unchecked finding from `verified_review.md` to a `## Trimmed by John` section at the end of `filtered_findings.md`, one line each: `- <date> <title>. Discovered by <profile> via <model> at <effort>. Reason: <John's words>`. Take the reason from text John added on the unchecked line or under Other Actions, and leave it out if they gave none; don't infer one. Keep the rest's ids. Apply any rewording asked for; otherwise keep their text.
- **Response** — recompose `initial_review_response.md` following [PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md](PROCESS_COMPOSE_INITIAL_REVIEW_RESPONSE.md), keeping John's edits to the previous one. Leave out the branch details block if no branch commits remain.
- **Checklist and actions** — rewrite `verified_findings_checklist.md` from the kept findings, all checked, with their summaries, Other Actions blank. Leave John's boxes in `initial_response_action.md` as they are; drop Pull request and Push if no branch commits remain.
