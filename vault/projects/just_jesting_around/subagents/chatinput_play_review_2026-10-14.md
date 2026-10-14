# ChatInput play migration review — 2026-10-14

Verdict: approve. No actionable findings. Reviewed commit `826c2dd7e596aea7ee545b37c1392dccdb83cc6c` against parent `d131c706917c45db80857d83473d002ccb337873`; only ChatInput stories and tests changed. No worktree edits, test runners, process termination, commits, or pushes performed by this reviewer.

All 23 original cases and 30 assertion sites remain covered: ten presentation cases move to browser scenes; thirteen unit cases retain every original assertion, with additions. Original vectors are preserved, including `hello`, three spaces, empty string, `Type here...`, and the busy/disabled story mount defaults. Existing five stories retain their arguments, model harness, signed-in decorator, and submission listener.

| Original cases | Final coverage |
| --- | --- |
| Provided value; default/custom placeholders | HelloDraft; EmptyQuestion with stronger full placeholder equality; CustomPlaceholder |
| Busy/disabled textarea | WaitingForAnswer; ConversationUnavailable |
| Empty/whitespace/content Send; busy/disabled with content | EmptyQuestion; WhitespaceDraft; HelloDraft; BusyHelloDraft; UnavailableHelloDraft |
| Accessible label | Retained unit check, plus exact textarea id and label text; browser textbox queried by accessible name |
| Input payload; click/Enter submit; Shift+Enter no submit | Retained four unit cases with starting states and exact positive event counts |
| No-match mention Enter and Escape | Retained two unit cases, preserving payload/visibility checks and adding starting values and submit count |
| Four resize cases | Unchanged units with original height vectors, live prop updates, and prototype restoration |
| Two busy/send icon cases | Unchanged units preserving all positive and negative class assertions |

All twelve scenes check visible composer state. Read-only plays preserve base scenarios; the two interaction scenes use canvas-scoped accessible queries and real typing, clearing, click, and keyboard input. Send is the canvas's single button; its unnamed icon control is documented, and disabled checks correctly use `aria-disabled`. New interaction results test the component's model-owned Send state and actual newline insertion. No CSS/layout measurements, direct DOM mutations, or dependency-only click checks were introduced.

Setup remains isolated through the existing model harness, signed-in decorator, fresh app/testing Pinia, owned mount cleanup, explicit unit Pinia disposal, and auto-unmount for live mounts. No storage keys or asynchronous setup were added. Mention cleanup and scrollHeight restoration remain intact. The original component snapshot matches the final component byte-for-byte; the temporary old-test sibling is absent, and its saved source matches the immutable parent.

Reviewed mutation driver and failure logs: every old-test run passes 23 cases. Duplicate emissions/broken association produce five failures in the new thirteen-unit suite; hidden composer produces twelve browser failures; changed placeholder suffix, frozen model Send state, and consumed Shift+Enter each produce one expected browser failure with eleven passes. Failure messages identify the intended assertions. These provide old-pass/new-fail evidence for strengthening and own-component evidence that every play detects a break. Driver exit zero represents successful expected nested old-zero/new-one outcomes, not passing mutated candidate tests.

Reviewed final positive logs: thirteen unit cases and twelve browser scenes pass. Root reports successful actual exits for these checks, type checking, lint, and formatting. The previously completed unchanged-base gate passed 516 units across 86 files and 556 browser cases across 96 files; focused candidate checks do not constitute a fresh broad gate. Limitations: this was an independent source/log review; no validation was rerun, and process exit statuses not stored inside logs rely on the root/driver reports.
