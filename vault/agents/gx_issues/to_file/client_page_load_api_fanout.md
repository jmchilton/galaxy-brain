# Galaxy client page loads fan out enough /api/ requests to trip test.galaxyproject.org's 429 limit

Source: John, 2026-10-08, quoting the playwright/gxui agent:

> A plain browser load of the workflow list already fires 48 /api/ requests in under a second, exceeding the 40-request burst limit and triggering a real 429—even without gxui involved.

> The workflow list makes an N+1 call to /api/workflows/{id}/counts per card plus ~24 base requests per load, including Sentry's /api/2/envelope/ hitting the same rate-limit bucket—so a page of workflows alone can trip the limit.

Full measurements (CDP-logged browser requests, one dev session, steps 30 s apart, 2026-10-08): `vault/projects/playwright/GALAXY_UI_SKILL_DESIGN.md`, section "429s and hardening plan", table after "Measured 2026-10-08". Headline rows:

| Step | Browser /api/ | Peak in 1 s | 429s |
|---|---|---|---|
| home | 24 | 24 | 0 |
| workflow list (~25 workflows) | 48 | 48 | 1 |
| run form | 32 | 32 | 0 |
| invocations list | 165 | 84 | 96 |

Named causes: workflow list fetches `workflows/{id}/counts` per card; invocations list fetches `/api/datatypes?extension_only=false` 62 times (uncached) and `workflows/{id}` 4× per workflow; Sentry `/api/2/envelope/` shares the nginx bucket (4 r/s, burst 40).
