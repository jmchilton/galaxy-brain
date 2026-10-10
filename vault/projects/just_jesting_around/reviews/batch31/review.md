# Batch 31 review

Range `ff84014787..234cdcf160f` on `vitest_readability`. Commit shape is fine throughout: the helper commit comes first, each originator touches one test file, there's no production code, and no comment refers to the process.

## Extend src/components/BaseComponents/test-utils.ts for client unit tests (85330e23a62)

Approved.

- `clickModalButton(wrapper, text)` is added next to `createMemoryRouter`. It has 3 supporting consumers and 4 originators. Its guards reject 0 or more than 1 match and a button with `aria-disabled`. Typing the parameter as `Pick<BaseWrapper<Node>, "findAll">` lets it scope to a nested modal (ReviewCleanupDialog's `#confirmation-modal` sits inside the outer GModal).
- UserSharing: the local copy is swapped for the shared helper and the call sites (`"Ok"`/`"Cancel"`) stay the same. 6 → 6.
- ReviewCleanupDialog: `vm.$emit("ok")` becomes a click on "Permanently delete". GModal is `v-model:show` with the default `closeOnOk`, so the click goes through `dialog.close()` and ends in a single `ok`. The exact `toEqual([[EXPECTED_ITEMS]])` is unchanged. The checkbox is set first, so `okDisabled` is false. 5 → 5.
- ToolInstallationRequestForm: I counted 9 call sites, all `$emit("ok")` + flush → `clickModalButton(wrapper, "Submit Request")`. No inputs, mocks or assertions changed. GModal has `:close-on-ok="false"`, so a click on Ok calls `emit("ok")` directly, exactly like the synthetic emit. `:ok-disabled="submitting || !formValid()"`, and `formValid()` only checks that name and description are non-empty. The length-limit, `http://` and stale-error cases all fill both fields first, so the button is enabled and `submit()` still runs its own validation. The scenarios are unchanged. Now that the length case goes through the real button, a future change that disables Ok on invalid length would make that case throw instead of passing vacuously.
- Follow-up, not required: `History/CurrentHistory/SelectPreferredStore.test.ts` and `PageEditor/PageDisplayToolbar.test.ts` also pick buttons with `.g-modal-confirm-buttons` selectors and could adopt the helper.

## Improve readability of RenameModal tests (e2b83bdbe13)

Approved.

| Original | Now |
|---|---|
| confirm → `updateWorkflow(id, {name})`, `close` truthy | same case; `toHaveBeenCalledExactlyOnceWith`, `close` `[[]]`, plus exactly one success toast |
| failure → `Toast.error` called, `updateWorkflow` args, `close` truthy, reopen shows original name | split: (a) error toast with the server message as the only toast, args, `close` `[[]]`; (b) reopened after failure starts from `WORKFLOW_NAME` |
| ok disabled when name unchanged | unchanged |

- `closeOnOk` is false, so the click is equivalent to the old emit. In case (b) the helper still has to click an enabled Rename, so the failed attempt really happens.
- Dropping `attachTo`/`DOMWrapper(document.body)` is fine because RenameModal's content renders inside the wrapper.
- Nit: `failed.unmount()` followed by `enableAutoUnmount` unmounts the same app twice. Vue's "Cannot unmount an app that is not mounted" warning gets swallowed by the `[Vue warn]` silence in setup. It's harmless, and the explicit unmount shows the "parent closes it" step, so I'm not requesting a change.

## Improve readability of UserDeletion tests (60d1cafba36)

Approved.

All 5 cases map 1:1: modal + warning text, input + delete disabled, enabled on match, mismatch after blur, and delete → logout. The delete case is strengthened: it checks that the DELETE path id is `[TEST_USER_ID]` and that logout ran exactly once. The user is now seeded on the real Pinia before mount, where it used to be set after mount (the component reads it lazily, so it only matters at submit time). With `closeOnOk` false, the click on "Delete Account Permanently" is equivalent to the emit, and the helper's disabled guard also proves that a matching email enables the button. Dropping `getLocalVue(true)` is fine because the component doesn't use `l()` on any asserted string. No findings.

## Improve readability of WorkflowMissingToolsRequest tests (814259b6f4f)

Changes requested.

| Original (16) | Now (16) |
|---|---|
| button text 2 / 1 tools | `request button` describe, unchanged |
| hidden: form flag off, notifications off | `it.each`, same configs |
| hidden: no tool ids | unchanged |
| hidden: anonymous (mount, then `$patch` anon) | mounts with `ANONYMOUS_USER` (see finding) |
| payload tools / workflow_id / remarks is string | one exact `toEqual` (stronger: no extra keys) |
| remarks context, no ids | unchanged |
| truncation note in modal | unchanged |
| cap 50: length + first/last + remarks note | all 50 names + remarks note (stronger) |
| button disabled in flight | the helper's `flushPromises` doesn't settle the pending promise, so the case is still in flight |
| success alert replaces button | unchanged |
| error inside open dialog | `.text()` on a missing node throws, so dropping the `exists()` line loses nothing |
| error cleared on cancel; cancel then reopen | real Cancel click |
| singular modal body, no truncation note | unchanged |

- The dead seed is confirmed. `defineStore("userStore", ...)` (`stores/userStore.ts:53`) means `initialState.user` was ignored, so `currentUser` stayed `ref(null)`. `isAnonymous` is `isAnonymousUser(null)`, which is `false`, so every "authenticated" case really ran with a null user. Seeding `userStore` fixes that.
- The real Cancel click is correct. `closeOnOk` is false and `attachTo` is kept, so the dialog is open and Cancel goes through `close` and ends in a single `cancel`.
- **Finding (coverage).** The old anonymous case didn't go registered → anonymous. Because of the dead seed it went **null → anonymous after mount**, which is the same order as production: `currentUser` starts `null` and `loadUser` fills it in. `showButton` is a `computed` over `userStore.isAnonymous`, so the component does react to that change. The old case was the only one that checked the button disappears when the user resolves after mount. A regression that read the flag once (for example destructuring `isAnonymous` from the store without `storeToRefs`) would still pass the new static mount. Keep the static case and add a transition case. Mount with `currentUser: null`, assert the button renders (current behavior: a null user doesn't count as anonymous), set `useUserStore().currentUser = ANONYMOUS_USER`, flush, and assert `ROOT` is gone.
- Minor, no change needed: bare `vi.mock("@/api/notifications")` automocks by importing the real module, where the old factory didn't import it. That's harmless, and `vi.mocked` typing is a real gain. `getLocalVue(true)` → `getLocalVue()` is unmentioned in the notes but harmless.
- Follow-up: the note's lead on `Workflow/Run/WorkflowRun.test.js:54` (same dead `user:` key) is worth queueing.

## Improve readability of WorkflowInvocationShare tests (234cdcf160f)

Approved.

| Original (6) | Now (6) |
|---|---|
| modal closed → opens, shows workflow + history names | unchanged, `toBe(false/true)` |
| share → success + clipboard toasts | real "Share" click; also asserts the modal closes and `writeText` gets the invocation link exactly once |
| renders nothing: `(false)` = owns history only | the same inputs are the "owns the history but not the workflow" row |
| renders nothing: `(true,false,false)` = owns workflow only | row 2, same inputs |
| renders nothing: `(false,false,true)` = owns history only (duplicate) | becomes the "owns neither" row (new combination) |
| both shareable → modal stays closed, one clipboard toast | unchanged; plus a `writeText` link check |

- The duplicate is confirmed. Old `(ownsWorkflow=false)` with defaults `ownsHistory=true` matched `(false, false, true)` exactly, and both the share icon and GModal assertions survive in the kept row.
- The render conditions match the old store overrides. Workflow ownership still comes from `username` vs `owner` through `matchesCurrentUsername`. History ownership is still `user_id` vs `fake_user_id` (`OTHER_USER_ID` when not owned). Shareability was the `SHARED_WORKFLOW_ID` / `-importable` id tricks and is now `importable: bothShareable` on both seeds. The history always carries an `importable` key, as the old mock did, so `hasImportable` behaves the same.
- With the workflow seeded under its instance id, `useWorkflowInstance` skips `fetchWorkflowForInstanceId`. With the history seeded, `getHistoryById` doesn't fetch. So no request goes out that the old mocks would have hidden. `getHistoryNameById` is now the real getter, not a stub.
- The real Share click is correct: default `closeOnOk` plus `v-model:show` means a click goes through `close`, which emits `update:show(false)` and then `ok`. The new modal-closed assertion is the evidence for that.
- Note, non-blocking: the old helper set the user after mount, so its positive cases implicitly checked that the share icon appears once the user loads. Seeding first drops that. The old workflow and history overrides spread the store and broke reactivity anyway, so this wasn't a deliberate scenario. Fine as is.
