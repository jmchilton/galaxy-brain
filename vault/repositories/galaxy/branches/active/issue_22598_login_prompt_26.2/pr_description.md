Addresses 🎯 #22598 on 26.2. On a logged-out Tool Shed, Explore → Changelog and Explore → Contents now say "Log in to view changelog" and "Log in to browse contents". They go to `/login?redirect=<hgweb path>`, and after login the user lands on the hgweb view instead of hgweb's bare "Forbidden".

hgweb's HTML views sit behind login on the main shed because crawlers overloaded them. The issue reporter said logging in covered their use. Anonymous browsing is #24167, which targets `dev`. This PR is the release-branch stopgap suggested in that review, and it adds no server load.

***`/login` accepts a `redirect` query and returns there after login. The value has to start with `/` and resolve to the shed's own origin, so tricks like `//host` or `/\t/host` (browsers drop the tab) fall back to the usual success page.***

<details><summary>What changed</summary>

- `RepositoryExplore.vue`: logged-in users keep the hgweb links. Anonymous users get the login prompts, in the menu and in dense mode.
- `auth.store` `login()` takes an optional return path and checks it with the new `safeReturnPath` in `util.ts`. The `/login` route passes `?redirect=` through `LoginPage` to `LoginForm`.
- `PaginatedRepositoriesGrid.test.ts` gets pinia and a `RouterLink` stub, because the explore buttons it renders now read the auth store.

</details>

## Risks

- `/login` now redirects to a path given in the URL. It follows only paths that resolve to the shed's own origin. Tests cover off-site, protocol-relative, backslash, tab/newline-smuggled and `javascript:` values.
- After login, reaching the hgweb view depends on the main shed's nginx accepting the new session. That can't be tested here.
- When merged forward, `RepositoryExplore.vue` conflicts with #24167 on `dev`. Keep #24167's version there.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

Vitest covers the anonymous and logged-in explore links, `LoginForm` passing the return path, the auth store landing on the return path or falling back, and `safeReturnPath`.

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
