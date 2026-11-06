## Review New PRs

when: daily
expires: pr_closed
what: open `galaxyproject/galaxy` PRs, skipping any already tracked (active or archived records):

- direct asks, however old and uncapped: John is directly in `reviewRequests` (not via a team), or a comment newer than his latest review or comment asks him to look again. Say so in `description`. `priority` is `high`.
- new picks: newly opened PRs; pick at most 5 worth reviewing per "Choosing new reviews" in ./AGENTS.md, skipping any John has already reviewed or commented on (check each candidate's `reviews` and `comments` with `gh pr view`, since search negations lag) and any with an outstanding review request to someone other than John. `priority` is `low`.

For each PR number `n`, `description` is a one-line summary from the PR text plus why it was picked. `status` is `recommended` for direct asks and for picks that fit the preferences in ./AGENTS.md (e.g. out of draft), otherwise `idea`.

Suggest:

```
prompt: Launch a review of galaxyproject/galaxy#{n}
agent_dir: gx_reviews
link: https://github.com/galaxyproject/galaxy/pull/{n}
description: 🔎 {description}
status: {status}
priority: {priority}
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
expires: pr_closed
what: active review records waiting on John rather than an agent or the author (see "Delivery and follow-up" in ./AGENTS.md):

- the latest round's generated review (e.g. `initial_review_response.md`, `draft-review.md`) is unposted and its `initial_response_action.md`, if any, has no checked boxes, with no jmchilton review or comment on the PR since;
- an approved greenish PR with awaiting John's merge; if John has already posted a review and they haven't responded to review (with commits or messages) - you should wait 7 days until suggesting this action
- a decision or follow-up the record's `index.md` says is waiting on John;
- a PR where John is directly in `reviewRequests` again (not via a team), or a comment newer than his latest review or comment asks him to look again.

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
