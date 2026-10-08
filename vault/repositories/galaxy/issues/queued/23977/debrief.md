# Debrief: client_page_load_api_fanout

Prepared 2026-10-08. Source: `client_page_load_api_fanout.md` (John's quote of the playwright/gxui agent + measurements in `vault/projects/playwright/GALAXY_UI_SKILL_DESIGN.md`). Proposal: `proposed_client_page_load_api_fanout.md`.

## Research

- Measurements are CDP-logged browser requests on test (2026-10-08), not re-measured. Invocations list 165 `/api/` requests, 96 × 429; workflow list 48, 1 × 429.
- nginx on test: `/api/` 4 r/s, burst 40, keyed by API key/session (infrastructure-playbook `8e96583`, `galaxy_test.j2`).
- Workflow list: per-card `workflows/{id}/counts` (`useWorkflowCardBadges.ts` → `invocationStore.ts`). Confirmed.
- Invocations list `/api/datatypes` ×62: per-row state badge HelpText → HelpPopover → Popper (eager `v-show` slot) → HelpTerm → `helpTermsStore.ensureInitialized` → `loadUploadDatatypes`; neither guard dedupes in-flight calls. State terms don't need datatypes. Same chain at test's deployed `67c3f964d355` and dev `9fd083720a7`. 25 rows explain 25 of 62; other 37 unexplained.
- `useKeyedCache` retries 429 up to 4 attempts, no backoff/`Retry-After` (since #21920 fixed #21886).
- `workflows/{id}?instance=true` ~4× per workflow: cause unconfirmed (`fetchWorkflowForInstanceId` already dedupes in flight); marked ❓.
- **Source correction:** Sentry is not in test's bucket. Client sets no `tunnel`; DSN host is sentry.galaxyproject.org. `/api/2/envelope/` only matched the path filter, so a few of the counted requests may be Sentry.
- No duplicate. Related: #19876, #20017, #21886/#21920.

## Rewrite

- One issue, not split: per-page table is the pitch; all causes share the dedupe/batch pattern.
- Lead with measurement table, then cause table with legend; call tree in details. Context cites the related issues. Proposed Approach + Alternatives included.
- Reviewer: Sentry note reworded, 62-vs-25 made honest, cited #21920, pinned infra commit.

## Leftover

- Not re-measured on dev; deployed test predates Vue 3 (code chains verified unchanged).
- 37 extra datatypes requests and the repeated `workflows/{id}` calls still unexplained.
- Assignment: came out of John's playwright/gxui work → likely assign John. Also tell the playwright project its Sentry attribution was wrong.
