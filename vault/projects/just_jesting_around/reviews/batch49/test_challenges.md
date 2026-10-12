Driver final gates: source approved at pushed tip `15ba2c4a57710c6b0715adbda5319465cfc44cc9`; final retained scope15client +2ToolShed cases passes shuffled490101, both frontend typechecks and all applicable hooks/lint/format pass. Library excluded under downstream ownership; original published history preserved and push fast-forward. Conditions below are satisfied.

# Batch 49 test challenges

Applied REVIEW_FOCUS, GX_PROCESS_CHALLENGE_TESTS and Galaxy writing_tests/client README guidance. I independently reviewed DatasetPopoverLink, TrsTool, Tool Shed ResetPassword and two sanitizer cleanup supporting files; authored WorkflowRunInputStep is supplemental.

DatasetPopoverLink's interactive and ariaLabel child props are meaningful accessibility component contracts at a deliberate shallow seam. TrsTool and supporting sanitizer cases assert the real directive's boundary/profile and resulting rendered HTML; they are not tests of DOMPurify's internal implementation. ResetPassword submits through actual form controls and checks the public request body, success navigation and visible failure banner. Retain every original assertion. No trivial assertion or mock should be removed as part of this readability work.

The existing FormDisplay/service double in InputStep addresses a parent event/debounce seam; cancellation remains exercised by explicit unmount followed by time advancement, independent of teardown. Fixtures and nth reuse established helpers. No new generic mocking utility or production refactor is justified.

Sanitizer cleanup was challenged across concrete consumers: capture the existing mocked implementation, restore it after wrapper teardown, and keep hooks in the same scope with reverse-registration semantics. All proposed supporting fixes satisfy that order. ResetPassword uses the separate Tool Shed runner/setup and its coverage comparison, not the Galaxy client test glob; its route-token and API collaborators are intentionally local mocked boundaries.

Screenshots and new browser tests are not warranted for test-only mounting, fixture and teardown changes. Real sanitizer behavior already has browser coverage in `lib/galaxy_test/selenium/test_rendered_markup.py` (library description), which complements these profile/renderer seams rather than replacing them. No new rendered production behavior, styling, credential flow or HTTP endpoint is introduced. Browser coverage should be reconsidered with future production changes; it would not prove these lifecycle fixes more directly than shuffled isolated runs.

Coverage maps independently show no previously covered source location lost in all other three origins and the earlier supporting cleanup comparison. Await driver combined tests/typechecks/hooks on the final retained scope. No test was weakened or dropped.

## Driver typecheck finding and inspected correction

Full canonical typecheck found the captured sanitizer implementation can be undefined, which is not accepted by mockImplementation. The driver guarded restoration in TrsTool, WorkflowHelpDisplay and NodeInvocationText: first mockReset, then reinstall the captured implementation only when defined. I inspected all three exact guards. They restore the function when present and preserve the empty mock baseline when absent, without changing unmount/restoration ordering or any assertion. This is a justified boundary check, not a new behavior mode.

Final scope excludes LibraryEditField: final ownership audit found storified=true, so its cleanup is deferred to its owning lane. I verified zero final Library diff and original published remote ancestry at `15ba2c4a57710c6b0715adbda5319465cfc44cc9`. Retain four originators plus WorkflowHelpDisplay/NodeInvocationText cleanup and README references to retained examples. The historical rewrite was abandoned before push; delivery can fast-forward. Final retained-scope gate is 15 client cases plus 2 Tool Shed cases, typecheck and hooks. Source approved.
