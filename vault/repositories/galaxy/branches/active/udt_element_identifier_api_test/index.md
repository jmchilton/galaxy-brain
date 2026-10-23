# udt_element_identifier_api_test

- [Open PR](https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:udt_element_identifier_api_test?expand=1)
- [View on GitHub](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test)

## Status

BLOCKED on a scope decision. The fix works (UDT `$(inputs.x.element_identifier)` was `null` when mapped over a list from the tool form/API); the second scope evaluation wants a job-cache guard. See [implementation debrief](implementation_debrief.md).

No PR.

Base: `dev` (`51e0a80a0db`), head `d5ddac3f416`; alt `udt_element_identifier_api_test_alt_original_scope`. Fork: `jmchilton/udt_element_identifier_api_test`. Worktree: `~/projects/worktrees/galaxy/branch/udt_element_identifier_api_test`.

## Issue

[#24410](https://github.com/galaxyproject/galaxy/issues/24410), filed 2026-10-23; tracked in `vault/repositories/galaxy/issues/wip/24410/`. Job-cache guard: [#24411](https://github.com/galaxyproject/galaxy/issues/24411) (`queued/24411/`).

## Decisions

- Red tests came from Foundry issue #672 research ([notes](../../../../foundry/issues/wip/672/index.md)).
- Fix reads the identifier already persisted as `<name>|__identifier__` job param (same source as Cheetah's `ElementIdentifierMapper`); does not change job tool_state to `{"src": "dce"}`.
- Base `dev`: UDT runtime code in `evaluation.py`/`runtime.py`/`modules.py` diverges heavily from `release_26.1` (no shell_quotable/deferred plumbing) and `release_26.0` (no runtimeify). Backport is an open question.
- Plain (non-mapped) dataset still renders `null`; labels and Cheetah fall back to HDA name. Left as-is, flagged in issue text.
