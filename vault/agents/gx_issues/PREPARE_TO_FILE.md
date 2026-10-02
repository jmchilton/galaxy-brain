# Preparing to file an issue

Preparing to file takes an issue idea and turns it into an issue description that is ready to post. The idea can be a short name or a path to a file in `to_file/`, or any other issue. The result is a reviewed description that waits for John's decision. It builds on [`GX_ISSUE_DESCRIPTIONS.md`](../_shared/GX_ISSUE_DESCRIPTIONS.md). Never post the issue without an explicit ask.

## 1. Write the issue description

- Write it to `to_file/proposed_<short_name>.md`, following `GX_ISSUE_DESCRIPTIONS.md`.

## 2. Review it with a subagent

- Give a fresh subagent the proposed description and its source material. Ask it to check the description for correctness and clarity against the code and the cited issues and PRs, and to revise it.
- If anything is egregious, such as a claim that isn't reproduced, a wrong premise, or a duplicate issue, the subagent pushes back instead of polishing the text.
- Do one review round only. Report anything left over instead of looping.

## 3. Debrief

Write a debrief of the research and the rewrite to `to_file/debrief_<short_name>.md`.

## 4. Hand off

- Give the user a recommendation on whether to post the issue in its current state.
- If the user wants it posted, post it, then move the source file, the proposal and the debrief to `old/` so that `to_file/` stays clean.
- Infer from context whether John should be assigned, for example when the issue came out of his own branch or work. If so, assign John and add the issue to `ISSUES.md`.
