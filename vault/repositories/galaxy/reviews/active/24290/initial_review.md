# Initial review — galaxy#24290 "Add a DSpace file source"

- Profile: [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) (+ REVIEW_FOCUS)
- Model: Opus 5.5, effort: low
- Reviewed commit: `06ab66dce072328c6e161b8153823b6e78d93b06` (merge-base with `origin/dev`: `1e6125acd93b`)

## Verdict

Solid, small, self-contained file source. Redirect handling (hop-by-hop allowlist check, token kept on the API origin) is careful and better than siblings. Main concern is accretion: the SSRF guard is a verbatim copy of NOMAD's, and the new redirect-safe GET is a generally useful helper buried in one plugin. A few small correctness edges. No P1s.

Ran: `test/unit/files/test_dspace.py` (2 passed) and `test_template_models.py::test_examples_parse` (passed). Ad-hoc probes (not committed) noted below.

## Findings

### P2 1: `_refuse_a_private_address` is a verbatim copy of NOMAD's; third variant in the tree

`lib/galaxy/files/sources/dspace.py` `_refuse_a_private_address` is character-for-character `lib/galaxy/files/sources/nomad.py:106-124` (only `base_url`→`api_url` in the message). `gitlab.py:124-171` has a third variant of the same "parse like requests, strip IPv6 brackets, call `validate_non_local`, re-raise with a friendlier message" logic, and `cbioportal.py:239-253` a weaker one. The comment in each copy says the reason is that `validate_non_local` mishandles uppercase schemes and bracketed IPv6 — that is a bug/limitation of `galaxy.files.uris.validate_non_local`, and each plugin is papering over it separately.

Suggested fix: move one helper (e.g. `BaseFilesSource._validate_remote_url(url, setting_name)` or a function in `galaxy/files/uris.py` taking the allowlist and label) and have NOMAD and DSpace call it; ideally fix the scheme/IPv6 normalization inside `validate_non_local` so callers don't need the wrapper at all. At minimum, DSpace should share NOMAD's method rather than duplicate it.

### P2 2: Redirect-safe authenticated GET should be a shared helper, not plugin-private

`DSpaceFilesSource._open_url` is the only place in `lib/galaxy` that follows redirects manually (`allow_redirects=False`) and validates every hop, stripping the bearer token off-origin. Siblings doing the same job are weaker: `cbioportal._open_url` lets `requests` follow redirects and only checks `response.url` *after* the redirected request was already made. This is exactly the reusable abstraction the PR could leave behind (e.g. `open_validated_url(url, allowlist, headers, auth_origin=...)` in `galaxy/files/sources/util.py`), with cbioportal (and later others) migrated onto it. As written, the best implementation is locked inside DSpace and the next plugin will copy it again.

Not necessarily a merge blocker for this PR, but worth asking the author to extract it (they also authored NOMAD) or to file a follow-up.

### P3 1: Bitstream names `..` / ending in `/..` can't be imported (implementation verified by probe)

`_file` builds `path = f"/bitstreams/{uuid}/{name}"` and `_realize_to` calls `_split(source_path, maxsplit=2)`, which runs `posixpath.normpath` first. A name of `..` or `x/..` collapses the uuid away (`/bitstreams/f1/..` → `/bitstreams`), so import fails with `ObjectNotFound` even though the listing showed the file. Probe: names `..` and `x/..` failed, `a/../b.txt` passed. The name is documented as cosmetic, so `_realize_to` should split the raw path (strip leading `/`, `split("/", 2)`) without normalizing, or `_file` should sanitize the name segment. Rare in practice; cheap fix.

### P3 2: Any HTTP 400 with a token is reported as an expired token

`_open_url` maps `status_code == 400 and "Authorization" in headers` to `AuthenticationRequired("…token… may have expired")`. That applies to every request, including `discover/search/objects` with a user-supplied query, so a 400 for a malformed search (or any other bad request) would be misreported as an expired login. Probe confirmed the mapping on a search 400; I did not verify which queries real DSpace answers with 400. Since `_list` already checks `authn/status` up front, the 400 heuristic only needs to apply to the content download (`_realize_to`), or could be confirmed with a follow-up `authn/status` call before blaming the token.

### P3 3: Extra `authn/status` round-trip on every list call

With a token, every `_list` call (each folder open, each page while scrolling, each search keystroke) first GETs `authn/status`. Fine for correctness, but doubles request count for token users. Consider only doing it at the root, or only after an empty/403 result.

### P3 4: Recursive listing error type differs from NOMAD

DSpace raises `MessageException` for `recursive=True`; NOMAD (same author, same situation) raises `RequestParameterInvalidException`. Pick the latter for consistency (it's a client parameter problem, maps to 400).

### P3 5: Tests are two long scenario functions; several branches untested

`test_download_checks_every_redirect_and_keeps_the_token_on_dspace` covers redirect hop validation, token stripping, 400→expired, `authn/status` false, and metadata-IP redirect refusal in one test with `responses.replace` mutations between them — a failure in one hides the rest. Split into focused tests. Untested branches worth one assertion each: `_all` multi-page accumulation (the loop termination), 401/403 messages with/without token, 404→`ObjectNotFound`, top-level query filtering via `_filter_and_page`, a bundle set with no `ORIGINAL`, and too-many-redirects. All are cheap with the existing `responses` fixture.

## Non-findings / checked

- Unpaged listings capped at 100 and unaligned-offset rounding are called out in the PR description and code comments; not re-litigated.
- `writable: Literal[False]` + `_write_from` raising matches cbioportal.
- Pydantic config duplicated between `dspace.py` and `templates/models.py` follows existing convention (NOMAD etc.).
- `production_dspace.yml` is in `MANIFEST.in` and parses under `test_examples_parse`.
- Imports are all module-level.
- No security findings warranting a private report: token is only sent same-origin (scheme+host+port, fails closed), every redirect hop is allowlist-checked before connecting. DNS-rebinding TOCTOU in `validate_non_local` is pre-existing and Galaxy-wide.
