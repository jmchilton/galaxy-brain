Run via gpt-6.1-sol (Codex reported reasoning effort: none).

**Acted on:** Codex's one finding (P1) was CONFIRMED and fixed in `4ddba1316d4`. On 25.1, `BModal` hides itself after `ok` unless the handler calls `preventDefault()`. Hiding fires `@hidden` → `resetModal` → `emit("reset")`, and `UserPreferences.vue:316` unmounts the modal (`v-if="showDeleteAccountModal"`). So on 25.1 and 26.0 *no* deletion error was ever visible, generic or specific; fixing the `err_code` alone would not have been enough. 26.1+ doesn't need this because `6be395a781f` moved the modal to `GModal` with `:close-on-ok="false"`. `handleSubmit` now takes the `BvModalEvent` and prevents the hide. The two failure tests assert that `BModal` emits no v-model `change` (the event it emits as `false` when hiding itself). Both are red on the previous component and green on the fix. The `isVisible()` and `reset` emission checks I tried first don't discriminate in jsdom, because the modal never finishes showing there.

Not acted on: nothing. Codex's sandbox (bwrap) could not run shell commands on this host. The first run reviewed nothing and returned an empty findings list, which said nothing about correctness. The second run got the diff, the touched files, the API client and mock, and the server delete paths inlined in the prompt.

Side effect to note: with the hide prevented, the OK button stays enabled while the DELETE is in flight, so a double click can send two requests. 25.1's modal had no in-flight state before either. 26.1's `deleting` ref handles this, and the second request on a refused/failed delete is harmless. Left as is to keep the backport small.

<details><summary>Codex findings (verbatim JSON summary)</summary>

- P1 correctness, `client/src/components/User/UserDeletion.vue:51`, "The modal closes before the refusal message can be shown", confidence certain. BModal hides after `ok` unless the handler synchronously calls `preventDefault()`; hiding triggers `resetModal`, which emits `reset` and unmounts the component in UserPreferences, so the message is never visible. Verdict: **CONFIRMED** (`bootstrap-vue/src/components/modal/modal.js` `hide()` lines 455-486; `UserDeletion.vue` `@hidden="resetModal"`; `UserPreferences.vue:316`).
- Coverage note: "Reviewed the supplied files and excerpts only; no commands were run."

</details>
