# Test challenges review — galaxy#24290

- Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md)
- Model: Opus 5.5; effort as set by coordinator
- Reviewed commit: `06ab66dce072328c6e161b8153823b6e78d93b06`
- Debrief and test plan: [test_challenges_debrief.md](test_challenges_debrief.md)

Verdict: test layer is right (unit tests over a `responses` HTTP fake, same as the GitHub/DRS/Dataverse sources); no unit test should be dropped or moved to API/integration/E2E. The gaps are structure and untested branching. `test_dspace.py` and the example-parse test pass locally (3 passed).

### P2 1: `_all` paging loop and root-level search are untested

Every fake response returns one page, so `_all`'s loop (keep fetching `page=N` until `len(objects) >= total` or an empty batch) never runs a second iteration. That loop backs community children, bundles and bitstreams; an off-by-one there would silently truncate or repeat listings. The root `list("/", query=...)` branch, which fetches all top communities through `_all` and filters client-side because the endpoint has no search, isn't exercised either.

Add `test_listing_pages_through_every_dspace_page`: register two pages with `responses.matchers.query_param_matcher` (monkeypatch `dspace.PAGE_SIZE` small to keep the data small), assert all entries come back and exactly two requests were made. Add `test_root_search_filters_all_top_communities` across two pages of top communities, asserting filtered names and total.

### P2 2: Split the four-scenario download/token test

`test_download_checks_every_redirect_and_keeps_the_token_on_dspace` covers four behaviors: token scoping across a redirect, 400 → `AuthenticationRequired` on download, the expired-token `authn/status` check on listing, and refusing a redirect to a link-local address. It switches between them by `responses.replace` on a shared registry. Its name covers only the first, a failure early on hides the later checks, and each step depends on the previous step's registry changes. The sibling `test_nomad.py` names each refusal in its own test.

Split it into named tests on the shared `_fake_repository()` setup, e.g. `..._sends_token_only_to_dspace`, `test_rejected_token_on_download_raises_authentication_required`, `test_expired_token_on_listing_raises_authentication_required`, `test_redirect_to_private_address_is_refused`.

### P3 1: Error mapping and path refusals are mostly untested

Only the 400-with-token branch of `_open_url` is tested. Add one parametrized refusal test for: 404 → `ObjectNotFound`, 401/403 → `MessageException` (with and without the token hint), a non-JSON body → the "DSpace 7 or newer" message, more than `MAX_REDIRECTS` redirects, realizing a non-`/bitstreams/<uuid>/<name>` path, listing an unknown path shape, and `recursive=True`.

### P3 2: `production_dspace.yml` has no template expansion test

The example is only checked by the `test_examples_parse` glob. Siblings with distinctive templates also get an expansion test in `test/unit/files/test_template_models.py` (`test_production_aws_public_bucket`, `test_production_github_oauth`). The token secret is optional. The client form sends it as an empty value; checked locally that this expands to `token=''`. The source treats that as no token via `(config.token or "").strip()`, but nothing asserts it.

Add `test_production_dspace`: expand with `api_url` and `{"token": ""}`, then assert a `DSpaceFileSourceConfiguration` with `token == ""`. In `test_dspace.py`, configure `token=""` and assert that listing neither calls `authn/status` nor sends an `Authorization` header.
