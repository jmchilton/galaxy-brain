Driver final gates: source approved at pushed tip `15ba2c4a57710c6b0715adbda5319465cfc44cc9`; final retained scope15client +2ToolShed cases passes shuffled490101, both frontend typechecks and all applicable hooks/lint/format pass. Library excluded under downstream ownership; original published history preserved and push fast-forward. Conditions below are satisfied.

Recommendation: retain the four originating readability rewrites, two narrowly scoped sanitizer-lifecycle supporting fixes, and the ten-line README teardown guidance. The support is justified by concrete reuse of the already mocked sanitizer and component lifecycle; no production change or new shared helper is warranted.

Scope reviewed at four-originator canonical tip `cdcc46fdae5` against base `e1f3ed5dce2da8ccd93324fd6b536db3269a8810`, plus the sanitizer follow-through in `/private/tmp/galaxy-readability49-trs` and canonical README Teardown Dependencies addition. The final ledger audit found concurrent `storified: true` ownership on LibraryEditField. Root excluded that supporting file under the mandatory downstream-wins rule and replayed only batch 49 commits onto the recorded remote, preserving the published history and leaving its original diff at zero. This is an ownership exclusion, not a blocked scope decision. Final combined validation remains the driver's gate; the driver will record the final SHA. This evaluates scope separately from correctness reviews.

## As implemented: four originators, two lifecycle consumers, one guidance section

Keep ResetPassword, DatasetPopoverLink, TrsTool and WorkflowRunInputStep readability changes. Keep failure-safe sanitizer restoration in WorkflowHelpDisplay and NodeInvocationText. LibraryEditField remains excluded because its later lane owns it. The README explains observed hook semantics and restoration of an existing shared mock implementation with TrsTool and WorkflowHelpDisplay as concrete examples.

| Pros | Cons |
| --- | --- |
| Selected test contracts and assertions preserved; native typing and lifecycle cleanup improve maintenance | Two supporting files broaden validation beyond the random originators |
| Each supporting consumer demonstrably mutates or depends on sanitizer cleanup | Existing legacy mount syntax remains in support files to limit their scope |
| Guidance applies to clocks and mocks, using existing VTU/mock APIs | Hook-order text depends on Vitest's stated default stacked configuration |

Selected cases rise from fourteen to fifteen only because DatasetPopoverLink's generic/cached label expectations become independently named cases. Two supporting cases remain two, for seventeen final cases across the six files: fifteen client cases plus two Tool Shed cases. Supporting counters must not advance; only selected originators count as this iteration.

## Contract to the four selected files

Leave the two eligible sanitizer consumers and README unchanged. This would be a smaller batch, but it knowingly leaves two overrides without restoration despite the same problem being fixed in TrsTool.

| Pros | Cons |
| --- | --- |
| Smaller integration and validation surface | Concrete shared-function cleanup findings remain unresolved |
| Four-file random selection remains visually simple | Misses useful reusable guidance derived from multiple actual consumers |

## Include LibraryEditField despite later-lane ownership

The earlier candidate support corrected its hook order, but the final ledger now assigns this file to the storification lane. Keeping that edit would violate the downstream-wins constraint; root correctly removed it without asking for a discretionary scope decision. Its owning lane can address lifecycle ordering later.

| Pros | Cons |
| --- | --- |
| Could fix the observed ordering in the same batch | Violates mandatory file ownership and risks clobbering concurrent later-lane work |
| Would add five existing validation cases | Unnecessary for the two eligible consumers and current originators |

## Expand to a new shared sanitizer cleanup helper

Create an abstraction that captures the original sanitizer implementation, installs a marker and registers cleanup. Current setup is a few explicit lines and registration order must remain clear alongside each file's other hooks; existing VTU and Vitest APIs already provide the necessary mechanics.

| Pros | Cons |
| --- | --- |
| Could reduce repeated mock/teardown calls | Hides the ordering that these fixes specifically make visible |
| Could standardize future consumers | No shared helper is necessary to satisfy any current scenario |

## Expand to production models, sanitizer behavior or all similar tests

Narrow production workflow types, restructure sanitizer APIs, or audit every suite with timers/mocks. These are distinct engineering tasks with wider behavior and review risks; the observed batch gaps are solved entirely in tests and targeted guidance.

| Pros | Cons |
| --- | --- |
| May improve broader type/lifecycle consistency later | Not required for this batch's fixtures, rendering or assertions |
| A future audit could find additional cleanup issues | Would turn a bounded readability batch into unrelated production work |

## Expand to E2E screenshots

Screenshots not relevant for this change. Read GX_PROCESS_SCREENSHOTS and the vault E2E writing guidance, and checked actual changes: no production component, style, browser test, screenshot capture or user-facing behavior changes. These edits preserve existing rendering and exercise exact props/events, sanitizer profile, fake-clock and mocked-request contracts, so there is no new visual behavior to record.

| Pros | Cons |
| --- | --- |
| Browser coverage can complement real routing or focus features separately | No UI change or screenshot artifact is introduced here |
| Could document existing appearance | Adds infrastructure without resolving a current readability or lifecycle gap |

The project MARGINAL_ADVICE update retires the earlier polling-cleanup advice into the delivered teardown guidance; it adds no source scope or shared helper. The README describes the existing globally mocked sanitizer accurately, and its scope remains ten lines.
