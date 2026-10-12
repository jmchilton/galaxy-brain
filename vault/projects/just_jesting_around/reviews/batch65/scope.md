Recommend retaining the eight-test batch65 scope, pinned from `98e8e836455918807d7c2c7c09a8ca64be807f02` to integrated `a0dc0eccc9e8be67715f0390337c0e2f969cc022`. All86 original executed cases and275 original intended checks remain; six evidenced public-contract checks raise the final count to281. The diff contains exactly eight test files and no production, supporting/shared-helper, dependency or documentation changes.

## As implemented

Datasets provider, Markdown parse, HistoryView, ColorSelector, ChatModeSelector, Tool utilities, sanitizeHtml and escapeStack retain their existing real or narrow mocked boundaries. Owned wrappers/stores/deferred responses/globals and native typing improve readability and isolation; parser and escape-stack checks address demonstrated blind spots without broadening application behavior.

| Pros | Cons |
| --- | --- |
| All original cases/checks and actual covered source locations remain. | Eight originators need distinct author and independent review evidence. |
| Four parser input-preservation checks and two stack-registration checks detect bounded mutations the originals miss. | The preserved parser self-comparisons remain redundant alongside the new checks. |
| Local helper/factory reuse keeps domain inputs visible; partial HistoryView fixtures preserve their original semantics. | Main and supplemental imported/rendered UI coverage must be reported separately. |

## Contract to casts and names only

Keep the original fixture/resource ownership and avoid the six new checks. This reduces changes but leaves globally overwritten clipboard state, unreleased component/store scopes, pending-response cleanup and demonstrated unchecked unchanged-output/duplicate-registration behavior.

| Pros | Cons |
| --- | --- |
| Smaller diffs and fewer fixture decisions. | Retains concrete cleanup weaknesses and assertion blind spots. |
| Easier mechanical review. | Falls short of the authorized readability/reuse loop's real-boundary objectives. |

## Expand into production schemas, shared fixtures or broader integration

Repair generated API schemas, migrate every palette mock to transport-level handlers, unify history fixtures across consumers or add browser tests. These are separate scopes: honest union typing and canonical factories suffice for datasets, while preserving partial HistoryView input payloads is intentional and no shared consumer gap requires a new abstraction here.

| Pros | Cons |
| --- | --- |
| Could address broad schema/fixture consistency in a dedicated change. | Introduces production/helper/support churn beyond the eight reviewed originators. |
| Transport/browser tests could cover future application changes. | No altered network or rendering behavior justifies expanding this batch. |

## Screenshots

Screenshots are not relevant for this change. The shared screenshot instructions and E2E-writing research were considered: all changes are unit-test originators, with no Vue template/style, screenshot expectation or E2E test modification. Existing rendering assertions remain; no screenshot capture, browser-test modification or screenshot artifact is warranted.

HistoryView and ColorSelector independent650201 review runs pass8 and3cases. Author reports preserve all original source coverage, including actual external shared UI where imported/rendered; no report is treated as evidence of rendering merely because a module was imported. Integrated full types/all-eight-suite/hooks and remaining independent-review gates are driver-owned and pending in this historical scope snapshot. No reviewer evidence requires expanding or contracting the final file scope.
