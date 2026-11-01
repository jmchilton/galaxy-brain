Run via Claude Opus 5.5 at low effort.

# Test challenges debrief (re-hardening)

**Outcome: no test changes, no Galaxy commits, nothing pushed.** All three branch tests hold up against the challenge list, and each one fails without the change it covers. An E2E test is marginally warranted, but it can't be run on this host. The draft stays untracked and is recommended for polish or CI.

## Fail-without-change check (re-run fresh)

`npx jest --config tests/jest/jest.config.js src/components/User/UserDeletion.test.ts` in `client/`. For each run, `UserDeletion.vue` was written into place from git with `git show`, and HEAD's copy was restored afterwards with `git checkout HEAD --`.

| Component version | 403004 test | 403005 test | pending test | other 5 |
|---|---|---|---|---|
| HEAD `e6590e91c9b` | pass | pass | pass | pass |
| `origin/release_25.1` | fail: generic message | fail: modal `change` `[[false]]` | fail: button not disabled | pass |
| `f2f80d3736d` (message fix, no preventDefault) | fail: modal closes | fail: modal closes | fail: button not disabled | pass |
| `4ddba1316d4` (original scope, no `deleting`) | pass | pass | fail: button not disabled | pass |

- Every non-baseline test fails at its own assertion: wrong text, the modal closing, or the button staying enabled. None of them fails because a fixture or helper is missing.
- The 403005 test was a "Baseline tests" commit (`0b0cd6bb422`), and that version passes on base. `4ddba1316d4` later added `expectModalStillOpen` to it, which is why it fails on base at HEAD. That is expected: the modal-staying-open part is new behaviour.
- The Baseline commit is still first in `origin/release_25.1..HEAD`.

## Tests challenged (`client/src/components/User/UserDeletion.test.ts`, jest on 25.1)

1. **"explains a deletion refused by the instance configuration and stays logged in"**. Kept. It checks what the user sees (the alert text), that there is no logout, and that the modal stays open. The response is mocked at the HTTP layer with the shared MSW `useServerMock`, using the real backend body.
2. **"shows a generic error and stays logged in when another 403 refuses the deletion"**. Kept. It guards against the 403004 branch matching too broadly.
3. **"disables the delete button while the deletion request is pending"**. Kept. A deferred promise holds the MSW handler open. The test checks the button's `disabled` attribute during the request, then checks the failure message and that the button is enabled again. There's no vacuous click on the disabled button; that was dropped after review 2.

Other mocks: the only one is `userLogoutClient` (`jest.mock`). It was already in the file and is needed because logout navigates the page. There are no hand-rolled mocks to replace with noops or dataclasses, and no layout faking. A refactor wouldn't remove any mocks: the component is a thin modal around one API call.

**`expectModalStillOpen` reads BModal's emitted `change` event.** That event is BModal's documented v-model event, not the component's own output, so the assertion leans toward implementation. I probed alternatives in jsdom on both HEAD and base:
- `isVisible()` on the modal, the dialog and the input is always `false`, because jsdom doesn't run the transition.
- `@hidden` / the component's `reset` emit never fires.

So `change` is the only jsdom signal that tells "kept open" apart from "closed". I kept it. A real "modal still shown" check belongs in E2E (below).

## API / integration test: not added

The backend is unchanged. `ConfigDoesNotAllowException` (403004) on self-deletion when `allow_user_deletion` is false is existing behaviour. Testing it would need a dedicated integration case, because the API driver forces deletion on, and it would only pin behaviour this client-only fix doesn't touch. This matches the round-1 judgement.

## E2E: marginally warranted; left untracked, not run

The modal staying open with the refusal message is browser behaviour, and jsdom can only show it indirectly (see above). Codex caught the modal closing on OK, while the original unit tests didn't. An E2E test would assert the user-visible result directly.

The draft `test/integration_selenium/test_user_deletion_disabled.py` in WORKING_DIRECTORY:
- is a `SeleniumIntegrationTestCase` with `allow_user_deletion=False`;
- uses existing `navigation.yml` components (`preferences.delete_account*`) and `assert_error_message`, which matches `.alert-danger`;
- reasons correctly: it would fail on base, because the message never shows and the modal closes.

Two reasons argue against committing it:
- **Cost.** It spins up a dedicated Galaxy server to check one alert.
- **No run here.** `static/dist` doesn't exist, because the 25.1 webpack build was never finished, and browsers need the library workaround in `earlier_drafts/1/screenshot_debrief.md`.

Per instructions it is **not committed**. I recommend running it during the screenshot step or polish, or letting CI run it, and committing it only after it passes. The `self.sleep_for(UX_RENDER)` after navigating mirrors `test_personal_information.py::test_delete_account`.

## Addendum (coordinator, after this challenge)

After this challenge ran, `e7210c056cf` added one test: "shows a generic error and re-enables the delete button when the request fails to reach the server". It uses `response.untyped(HttpResponse.error())` through the shared mock, following the `JobStepJobs.test.ts` precedent. It fails against `e6590e91c9b` (no alert, plus an unhandled-rejection Vue warning) and passes with the fix. Only one test changed, so a fresh challenge wasn't needed.
