## Review New PRs

when: daily
what: newly opened `galaxyproject/galaxy` PRs; pick at most 5 worth reviewing per "Choosing new reviews" in ./AGENTS.md, skipping any already tracked (active or archived records).

For each PR number `n`, `description` is a one-line summary from the PR text plus why it was picked. `status` is `recommended` for picks that fit the preferences in ./AGENTS.md (out of draft, no recent review request to someone else), otherwise `idea`.

Suggest:

```
prompt: Launch a review of galaxyproject/galaxy#{n}
agent_dir: gx_reviews
description: 🔎 {description}
status: {status}
```

## Respond to Reviews

when: whenever
what: review records whose `initial_response_action.md` has checked boxes but whose response hasn't been acted on (no jmchilton review or comment on the PR since the report).

`description` is the checked actions, comma-separated.

Suggest:

```
prompt: Respond to galaxyproject/galaxy#{n}. This launch is my approval to run the action outlined in the relevant initial_response_action.md file - which may include opening pull requests, creating issues, pushing commits to the target PR branch, and posting comments.
agent_dir: gx_reviews
profile: Sonnet (medium)
description: 💬 {description}
status: recommended
```
