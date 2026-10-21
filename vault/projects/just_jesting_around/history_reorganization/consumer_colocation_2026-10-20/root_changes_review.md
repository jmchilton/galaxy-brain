# Normal review: root-authored publication and documentation changes

Scope: `apply_refs.py`, `prepare_history.py` (including the narrowed preparation guard), `readme_fragments.py`, the actual prepared README changes, and `PIPELINE_BRANCHES.md` / `PIPELINE_WORKERS.md`. This review deliberately excludes my own support scheduler, AST utility, and generated support schedule; those need the independent reviews already recorded separately. Review criteria include `vault/agents/_shared/REVIEW_FOCUS.md`.

## Result

PASS within this scope. No blocking findings.

The apply script verifies the exact five intended existing branch names, checks each old head against its pinned SHA, verifies old/new tree equality, and refuses dirty attached worktrees before constructing one `update-ref --stdin` transaction. Recovery refs and all five branch updates are committed atomically. Existing matching recovery refs are verified; differing ones cause an abort. It does not create domain branches or touch remotes. Moving branch tips with identical trees preserves attached worktree file/index content.

Tested `apply_refs.py` against a disposable repository under `/private/tmp/consumer-colocation-apply-review-8v80a8g5`, using read-only alternate access to the real object database. Confirmed stale-head rejection changes no refs, all five updates and archive refs succeed together, matching recovery refs can be reused, and an unrelated sentinel branch remains unchanged. The canonical repository's refs were not changed by this test.

The preparation guard now checks precisely the five pinned branch refs and the source worktree's status before/after preparation. This correctly permits unrelated branch maintenance running concurrently. All object creation uses an isolated temporary index and explicit `commit-tree`; there is no preparation-time branch/ref mutation. The narrowed guard does not weaken protection of any branch being published.

The prepared readability opening commit changes only `client/README.md`. Its framework mounting/configuration examples reference APIs already in the pinned base: `withPlugins` is exported from `tests/vitest/helpers.js`, and `resetMockConfig` / `setMockConfig` already exist. The three newly introduced helper-specific passages are absent initially and are assigned to the actual first consuming commits: modal-button use with ReviewCleanupDialog, effect-scope use with useWorkflowCardActions, and history seeding with UploadFileRow. Changed example-table prose and teardown conversion examples are delayed until their referenced conversions are present. The final README blob is restored exactly.

The play README's completed catalog-audit link travels with `A11Y_AUDIT.md` at the completed catalog, while accessibility policy remains in the opening framework commit. This avoids linking an absent evidence file from the framework foundation.

The pipeline notes now consistently instruct workers to keep the complete existing lanes, preserve the representative example second, introduce support and its documentation with the first consuming test, split independently used exports, retain compatibility for remaining callers, and delay domain PR extraction until requested. The earlier rule that front-loaded all shared support is removed. `git diff --check` passed for both pipeline documents.

Publication still requires the remaining runtime gates and final lease-protected remote pushes managed by the parent. This review grants no change to RFC draft status or accessibility/CI claims.
