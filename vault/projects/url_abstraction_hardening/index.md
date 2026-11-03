---
type: project
title: "URL Abstraction Hardening"
tags:
  - project
  - galaxy/lib
status: draft
created: 2026-11-02
revised: 2026-11-02
revision: 1
ai_generated: true
summary: "Align Galaxy's shared URL check with how its HTTP clients read URLs, and check every redirect hop, per release."
---

# URL Abstraction Hardening

`validate_non_local` (`lib/galaxy/files/uris.py`) and its callers parse URLs one way, while the HTTP clients that then fetch them (`requests`/`urllib3`, `urllib`, `httpx`) parse them in others. Redirects are also followed differently by each caller. This project lines the shared check up with the clients and gives callers one way to check every redirect hop, carrying forward the per-hop approach from [`citation_fetch_hardening_26.1`](../../repositories/galaxy/branches/active/citation_fetch_hardening_26.1/index.md)'s `bounded_get`.

The code differs across releases (e.g. the http file source uses `urllib` through 26.1 and `requests` from 26.2), so each release gets its own branch unless the older one merges forward cleanly.

## Branches

| Release | Branch | Status |
|---|---|---|
| `release_25.1` | [`harden_url_abstractions_25.1`](../../repositories/galaxy/branches/active/harden_url_abstractions_25.1/index.md) | hardening |
| `release_26.0` | [`harden_url_abstractions_26.0`](../../repositories/galaxy/branches/active/harden_url_abstractions_26.0/index.md) | needed: 25.1 conflicts on 26.0 (`uris.py`, `http.py`, tests) |
| `release_26.1` | [`harden_url_abstractions_26.1`](../../repositories/galaxy/branches/active/harden_url_abstractions_26.1/index.md) | needed: 25.1 conflicts on 26.1 (also `trs_proxy.py`, TRS/DRS tests) |

## Decisions

- 2026-11-02, John: one branch each for 25.1, 26.0 and 26.1; skip a release when the branch below merges into it cleanly.
- A release is skipped only if the test merge has no conflicts, the new tests pass on the merged tree, and that release has no new caller needing its own change.
- `http_redirect_validation_25.1` (an earlier one-commit branch for per-hop checks in the http file source, never recorded or opened) is folded into the 25.1 branch.
