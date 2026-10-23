- `kind/bug`
- `area/workflows`
- `area/API`

Early invocation rejection and recursive tool diagnostics are the central changes. Galaxy's labeler would add `area/testing` for the API regressions and `area/tool-framework` for the protocol property; those are supporting changes. The service/manager paths do not automatically trigger workflow/API labels, but their behavior warrants both.
