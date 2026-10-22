# John's Galaxy Brain Review Factory

If a review on your Galaxy pull request linked you here, the findings came from several reviewer agents, were checked by a verifier, and were edited by John before posting. This page explains how the review was put together, what the labels mean, and how to push back.

## Overview

A coordinating agent keeps the review queue. It never reads the whole diff itself; each kind of review runs in its own subagent, at an effort level the coordinator sets explicitly.

```mermaid
flowchart TD
  Q["PR queued for review"] --> P["Reviewer profiles<br/>run in parallel"]
  P --> V["Verify and fix<br/>reproduce, filter, merge"]
  V --> C["Compose response"]
  C --> J{{"John edits and picks an action"}}
  J --> Post(["Review posted"])
  Post -.->|"author pushes changes"| F["Follow-up round"]
  F -.-> P
```

> [!TIP]
> **💭 John's take:** the review weighs most heavily on reusing existing abstractions, staying consistent with sibling code paths, and leaving behind something reusable instead of accreting code. Galaxy is old and well established, so a change that fits what's already there usually beats a clever new path.

## Profiles

Each profile is a short instruction file. The coordinator picks every profile that applies to the PR from the [reviewer registry](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/index.md).

```mermaid
flowchart TD
  PR["Pull request + worktree"] --> Sel["Pick profiles from the registry"]
  Sel --> D["default<br/>every PR"]
  Sel --> R["risk assessment<br/>every PR"]
  Sel --> T["test challenger<br/>PR touches tests"]
  Sel --> TH["thermo review<br/>500+ lines"]
  Sel --> L["learning_galaxy<br/>250+ lines or on request"]
  D --> F["P1 / P2 / P3 findings"]
  T --> F
  TH --> F
  R --> RK["Risks section<br/>pasted as is"]
  L --> LG["Notes for galaxy-brain research<br/>not posted"]
  F --> V(["to verification"])
```

| Profile | Looks for |
| --- | --- |
| [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) | A thorough review weighted by [John's review focus](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/REVIEW_FOCUS.md): reuse, sibling-path consistency, test coverage, typing. |
| [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) | The same [test challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md) John's own branches go through, given as recommendations. |
| [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) | Maintainability: abstraction quality, oversized files, growing tangles of conditionals. |
| [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) | One-way versus two-way doors: what the change would lock Galaxy into. |
| [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) | What a Galaxy developer should learn from architecturally interesting changes. Feeds John's notes, not your review. |

> [!TIP]
> **💭 John's take:** effort is matched to the PR. A bug fix against a release branch gets its test and maintainability challenges at low effort, so it isn't buried in refactoring requests that don't belong in a release. Thermo review starts at 500 lines here, compared with 50 on John's own branches, because John spends more attention on work they author than on PRs they review.

## Verify

When all reports are in, one verification subagent checks them. It estimates the fix for each finding. Fixes under about 200 lines go on a review branch, one commit per finding, often with a test that shows the problem. It then merges duplicates across profiles, renumbers the findings, and filters out the ones that don't hold up.

```mermaid
flowchart TD
  Reps["All profile reports"] --> E["Estimate each fix"]
  E -->|"under ~200 lines"| B["Review branch<br/>one commit per finding"]
  E --> Agg["Merge duplicates, renumber"]
  B -->|"reproduced or fixed"| Agg
  Agg --> Filt{"Keep?"}
  Filt -->|"disproved, not actionable,<br/>re-argues a decision in the PR,<br/>or about untouched code"| FF["Filtered list<br/>for John only"]
  Filt -->|keep| VR["Verified findings<br/>marked implementation verified<br/>when reproduced"]
```

> [!TIP]
> **💭 John's take:** a finding the verifier couldn't stand behind shouldn't cost you time. Disproved and non-actionable findings are dropped, along with anything that re-argues a choice your PR description already explains. Slow test layers are no excuse: if a finding needs an API, integration or Selenium test to prove it, the verifier writes that test.

## Respond

A low-effort subagent assembles the response: space for John's own comments at the top, the risk summary, then the verified findings, each with its evidence, suggested fix, and the review-branch commit if there is one. John edits it and checks the actions to take.

```mermaid
flowchart TD
  In["Verified findings + risks<br/>+ review agent details"] --> C["Compose response"]
  C --> J{{"John edits, adds comments"}}
  J --> A["John checks the actions"]
  A --> Rv["Approve, comment<br/>or request changes"]
  A --> M["Approve and merge"]
  A --> BP["Open a PR from the review branch<br/>against your branch"]
  A --> Pu["Push the review branch<br/>fast-forward only"]
  A --> Is["Open a follow-up refactor issue"]
```

> [!TIP]
> **💭 John's take:** once the review is delivered, the next move is yours. The agents are told never to nudge you, bump a stale thread, or chase a PR. They come back only when you push changes that need checking, or when John has promised a follow-up.

## Reading a review from this factory

- **P1** must be fixed before merge, **P2** should be fixed, and **P3** is minor or a nit. The agents assign these ratings. If John hasn't called out a P3 above the findings, feel free to ignore it.
- **(implementation verified)** means the verifier reproduced the problem, wrote a test for it, or fixed it on the review branch.
- **The review branch** is the verifier's working copy, not production-ready code. Take any commits that help; a human should still review them.
- **Suggested follow-up refactoring** appears when the review recommends work that doesn't fit your PR or its target branch. It's offered as draft issue text, not as a merge blocker.
- **Disagree?** Please push back. You're contributing to a repository John cares about, and you deserve a human response. If a finding is wrong or missing context, say so.

> [!NOTE]
> The "Automated Review Details" block near the top of each review lists which profiles ran, on which model, and at what effort. The full process is in [`PROCESS_INITIAL_REVIEW.md`](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md).
