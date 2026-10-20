Coordinator completion: acted on all review findings (none required source changes). Target-specific checks subsequently passed: 74 tests across five suites, full type check, ESLint and Prettier. Published head `94a34cd0b23` verified remotely.

# Independent release_26.2 rebase review

Approved for the pinned release target on source review; no rebase corrections requested. Runtime/type/lint results remain coordinator-owned and pending at the time of this report.

Reviewed 2026-10-20 using the shared REVIEW_FOCUS.md. Inspected the full four-file delta against origin/release_26.2 at `1ff2ce4cc513c9923a839fcbaa522e756bd9ab22`, both rewritten commit mappings, shared GButton implementation, classic Popper controller, Bootstrap resets, and the relevant test infrastructure. No source edits, commits, or subagents were used.

## Relevant code exists on the target

Both ChatInput and classic Popper, including their existing test files, exist unchanged on the pinned release base relative to the prior dev base `0de6cc2d7fef75633ea30717162bad53d583d80e`. The missing send-action name and the built-in titled Popper mouse-only close control therefore remain applicable release fixes.

ChatInput imports the BaseComponents GButton bridge, which exports the shared galaxy-ui GButton. That implementation is byte-identical across the two bases and forwards `$attrs` to its dynamic native root. The new explicit aria-label reaches the send action without requiring any dev-only forwarding change. Busy/disabled behavior and native type handling remain supported on the target.

The classic usePopper controller is also byte-identical across bases. Its document Escape handling and delegated `.popper-close` click handling remain compatible with the component's new shared close handler. Escape from popup content restores focus before the existing document listener idempotently hides the popup again; wrapped and external references use the same supported target boundary. No controller or imported helper change was required.

The relevant base.scss/overrides.scss native-button Bootstrap extension is unchanged on release. The new scoped normal/hover/focus/active resets are therefore still required and appropriate, and the explicit focus-visible outline remains the keyboard indication. No dev-specific CSS token or component API dependency was introduced.

## Tests and setup

The release Vitest config retains happy-dom and its setup file imports jest-dom, supplying the accessible-name matcher used by the regression cases. The test setup differs between release and dev in how sanitizeHtml is imported/mocked: release uses the client directive, whereas dev imports the UI directive directly. These particular name/focus tests do not exercise sanitized HTML and introduce no reliance on that dev-only setup change.

All regression assertions remain present: four chat-name states; named native non-submit close control; wrapped/external focus return; preserving unrelated focus; Escape focus return; and the independently committed neighboring baseline behavior tests. No assertions were removed or weakened during the rebase.

## History and validation limits

Independent range-diff reports both commits as identical patches:

- `a2166f2c585` -> `bb7bfb7703ded7c1ac724a04bb330045e5fc4ea8`: baseline tests.
- `d843b804a20` -> `94a34cd0b2330730145764d74728f07870699e40`: accessibility fixes and regressions.

The final delta remains four files, 137 insertions and 4 deletions. Old dev history is preserved in the coordinator's backup; the original-scope alternative is intentionally historical and does not need to be rewritten for this rebase. There is no new scope or source change requiring additional regression/screenshot files based on this review.

This report establishes release suitability and absence of a discovered dev-only dependency. It does not reuse previous dev-base runtime success as proof of release-base success; the coordinator is running the target-specific tests, typecheck, and lint separately.
