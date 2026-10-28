Toward 🎯 #22598 on 26.2 - anonymous Tool Shed users get a login prompt instead of hgweb's bare "Forbidden".

On a logged-out Tool Shed, Explore → Changelog and Explore → Contents link to hgweb views that answer "Forbidden" with no hint why. They now read "Log in to view changelog" and "Log in to browse contents", and login sends the user back to the hgweb view they asked for. ***Direct hits on hgweb URLs (bookmarks, search results) still get "Forbidden"; only links from the Tool Shed UI change.***

hgweb's HTML views sit behind login on the main shed because crawlers overloaded them. The issue reporter said logging in covered their use. ***This is the release-branch stopgap suggested on #24167; anonymous browsing itself stays in #24167 on `dev`, and this PR adds no server load.***

To make that work, `/login` now takes `?redirect=<path>` and returns there after login. ***The value has to start with `/` and resolve to the shed's own origin, so `//host`, `/\t/host` (browsers drop the tab) and the like fall back to the usual success page.*** Login links carry it wherever returning makes sense: the masthead Login button returns to the current page (except from the home, auth and post-auth pages), and switching between Login and Register keeps the return path.

<details><summary>What changed</summary>

- `RepositoryExplore.vue`: Changelog/Contents render from one link model. Logged-in users keep the hgweb links; anonymous users get the login prompts, in the menu and in dense mode.
- `util.ts`: `safeReturnPath` vets the return path; `withRedirect` builds `/login` and `/register` links that carry it.
- `auth.store` `login()` takes the return path and lands there, or on `/login_success`. A failed session check now clears the cached user, so an expired session shows the prompts rather than links to "Forbidden". The unused `returnUrl` state is gone.
- `routes.ts` passes `?redirect=` to `LoginPage`/`LoginForm` and `RegisterPage`. `ShedToolbar.vue` builds its Login link from the current route.
- `PaginatedRepositoriesGrid.test.ts` gets pinia and a `RouterLink` stub, because the explore buttons it renders now read the auth store.

</details>

## Risks

The one lasting choice is that `/login` honors a `redirect` query; it only follows same-origin paths, and dropping it later just sends users to the success page again.

<details><summary>Risk Details</summary>

- `/login` redirects to a path from the URL. Tests cover off-site, protocol-relative, backslash, tab/newline-smuggled and `javascript:` values.
- After login, reaching the hgweb view depends on the main shed's nginx accepting the new session. That can't be tested here; the test shed doesn't gate hgweb.
- Merged forward, `RepositoryExplore.vue` conflicts with #24167 on `dev`. Keep #24167's version there; the login return path can carry forward unchanged.

</details>

<details><summary>Risk Review Advice</summary>

Read `safeReturnPath` in `util.ts` and its tests in `util.test.ts`: it is the only guard on the redirect. Then check that the masthead's skip list in `ShedToolbar.vue` covers every page a post-login return would be pointless on.

</details>

## Context

Suggested in review of 🔀 #24167, which keeps anonymous contents browsing on `dev`. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All items pass.</summary>

- [x] What does the user see when it fails? Bad credentials keep the existing error banner. An off-site or malformed `?redirect` is ignored and login lands on `/login_success`. A failed session check clears the cached user, so the prompt shows instead of stale logged-in links.
- [x] Is the diff free of unrelated or stale generated changes? Yes.
- [x] Are unit tests not just testing the literal implementation? Yes: they assert where login lands, the off-site fallback, rejected return paths and the masthead's skip list, plus the Playwright test `test_login_returns_to_redirect`.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes: the leading commit renders the explore links from one model, behavior unchanged.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/pr_checklist/). Run via claude-sonnet-5-5 at default effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Modest expansion, applied: every login link carries the return path.</summary>

As first built, `?redirect` was used only by the two explore prompts while the masthead Login still dropped users on `/login_success`. The masthead and the Login/Register links now carry it, and the dead `returnUrl` store state is gone. A 401-driven route guard (wouldn't cover hgweb, which isn't an SPA route) and backporting #24167 (adds the load the gating avoids) were rejected.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/scope_evaluation/).

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>A leading commit renders Changelog/Contents from one link model, behavior unchanged.</summary>

The menu and dense button group duplicated markup per link. With one computed model, the anonymous-prompt commit becomes a single ternary over the link target. Existing tests pass unchanged on the refactor.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/baseline_refactor/).

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Unit tests kept; a Playwright test for the login return path added.</summary>

Store, form and menu tests assert visible behavior with minimal mocking. The new E2E test logs in from `/login?redirect=...` and checks it lands on that page.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/test_challenges_debrief/).

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding, fixed: an expired session still showed the hgweb links.</summary>

The auth store loaded `user` from localStorage and kept it when `/api/users/current` failed. A failed check now clears it; the new store test failed first.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/codex_review/).

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Duplicated explore-link markup collapsed; the rest kept.</summary>

Four `v-if`/`v-else` template copies became one link model (now the baseline refactor). `safeReturnPath` stays in `util.ts`, the right layer for it.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/issue_22598_login_prompt_26.2/thermo_nuclear_review/).

</details>

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

Vitest covers the anonymous and logged-in explore links, the return path through `LoginPage`, `LoginForm`, `RegisterPage` and the masthead, the auth store landing on the return path or falling back, `safeReturnPath` and `withRedirect`. The Playwright test `test_login_returns_to_redirect` logs in from `/login?redirect=` and lands on that page.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
