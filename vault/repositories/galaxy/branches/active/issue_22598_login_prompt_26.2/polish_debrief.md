# Polish debrief: issue_22598_login_prompt_26.2

Polished 2026-10-28. Head `3a3d5771d30`, rebased cleanly onto `release_26.2` (`0902830bfa6`).

## Snapshot

```
created .../differential-review/snapshots/20261028T160102Z-polishing-3a3d5771d303.json
  polishing @ 3a3d5771d303 vs origin/release_26.2 (merge-base 0902830bfa67)
  first snapshot: 9 commits, 19 files, 43 hunks
```

## Steps

- **CI:** fork CI had never run; the new push (`3a3d5771d30`) starts it. Not yet checked.
- **Scope B (John's choice):** two new commits. `d910686da95` drops the unused `returnUrl` store state. `3a3d5771d30` adds `withRedirect` in `util.ts` (also used by the explore prompts), makes the masthead Login carry the current route (skipping `/`, auth and post-auth pages), and has Login↔Register links keep `?redirect`. `/register` gets a `returnTo` route prop for that. New tests are in `ShedToolbar.test.ts`, `RegisterPage.test.ts`, the new `LoginPage.test.ts` and `util.test.ts`. The component tests failed first. Vitest 191/191, vue-tsc clean, eslint 0 errors.
- **Checklist:** [pr_checklist.md](pr_checklist.md), all pass (Sonnet).
- **Strengthening (Opus):** I added a highlighted sentence saying that direct hgweb hits still get "Forbidden". I also reworded "lands on" to "sends back" and "every login link" to "where returning makes sense".
- **Check branch:** prettier, eslint and vue-tsc are clean. ruff, black and isort are clean on the two Python test files. mypy wasn't run, since the only Python change is test locators and a test method.
- **Titles/tags:** [pr_titles.md](pr_titles.md), [pr_tags.md](pr_tags.md). The labeler globs `lib/toolshed/**`, so it won't add `area/toolshed` for `lib/tool_shed`. Apply that label by hand.

## Left over

- The Playwright test only returns to an SPA route. A case that returns to `/repos/<owner>/<name>/shortlog` needs a seeded repo and a shed Playwright run. Neither was done. The new commits weren't run under Playwright either.
- No screenshots in the description.
- Scope question: should the hgweb "Forbidden" response itself link to `/login?redirect=`? That would cover bookmarks and search hits, but it widens the scope.
