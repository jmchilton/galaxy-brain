# #24469 — collection build from history selection leaves stale selection

https://github.com/galaxyproject/galaxy/issues/24469 — filed 2026-10-26, assigned jmchilton.

- [Issue draft](issue_draft.md) · [Proposal as filed](proposal.md) · [Debrief](debrief.md)

Regression from 08410e96e57 (v25.0.0): `SelectionOperations.vue` binds `@created-collection="createdCollection"`, method deleted.

## Next

Branch off release_25.0 (or oldest supported): restore `createdCollection` emitting `reset-selection` + `update:show-selection` false; red vitest first, then Selenium check in `test_collection_builders.py`. Check rules-builder path also lost a `reset-selection` emit in that commit.
