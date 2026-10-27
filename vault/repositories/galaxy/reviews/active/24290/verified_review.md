### P2 1: The redirect-checking GET is a reusable primitive kept private to DSpace (implementation verified)

`DSpaceFilesSource._open_url` is the only fetcher in `lib/galaxy/files` that follows redirects by hand (`allow_redirects=False`), checks every hop against `fetch_url_allowlist` before requesting it, and keeps the bearer token on the API origin. Its siblings are weaker: `cbioportal._open_url` and ckan's download check the starting URL and the final `response.url`, and `http.py` checks the final URL. In each of them `requests` has already fetched every intermediate hop before anything checks it. With the loop inside one plugin, the next HTTP file source will copy it again or keep the weaker pattern.

<details><summary>Evidence</summary>

A new `test_uris.py` test of the extracted helper confirms that each hop is checked before it is requested, a refused hop is never fetched, headers are computed per hop, and the redirect cap holds. All DSpace tests pass on the helper.

</details>

Move the loop to `galaxy.files.uris` next to `validate_non_local`, taking a per-hop URL check and per-hop headers, and keep only the DSpace status mapping (400/401/403/404) in the plugin. Moving cbioportal, ckan and `http.py` onto it can be a follow-up.

<details><summary>Details</summary>

The review branch adds `get_checking_every_redirect(url, check_url, headers_for, params=None, max_redirects=5)`. It raises `requests.exceptions.TooManyRedirects` past the cap, and DSpace's existing `except RequestException` turns that into a `MessageException`. `headers_for` gets each hop's URL, so DSpace sends `Authorization` only when the hop's origin matches `api_url`. ckan's `_is_same_origin` could use the same hook. `check_url` doesn't depend on which private-address helper lands: DSpace passes its own `_refuse_a_private_address`, or the shared `refuse_a_private_address` proposed in arash77/galaxy#10.

</details>

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: One download test covers four behaviors in sequence (implementation verified)

`test_download_checks_every_redirect_and_keeps_the_token_on_dspace` checks four things in turn: token scoping across a redirect, 400 → `AuthenticationRequired` on download, the expired-token `authn/status` check on listing, and refusing a redirect to a link-local address. It switches between them with `responses.replace` on a shared registry. Its name covers only the first, a failure early on hides the later checks, and each step relies on the registry changes made by the step before. `test_nomad.py` gives each refusal its own test.

Split it into one test per behavior. The branch adds `test_download_follows_redirect_and_sends_token_only_to_dspace`, `test_rejected_token_on_download_raises_authentication_required`, `test_expired_token_on_listing_raises_authentication_required` and `test_redirect_to_private_address_is_refused`, each registering only the responses it needs.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: A bitstream named `..` or ending in `/..` is listed but cannot be imported (implementation verified)

`_file` builds `/bitstreams/<uuid>/<name>` from the bitstream's name, but `_realize_to` runs the path through `posixpath.normpath` before splitting it. A name of `..` or `x/..` therefore removes the uuid (`/bitstreams/f1/..` → `/bitstreams`), and the import fails with "not a file" even though the listing showed the file. The PR says the name only names the dataset, so it shouldn't affect lookup.

<details><summary>Evidence</summary>

A parametrized test that imports `gxfiles://dspace/bitstreams/f1/<name>` failed for `..` and `x/..` with `ObjectNotFound: The specified DSpace path is not a file [/bitstreams/f1/..]` and passed for `a/../b.txt`. After the fix all three pass, and `bitstreams/../x`, `bitstreams//x` and `bitstreams/./x` are refused without a request.

</details>

Split the raw path in `_realize_to` (strip the leading `/`, `split("/", 2)`) and reject an empty, `.` or `..` uuid segment, so `bitstreams/../x` can't become `core/bitstreams/../content`.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Most of the error mapping in `_open_url` and the path refusals are untested (implementation verified)

Of the status mapping, only the 400-with-token branch has a test. Nothing covers 404 → `ObjectNotFound`, a non-JSON body → "did not answer like a DSpace 7 or newer REST API", more than `MAX_REDIRECTS` redirects, realizing a path that isn't `/bitstreams/<uuid>/<name>`, or listing an unknown path shape. arash77/galaxy#10 adds tests for 401/403 and recursive listing; these cases remain.

The branch adds a parametrized `test_dspace_responses_map_to_galaxy_errors` (404, non-JSON, redirect loop) and `test_paths_outside_the_dspace_layout_are_not_found`, which also asserts that no request is made.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: `_page` uses the magic key `"searchResult"` to switch response shapes (implementation verified)

`_page(..., key)` checks for `key == "searchResult"` and then unwraps `_embedded.searchResult._embedded.objects[*]._embedded.indexableObject`. Every other key reads `_embedded[key]`. The string is both a lookup key and a mode flag, and `_objects` passes it through.

Give discover search its own `_search_page`, use a small `_embedded(data, key)` reader for both, and replace `_objects` with a `_page_params(params, limit, offset)` that only builds the paging parameters.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: `_filter_and_page` adds another copy of in-memory pagination (implementation verified)

`_filter_and_page` slices `entries[offset:offset + limit]` itself. `FsspecFilesSource._apply_pagination` already does this with the same semantics (an offset without a limit is honored), and cbioportal and ckan each have their own slice.

Move `_apply_pagination` from `FsspecFilesSource` to `BaseFilesSource` and have DSpace call it. Fsspec sources inherit it unchanged. cbioportal's override has the same semantics, so a follow-up can delete it.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: `_list` dispatches with chained `len(parts) == 2 and parts[0] == ...` checks (implementation verified)

`_list` has a root branch plus three `if len(parts) == 2 and parts[0] == "<kind>"` branches, and each branch handles its query inline. The path layout (`/communities/<id>`, `/collections/<id>`, `/items/<id>`) isn't stated in any one place.

Use `match self._split(path):` with `case []`, `case ["communities", community_id]` and so on, and move each listing into a small named method (`_top_communities`, `_community_children`, `_collection_items`). Galaxy has no other `match` statements yet (it requires Python 3.10 or later), so a `{kind: handler}` dict is a fine alternative if maintainers prefer that.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
