Run via claude-sonnet-5-5 at default effort.

- [x] What does the user see when it fails? Bad credentials: existing ErrorBanner in LoginForm.vue (login catch sets errorMessage). Off-site/malformed `?redirect` is ignored, falls back to /login_success (auth.store.ts `safeReturnPath(returnTo) ?? "/login_success"`). Failed session check now clears cached user (auth.store.ts setup catch), so the login prompt shows instead of stale logged-in UI.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. Behavioral: auth.store.test.ts "lands on the page the user came to log in for", "falls back to ... off this site"; util.test.ts `safeReturnPath` "rejects anything that could leave the site"; ShedToolbar.test.ts "does not redirect back to the auth pages"; plus Playwright E2E `test_login_returns_to_redirect`.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes. Leading commit f5cb365091d "Render shed hgweb explore links from one model" is the baseline refactor (see baseline_refactor.md).
- [x] Are the comments free of excess archeology? Yes. Comments in util.ts, ShedToolbar.vue, RepositoryExplore.vue describe current behavior only.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.
