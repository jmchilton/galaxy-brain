# Refused account self-deletion shows a generic error instead of "User deletion must be configured…"

When Galaxy refuses an account self-deletion, the Delete Account modal shows "An error occurred while deleting the user." The message that explains the refusal never appears.

On a stock Galaxy, every self-deletion attempt ends this way. `enable_account_interface` defaults to `true`, and that is the setting that shows the **Delete Account** card in User Preferences. `allow_user_deletion` defaults to `false`, so the server refuses the request. On current `dev` (20f365a2654):

| Step | What happens |
| --- | --- |
| User confirms their email and clicks **Delete Account Permanently** | `DELETE /api/users/{id}` |
| Server answers | HTTP 403, `{"err_code": 403004, "err_msg": "The configuration of this Galaxy instance does not allow admins to delete users."}` |
| Modal shows | `An error occurred while deleting the user.` ❌ |
| Modal should show (the text is already in the component) | `User deletion must be configured on this instance in order to allow user self-deletion.  Please contact an administrator for assistance.` ✅ |

<details><summary>Why</summary>

`UserDeletion.vue`'s `handleSubmit` picks its message with `error.err_code === 403`. Galaxy's `err_code` is a six-digit code, not the HTTP status. `ConfigDoesNotAllowException` sends `403004` (`CONFIG_DOES_NOT_ALLOW`), so the branch is never taken.

The client's `errorResponseMiddleware` sets `err_code` to the HTTP status only for failures Galaxy didn't produce (no `X-Request-ID`). So today the "must be configured" text only shows when a proxy answers with a 403, and that is exactly the wrong case for it.

Both server refusals a user can get on this route carry 403004:

- `allow_user_deletion: false`: `UserManager.delete` (`lib/galaxy/managers/users.py`) raises `ConfigDoesNotAllowException`. This is the refusal the UI actually reaches.
- `enable_account_interface: false`: `ensure_account_modification_allowed` (`lib/galaxy/webapps/galaxy/api/users.py`) raises `ConfigDoesNotAllowException("Account deletion is not allowed in this Galaxy instance")`. `test/integration/test_config_options_users.py::test_delete_rejected_for_non_admin` asserts this 403004. The same setting hides the Delete Account card, though.

The other 403 on this route, `InsufficientPermissionsException` (403005, for deleting someone else's account), can't happen here, because the modal always sends the current user's id.

The Selenium `test_delete_account` doesn't catch this, because the test driver sets `allow_user_deletion=True` (`lib/galaxy_test/driver/driver_util.py`).

</details>

<details><summary>Reproduction (vitest, fails on dev)</summary>

Save as `client/src/components/User/UserDeletionRefusal.test.ts` and run it with `pnpm exec vitest run` under the node version in `client/.node_version`. The `not.toBe` fails on dev. Changing the check to `403004` turns the test green, and the existing `UserDeletion.test.ts` still passes.

```ts
import { getFakeRegisteredUser } from "@tests/test-data";
import { getLocalVue } from "@tests/vitest/helpers";
import { mount } from "@vue/test-utils";
import flushPromises from "flush-promises";
import { createPinia } from "pinia";
import { expect, it, vi } from "vitest";

import { useServerMock } from "@/api/client/__mocks__";
import { useUserStore } from "@/stores/userStore";

import UserDeletion from "./UserDeletion.vue";
import GModal from "@/components/BaseComponents/GModal.vue";

vi.mock("@/utils/logout", () => ({ userLogoutClient: vi.fn() }));

const { server, http } = useServerMock();
const EMAIL = "user@test.com";

it("explains a refused self-deletion instead of showing a generic error", async () => {
    // Body Galaxy sends when allow_user_deletion is false (ConfigDoesNotAllowException).
    server.use(
        http.delete("/api/users/{user_id}", ({ response }) =>
            response("4XX").json(
                {
                    err_code: 403004,
                    err_msg: "The configuration of this Galaxy instance does not allow admins to delete users.",
                },
                { status: 403 },
            ),
        ),
    );
    const wrapper = mount(UserDeletion as object, { global: getLocalVue(true), pinia: createPinia() });
    useUserStore().currentUser = getFakeRegisteredUser({ email: EMAIL, id: "uid" });
    await flushPromises();

    await wrapper.find("#name-input").setValue(EMAIL);
    wrapper.findComponent(GModal).vm.$emit("ok");
    await flushPromises();

    const alert = wrapper.find(".alert-danger").text();
    expect(alert).not.toBe("An error occurred while deleting the user."); // fails on dev
    expect(alert).toContain("User deletion must be configured on this instance");
});
```

</details>

## Context

Bug found while converting the UserDeletion tests to Storybook stories on 🌿 [`vitest_stories`](https://github.com/jmchilton/galaxy/tree/vitest_stories). A regression from 🔀 #19658 (25.1), whose Composition API migration (commit `2113d36cca7`) replaced axios's `e.response.status === 403` with `error.err_code === 403`. That branch didn't even assign the message at first; 🔀 #22114 (26.1) fixed the assignment but kept the check. #19658 also stopped a failed delete from logging the user out anyway.

## Proposed Approach

In `UserDeletion.vue`, compare `error.err_code` with a named `CONFIG_DOES_NOT_ALLOW = 403004` constant, the way `api/pages.ts` names `USER_SLUG_DUPLICATE`. Keep the component's own wording for that case.

<details><summary>Approach details</summary>

- `components/providers/JobProvider.js` also hardcodes `403004`. The client has no shared error-code module yet; a `CONFIG_DOES_NOT_ALLOW` constant in `@/api` would serve both. That is nice to have, not required.
- Other failures could show `errorMessageAsString(error)` in place of the fixed generic sentence. That is optional and not needed for this bug.
- Tests, red first, in the existing `UserDeletion.test.ts` using its `mountComponent`:
  - a 403 / 403004 response shows "User deletion must be configured…" (the reproduction above);
  - a guard case: a different failure (e.g. 403005, or a 500) still shows the generic text, which proves the check tells the cases apart.

</details>

## Alternative Approaches

Showing the server's `err_msg` would tell users that the instance "does not allow admins to delete users", which is the wrong audience. Checking the HTTP status can't tell a Galaxy refusal from a proxy's 403. Hiding the card needs a config value that non-admins can't see today. Matching the error code is the smallest fix that is also exact.

<details><summary>Alternatives In Detail</summary>

### Alternative: Show the server's `err_msg`

<details><summary>Description</summary>

#### Details

Drop the custom sentence and show `errorMessageAsString(error)` for every failure.

#### Why the proposed approach is preferred

The message a user actually gets, from `UserManager.delete`, is worded for the admin users grid: "The configuration of this Galaxy instance does not allow admins to delete users." It doesn't tell the user what to do. Rewording it server-side would affect the admin path too. The component's sentence ("…Please contact an administrator") is the right one here.

</details>

### Alternative: Check the HTTP status

<details><summary>Description</summary>

#### Details

Destructure `response` from `GalaxyApi().DELETE(...)` and test `response.status === 403`, which is what the code did before #19658.

#### Why the proposed approach is preferred

The status covers 403005 and proxy-generated 403s as well as the configuration refusal. Only `err_code` identifies "this instance doesn't allow it".

</details>

### Alternative: Hide the Delete Account card when deletion is disabled

<details><summary>Description</summary>

#### Details

Gate the card in `UserPreferences.vue` on `allow_user_deletion` as well as `enable_account_interface`.

#### Why the proposed approach is preferred

`allow_user_deletion` is only serialized by `AdminConfigSerializer`, so non-admin clients can't see it. Exposing it is a separate decision, and the modal's message would still need fixing for clients that keep the card. This is a reasonable follow-up, not a replacement.

</details>

</details>
