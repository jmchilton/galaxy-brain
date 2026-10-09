# Workflow export links

Originator: `client/src/components/Workflow/WorkflowExport.test.js`. Cases: **1 → 2**.

Separate initial private-workflow links from the dependent workflow-ID reload sequence. Move handlers into each scenario, reuse `getFakeWorkflowSummary`, infer the workflow path parameter through the OpenAPI handler, and return the legacy summary-shaped fixture through `response.untyped(...)`. Small local mount/link helpers remove repeated setup and positional attribute calls. Auto-unmount wrappers and create fresh plugins per mount.

Preserved private workflow0's exact JSON-download and image URLs, the `setProps({id:"1"})` fetch/reload transition, importable owner/slug workflow1, and all three exact updated URLs including the full localhost import URL. Array assertions now verify complete ordered link output, strengthening the original positional checks. The initial workflow0 checkpoint remains in the reload scenario; the independent case names its own initial-display contract.

Reuse: the workflow-summary factory introduced in an earlier iteration now serves this consumer; defaults stay inside that existing factory. Export's local response and link arrangement differ from workflow store/list setup, so no new shared helper or supporting migration is needed. No missing best-practice guidance emerged.

Validation: the five owned suites passed 33/33 cases with no skips under shuffled Vitest seed `130031` (`/private/tmp/jest_readability_batch13_upload_final.json`). Scoped ESLint passed with zero warnings, Prettier passed, and `git diff --check` passed. The root runs authoritative full-client typechecking and final whole-batch validation.
