```yaml
documents:
  - path: vault/projects/url_abstraction_hardening/index.md
    why: Project plan for this change - per-release branches, skip-if-clean-merge rule, and the folded-in http_redirect_validation_25.1 work.
  - path: vault/research/Component - Tool Citations and External Metadata Fetch.md
    why: Section 7 is the only description of validate_non_local, validate_uri_access, fetch_url_allowlist_ips plumbing and the call-site list; anchored on dev, so line numbers and the http file source (requests there, urllib on 25.1) differ.
    load_when: Mapping callers of validate_non_local and checking what else changes when its parsing changes.
  - path: vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/index.md
    why: Prior work that checks each redirect hop with validate_non_local via galaxy.util.requests.bounded_get; scope decision "no host allowlist, existing validate_non_local".
    load_when: Designing the shared per-hop helper and deciding what to reuse from bounded_get.
  - path: vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/initial_implementation_debrief.md
    why: Describes bounded_get (redirect limit, https-only, injected validator per hop, URL normalized before check) and the Galaxy-side adapter that injects validate_non_local.
    load_when: Choosing the helper's signature or where it lives (galaxy.util vs galaxy.files).
  - path: vault/repositories/galaxy/branches/active/citation_fetch_hardening_26.1/test_challenges_debrief.md
    why: How per-hop redirect checks were tested (responses-mocked 302 chains) and what was judged redundant.
    load_when: Writing hop-check tests.
  - path: vault/research/Component - DRS Support.md
    why: fetch_url_allowlist plumbing into file sources and stream_url_to_file re-entering the http file source; shows other consumers of the allowlist.
    load_when: Checking that DRS-driven http downloads behave the same after the http file source change.
  - path: vault/research/Component - Workflow Import.md
    why: TrsProxy role in workflow import-by-TRS-URL (create_workflow_from_trs_url); callers of match_url and server_from_url.
    load_when: Changing TrsProxy/TrsServer to take the allowlist and check hops.
  - path: vault/research/Component - Data Fetch.md
    why: URL-element validation in the fetch API (validate_non_local on submitted URLs), upstream of the http file source.
    load_when: Confirming parser changes keep fetch API validation behavior.
  - path: vault/repositories/galaxy/branches/merged/fix_format_source_docs/polish_debrief.md
    why: Records that test/unit/workflows/test_trs_proxy.py hits an external TRS server and goes red in CI unrelated to a branch.
    load_when: Interpreting CI results for TRS tests.
research_requests: []
```

## Code observations (verified at 9eb3271d60a, release_25.1)

- **`validate_non_local` (`lib/galaxy/files/uris.py`)** matches the scheme by lowercase prefix and reads the host from `urlparse(...).netloc` with hand-rolled `@`/port/IPv6 splitting. `validate_uri_access` and `TrsProxy.match_url` use the same lowercase prefix test for `file://`. It returns the stripped URL; `upload_common.py` uses the return value.
- **Callers that only inherit the parsing change:** `_fetch_util.py`, `upload_common.py`, `api/workflows.py` and `services/histories.py` (via `validate_uri_access`), `api/proxy.py`.
- **`files/sources/http.py`:** urllib follows redirects and the URL is checked after `urlopen` returns. The per-hop version needs an opener with an `HTTPRedirectHandler.redirect_request` override; tests patch `urllib.request.urlopen`, so the patch target moves.
- **`workflow/trs_proxy.py`:** `match_url` checks the user URL once; `TrsServer._get` uses `requests.get` with default redirects. `TrsServer` doesn't hold the allowlist; `get_server` (configured servers) and `server_from_url` (user URL) both build it. `test_match_url` is the offline test; the rest hit dockstore.
- **`files/sources/remotezip.py`:** `get_final_url` (HEAD, redirects on) and `get_range` (GET, redirects on, no timeout). Tests mostly need network (`skip_if_github_down`).
- **`api/proxy.py`:** already follows redirects manually and checks each hop (httpx, async), so it is the model for the loop.
- **`galaxy.util.requests`** on 25.1 is the thin wrapper; `bounded_get` isn't here.
- **Tests:** `test/unit/files/test_uris.py`, the `fake_public_dns` fixture in `test/unit/files/conftest.py`, and `responses` (requests only; urllib needs a mocked opener or a local server).
