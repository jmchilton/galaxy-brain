# Normal review — requested test cleanup, 2026-10-12

No findings required changes. The independent review confirmed every moved regression is retained and the six API methods adequately exercise the HTTP and persistence contracts. No recommendations were declined. The description's counts, challenge summary and deleted API selectors were updated after checklist reevaluation.

<details><summary>Full review and checklist reevaluation</summary>

All 22 removed API expression cases remain covered by parametrized analyzer tests: 16 conservative lexical/binding cases, five retained-root cases and the static-property-child case. Exact static-path and dynamic-classification assertions strengthen analyzer checks relative to import success/rejection alone. The six retained API methods cover diagnostic mapping, mixed dynamic rejection, accepted computed round-trip, supported nested spellings, real pipe-named subworkflow inputs and rejected-update persistence. The nested-spelling method covers two examples, so six methods is not six requests. Production files and the shared fixture are unchanged.

GENERAL.md and WORKFLOW_RELATED.md pass for this revision; human-read remains unchecked. Only the two test files changed, with clean whitespace checks. Analyzer tests assert public semantic results rather than private scanner structure, and the boundary comment explains current server/editor compatibility. HTTP diagnostics, affected import/save workflows, issue/evaluator evidence and previously evaluated alternatives remain valid because production is unchanged. The focused run passed 29 tests: six API methods plus 23 fast tests, with two existing namespace warnings.

</details>
