Fix 🎯 #17204 — let recipients remove items from Shared with Me, individually or in bulk.

Old training histories and workflows can accumulate in a recipient's shared lists; clearing them currently requires asking their owners to unshare them. This restores recipient control through **Remove from Shared** on history and workflow cards and the shared visualization grid, with bulk removal in all three views.

![Confirm removing two shared histories while retaining a third](screenshots/history_sharing_bulk_unshare_with_me_confirm.png)

***Recipients remove their own share; the owner's item and other recipients' shares stay intact.*** The confirmation explains that the owner must share the item again to restore its shared-list membership. Public or link-based access remains governed by the existing visibility settings.

***Histories, workflows and visualizations gain individual and bulk UI actions; pages gain the API operation only.*** This addresses recipient removal, including the issue's batch-cleanup request. It does not change workflow execution or add a shared-pages list.

Removing a workflow share also removes that recipient's tool-panel bookmark, whether the owner or recipient initiates removal. Bulk operations continue after individual failures and report their names and errors. Existing owner bulk messages now use the correct singular/plural nouns. A small event-type correction removes an existing client `as any` without changing editor behavior.

<details><summary>Result and implementation</summary>

![Only the unselected history remains](screenshots/history_sharing_bulk_unshare_with_me_removed.png)

The common sharing service exposes `PUT /api/{histories,workflows,pages,visualizations}/{id}/unshare_with_me`; each call removes only the authenticated recipient's association. There is no database migration. Client requests use generated route types. Shared list selection exposes the removal action while Delete/Backspace remains guarded from owner-only actions.

Workflow bookmark rows are deleted with both recipient and workflow predicates in the same transaction as the share. This avoids an existing relationship's cartesian-product warning becoming a server error under strict SQLAlchemy settings. Both owner- and recipient-initiated regression cases were reproduced failing before that correction and pass afterward.

</details>

## Risks

The additive API and recipient-controlled removal establish a lasting contract; restoring a removed private share requires its owner to share it again.

<details><summary>Risk Details</summary>

- Bulk removal commits each item separately. A failure can leave a partially completed selection; failures are reported rather than rolled back as a group.
- Workflow unsharing now drops the affected recipient's bookmark, including through the existing owner operation. Owner and other-recipient bookmarks are preserved.
- The common operation covers four shareable types, while pages remain API-only.
- No schema migration, workflow execution change, or owner bulk error-handling change is included.

</details>

<details><summary>Risk Review Advice</summary>

Review the authenticated-recipient lookup and the recipient/workflow predicates on bookmark cleanup. Check the confirmation text, partial-failure feedback, and shared-view keyboard guards. Bulk workflow and visualization interactions have client coverage; browser scenarios cover single history, bulk histories and single workflow removal.

</details>

## Context

The issue's [batch-removal discussion](https://github.com/galaxyproject/galaxy/issues/17204#issuecomment-1992554082) and [instructor example](https://github.com/galaxyproject/galaxy/issues/17204#issuecomment-2767273659) explain why owner-driven cleanup is insufficient. Alternative kept on 🌿[original per-item scope](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2_alt_original_scope) — omits bulk removal and bookmark cleanup. Alternative kept on 🌿[before plural-message expansion](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2_alt_before_plural_messages) — retains bulk removal but omits the approved owner-message corrections. Alternative kept on 🌿[before baseline refactor extraction](https://github.com/jmchilton/galaxy/tree/issue_17204_remove_shared_with_me_26.2_alt_before_baseline_refactor) — preserves the same pre-polish source tree with different commit boundaries. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Individual and bulk recipient removal, bookmark cleanup and the approved message corrections form the retained scope.</summary>

The recorded evaluation compares per-type and backend/client splits, API batching and narrower per-item alternatives. Owner-loop error-semantics changes, shared-history Multiview and a shared-pages list remain separate work.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>The shared service and bulk utilities have concrete consumers without a generic UI orchestration layer.</summary>

The complete pre-polish implementation was reviewed for abstraction and complexity. Polishing subsequently replaced ORM row-by-row bookmark deletion with a scoped DELETE after strict-warning API execution exposed the relationship-load failure; the follow-up checklist review covers that correction.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Tests exercise cancellation, partial failures, access loss, retained shares and bookmark cleanup.</summary>

Baseline tests remain in the leading commit. Fresh polishing checks pass 42 focused client tests, then all six visualization tests including the added cancellation case (43 focused cases total), and all 14 workflow-sharing API tests with strict SQLAlchemy warnings, including both bookmark regressions. Three browser scenarios and six inspected screenshots were recorded before polishing; those screenshots show the unchanged removal UI.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>The plural helper and behavior-equivalent Multiview caller precede the feature commits.</summary>

The isolated helper refactor follows the leading baseline tests. History extraction preserved the complete pre-polish source tree; its isolated client checks passed 10 tests.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment?
- [x] What does the user see when it fails? Errors name failed removals; bulk actions continue and refresh, and failed workflows remain selected.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Tests cover observable cancellation, error, access, list and bookmark behavior.
- [x] Are baseline tests in their own leading commits? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? N/A.
- [x] Which existing workflows change behavior? Shared workflow lists gain recipient removal, and unsharing clears that recipient's bookmark.
- [x] Who hits this in practice and what is the evidence? Recipients with accumulated shares, including the instructor example in #17204.
- [x] Were simpler or existing approaches considered? Existing sharing, selection, dialog and grid infrastructure is reused; scope alternatives are documented above.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Test coverage and execution</summary>

API regressions cover all four shareable types, recipient access, repeat removal, other-recipient preservation and owner/recipient workflow bookmark cleanup. Client coverage exercises action visibility, cancellation, partial failures and keyboard guards. Browser scenarios exercise individual history/workflow removal and two-of-three history bulk removal.

Fresh polishing: the initial seven-file client run passed 42 tests; the expanded visualization suite then passed six (43 focused cases total). All 14 strict-warning workflow-sharing API tests pass. Client type checking and Python formatting pass; full mypy reports the same 32 existing errors as the release-base comparison. Before polishing: all three browser scenarios passed and six screenshots were inspected. Fork CI is rerunning on the polished head; the previous head's API bookmark failures were reproduced and fixed locally. Its unrelated integration failure was a Pulsar job-state timing assertion; macOS jobs were cancelled before executing steps.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
