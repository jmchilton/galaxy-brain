# Implementation handoff — test cleanup, 2026-10-12

READY for human review. The requested revision reduces workflow-validation API test methods from 28 to six and preserves all 22 moved expression variations in fast analyzer tests. The shared client/backend YAML contract and production behavior are unchanged.

The six API methods cover actionable HTTP rejection diagnostics, rejection alongside computed access, computed-expression preservation, both supported nested spellings, legal subworkflow pipe labels, and rejected editor-save persistence. Backend parametrizations cover conservative lexical handling and exact retained static paths; they remain separate from the editor specification because server rejection and editor edge matching have different policies.

All 29 focused tests pass: six API methods and 23 fast tests, including the shared contract. The nested-spelling API method intentionally performs two imports. Ruff, Black, isort, whitespace checks and commit hooks pass. Normal review, fresh test challenge and general/workflow checklist reevaluation found no outstanding work. UI, browser-test and screenshot applicability is unchanged. Prior implementation and challenge evidence is preserved in `earlier_drafts/1/`.

Pushed head: `9b008a0f5199e4a434cf3373d9ece44d0db6ad22`; remote head verified and worktree clean. Base remains `dev` at `9ac3cd2eb304f2860c0daf3afea0cc777f9e5cd6`. New-head fork CI is pending (17 queued, three pending, two skipped, no observed failures). The prepared description has the correct counts and commands; the single description-strengthening round was not repeated.

Queue status remains `branches_ready_for_final_review`. John still needs to read the revised tests/comments and description and decide whether to reopen closed #23817 or create a new PR. No final SHA approval is recorded.
