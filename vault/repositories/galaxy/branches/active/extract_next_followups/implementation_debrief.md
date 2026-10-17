# extract_next_followups: implementation debrief (E8, 2026-10-17)

**STATUS: READY.** John asked for E8 after the scope decisions, and it is done. Head `891572be9e0` on `jmchilton/extract_next_followups`, base `release_26.2`; one commit on top of `0a2f2198beb`. The previous debrief, which covers retarget, E5–E7 and all validation up to `0a2f2198beb`, is in [earlier_drafts/4](earlier_drafts/4/implementation_debrief.md). Its "what changed" list and validation table still apply.

## E8: synthesized boundary rows list the local copy

- **Bug, reproduced red.** On the page summary, a boundary input with no row of its own got a synthesized input row resolved by *original* id. A hidden element of a collection copied from another user's history is one such input. The row listed the source element, in a history that may no longer be accessible, not this history's copy.
- **Fix.** In `workflow_extraction_summary.py`, `HistoryBoundary` now keeps `local_copies`, a read-only map from original ref to this history's copy, preferring an undeleted copy. `_synthesize_boundary_inputs` uses that copy and falls back to the original only when no copy is here. `produced_elsewhere` is unchanged and checks the map's keys.
- **Tests.**
  - API test: `test_element_of_collection_copied_from_unshared_history_seeded_as_local_copy`. Another user publishes a list, we copy it and run `cat1` on a hidden element, then they disable link access. The row must list our element, no source element id may appear, and the extracted workflow must be wired.
  - Unit test: `test_boundary_prefers_undeleted_local_copy`.

## Review (normal subagent)

There is no review debrief file, because the review flagged a possible security item, which was handled privately per policy. What was acted on:
- explicit `None` fallback instead of `or`
- `MappingProxyType` for the map on the frozen dataclass
- unit test for the undeleted-copy preference
- API assertion that no source element id is listed

Not acted on, and why:
- **One shared ref→copies index for the boundary and `_collections_by_original`.** `_collections_by_original` keeps every copy of a collection and also runs on the history path, where there is no boundary. Merging them would rework `_summary_rows` for no behavior gain, so it remains a refactor follow-up.
- **When every local copy is deleted or purged, the row lists a deleted copy.** This matches `summarize`, which also walks deleted contents, so it was accepted.
- **Hashing the frozen boundary raises.** Nothing hashes it.

## Validation (at `891572be9e0`, unless noted)

| Suite | Result |
|---|---|
| `test_pages_history_attached.py` | 58 passed (full suite, before the review tweaks); after the tweaks, the 10 seeded/copied tests passed again |
| `test_workflow_extraction_summary.py` unit | 18 passed |
| mypy (`lib/`) | Only the unrelated `notification.py:862` error |
| black / ruff / pre-commit | clean |

`test_workflow_extraction.py` was not rerun, because `HistoryBoundary` is only used on the page path.

**Remaining:** fork CI on the new base. The branch must still merge before 26.2.0 because of the API rename.
