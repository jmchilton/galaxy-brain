Codex (re-harden pass, scope B, `65132d40dac..8aca76c30be`) raised two P2s. I acted on half of the first one and on neither part of the second.

- **Acted on:** the readiness gate in `_workflow_card_named` compared titles case-sensitively, while the server's search matches names with `ilike` (`index_filter_util.py:26`). So a list holding `NAME` and `name (copy)` never passed the gate, and the helper timed out. The gate is now case-insensitive. Folded into `55f2a4f725b` (was `4b4eb906101`). The final tree differs from the polished one only by this change, and pre-commit passes.

Not acted on:
- **Finding 1, tag/owner/annotation matches.** A search result that matches NAME only through a tag, owner or annotation still blocks the gate, and the helper times out instead of clicking. This limit was already known and documented (pass 1 codex review and scope evaluation). Under a stale list, failing safe is the point of the gate. The E2E callers use random names, so they don't hit it.
- **Finding 2, pagination.** If 24 or more newer matching workflows fill the first page, the exact title sits on page 2 and the helper times out. This is NEEDS-DECISION, not a defect for these callers: no test creates that many name-prefixed siblings, and the old helpers clicked the wrong workflow in that state. A fix (a `name:` filter, or paging) belongs in follow-up E.

<details><summary>Full Codex output</summary>

Coverage: all six changed files plus WorkflowList/Card/CardList/useWorkflowCardActions, GCard, GOverlay, has_driver, playwright_element, smart_components, managers/workflows.py, index_filter_util.py, populators, framework, test_workflow_run. Codex did not run any E2E tests.

1. **P2, navigates_galaxy.py:1836.** "Valid search results can prevent selecting an exact title." The readiness guard rejects the whole list before it looks for an exact title whenever any title lacks the case-sensitive substring. Search matches names, tags and owners case-insensitively, so the helpers time out. Scenario: workflows "NAME" and "name (copy)", or an unrelated workflow tagged "NAME". Confidence: certain. **Partially CONFIRMED.** The case part is fixed. The tag/owner part is a known limit and was left alone.
2. **P2, navigates_galaxy.py:1840.** "Exact titles beyond the first search-results page are never examined." WorkflowList pages 24 at a time, newest first. Scenario: "NAME" followed by 24 newer "NAME (copy)". Confidence: certain. **NEEDS-DECISION.** The behaviour is real, but it is out of reach of the callers and the old helpers misclicked in that state.

</details>
