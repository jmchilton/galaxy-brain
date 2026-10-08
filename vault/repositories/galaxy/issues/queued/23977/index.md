# galaxy#23977 — Client page loads fan out enough /api/ requests to trip rate limits

[Issue](https://github.com/galaxyproject/galaxy/issues/23977) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Came out of the playwright/gxui 429 measurements (`vault/projects/playwright/GALAXY_UI_SKILL_DESIGN.md`).

Workflow Invocations list: 165 `/api/` requests, 96 × 429 on test (nginx 4 r/s, burst 40). Causes: per-row HelpText eagerly loads `/api/datatypes` with no in-flight dedupe (×62); workflow list per-card `workflows/{id}/counts`; `useKeyedCache` retries 429 with no backoff; repeated `workflows/{id}?instance=true` unexplained.

Next: shared in-flight promise in `loadUploadDatatypes` / `helpTermsStore.ensureInitialized` (and skip datatypes for YAML terms); red test asserting invocations-list request count doesn't scale with rows.

Open: 37 of 62 datatypes requests unexplained; not re-measured on dev. The playwright notes wrongly attribute part of the 429s to Sentry (`/api/2/envelope/` goes to sentry.galaxyproject.org).
