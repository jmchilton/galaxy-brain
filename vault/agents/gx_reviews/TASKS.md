```gb-tasks
- prompt: Launch a review of galaxyproject/galaxy#24613
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24613
  description: |
    🔎 nekrut: preserve uninitialized collection elements in model-store export/import; collections, ready, real repro w/ backport.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#25042
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/25042
  description: |
    🔎 mvdbeek [25.1]: keep step input defaults when saving from workflow editor; ready, workflows, +355 lines.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Follow up on galaxyproject/galaxy#23522 (vault/repositories/galaxy/reviews/active/23522/).
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/23522
  record: galaxy/reviews/23522
  kind: human
  description: |
    👀 John directly in reviewRequests; only a comment posted 2026-10-28, natefoo/mvdbeek discussion since.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Needs Follow Ups
  snoozed_until: 2026-11-30
- prompt: Launch a review of galaxyproject/galaxy#24154
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24154
  description: |
    🔎 Direct ask: John in reviewRequests (never reviewed). mvdbeek [26.1] filtered outputs as skipped placeholders for skipped jobs; draft, +83/-2.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
  snoozed_until: 2026-11-30
- prompt: Launch a review of galaxyproject/galaxy#25060
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/25060
  description: |
    🔎 mvdbeek [26.2]: fix remote tool evaluation for user-defined tools; ready, jobs, +85/-6, follows #25023 which John reviewed.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#25002
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/25002
  description: |
    🔎 mvdbeek: rename workflow outputs from connected step inputs via $(inputs.name); ready, workflows, +749/-22.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#25026
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/25026
  description: |
    🔎 guerler: keep quoted delimiters inside their column in CSV dataproviders; ready, backend, +100/-9.
  status: recommended
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Launch a review of galaxyproject/galaxy#25008
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/25008
  description: |
    🔎 pauldg: drop pgcrypto requirement from purge_deleted_users_gdpr, redact old private role names; ready, backend/migrations, +57/-10.
  status: idea
  priority: low
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Review New PRs
- prompt: Follow up on galaxyproject/galaxy#24818 (vault/repositories/galaxy/reviews/active/24818/).
  agent_dir: gx_reviews
  link: https://github.com/galaxyproject/galaxy/pull/24818
  record: galaxy/reviews/24818
  kind: human
  description: |
    👀 John directly in reviewRequests; initial review unposted (only P2 1 + P3 1 comments 2026-11-12, no reply); PR now CI-green/clean.
  status: recommended
  priority: high
  suggested_by: gx_reviews/SUGGESTED_TASKS.md#Needs Follow Ups
```
