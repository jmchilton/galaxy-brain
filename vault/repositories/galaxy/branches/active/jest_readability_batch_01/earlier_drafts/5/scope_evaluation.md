Recommendation: retain the implemented scope of five selected client unit-test files plus evidence-backed client testing guidance; defer shared page/revision factories and additional test-file refactors to a separate batch.

The user requested five diverse random tests, a dedicated readability agent for each, application of existing guidance, investigation of reuse within and across files, and feedback into best practices. The implementation covers one component, composable, store, utility, and API test using the recorded seed. Reuse investigation does not require migrating every discovered consumer in this batch.

## As implemented: five files and client guidance

Keep the five selected test refactors and the focused additions to `client/README.md`. Existing test helpers and factories are reused where suitable; the page editor store's new domain factories and GET handler builders remain local, and neighboring opportunities are documented in the per-file reviews.

| Pros | Cons |
| --- | --- |
| • Satisfies every requested activity across five different test categories.<br>• Documents practices supported by specific examples.<br>• Keeps production and unrelated suites outside the change. | • Page/revision fixture duplication remains in other suites.<br>• The store refactor accounts for most of the diff and needs careful review. |

## Expand to shared page/revision factories

Move typed summary/details factories into `client/tests/test-data` and migrate the selected store test, `client/src/api/pages.test.ts`, and appropriate `client/src/components/PageEditor` consumers. This is a concrete reuse opportunity, but requires reviewing and validating additional suites and preserving their distinct fixture identities; leave it as a follow-up.

| Pros | Cons |
| --- | --- |
| • Removes repeated required-field boilerplate across real consumers.<br>• Centralizes schema maintenance and can replace incomplete fixture casts. | • Expands beyond the five randomly selected files.<br>• Adds shared API design and migration work to a readability batch.<br>• Coupling distinct fixtures prematurely could hide scenario inputs. |

<details>
<summary>Concrete consumers recorded by the store reviewer</summary>

`api/pages.test.ts` repeats page summaries and details. `PageEditor/testData.ts` supplies summary constants consumed by `HistoryPageList.test.ts` and `PageCard.test.ts`. `PageEditorView.test.ts`, `PageDisplayToolbar.test.ts`, and `HistoryPageView.test.ts` contain incomplete details fixtures. `PageRevisionList.test.ts` has a local summary factory, while `PageRevisionView.test.ts` and `PageEditorView.test.ts` provide revision details. A follow-up should keep page and revision summary/detail types distinct, generate fresh objects, and make overrides visible in each scenario. The current batch has not implemented this extraction.

</details>

## Contract to test changes only

Keep the five refactors but remove the README additions. This reduces documentation review, but leaves the requested learning from the five reviews confined to project notes rather than the client guidance that future contributors read.

| Pros | Cons |
| --- | --- |
| • Smaller documentation surface.<br>• Avoids adopting broad guidance before further batches. | • Weakens the requested feedback into best practices.<br>• Leaves guidance on composable context and mock-handler lifetimes incomplete. |

## Expand to neighboring tests or the full inventory

Refactor additional candidates such as `utils/slug.test.ts`, related markdown tests, or the remaining inventory in the same branch. They merit later investigation, but a staged series of diverse batches gives clearer review and validation boundaries.

| Pros | Cons |
| --- | --- |
| • Accelerates the project's longer-term readability goal.<br>• Tests the emerging guidance on more examples. | • Exceeds the user's requested five-file starting batch.<br>• Adds review and regression risk before evaluating this batch.<br>• May introduce abstractions without sufficient evidence. |

## Expand visualization mock fidelity

Replace the existing mock of the pure URL item builder with a spy on its real implementation in a later batch. The independent test challenge identified this opportunity; the mock predates these readability changes and does not justify expanding the present scope. The parent retained the upload-module mock to isolate the component boundary, and the pure helper already has coverage in `utils/upload.test.ts`.

| Pros | Cons |
| --- | --- |
| • Exercises real upload-item construction while retaining observable call assertions.<br>• Reduces duplication of a pure implementation in its mock. | • Changes the tested boundary beyond a readability refactor.<br>• Requires a separate assessment of isolation and intended unit boundaries. |

## Independent review input

The normal reviewer reported no scope or correctness blocker, agreed to defer shared page/revision factories, and found no need for new E2E tests. Its test challenge suggested the existing URL item-builder spy opportunity above as a follow-up. The parent reports all 98 resulting cases, lint, formatting, and full Vue TypeScript checking passed. This report evaluates scope and documented reuse opportunities; correctness and test adequacy remain covered by that independent review.
