---
related_records: foundry/issues/674
---
# #758 Foundry pages say Galaxy `when` cannot act per element, but a mapped gate can

[Issue](https://github.com/galaxyproject/foundry/issues/758). Split from #674 at John's request, 2026-11-07, and filed `roadmap/off`, `priority/mvp`, `work/ready-implement`, `documentation`. The body holds the page table and proposed approach.

## Status

`queued_implement`: no branch or PR.

## Findings

- Land after #755, whose "Mapped branches" section the pages link. #755 was open and mergeable on 2026-11-07.
- #712 deletes the cleanup pattern's line, so re-check that row before editing it.
- `source-patterns/nextflow/branch-filter-ifempty-to-galaxy-filters-gates` wasn't in #674's scope. A search for the claim found it.

## Next

Implement per the issue, after #755.
