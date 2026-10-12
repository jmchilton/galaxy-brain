# ManagePushAccess — independent normal review

Approved worker commit 911ba62a1ca against pinned base ee56ad6a3715b5b792d5537e84dc9f2446920d2e. Reviewed actual component, the original/final test, current shared README ownership guidance, and REVIEW_FOCUS.

The one original case and five assertions remain unchanged: repository owner is shown first with no remove button, collaborator is shown with a remove button, and the non-owner manager username is absent. These checks preserve the specific regression contract and ordered rendered entries, without claiming button-click or permission-update coverage.

Per-scenario Pinia is explicitly supplied to both stores and the native global plugins. This ensures the component renders the same seeded repository/auth state and avoids ambient store selection. Automatic unmount precedes completion disposal, and the existing SelectUser stub continues to isolate user-search behavior outside this test's scope. No unrelated mocks, production changes, or new abstractions.

Independent run uses the Tool Shed's own Vitest 3.2.7 with shuffled seed 590201 and passes one case: `/private/tmp/readability59-pushaccess-independent.log`. Recomputed covered-source-location comparison retains all 151 covered statement/function/branch-arm locations across 89 files, zero lost or added. No assertion weakening, actionable review finding, or README gap identified.
