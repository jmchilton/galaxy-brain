# Readability batch 49

Four originators drawn with seed `2610949`; [manifest](readability_batch_49.yml). Recorded remote/base `e1f3ed5dce2`, pinned dev `9ac3cd2eb30` unchanged. Two concrete sanitizer consumers receive focused supporting cleanup; only originators receive counters. No new upstream inventory entries.

| Originator | Result | Cases |
| --- | --- | ---: |
| [ResetPassword](reviews/batch49/ResetPassword.md) | Hoisted/reset boundary mocks, required input/form/alert queries, automatic unmount; own Tool Shed setup and runner retained. | 2 → 2 |
| [DatasetPopoverLink](reviews/batch49/DatasetPopoverLink.md) | Typed shallow cached-name seam, required popover component, tracked parent unmount, separate generic/cached naming cases. | 2 → 3 |
| [TrsTool](reviews/batch49/TrsTool.md) | Typed registry fixture, native mount, required sanitizer call guard and existing nth; preserve initial sanitizer implementation after unmount. | 1 → 1 |
| [WorkflowRunInputStep](reviews/batch49/WorkflowRunInputStep.md) | Narrow form-input fixture, existing dataset factory, required child boundaries, full service mock reset and unmount before restoring clock; retain debounce/cancellation behavior. | 9 → 9 |

All original assertions retained or strengthened. [Supporting lifecycle report](reviews/batch49/SanitizerLifecycle.md) records WorkflowHelpDisplay and NodeInvocationText: restore the initial global sanitizer implementation after unmount, keeping restoration and auto-unmount in the same scope with reverse hook ordering. Help/Node keep their original mounts and fixtures to bound supporting scope. No production files or new shared helper. No later-lane-owned test changed.

Added ten lines of concrete README teardown guidance, illustrated by TRS and WorkflowHelpDisplay. Prior marginal polling/unmount advice is now covered by that general lifecycle rule and retired from the unresolved list. No thin shared helper needed to wrap these existing lifecycle APIs.

Baseline: 14 selected plus two supporting cases. Final: 15 selected plus two supporting cases. Canonical client combined run passes all five retained suites/15 cases; Tool Shed's own runner passes two cases. Shuffled seed `490101`, pinned Node `22.20.0`, maxWorkers=1; no skips. Own Tool Shed lint/format/typecheck and explicit hooks pass. Client source hooks, final guarded-restoration hooks and full canonical client vue-tsc pass. Initial type gate identified an optional mock implementation; the corrected final gate exits0.

Coverage retains every previously covered source location: popover165files, TRS15, input17, Reset90. Supporting isolated pairs: Help16files and Node170, all unchanged. Tool Shed coverage uses its own Vitest3.2.7 plus matching coverage plugin installed only in temp; repository dependencies/locks unchanged. Optional real-router warning cleanup was discarded because it changed an incidental compiled branch. Original warnings remain at both refs.

[Independent review](reviews/batch49/review.md), [input independent review](reviews/batch49/WorkflowRunInputStep-independent-review.md), [test challenge](reviews/batch49/test_challenges.md), [maintainability](reviews/batch49/maintainability.md), and [scope](reviews/batch49/scope.md) approve this source shape. Full client typecheck caught the saved sanitizer implementation's optional type; guarded restoration in all three TS consumers preserves an absent implementation after reset. Final gates pass. No E2E/screenshots or scope expansion needed.

A final ownership audit found LibraryEditField had become `storified: true` through concurrent later-lane work. Its prepared cleanup was excluded before push. Replaying only this batch's new commits onto the original recorded remote head preserves all published history and leaves that library file identical to the pushed base; no force push is required. Its exploratory validation is retained in the worker report as excluded evidence. Supporting counters remain unchanged. Final retained-scope run passes all15client cases, plus two canonical Tool Shed cases,17total. Fast-forward pushed `15ba2c4a57710c6b0715adbda5319465cfc44cc9`; GitHub verification and ledger write follow. Vault validation has zero errors and15pre-existing advisory warnings.

Final commits: `143c862925a` popover, `7a8ffc84316` TRS, `2c71e67af90` input, `18f4c80cd1d` reset, `28b56f1983a` README, `fa688c19bad` supporting help, `15ba2c4a577` supporting node. Original published commits are ancestral; LibraryEditField is unchanged. Only four originating counters written after push; supporting counters unchanged. Vault records committed locally only; downstream branches left alone.
