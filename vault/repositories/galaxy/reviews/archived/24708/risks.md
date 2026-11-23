The one-way risks are the widened public contract of `GET /api/invocations` (`workflow_id` and `history_id` become repeatable lists, changing their OpenAPI types) and the user-facing `workflow:`/`history:` filter vocabulary, which will be hard to change once people and scripts rely on them.

<details><summary>Risk Details</summary>

- `workflow_id` and `history_id` on `GET /api/invocations` change from `string | null` to `string[] | null` in the OpenAPI schema. A single value still works on the wire, but typed consumers of the schema must change, as the two in-tree grid configs did, and any-of semantics for repeated ids become a supported behavior.
- The list has no server-side size limit. Each history id adds its own access check, and one inaccessible history or missing workflow fails the whole request rather than dropping that id.
- A name filter sends up to 50 matches per lookup, across three lookups for each of workflows and histories, in a GET query string. A common word could produce several KB of URL and hit request-line limits on some deployments. This is fixable later without changing the contract, but the failure would appear only on large accounts.
- Name filters cap at 50 matches per lookup with no sign in the UI, so a broad name can silently omit invocations from the list.
- `workflow:<name>`, `history:<name>`, quoted exact matching and "unkeyed text is a workflow name" are new search semantics that users will learn. Changing them later breaks habits, though not stored data.
- `FieldEntry.filter` is a new generic `GridList` extension point. Its `{ key, clears, plural, search }` shape is easy to change now and gets harder as other grids adopt it.
- `build_invocations_query` keyword arguments are renamed to `stored_workflow_ids` and `history_ids`. All in-tree callers are updated; only out-of-tree callers would notice.

</details>

<details><summary>Risk Review Advice</summary>

Humans should decide whether repeated query parameters on a GET are the contract Galaxy wants for multi-id filtering, and whether it should carry a size limit before clients depend on it. Also confirm that failing the whole request on one bad id is the intended behavior, since a stale id in the filter text would then produce a grid error rather than a narrower result.

The client side is cheap to walk back apart from the filter vocabulary. Check that the substring default, the unkeyed-text meaning and the "picked items narrowed by name" rule are ones the team would keep, and that `FieldFilter` is general enough for the next grid.

</details>
