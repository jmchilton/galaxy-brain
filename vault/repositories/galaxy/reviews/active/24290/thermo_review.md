# Thermo review — galaxy#24290 (Add a DSpace file source)

- Profile: thermo_review
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: `06ab66dce072328c6e161b8153823b6e78d93b06` (diff vs `git merge-base origin/dev HEAD`)
- Code was read, not run.

## Verdict

The plugin is a compact, self-contained 324-line file. It follows the usual plugin wiring (`models.py` union, `TypesToConfigurationClasses`, client `templateTypes`, MANIFEST, sample conf), and `models.py` stays under 1k lines (905). The structural problem is that it copies and adds URL-safety code to private plugin methods. It doesn't lift that code into a shared layer. The private-address check is a verbatim copy of `nomad.py`'s, and the redirect-safe fetcher is stronger than what ckan, cbioportal and http.py use, yet no sibling can reuse it. No blockers, but this is accretion where a reusable abstraction belongs.

## Findings

### P2 1: `_refuse_a_private_address` is a verbatim copy of `NomadFilesSource._refuse_a_private_address`

`lib/galaxy/files/sources/dspace.py` `_refuse_a_private_address` matches `lib/galaxy/files/sources/nomad.py:106-123` line for line: the same comment, the `parse_url` + `strip("[]")` workaround for `validate_non_local`'s case-sensitive scheme check and bracketed IPv6, the same scheme check, and the same two exception rewrites with identical messages. Only the "needs a base_url/api_url like ..." text differs. `gitlab.py:124-166` has a third variant of the same `validate_non_local` workaround. The comments in all three describe the same flaw in `galaxy.files.uris.validate_non_local`.

Suggested fix: move this into one shared helper, for example `validate_non_local_url(url, allowlist, label)` in `galaxy/files/uris.py`, or a `BaseFilesSource` method taking the example URL. Have dspace and nomad call it. Better still, fix `validate_non_local` itself so it normalises the scheme and IPv6 brackets, so the workaround and its comment go away everywhere. At minimum, dspace should reuse nomad's code and not fork a second copy.

### P2 2: The redirect-validating fetcher in `_open_url` is a reusable safe-fetch primitive, kept private to one plugin

`DSpaceFilesSource._open_url` hand-rolls a redirect loop. It sets `allow_redirects=False`, validates every hop before requesting it, caps redirects at `MAX_REDIRECTS`, and sends the bearer token only to the configured origin (via `_origin`). This is the right shape, and it is strictly better than its siblings:
- `ckan.py:244-255` and `cbioportal.py:241-253` validate only `response.url` after the redirect chain has already been fetched.
- `ckan.py:246,414` has its own `_is_same_origin` origin-scoped token logic.
- `http.py:104` validates the final URL only after the fetch.

`_open_url`/`_get_json` is also structurally a clone of cbioportal's `_open_url`/`_get_json` pair.

Suggested fix: extract the loop into a shared helper (`galaxy/files/uris.py` next to `validate_non_local`, or `galaxy/files/sources/util.py`), for example `open_validated_url(url, allowlist, headers=..., auth_headers=..., auth_origin=..., params=...)`. It would yield the response, and the plugin would keep only DSpace-specific status mapping (400 → token expired, 401/403 hint). Moving ckan, cbioportal and http.py onto it can be a follow-up. Landing it as plugin-private code means the next plugin copies it a fourth time.

### P3 1: `_page` changes the response shape based on the magic key `"searchResult"`

`_page(..., key)` branches on `key == "searchResult"` to unwrap `_embedded.searchResult._embedded.objects[*]._embedded.indexableObject`. All other keys read `_embedded[key]`. The string parameter does double duty as a lookup key and as a mode flag. Split it into a small `_search_page` (or pass an extractor), so `_page` reads one shape and the discover-search unwrapping is explicit where `_list` uses it.

### P3 2: Token normalisation repeated at use sites; nomad normalises it on the config

`(config.token or "").strip()` appears in both `_list` and `_open_url`. `NomadFileSourceConfiguration` uses a `field_validator("token")` (`strip_token`), so `config.token` is always either `None` or stripped. Adopt the same validator on `DSpaceFileSourceConfiguration`. Then both sites become `if config.token:` and the invariant lives at the boundary, not in each caller.

### P3 3: `_filter_and_page` re-implements name filter + slice pagination that several plugins already carry

`_filter_and_page` (substring filter on `entry.name` + `offset`/`limit` slice) repeats `cbioportal.py:136,292-299` (`query.lower() in entry.name.lower()` plus its own `_apply_pagination`), `_fsspec.py:343-356` `_apply_pagination`, and similar slices in `ckan.py:114`, `omero.py:339,414` and `_pyfilesystem2.py:104`. The missing abstraction is a `BaseFilesSource` helper, for example `_filter_and_paginate(entries, limit, offset, query)`, for plugins that list everything server-side and then page in memory. Promote it there, or at least reuse the `_fsspec` version's semantics, and don't add another private copy.

### P3 4: `_list` dispatches with chained `len(parts) == 2 and parts[0] == ...` checks

`_list` has three `if len(parts) == 2 and parts[0] == "<kind>"` branches plus a root branch, with query handling inlined in each. A `match parts:` (`case []`, `case ["communities", uuid]`, ...) or a `{kind: handler}` dispatch makes the path model (`/communities/<id>`, `/collections/<id>`, `/items/<id>`, `/bitstreams/<id>/<name>`) explicit in one place. `_realize_to` and `_directories` would share it, and each listing becomes a small named method. This is a legibility point, not a correctness one.

## Not flagged

- The template/resolved config models are duplicated in `dspace.py` and `templates/models.py`. Every file source does this, and changing it is out of scope here.
- No file crosses 1k lines.
