---
upstream_base_branch: release_25.1
---
# issue_24469_collection_build_reset_selection_25.1

- [PR #24487](https://github.com/galaxyproject/galaxy/pull/24487)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/issue_24469_collection_build_reset_selection_25.1)

## Status

Status: `ready`; head `82dba888f08` (fast-forwarded to davelopez's jmchilton/galaxy#97, dropdown-driven Jest tests), targeting `release_25.1`.

Draft PR [#24487](https://github.com/galaxyproject/galaxy/pull/24487) opened at John's request on 2026-10-26.

PR approved by davelopez and itisAliRH; CI rerunning on `82dba888f08`, local Jest 29/29.

## Approval

John requested opening the PR on 2026-10-26 for SHA `83ed090f9b4d88eaefd0d15e2c2f0616f7d1f311`, using the selected title `[25.1] Fix stale history selection after Auto/Advanced Build List` and recorded labels. Opened as draft while CI is queued; the user-marked human checklist was preserved verbatim.

Screenshots are hosted on the fork's `pr-assets-issue_24469_collection_build_reset_selection_25.1` branch at `63a19b1a86ca44553ab84b3b798bf3afe069e28f`.

Fixes galaxyproject/galaxy#24469 ([issue record](../../../issues/queued/24469/index.md)): building a collection from a history selection leaves selection mode on.

## Decisions

- Merge-forward to 26.0+: swap `jest.fn()` → `vi.fn()` in SelectionOperations.test.js (vitest `globals: false`, per itisAliRH).
- Cancel-loses-selection tradeoff queued as follow-up: [incubator](../../../issues_incubator/incubating/collection_wizard_cancel_restore_selection/index.md).

- Base `release_25.1` per John (issue notes said 25.0, unsupported).
- Reset selection when opening the list wizard (issue path), not on create; cancel drops selection. Restored `createdCollection` for build-list-all modal.

[implementation](implementation_debrief.md) · [initial](initial_implementation_debrief.md) · [scope](scope_evaluation.md) · [screenshots](screenshot_debrief.md)

[PR description](pr_description.md) · [Title options](pr_titles.md) · [Labels](pr_tags.md) · [Polish debrief](polish_debrief.md)
