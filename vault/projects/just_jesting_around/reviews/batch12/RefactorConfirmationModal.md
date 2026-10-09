# RefactorConfirmationModal

Reviewed `client/src/components/Workflow/Editor/RefactorConfirmationModal.test.ts`: 7 cases before and after, all passing with shuffle seed 120043; scoped ESLint and Prettier pass.

The tests use a local mount function, automatic unmounting, correctly installed global options, hoisted confirmation mock, and reset mock implementations between scenarios. Generated action, version, and response types replace incomplete objects and double casts. A short response helper supplies the required metadata while leaving each scenario's messages and dry-run flag visible. Immediate async results use `mockResolvedValueOnce` or `mockRejectedValue` instead of manually constructed promises.

Preserved empty-action suppression, dry-run rejection and one error event, no success event on rejection, message-free dry-run then execution, initially hidden/shown message modal, warning text, and the real Proceed button triggering execution. Exact API arguments now include actions, editor style, dry-run flag, and optional version. The error and success event payloads are checked completely. Older-version confirmation still checks its call count/message/title, cancellation still prevents refactoring, and the latest version still bypasses confirmation. Each wrapper is local to its scenario.

The modal retains full mounting for rendered server messages and the real button interaction. A shared response factory would have no second concrete consumer, so its small arrangement stays local. Current README guidance covers all changes; no new advice is proposed.
