- `kind/refactoring` — naming-only API change; no behavior change.
- `area/API` — renames a route and payload fields (bot applies it too).
- `area/workflows` — workflow extraction (bot applies it via `lib/galaxy/workflow/`).

Bot would also add `area/client`/`area/UI-UX`; dropped — client change is payload keys only, nothing visible.
