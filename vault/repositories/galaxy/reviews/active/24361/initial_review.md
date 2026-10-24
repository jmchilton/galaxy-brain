# Initial review — galaxy#24361 "Add HAL file source"

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md)
- Model: Claude Opus 5.5, effort: medium
- Reviewed commit: `57bac72b9a2` (base `origin/dev`)
- Scope: new `lib/galaxy/files/sources/hal.py` (297 lines), template model + example, client type registration, one template-model unit test.
- CI at review time: only `Main tool tests / Test (3.10)` red (`UnknownParameterTypeError: ... type file` in tool loading). Unrelated to file sources.

## Verdict

The source is small and careful. It validates every redirect hop, pins downloads to versioned URLs, filters attachment hosts and path shapes, and fails closed on read-only misuse. It matches the shape of its siblings (`cbioportal.py`, `nomad.py`): read-only rejection, `recursive` rejection, and duplicated config classes in `templates/models.py` all follow existing convention. The main gap is that `hal.py` has no tests at all. The second is that the most reusable part, a redirect-safe HTTP fetch, is buried as a private method. No P1s.

## Bugs / substantive

### P2 1: No tests cover `hal.py`

The only test added is `test_production_hal`, which checks the template YAML. The PR body leaves "automated tests" unchecked. None of the 300 lines of network and path logic run in CI. Siblings show the pattern to follow: `test/unit/files/test_cbioportal_download.py` and `test_nomad.py` use `responses` with `object.__new__` / patched allowlists. Minimum useful coverage:

- `_split_path`: valid `/hal-01479142v2`, `/hal-01479142v2/name`, bad version `v0`, extra segments, empty filename.
- `_record_files`: drops non-HAL hosts, non-`https`, wrong `/<id>/file/<name>` shape, and `.`/`..`/`\` names. Pins URLs to `/<id>v<n>/file/`. Raises on version mismatch and on ambiguous duplicate names.
- `_open_url`: rejects a redirect to a private address before requesting it, and rejects credentials in the URL. Turns 401/403 into the embargo message and 404 into `ObjectNotFound`. Stops after too many redirects.
- `_list` on a record: pagination slicing, the filename filter, and `_file_size` returning 0 on HEAD failure, a non-identity encoding, or a junk `Content-Length`.
- `_realize_to`: rejects a filename that isn't in the record.

These are cheap with `responses`. The redirect-validation behavior is the security-relevant part and should be locked in.

### P2 2: Extract the per-hop redirect-validating fetch into a shared helper

`HALFilesSource._open_url` does several things:

- `allow_redirects=False`, then `validate_non_local` on every hop before the request is made
- scheme and credential checks
- a cap on the number of hops
- `RequestException` → `MessageException`

That logic is generic and stricter than what siblings do. `http.py` and `cbioportal.py` let `requests` follow redirects and validate only `response.url` afterwards. Keeping it private to HAL means the next file source re-implements it, or doesn't. Suggest a context manager in `galaxy.files.uris`, next to `validate_non_local` and `get_reusable_http_session`, roughly `open_validated_url(url, allowlist, *, method, params, headers, timeout, max_redirects)`. HAL should call it, and other sources could adopt it later. The helper should also use `get_reusable_http_session()` when one is set. Today every call, including each of the size-probe HEADs, opens a fresh `requests.Session()` with no keep-alive. The HAL-specific parts (the 401/403 embargo message and the HTML-page rejection) stay in `hal.py`.

### P3 1: Listing a record with `limit=None` sends a HEAD for every attachment

`page = entries[start : start + limit if limit is not None else None]` gives the whole record when `limit` is omitted. The `remote_files` API defaults `limit` to `None` (`lib/galaxy/webapps/galaxy/api/remote_files.py:141`). Only the FilesDialog always passes `perPage`. An API call on a record with many annexes then fans out unbounded HEAD requests, 4 at a time with a 5 s timeout each. Cap the probe at `DEFAULT_PAGE_LIMIT` when `limit is None`, or skip sizes in that case. HAL's search API has no size field (checked with `fl=*`), so HEAD is the only option.

### P3 2: Old versions are refused at download time although HAL still serves them

The PR body documents this as a browse limitation: "historical-version browsing is not implemented". This finding is about `_realize_to` only. Once a deposit gains a new version, every saved `hal://…/<id>v<n>/<file>` URI fails with "browse again". That covers reruns, deferred datasets, and workflow inputs. HAL still serves the pinned URLs: `https://hal.science/hal-01207234v1/file/IPCP_JOTA.pdf`, `v2`, and `v3` all return 200 with different `Content-Length` values. `_realize_to` could fetch `https://hal.science/<id>v<n>/file/<quoted name>` directly whenever the index version differs, and keep the index lookup only for the current version. The path already has the version and a single-segment filename, the host is fixed, and a 404 already maps to `ObjectNotFound`. If this re-argues an intended design choice, drop it.

### P3 3: The HTML Content-Type rejection also blocks genuine HTML attachments

`_open_url` raises "HAL returned an HTML page" for any `text/html` response. It applies to `_realize_to` and to size HEADs, so an attached `.html` annex can never be imported and its size always shows 0. I couldn't confirm that such annexes exist in HAL (Solr wildcard queries on `fileAnnexes_s` return nothing). Consider applying the check only to the search-API call, or only when the attachment name doesn't end in `.html`/`.htm`.

### P3 4: The hardcoded file-host allowlist doesn't follow the configurable `api_url`

`_record_files` accepts files only from `hal.science`, `*.hal.science`, `hal.inrae.fr` and `(*.)archives-ouvertes.fr`. `api_url` is user-templatable and admin-configurable, so pointing it at any other HAL deployment lists deposits whose attachments are all silently filtered out, leaving empty directories. At minimum, move the hosts into a named module constant. Better, either derive the allowed hosts from the configuration or say in the template `help` that only HAL-hosted instances are supported.

## Nits

- **P3 5:** One malformed doc (missing `version_i`) in the root search makes `_record_id` raise and fails the whole page. Skipping it with a `log.warning` would be more forgiving.
- **P3 6:** `_split_path` rejects a trailing slash (`/hal-01479142v2/`) as an invalid path. `cbioportal._normalize_path` strips it, so normalize it here too.
- **P3 7:** The `isinstance(entry, RemoteFile)` in `_list` exists only to satisfy typing on a list that contains only `RemoteFile`s. Annotating the comprehension as `list[RemoteFile]` and widening it at return would drop the check.
- **P3 8:** `"https://api.hal.science/search/"` is repeated in `hal.py`, in both `templates/models.py` classes, and in the YAML. `models.py` could import `DEFAULT_API_URL`. This is optional, since the duplication follows sibling convention.
