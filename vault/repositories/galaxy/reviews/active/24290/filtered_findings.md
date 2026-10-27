# Filtered findings — galaxy#24290

A maintainer review on the PR (2026-10-23) already proposed fixes in [arash77/galaxy#10](https://github.com/arash77/galaxy/pull/10), which is open against the author's branch. Findings it already covers are filtered so the review doesn't repeat them.

- **`_refuse_a_private_address` is a verbatim copy of NOMAD's** (default P2 1, thermo P2 1): already raised in the PR thread. arash77/galaxy#10 adds a shared `galaxy.files.uris.refuse_a_private_address` that nomad and dspace both use, with tests. A fix inside `validate_non_local` for uppercase schemes and bracketed IPv6 is still a possible follow-up, but that's pre-existing code.
- **Any 400 with a token is reported as an expired token** (default P3 2): mostly addressed by arash77/galaxy#10, which rejects non-uuid ids before any request and maps the 422 DSpace returns for unparseable searches. After that, no concrete 400 on a listing with a token is known. The thread also notes that nobody has confirmed DSpace returns 400 for an expired token at all.
- **Extra `authn/status` round-trip on every list call** (default P3 3): re-litigates a decision in the PR description ("when a source has a token, browsing first checks that DSpace still accepts it"). Both suggested alternatives would let an expired token silently show only public content.
- **Recursive listing raises `MessageException`, not `RequestParameterInvalidException`** (default P3 4): fixed in arash77/galaxy#10.
- **Token normalized at each use site; NOMAD uses a field validator** (thermo P3 2): fixed in arash77/galaxy#10 (`strip_token` validator).
- **`_all` paging loop and root search untested** (gx_test_challenger P2 1, part of default P3 5): covered by `test_a_community_pages_through_all_its_children_before_filtering` in arash77/galaxy#10. It tests two `page=` requests over 150 children, the community name filter, and the root query filter.
- **`production_dspace.yml` has no template expansion test** (gx_test_challenger P3 2): covered by `test_production_dspace` in arash77/galaxy#10, which expands the template with both a real and an empty token.
