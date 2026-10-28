A clear gap in my current process is figuring out what to do when other people have already reviewed a PR I launched a review of. Hmm... -John

<details><summary>Automated Review Details</summary>

Reviewed with [John's Galaxy Brain Review Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-reviews/).

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via claude-opus-5-5 at medium effort.
- Review profile [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via claude-opus-5-5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via claude-opus-5-5 at medium effort.
- Review profile [gx_risk_assessment](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_risk_assessment.md) was run via claude-opus-5-5 at low effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via claude-opus-5-5 at medium effort.

</details>

<details><summary>Risks</summary>

Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: 06ab66dce072328c6e161b8153823b6e78d93b06

The one-way risks are small and additive: a new `dspace` plugin type in the API schema and template enums, plus a URI path layout (`/bitstreams/<uuid>/<name>`, `/communities|collections|items/<uuid>`) that gets saved in dataset source URIs and user template instances, so it must stay stable after release.

<details><summary>Risk Details</summary>

- The `dspace` value joins the public `FileSourceTemplateType` / plugin-type enums in the API schema. Renaming or removing it later breaks clients and stored user file source instances.
- The `dspace://` URI path scheme ends up in dataset provenance and in workflows or requests that reference remote files. Changing the path layout (e.g. dropping the trailing file name, or switching from bitstream UUID to handle) would break re-fetching existing URIs.
- The template `production_dspace.yml` (id `dspace`, version 0) fixes the variable/secret names (`api_url`, `token`). User instances store these names, so renaming them needs a template version upgrade path.
- The behavior choices become user expectations: read-only, only the `ORIGINAL` bundle exposed, MD5 hashes skipped for PDFs, unpaged listings capped at the first 100 objects, and offsets that are not a multiple of the limit rounded down to a page. These can all be changed later, but changes would be visible to users.
- The plugin does its own redirect following and private-address checks in addition to the shared `validate_non_local` / `fetch_url_allowlist`. It is a second copy of outbound-fetch policy that has to be kept consistent with the shared one.
- The sample `file_sources_conf.yml.sample` points at `demo.dspace.org`, which resets its content. This is two-way but may confuse admins who copy it as-is.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide that the URI path layout is the one they want to keep, since it is the main thing that persists in user data: especially whether to keep the bitstream UUID as the key and the trailing name only for display. They should also check that the template's variable and secret names match conventions in sibling templates (e.g. NOMAD, ARC), because renaming them later needs a template version upgrade.

The custom `_open_url` redirect and SSRF handling should be checked against how other HTTP-based file sources fetch URLs. If a shared helper exists or should exist, it is cheaper to adopt it now than to keep a separate outbound-fetch policy going. Everything else (pagination shortcuts, PDF hash skipping, client icon/message) can be undone.

</details>

</details>

## Automated Review Findings

<details><summary>About findings</summary>

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

</details>

<details><summary>Review Verification Branch Details</summary>

This [review branch](https://github.com/jmchilton/galaxy/tree/pr_24290_review_0) contains work the verification agent did to help verify findings and make sure suggestions make sense and are actionable. This doesn't necessarily represent production ready code. Feel free to include any commits in the PR but they should be reviewed by a human.

The overlapping fixes already proposed in arash77/galaxy#10 aren't repeated here. This branch is based on the PR head, not on #10, so it will conflict with #10 and needs a rebase whichever lands first.

<details><summary>Branch and Commit Details</summary>

Branch [`pr_24290_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24290_review_0) is in `~/projects/worktrees/galaxy/pr/24290`, branched from the reviewed commit `06ab66dce07`. It fixes the findings that arash77/galaxy#10 doesn't already cover. The test changes split the four-scenario download test and cover the error mapping and path refusals that had no tests. One fix lets bitstreams named `..` be imported. The refactors split the search-result unwrapping out of `_page`, dispatch `_list` with `match`, share in-memory pagination through `BaseFilesSource`, and move the redirect-checking GET into `galaxy.files.uris` as `get_checking_every_redirect`. `test_dspace.py` (15 tests) and the new `test_uris.py` test pass. Because #10 also edits `dspace.py`, `test_dspace.py` and `uris.py`, this branch will conflict with it, mostly in `_list`, `_open_url` and the test fixtures, and needs a rebase whichever lands first.

- [`ee426f4d526`](https://github.com/jmchilton/galaxy/commit/ee426f4d526) Split the DSpace download and token test into one test per behavior — four named tests replace the sequential `responses.replace` scenario, and each registers only its own responses.
- [`bbb0ea4c4c7`](https://github.com/jmchilton/galaxy/commit/bbb0ea4c4c7) Test how DSpace error responses and bad paths are reported — adds a parametrized test for 404, non-JSON and redirect-loop responses, and a test that non-DSpace path shapes are refused without a request.
- [`55cf212db98`](https://github.com/jmchilton/galaxy/commit/55cf212db98) Keep a DSpace bitstream name of .. from hiding its uuid — `_realize_to` splits the raw path and rejects an empty, `.` or `..` uuid segment; the tests were red first.
- [`1a4fd2f58bf`](https://github.com/jmchilton/galaxy/commit/1a4fd2f58bf) Read DSpace search results in their own method, not through a magic key — adds `_search_page` and `_embedded`, and replaces `_objects` with `_page_params`.
- [`fb0d0e97936`](https://github.com/jmchilton/galaxy/commit/fb0d0e97936) Dispatch DSpace listings on the path shape with match — `_list` becomes a `match` over the path parts that calls `_top_communities`, `_community_children` and `_collection_items`.
- [`0f011d04924`](https://github.com/jmchilton/galaxy/commit/0f011d04924) Share in-memory pagination between fsspec and DSpace file sources — moves `_apply_pagination` from `FsspecFilesSource` to `BaseFilesSource` for `_filter_and_page` to use.
- [`8bd2da95ba7`](https://github.com/jmchilton/galaxy/commit/8bd2da95ba7) Move the DSpace redirect-checking GET into galaxy.files.uris — `get_checking_every_redirect` takes a per-hop URL check and per-hop headers, DSpace keeps only its status mapping, and a `test_uris.py` test covers the helper.

</details>

</details>

### P2 1: The redirect-checking GET is a reusable primitive kept private to DSpace (implementation verified)

`DSpaceFilesSource._open_url` is the only fetcher in `lib/galaxy/files` that follows redirects by hand (`allow_redirects=False`), checks every hop against `fetch_url_allowlist` before requesting it, and keeps the bearer token on the API origin. Its siblings are weaker: `cbioportal._open_url` and ckan's download check the starting URL and the final `response.url`, and `http.py` checks the final URL. In each of them `requests` has already fetched every intermediate hop before anything checks it. With the loop inside one plugin, the next HTTP file source will copy it again or keep the weaker pattern.

<details><summary>Evidence</summary>

A new `test_uris.py` test of the extracted helper confirms that each hop is checked before it is requested, a refused hop is never fetched, headers are computed per hop, and the redirect cap holds. All DSpace tests pass on the helper.

</details>

Move the loop to `galaxy.files.uris` next to `validate_non_local`, taking a per-hop URL check and per-hop headers, and keep only the DSpace status mapping (400/401/403/404) in the plugin. Moving cbioportal, ckan and `http.py` onto it can be a follow-up.

<details><summary>Details</summary>

The review branch adds `get_checking_every_redirect(url, check_url, headers_for, params=None, max_redirects=5)`. It raises `requests.exceptions.TooManyRedirects` past the cap, and DSpace's existing `except RequestException` turns that into a `MessageException`. `headers_for` gets each hop's URL, so DSpace sends `Authorization` only when the hop's origin matches `api_url`. ckan's `_is_same_origin` could use the same hook. `check_url` doesn't depend on which private-address helper lands: DSpace passes its own `_refuse_a_private_address`, or the shared `refuse_a_private_address` proposed in arash77/galaxy#10.

</details>

Fixed on the review branch in [`8bd2da95ba7`](https://github.com/jmchilton/galaxy/commit/8bd2da95ba7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort and [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P2 2: One download test covers four behaviors in sequence (implementation verified)

`test_download_checks_every_redirect_and_keeps_the_token_on_dspace` checks four things in turn: token scoping across a redirect, 400 → `AuthenticationRequired` on download, the expired-token `authn/status` check on listing, and refusing a redirect to a link-local address. It switches between them with `responses.replace` on a shared registry. Its name covers only the first, a failure early on hides the later checks, and each step relies on the registry changes made by the step before. `test_nomad.py` gives each refusal its own test.

Split it into one test per behavior. The branch adds `test_download_follows_redirect_and_sends_token_only_to_dspace`, `test_rejected_token_on_download_raises_authentication_required`, `test_expired_token_on_listing_raises_authentication_required` and `test_redirect_to_private_address_is_refused`, each registering only the responses it needs.

Fixed on the review branch in [`ee426f4d526`](https://github.com/jmchilton/galaxy/commit/ee426f4d526).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 1: A bitstream named `..` or ending in `/..` is listed but cannot be imported (implementation verified)

`_file` builds `/bitstreams/<uuid>/<name>` from the bitstream's name, but `_realize_to` runs the path through `posixpath.normpath` before splitting it. A name of `..` or `x/..` therefore removes the uuid (`/bitstreams/f1/..` → `/bitstreams`), and the import fails with "not a file" even though the listing showed the file. The PR says the name only names the dataset, so it shouldn't affect lookup.

<details><summary>Evidence</summary>

A parametrized test that imports `gxfiles://dspace/bitstreams/f1/<name>` failed for `..` and `x/..` with `ObjectNotFound: The specified DSpace path is not a file [/bitstreams/f1/..]` and passed for `a/../b.txt`. After the fix all three pass, and `bitstreams/../x`, `bitstreams//x` and `bitstreams/./x` are refused without a request.

</details>

Split the raw path in `_realize_to` (strip the leading `/`, `split("/", 2)`) and reject an empty, `.` or `..` uuid segment, so `bitstreams/../x` can't become `core/bitstreams/../content`.

Fixed on the review branch in [`55cf212db98`](https://github.com/jmchilton/galaxy/commit/55cf212db98).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 2: Most of the error mapping in `_open_url` and the path refusals are untested (implementation verified)

Of the status mapping, only the 400-with-token branch has a test. Nothing covers 404 → `ObjectNotFound`, a non-JSON body → "did not answer like a DSpace 7 or newer REST API", more than `MAX_REDIRECTS` redirects, realizing a path that isn't `/bitstreams/<uuid>/<name>`, or listing an unknown path shape. arash77/galaxy#10 adds tests for 401/403 and recursive listing; these cases remain.

The branch adds a parametrized `test_dspace_responses_map_to_galaxy_errors` (404, non-JSON, redirect loop) and `test_paths_outside_the_dspace_layout_are_not_found`, which also asserts that no request is made.

Fixed on the review branch in [`bbb0ea4c4c7`](https://github.com/jmchilton/galaxy/commit/bbb0ea4c4c7).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via claude-opus-5-5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 3: `_page` uses the magic key `"searchResult"` to switch response shapes (implementation verified)

`_page(..., key)` checks for `key == "searchResult"` and then unwraps `_embedded.searchResult._embedded.objects[*]._embedded.indexableObject`. Every other key reads `_embedded[key]`. The string is both a lookup key and a mode flag, and `_objects` passes it through.

Give discover search its own `_search_page`, use a small `_embedded(data, key)` reader for both, and replace `_objects` with a `_page_params(params, limit, offset)` that only builds the paging parameters.

Fixed on the review branch in [`1a4fd2f58bf`](https://github.com/jmchilton/galaxy/commit/1a4fd2f58bf).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 4: `_filter_and_page` adds another copy of in-memory pagination (implementation verified)

`_filter_and_page` slices `entries[offset:offset + limit]` itself. `FsspecFilesSource._apply_pagination` already does this with the same semantics (an offset without a limit is honored), and cbioportal and ckan each have their own slice.

Move `_apply_pagination` from `FsspecFilesSource` to `BaseFilesSource` and have DSpace call it. Fsspec sources inherit it unchanged. cbioportal's override has the same semantics, so a follow-up can delete it.

Fixed on the review branch in [`0f011d04924`](https://github.com/jmchilton/galaxy/commit/0f011d04924).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>

### P3 5: `_list` dispatches with chained `len(parts) == 2 and parts[0] == ...` checks (implementation verified)

`_list` has a root branch plus three `if len(parts) == 2 and parts[0] == "<kind>"` branches, and each branch handles its query inline. The path layout (`/communities/<id>`, `/collections/<id>`, `/items/<id>`) isn't stated in any one place.

Use `match self._split(path):` with `case []`, `case ["communities", community_id]` and so on, and move each listing into a small named method (`_top_communities`, `_community_children`, `_collection_items`). Galaxy has no other `match` statements yet (it requires Python 3.10 or later), so a `{kind: handler}` dict is a fine alternative if maintainers prefer that.

Fixed on the review branch in [`fb0d0e97936`](https://github.com/jmchilton/galaxy/commit/fb0d0e97936).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [thermo_review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/thermo_review.md) via claude-opus-5-5 at medium effort. Verified via claude-opus-5-5 at medium effort.

</details>
