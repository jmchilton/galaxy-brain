Fix 🎯 #15515 - “Show inputs for this item” highlights the inputs and outputs of imported and copied history items.

Importing a published history is how people study someone else's analysis, but the existing `related:<hid>` filter highlights only the clicked copy. This change follows ordinary copies back to their job connections and maps the related items into the history being viewed.

| Item being viewed | `dev` | This PR |
| --- | --- | --- |
| Original job input or output | Immediate job relationships | Immediate job relationships |
| Imported dataset or collection | Clicked item only | Copied inputs and outputs |
| Items copied individually with different hids | Clicked item only | Related copies, using their new hids |
| Imported input used by a new job, then imported again | Local job relationships only | Original and new job relationships |
| Pass-through or cached job output | Its own job relationships | Its own job relationships |

***Ordinary history copies inherit provenance; pass-through and cached outputs retain their own job relationships. Sharing the same physical dataset is insufficient to count as related.*** Collection membership, including nested collections, prevents hidden outputs from inheriting unrelated source relationships. It does not supply missing individual job connections. ***Jobs run on ordinary imported copies remain related, including consumers of intermediate copies.*** An output collection that reuses an existing input element preserves that input's provenance.

***No jobs are copied, no columns or migrations are added, and the API and client remain unchanged. Returned hids belong to the history being viewed.***

<details><summary>Query design and cost</summary>

- Two fixed SQL queries per fetch: a small metadata query resolves the clicked association IDs and which item types have copies, then one relationship query joins guarded ancestry to job inputs/outputs and maps back to hids. Intermediate copies' consumers remain included. Related IDs stay in SQL.
- Direct item IDs are matched first. Absent item types and types without copies omit their recursion entirely. Histories without copies use the direct relationship query.
- Both HDA and HDCA mapping use association IDs and explicit copy ancestry. No lookup fans out across importers sharing a `dataset_id`.
- Ancestry uses primary-key joins, with the creating-job guard on the current item before its next hop. Hidden collection ownership is computed once across possible copy ancestors, including nested membership. Distinct work sets keep downstream joins manageable.
- Ordinary job joins use `UNION ALL`; recursive ancestry keeps `UNION` so malformed cycles terminate. Mapping stops when it reaches a related association.
- The filter is recomputed on contents refreshes and pagination. Work still scales with candidate copies, copy depth, and containing collections. One statement does not imply constant work.

</details>

## Risks

This is a reversible query change, but relationship boundaries and repeated-fetch costs need review.

<details><summary>Risk Details</summary>

- SQLite and PostgreSQL 18 both pass all eight related-filter API tests. Unit regressions cover pass-through/cache boundaries, nested hidden outputs, reused imported inputs, cyclic links, and query count.
- PostgreSQL `EXPLAIN ANALYZE` probes cover 10,000 importers sharing two datasets, 2,002 ordinary collections, 2,002 copied collections, and nonempty copied collections. These are synthetic fixtures rather than a production performance guarantee.
- Chains through library datasets remain unsupported. Existing gaps in implicit mapped-output collection connections remain.
- Input/output arrows still follow hid order, so copying individual items with reordered hids can reverse an arrow. Whole-history imports preserve hids.

</details>

## Context

Builds on 🔀 #15210. Alternative to 🔀 #15573, which hides the button for copied items. The revision addresses the correctness and repeated-query concerns raised in review.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Unsupported ancestry retains the clicked item and any discoverable relationships. SQL errors follow the existing history-contents error path.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes; they assert relationship boundaries, excluded items, history scoping, and a fixed query count for a deep chain.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain descriptions of previous implementations or bugs, what purpose do they serve? N/A.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `pytest test/unit/app/managers/test_JobConnectionsManager.py`: 23 tests, including 17 new regression/behavior cases.
- `pytest lib/galaxy_test/api/test_history_contents.py -k index_filter_by_related`: eight real-tool API tests; run on SQLite and PostgreSQL 18.
- `test_history_related_filter_copied_history`: existing browser regression copies a history, switches to it, and checks the highlight button includes the related item and excludes the unrelated one. It is unchanged in this revision; new-head browser CI remains to run.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
