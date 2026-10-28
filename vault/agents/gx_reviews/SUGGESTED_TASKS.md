## Review New PRs

when: daily
what: newly opened `galaxyproject/galaxy` PRs; pick at most 5 worth reviewing per "Choosing new reviews" in ./AGENTS.md, skipping any already tracked (active or archived records) and any with an outstanding review request to someone other than John.

For each PR number `n`, `description` is a one-line summary from the PR text plus why it was picked. `status` is `recommended` for picks that fit the preferences in ./AGENTS.md (e.g. out of draft), otherwise `idea`.

Suggest:

```
prompt: Launch a review of galaxyproject/galaxy#{n}
agent_dir: gx_reviews
link: https://github.com/galaxyproject/galaxy/pull/{n}
description: 🔎 {description}
status: {status}
priority: low
```

## Respond to Reviews

when: whenever
what: review records whose `initial_response_action.md` has checked boxes but whose response hasn't been acted on (no jmchilton review or comment on the PR since the report).

`description` is the checked actions, comma-separated.

Suggest:

```
prompt: Respond to galaxyproject/galaxy#{n}. This launch is my approval to run the action outlined in the relevant initial_response_action.md file - which may include opening pull requests, creating issues, pushing commits to the target PR branch, and posting comments.
agent_dir: gx_reviews
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/reviews/{n}
profile: Sonnet (medium)
description: 💬 {description}
status: recommended
```

## Needs Follow Ups

when: whenever
what: active review records waiting on John rather than an agent or the author (see "Delivery and follow-up" in ./AGENTS.md):

- the latest round's generated review (e.g. `initial_review_response.md`, `draft-review.md`) is unposted and its `initial_response_action.md`, if any, has no checked boxes, with no jmchilton review or comment on the PR since;
- an approved PR with green checks awaiting John's merge;
- a decision or follow-up the record's `index.md` says is waiting on John.

Skip records the Respond to Reviews section covers. `description` is why it needs John, in one line.

Suggest:

```
prompt: Follow up on galaxyproject/galaxy#{n} (vault/repositories/galaxy/reviews/active/{n}/).
agent_dir: gx_reviews
link: https://github.com/galaxyproject/galaxy/pull/{n}
record: galaxy/reviews/{n}
kind: human
description: 👀 {description}
status: recommended
priority: high
```

@../_shared/BLOCKER_SUGGESTED_TASKS.md
