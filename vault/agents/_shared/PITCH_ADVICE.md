General dos and don'ts for pull request descriptions, issues, and branch pitches.

## DO NOT: Cite an agent as evidence.

- No "an agent found / says / agrees". Agreement between two agents is no evidence at all.
- If an agent surfaced the problem, reproduce it as a failing workflow or real example first. If you can't, don't file.
- Saying an agent was used is fine. Treating it as an authority isn't.

## DO: Avoid vacuous claims.

- A test cited as failing on the base branch must fail at the bug's assertion, not on an API the branch adds.
- If it reads a new field first, run it on the base with that check removed.
- When the branch changes after the description is written, re-check every claim and update `pr_description.md` and any open PR's body to match.

## DO: Use details liberally.

In main body:

- Use `<details>` tags, nested when it helps.
- Hide implementation details in details if they extend beyond a readable paragraph.
- Hide detailed code walks in details. Do not include detailed code walks unless they are needed.

## DO: Be persuasive.

The code and documentation describe implementation details, edges and limitations of features, etc. The PR description is a pitch. It's tempting to jump straight to describing the implementation - readers should be convinced there is a problem or the feature is needed before any implementation description.

## DO: Lead with showing instead of telling.

If the main body can be front-loaded with something visual - please make it so. If the bulk of it can be entirely visual - please make it so. See ./SHOW_ME_RULES.md for guidance.
