# FormUpload stories review — b1eb98fd50b

Reviewed 2026-10-14. Independent read-only review approved against 2a56b0f6a0b without blockers or requested changes.

## Assertion mapping

Both original cases and all five assertions remain unchanged: exact textarea value H1/H2/H3 CSV payload; disabled true; null-value textarea style.display none; empty textarea text; exact No file chosen label. Original selectors retained. Unit value override keeps the original payload while browser story shows a realistic sample sheet.

Stories explicitly type string or null, default to null, and reuse withModel/excludeStories. The harness returns emitted input to the parent value; useStoryMount owns wrapper cleanup. Comments describe initial empty/preloaded states without claiming successful file selection.

## Existing defect

Real native file selection updates the filename but leaves preview hidden/empty. Instrumented native FileReader shows one construction and zero readAsText calls. Source supports a suspected model/event timing issue, but precise cause is unconfirmed. Recorded separately in BUGS_FOUND; no production change. Temporary instrumentation restores the native reader in finally and was removed.

## Validation

Targeted units 2/2, initial-state Chromium probes 2/2 and type-check passed. Review inspected logs and source, ran no extra gates, and modified no files/processes. Complete post-review gates passed unit 718 tests in all 91 selected files and Chromium 344 tests in 90 files. Formatting, lint and normal hooks passed. Fast-forward push completed.
