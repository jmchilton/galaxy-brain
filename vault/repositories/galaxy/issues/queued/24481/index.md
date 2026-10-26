# #24481 — Mapping collection outputs over sample sheets precreates invalid types

- Issue: https://github.com/galaxyproject/galaxy/issues/24481 (filed 2026-10-26, assigned jmchilton)
- [issue_draft.md](issue_draft.md) — original draft
- [proposal.md](proposal.md) — posted proposal
- [debrief.md](debrief.md) — reproduction and review notes

## Next

Add a regression test for mapping a fixed `list` collection output over a sample sheet, then resolve whether to normalize the outer level to `list` or support additional sample sheet nesting. Preserve the existing column definitions and row values.

## Context

The reviewed in-process reproduction confirms that collection precreation succeeds with `sample_sheet:list` and `sample_sheet:list:paired`, while explicit type validation rejects both. `sample_sheet:paired` is a valid control. No submitted API job or browser reproduction has been performed.

Discovered during [#24303](https://github.com/galaxyproject/galaxy/issues/24303); its [type_prefix branch](../../../branches/active/issue_24303_collection_type_prefix_26.2/index.md) leaves this outer mapping composition problem as a separate follow-up.
