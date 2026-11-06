- `kind/bug`
- `area/API`
- `area/workflows`
- `area/security`

Labeler applies `area/API` (api/**) and `area/testing/api`; `area/testing/api` dropped (tests support the fix, not the focus). `area/workflows` isn't auto-applied (no `lib/galaxy/workflow/**` change) but the change is about workflow access. `area/security`: drop it if this should stay low-profile.
