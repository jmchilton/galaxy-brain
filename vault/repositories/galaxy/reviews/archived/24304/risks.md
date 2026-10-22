Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is a client-only fix scoped to the library import history picker, reusing the existing `getMyHistories` helper; no API, workflow, or tool behavior changes.

<details><summary>Risk Details</summary>

- Users who relied on the picker showing public/published histories from other users will no longer see them; this is the intended fix (importing from others' histories into a library was not the picker's purpose).
- Advanced filter terms are no longer sent as `q`/`qv`; the raw filter text goes in `search` instead, so filter behavior now depends on the server's search parser.
- Requested `keys` change from `create_time` to `username`; nothing in the picker reads `create_time`.

</details>

<details><summary>Risk Review Advice</summary>

Confirm that filters typed in the picker (e.g. `name:foo`, `tag:bar`) still narrow results through `search`, and that paging totals are correct now that `search` is always non-empty. Rollback is a simple revert.

</details>
