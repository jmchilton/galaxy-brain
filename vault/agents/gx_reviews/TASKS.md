```gb-tasks
- prompt: Launch a review of galaxyproject/galaxy#24613
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24613
  description: |
    🔎 nekrut: preserve uninitialized collection elements in model-store export/import; collections, ready, real repro w/ backport.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24666
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24666
  description: |
    🔎 mvdbeek: [26.2] atomic tool source store schema creation (fixes #24519); tools/architecture, still draft.
  status: idea
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24712
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24712
  description: |
    🔎 mvdbeek: [26.0] commit job final state in same transaction as outputs; job-state correctness on a release branch.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24693
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24693
  description: |
    🔎 mvdbeek: [26.2] reject unpopulated collections in output assertions; collections/testing, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24679
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24679
  description: |
    🔎 davelopez: [25.1] fix OAuth2 redirect URIs under URL prefix; auth fix on old release, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24701
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24701
  description: |
    🔎 mvdbeek: [26.2] only pass --home to Singularity when job sets HOME; container runtime behavior change.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24704
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24704
  description: |
    🔎 mvdbeek: [26.2] wrap single values of multiple selects in stored workflow state; workflow state, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24732
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24732
  description: |
    🔎 pujitha24: stricter zip check so a tar ending in a zip isn't treated as that zip; file-type sniffing correctness, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24683
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24683
  description: |
    🔎 mvdbeek: [26.2] model implicit empty boolean conditional branches; tool-state/workflow modeling, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24673
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24673
  description: |
    🔎 mvdbeek: [25.1] fix HDA copies left on a purged dataset by a late job cache hit; data-integrity fix on old release, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24689
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24689
  description: |
    🔎 arash77: [26.1] fix 404 for Tool Shed citable URLs with a trailing slash; small Tool Shed routing fix, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24716
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24716
  description: |
    🔎 itisAliRH: [26.2] apply user tool filter preferences allowed by user_tool_filters; tool panel/config behavior, ready.
  status: idea
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Follow up on galaxyproject/galaxy#24361 (vault/repositories/galaxy/reviews/archived/24361/).
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24361
  record: galaxy/reviews/24361
  kind: human
  description: |
    👀 Approved, mergeable, CI green; author pushed 15da7456dad (2026-11-04) after review — re-check head, then merge.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Needs Follow Ups
- prompt: Follow up on galaxyproject/galaxy#24222 (vault/repositories/galaxy/reviews/active/24222/).
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24222
  record: galaxy/reviews/24222
  kind: human
  description: |
    👀 Approved, mergeable, CI green; author pushed b1bdb4a3271 (2026-11-04) after review — re-check head, then merge.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Needs Follow Ups
- prompt: Follow up on galaxyproject/galaxy#24586 (vault/repositories/galaxy/reviews/active/24586/).
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24586
  record: galaxy/reviews/24586
  kind: human
  description: |
    👀 Approved, mergeable, CI green; author pushed 1a5ce23b263 (2026-11-02) after review — re-check head, then merge.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Needs Follow Ups
- prompt: Launch a review of galaxyproject/galaxy#24757
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24757
  description: |
    🔎 mvdbeek: [25.1] don't return 404 while a dataset is being purged; backend/datasets, ready, no other reviewer requested.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24741
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24741
  description: |
    🔎 mvdbeek: at most one Celery disk usage recalculation per user; backend/celery, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24739
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24739
  description: |
    🔎 mvdbeek: [26.2] decrease owners' disk usage on admin dataset cleanup; backend, ready; related to merged #24511 review.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24750
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24750
  description: |
    🔎 mvdbeek: [26.2] batch session cleanup with read-only previews and retention; admin/database, ready.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#24756
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24756
  description: |
    🔎 nsoranzo: [26.2] COMPLIANCE logger gets user ID, drop relative compliance.log handler; admin/logging, ready.
  status: idea
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
```
