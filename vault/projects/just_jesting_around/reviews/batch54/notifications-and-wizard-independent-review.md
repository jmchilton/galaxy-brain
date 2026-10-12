# Batch 54 — independent notification and wizard review

Compared both originator diffs against pinned base `e1eecdf4f1a92feeeb2d590cfc6aba6bd8c64674`, applying normal review focus, test challenges, client guidance, and strict maintainability standards. Verdict: approve both. No material fixes requested. No draft or production changes made during review.

## NotificationsList

All three original cases and eight assertions remain. Card counts and unread fixture counts still agree, with the separate exact six-item assertions retained. The filter presence assertion still precedes clicking the real button; `get` makes the required action explicit without replacing the original presence check. The empty-state scenario still observes the same mounted component before and after clearing its store, so a stale list or missing empty state remains detectable.

The helper returns the actual test-owned notifications store, replacing ambient lookup in the mutation case. `createTestingPinia` already makes its instance active, and `withPlugins` installs that same instance, so removing explicit `setActivePinia` changes no store identity. `onTestFinished` disposal follows auto-unmount hooks and stops store effects. `nextTick` preserves the original Vue render boundary. Full real child rendering and the existing shared generator are unchanged.

No extra helper, condition, fixture model, production seam, or decomposition need is introduced. The three cases test a client filtering/render contract with real reactive transitions; moving them to API tests would not check that contract. Browser tests would add unrelated setup for a test-only rewrite, so no new E2E coverage or screenshot is warranted.

Independent shuffled run passes all three cases (Node22.20.0, seed540201, one worker), log `/private/tmp/readability54-notifications-independent.log`. Independently compared source-normalized statement/function/branch-arm locations: 155 files in each report, all 799 original locations retained, 805 final, zero losses. Six additions are SSE scope-disposal work. Author type/lint/hooks evidence and driver's integrated gates remain separate.

## GenericWizard

All three original cases and seven assertions remain: the description reaches the links sanitizer profile, includes rendered strong text and the new-tab target; default container is DIV with card class; requested plain container is DIV without card class. Missing matching sanitizer calls still fail the exact original assertions. Required container queries strengthen missing-element diagnostics.

The real host still calls useWizard in component setup, which assigns its effects to the mounted component's lifetime. Native props/global remove legacy adapter options and an object cast without replacing the wizard or its rendered container. Clearing sanitizer call history before every case prevents inherited calls while retaining the global pass-through implementation; no mock reset or replacement can silently suppress rendering. Auto-unmount cleans the host and its effects. No timer or mock restoration ordering is needed because implementation is untouched.

This test checks Markdown-to-directive wiring and actual container selection, not sanitizer security itself or Vue framework mechanics. It should remain at the component layer; no production feature was introduced that requires new API/browser coverage. A generalized host builder would add indirection to these three direct cases. No structural growth or guidance gap requires further changes.

Independent shuffled run passes all three cases (Node22.20.0, seed540201, one worker), log `/private/tmp/readability54-wizard-independent.log`. Independently compared normalized covered locations: identical 107 locations across 15 source files, zero losses/additions. Root retains final integrated type/lint/publication gates.
