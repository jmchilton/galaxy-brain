Keep the expanded scope as implemented: the requested FAQ extraction now includes a general display-catalog helper for both populated and valid empty catalogs; no further expansion or contraction is recommended.

## Possible Decompositions

The branch exceeds 100 lines of non-generated additions. These are logical PR boundaries for John to choose later, not a recommendation to split:

1. **Account FAQ helpers and storage Refresh:** reset-request extraction and existing consumer, Manage Information navigation/save and existing consumers, unique public-name fixtures, storage Refresh selectors/helper/baseline test, and their screenshots. Preserve the storage baseline before its helper extraction.
2. **Workflow editor FAQ helpers:** editor tag selectors/helper/baseline test, Best Practices inspection and existing consumer migrations, and screenshots. Preserve the tag baseline before extraction.
3. **Dataset display catalog:** populated and empty baseline tests, successful-dataset readiness instrumentation and realistic existing component fixture, semantic hooks for modern/legacy display applications, catalog helper, existing Visualize target reuse, and screenshots. Preserve both baseline tests before extraction and the empty-helper migration.

These pieces have no behavior dependency on one another and could land in any order. Splitting requires partitioning the shared baseline and extraction commits while retaining each piece's test-before-refactor sequence. The current combined sequence is `1046d1b61d2` → `85060de5c87` → `fbb015b3916`.

## As implemented: FAQ extraction plus complete loaded-catalog inspection

Extract the selected account, storage, workflow-editor and dataset-display tests/helpers onto the QA target release_26.2. Include the first evaluation's modest generalization: `dataset_display_applications()` returns labels/link texts for populated catalogs and `{}` for a successfully loaded dataset with no applications, with a provider identity boundary distinguishing absence from loading/failure.

| Pros | Cons |
| --- | --- |
| • Delivers the browser abstractions explicitly requested by UPSTREAM_TESTS.md.<br>• Covers both ordinary catalog outcomes through one reusable operation.<br>• Migrates real existing consumers and preserves release-behavior baselines.<br>• Keeps the catalog return shape small and useful. | • Bundles several FAQ surfaces in one branch.<br>• Adds client test instrumentation to expose successful loading.<br>• Catalog inspection reports labels/text rather than navigation destinations. |

<details>
<summary>Why this scope is now sufficient</summary>

This is the second scope evaluation, after implementing the first evaluation's expansion. The earlier helper could inspect only datasets with applications because it waited for an item. The current contract covers the additional ordinary case directly, without an empty-case mode or a different return type. The successful-ID marker and fixture correction complete that generalization's boundary; they do not introduce an independent feature.

The project goal is to extract and harden browser interaction abstractions from FAQ QA runs, with missing coverage treated as a release-quality bug. A contraction to tests alone would miss that explicit goal. Conversely, no reviewed implementation note identifies another related product bug or missing ordinary case that must be added to make this batch's operations useful. The normal review findings concerned readiness and formatting and were addressed; the test challenge corrected baseline placement and fixture realism; the strict review and polish found no additional scope request.

The preference for modest expansion is satisfied by the implemented populated/empty generalization. Keeping it is recommended because it now supplies a complete catalog-reading operation for the intended normal states, not because this is a release branch or because another rescope would require a user decision.

</details>

## Expand: expose display-link destinations and targets

Return structured per-link metadata including href/router destination and target, and add browser assertions that the configured destinations are actionable. This is the broader display-link inspection option considered in the first evaluation.

| Pros | Cons |
| --- | --- |
| • Gives automation a richer account of modern and legacy link semantics.<br>• Could support future QA that follows or validates individual display links. | • Introduces a new result shape and a second operation beyond catalog inspection.<br>• No selected caller currently needs destination metadata.<br>• Following external links introduces additional external/configuration concerns. |

Do not expand this branch to that contract. The existing component test already retains destination assertions for both rendering variants, while the new browser operation intentionally answers which applications/links a dataset offers. No source request or review finding establishes destination metadata as a prerequisite for this batch. A dedicated navigation operation can be designed around a real consumer instead of enlarging this catalog result speculatively.

## Expand: more profile, tagging or catalog mutation operations

Add operations such as removing/replacing workflow tags, further profile fields, switching between multiple catalog datasets in one QA flow, or a generalized browser inspection model. These could reuse touched areas but would extend beyond the selected extracted operations.

| Pros | Cons |
| --- | --- |
| • Could support additional QA scenarios through shared abstractions.<br>• May expose further reusable operations in neighboring components. | • Adds distinct requested actions rather than completing a missing normal outcome of an existing operation.<br>• No current extracted caller or review finding requires them.<br>• A generic inspection model would impose a larger contract on unrelated UI surfaces. |

Do not recommend these additions now. The useful small generalization identified in this work was successful empty-catalog handling, and it is implemented. New mutation operations should be driven by their own training/QA scenario rather than treated as necessary breadth for this extraction.

## Contract: return to populated catalogs only

Drop the empty-catalog helper extension, its baseline case and successful-load marker, preserving the first implementation's populated-catalog operation.

| Pros | Cons |
| --- | --- |
| • Removes the additional catalog state and its instrumentation.<br>• Closely matches the initially extracted example. | • Reintroduces a normal valid dataset state that yields an item-presence timeout.<br>• Discards the first evaluation's useful generalization and its real consumer.<br>• Makes the helper less suitable for QA across arbitrary dataset types. |

Do not contract. Empty catalogs belong to the catalog-reading operation, and support for them is now implemented without a larger public data model.

## Contract: retain coverage but inline the helpers

Keep baseline browser coverage and remove reusable helper extraction, existing consumer migrations and semantic inspection hooks.

| Pros | Cons |
| --- | --- |
| • Reduces the browser helper API surface.<br>• Leaves independently useful release-behavior tests. | • Fails the explicit goal of extending interaction abstractions for QA.<br>• Restores duplicated account/Best Practices paths and raw traversal.<br>• Removes operations that already have real callers. |

Do not contract to coverage alone. Reusable helpers are a central deliverable, not optional cleanup.

## Expand: combine password-reset regression and neighboring batches

Bring actual emailed-password reset/session behavior, issue #24457, more FAQ batches, gxui command changes, or training-document updates into this branch.

| Pros | Cons |
| --- | --- |
| • Could combine more findings from the training effort.<br>• Could provide a broader end-to-end account-recovery story. | • Duplicates the explicitly separate password-reset release_25.1 workstream.<br>• Combines independent product, CLI and documentation deliverables.<br>• Adds no prerequisite to the selected release_26.2 extraction. |

Keep these established workstreams separate. The reset-request helper remains here because its existing request test consumes it; actual emailed reset/session coverage belongs to the separate bug branch. This follows the user's concrete division of work rather than a general preference for narrow release-branch changes.

## Disposition

No second rescope is requested. Continue hardening and screenshot verification of the current expanded implementation. This evaluation made no code or history changes and does not replace correctness or runtime reviews.
