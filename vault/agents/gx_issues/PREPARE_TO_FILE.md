# Preparing to file an issue

Preparing to file takes an issue idea and turns it into an issue description that is ready to post. The idea can be a short name, an incubator record (`vault/repositories/galaxy/issues_incubator/incubating/<short_name>/`), or any other issue. The result is a reviewed description that waits for John's decision. It builds on [`GX_ISSUE_DESCRIPTIONS.md`](../_shared/GX_ISSUE_DESCRIPTIONS.md). Never post the issue without an explicit ask.

RECORD is the incubator record. Create it, with the idea in `raw.md`, if it doesn't exist yet.

## 1. Write the issue description

- Write it to `RECORD/proposal.md`, following `GX_ISSUE_DESCRIPTIONS.md`. If a duplicate is found or it seems like a non-issue, write no proposal; make the case for rejecting it in the debrief instead.

## 2. Review it with a subagent (if proposed)

- Give a fresh subagent the proposed description and its source material. Ask it to check the description for correctness and clarity against the code and the cited issues and PRs, and to revise it.
- If anything is egregious, such as a claim that isn't reproduced, a wrong premise, or a duplicate issue, the subagent pushes back instead of polishing the text.
- Do one review round only. Report anything left over instead of looping.

## 3. Debrief

Write a debrief of the research and the rewrite to `RECORD/debrief.md`. Update `RECORD/index.md`: a `# ` title, then one line describing the issue and your recommendation.

## 4. Hand off

- Give the user a recommendation: post the issue as it stands, keep it internal, or accept a rejection. Issues are meant to be granular, but some are too small to be worth a GitHub issue; recommend keeping those internal.
- If the user wants it posted, run [`file_incubator_issue.py`](../_shared/scripts/file_incubator_issue.py) `RECORD --status STATUS` (add `--assign` per the last bullet). It posts `proposal.md` and moves RECORD to the new `vault/repositories/galaxy/issues/STATUS/<number>/` record. Then triage it per [`ISSUES_INDEX.md`](../_shared/ISSUES_INDEX.md). John can also post it with the 📤 File issue launcher.
- If the user keeps it internal, because it's too small for its own issue or for another reason they give (such as fixing it PR-first), move RECORD to `issues_incubator/internal/`. A branch that implements it links RECORD from its `index.md`.
- If the user decides not to post it or accepts a rejection, move RECORD to `issues_incubator/rejected/`.
- Infer from context whether John should be assigned, for example when the issue came out of his own branch or work. If so, assign John and add the issue to `ISSUES.md`.
