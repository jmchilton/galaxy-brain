# galaxy#24410 — User-defined tools: `$(inputs.x.element_identifier)` is `null` when mapped over a list from the tool form or API

[Issue](https://github.com/galaxyproject/galaxy/issues/24410) · [proposal](proposal.md) · [debrief](debrief.md) · [source](raw.md) · branch [`udt_element_identifier_api_test`](../../../branches/merged/udt_element_identifier_api_test/index.md) · related [#24411](https://github.com/galaxyproject/galaxy/issues/24411) (job cache) · research from [foundry#672](../../../../foundry/issues/wip/672/index.md)

Filed 2026-10-23. The fix is on branch `udt_element_identifier_api_test` (head d5ddac3f416, base dev 51e0a80a0db), with red-to-green API tests.

The branch is blocked on two scope decisions: adding the #24411 cache guard, and choosing `null` or the dataset name for plain datasets. `meta.py` was refactored on dev after the branch base, so check the branch on a rebase.

Next: John's scope decision, then a rebase and a PR.
