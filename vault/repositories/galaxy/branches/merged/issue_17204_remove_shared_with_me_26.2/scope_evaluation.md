**Recommendation: keep the approved expanded scope as implemented.** The second scope decision is resolved: ten existing owner bulk messages now use `pluralize`, and the Multiview toast uses the same helper. Together with per-item and bulk recipient removal across histories, workflows and visualizations, the shared API operation for all four shareable types, and workflow bookmark cleanup, this addresses the user-control problem in #17204. No further expansion or contraction is recommended. Finish the already-required static checks and screenshot capture; these are validation steps, not another scope decision.

## Possible Decompositions

At `81e7e68d517`, excluding generated `schema.ts`, the diff changes **1,422 lines: 529 production and 893 tests**. Generated schema adds another 248 lines. These options describe review boundaries; none is a recommendation to split.

The unchanged `1f15cbcd054` Baseline tests commit remains first. The standalone `587abc5643b` refactor introduces `pluralize`, its tests and behavior-equivalent Multiview adoption before feature code. Preserve those foundations, or distribute their relevant test hunks to each resulting branch. Return annotations currently in the later grammar/typing commit should accompany their routes and manager in any split.

| Option | Contents and landing order | Dependencies / preparation |
|---|---|---|
| Single branch | Baseline tests → plural helper refactor → API and per-item UI → bookmark cleanup → bulk UI → owner grammar fixes and review cleanups. | Existing commits already express these boundaries; no rearrangement required. |
| Per-item, then bulk | 1. Shared service, four routes/schema, per-item history/workflow/viz actions and both single-item E2E scenarios. 2. Bulk selection/actions, `settleEach`, bulk history E2E and owner grammar corrections. | Bookmark cleanup can land with the first part because it fixes the result of any share removal. Utility refactor is an independent foundation. |
| Backend, then client | 1. Shared service, four routes/schema, workflow bookmark cleanup and API regressions. 2. Per-item and bulk UI, client tests, E2E and owner grammar corrections. | Client part depends on the API routes; route/manager annotation hunks belong in part 1. |
| Bookmark fix, then recipient feature | 1. Owner-side workflow unsharing drops the recipient bookmark, with its owner-path API test. 2. Recipient operation and all UI/tests. | Rewrite the bookmark tests so the first part does not depend on the new recipient route; move the recipient-path bookmark test to part 2. The owner defect can be reviewed independently. |
| Per type | 1. Common API, schema and bookmark cleanup. 2. Histories, utility helpers and owner grammar. 3. Workflows and owner grammar. 4. Visualization grid actions. | Parts 3 and 4 require `settleEach` from part 2, or it moves into the common foundation. The plural refactor remains independently reviewable. |

## Scopes considered

### 1. Approved expanded implementation — keep

Recipients can remove their own share through the common service for histories, workflows, pages and visualizations. Histories, workflows and visualizations expose single and bulk actions; pages are API-only. Removing a workflow share also removes its recipient bookmark, including when initiated by the owner. Counted owner messages in the two touched lists now select the correct noun.

| Pros | Cons |
|---|---|
| - Restores the missing recipient control described in the issue and covers its explicit batch-removal use case.<br>- Applies the common operation across the sharing model instead of fixing histories alone.<br>- Includes the related stale-bookmark defect and the approved visible grammar fixes.<br>- Existing shared helpers and UI mechanisms carry the general behavior. | - Broader review than the original per-item history symptom.<br>- Bulk workflow and visualization success paths have client coverage rather than their own browser scenarios. |

The live issue confirms that copy/import was already fixed and the outstanding request is recipient unsharing. The [March 2024 comment](https://github.com/galaxyproject/galaxy/issues/17204#issuecomment-1992554082) explicitly discusses batch removal; the [March 2025 instructor example](https://github.com/galaxyproject/galaxy/issues/17204#issuecomment-2767273659) explains why asking each owner to remove a share is impractical. John's [October 2026 analysis](https://github.com/galaxyproject/galaxy/issues/17204#issuecomment-6397738970) identifies the common sharing layer and other shareable types. The implementation covers those cases, not the already-resolved copy behavior.

### 2. Previous scope without owner grammar fixes — superseded

Keep recipient functionality but omit the ten owner-message changes, retaining the helper only for recipient text and Multiview.

| Pros | Cons |
|---|---|
| - Slightly narrower visible-text diff. | - Leaves the exact sibling-code bug John authorized fixing: “delete 1 histories” / “Restored 1 workflows.”<br>- Saves only small string changes and would reverse the approved scope decision. |

The old evaluation's wording implied eleven owner strings plus Multiview. The actual sites are **five owner strings per list plus one Multiview toast: eleven total**. All are now covered. The standalone helper refactor has a real pre-feature caller, resolving the reusable-utility concern as well.

### 3. Reuse `settleEach` in existing owner bulk actions

Move owner delete/purge, restore and tag loops onto the recipient removal algorithm.

| Pros | Cons |
|---|---|
| - Fewer loop patterns in the touched lists.<br>- Could remove bookkeeping that history owner actions no longer use. | - Owner loops currently stop after the first failure; `settleEach` continues. This changes destructive-operation semantics and requires an explicit product decision and regression coverage.<br>- Recipient removal already has one shared algorithm across its three callers; this is not missing generalization of the requested operation. |

This remains a distinct behavior change, not a reason to widen this implementation again. The fresh thermo and baseline reviews independently reached the same conclusion.

### 4. Multiview for shared histories

Expose Multiview in the now-selectable shared-history footer.

| Pros | Cons |
|---|---|
| - Potentially useful while an instructor reviews several shared histories.<br>- Reuses selection and existing history viewers. | - Multiview's “Switch to” operation assumes an owned history, so enabling it safely needs ownership-aware controls and tests in another workflow.<br>- Adds a review/display feature rather than completing removal of shares. |

### 5. Backend batch removal endpoint

Add batch routes and replace the three client loops with one request per bulk operation.

| Pros | Cons |
|---|---|
| - Fewer HTTP requests for a large selection.<br>- Could define a server-side batch result contract. | - The existing batch-delete precedent itself loops over individual operations; batching alone does not provide atomicity or simplify the required per-item failure reporting.<br>- Adds another public contract and generated schema without removing the common operation already implemented. |

The current general piece is the shared recipient service plus `settleEach`; all requested types and bulk views already use it. A batch API would need a separate scalability or transaction requirement to justify its own contract.

### 6. Additional bulk workflow and visualization browser tests

Add browser scenarios matching history bulk removal.

| Pros | Cons |
|---|---|
| - More browser coverage across list implementations. | - Workflow bulk client tests mount real cards and exercise selection plus requests; visualization grid tests cover its handler contract.<br>- Visualization browser setup needs infrastructure absent from the existing suite.<br>- This is a coverage choice already examined in fresh test/E2E reviews, not a missing product use case. |

Existing required screenshots and three browser scenarios still need to run in this hardening pass. That pending validation does not change the scope recommendation.

### 7. Share-time ordering and a shared-with-me pages list

Order histories by when they were shared, and add a page discovery view.

| Pros | Cons |
|---|---|
| - Share-time ordering addresses another observation in the issue thread.<br>- A page list would expose the already-supported recipient API operation. | - Share associations do not currently record share time; ordering needs a schema/data-history design, not a local sort fix.<br>- A pages list is a new navigation and discovery surface, while the existing lists now all expose removal.<br>- Neither is necessary for recipients to clear the problematic listings. |

These are useful independent feature candidates. Their separation follows their data and UI contracts, not merely the release target.

### 8. Further client/router abstraction or unrelated plural cleanup

Introduce an options object/view enum for card actions, a generic sharing router/client dispatcher, or replace plural ternaries throughout the client.

| Pros | Cons |
|---|---|
| - Could standardize broader conventions and reduce positional arguments. | - Existing canonical sharing logic and typed per-type wrappers already cover this operation.<br>- Generic dispatch would add types/casts or alter unrelated callers without removing the current per-view presentation differences.<br>- The approved plural expansion already fixes the counted messages in the touched owner actions; client-wide text work is a separate cleanup. |

### 9. Contract to per-item removal or retarget to `dev`

Drop bulk removal/bookmark cleanup, or move the unchanged implementation off `release_26.2`.

| Pros | Cons |
|---|---|
| - A smaller per-item branch is already preserved as an alt and could reduce initial review size.<br>- `dev` remains an available maintainer preference. | - Contraction removes batch removal explicitly raised in the issue and preserves stale workflow bookmarks.<br>- No migration or API replacement forces a target change; the implementation restores recipient control with additive routes.<br>- The decomposition options provide review boundaries without discarding implemented behavior. |

Keep `release_26.2` and the approved functionality. The release branch alone is not an argument against useful adjacent fixes; those fixes have already been included here.
