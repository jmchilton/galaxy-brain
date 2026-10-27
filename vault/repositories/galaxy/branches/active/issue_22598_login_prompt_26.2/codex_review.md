# Codex review

Codex (`codex exec -s read-only`) on `origin/release_26.2...2b555299241`. One finding.

## Confirmed — fixed

- **Expired session still shows hgweb links** (`RepositoryExplore.vue`). The auth store loads `user` from localStorage. `setup()` catches the 401/403 that the API client middleware throws from `/api/users/current`, but it didn't clear `user`, so Explore stayed on the logged-in branch and linked to hgweb's Forbidden page. Fixed in `auth.store.ts`: a failed check clears `user` and localStorage. The new `auth.store.test.ts` case failed first. Vitest 186/186; vue-tsc, prettier and eslint are clean.

## Refuted

None.
