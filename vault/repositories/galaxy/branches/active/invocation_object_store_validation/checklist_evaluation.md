## John's Checklist

- [ ] Did a human read every test and every comment? Requires human author to check.
- [x] What does the user see when it fails? HTTP 400 with the existing object-store selection-policy message, before creation of the requested history; conflicting general/split selections also fail before history creation.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; the parametrized API regression checks HTTP 400 and absence of a uniquely named history for all three fields, while existing integration tests check actual default, selected, and split dataset placement.
- [x] Are the comments free of excess archeology? Yes; no comments are added.
- [x] If comments contain some description of previous implementation, bugs, etc. - what purpose do they serve? N/A.
- [x] Which existing workflows change behavior (if any)? Requests supplying an unselectable store ID in any of the three preference fields now fail before invocation/history creation; valid selections and omitted/null/empty preferences retain existing handling.
- [x] Who hits this in practice and what is the evidence? Invocation API clients supplying stale, unknown, or disallowed store preferences; the recorded baseline reproduction returns HTTP 200 for each of the three invalid-field requests, and the regression checks rejection without a leftover history.
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Reuses the existing preference validator; leaving exclusivity validation late preserves the same unwanted history side effect, while generalized preflight adds unrelated scope.

<details><summary>Review evidence and limits</summary>

Reviewed supplied exact two-file diff for polish head `90ef0b0382b6614a1bcea0204300d813baa2091e` against release_26.2 `579ca73440d776002b7099538cef000838687d8e`, plus current validator/object-store implementations, full relevant code, branch implementation debrief, scope evaluation, prior normal review and test challenge. No actionable blocker or necessary code fix found. The current validator call precedes normalization, input expansion, and `_get_target_history`; stored preference values and the existing general/split predicate remain unchanged. The only wording change corrects the exclusivity message grammar.

Existing positive controls are `test_workflow_objectstore_selection` and `test_workflow_mapped_collection_objectstore_selection_split` in `test/integration/objectstore/test_selection_with_user_preferred_object_store.py`. They check real backend placement and request serialization, including separate output/intermediate stores. Historical implementation evidence reports baseline 3 failures returning 200, fixed 3 API passes and 2 integration passes. This read-only review did not run tests; fresh test/CI results must be reported separately by the polishing owner. Human-read remains unchecked.

Potential misunderstanding to address in description: this validates request-selected storage before side effects; it does not change how valid storage choices are routed or attempt a generalized invocation preflight. The user-visible change includes earlier rejection of the existing general/split conflict, which should be mentioned alongside invalid IDs.

</details>
