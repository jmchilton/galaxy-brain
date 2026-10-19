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

- Two fixed SQL queries per fetch: a metadata query resolves the clicked association IDs and which item types have copies in one pass per association type, then one relationship query joins guarded ancestry to job inputs/outputs and maps back to hids. Intermediate copies' consumers remain included. Related IDs stay in SQL.
- Direct item IDs are matched first. Absent item types and types without copies omit their recursion entirely. Histories without copies use the direct relationship query.
- Dataset copies in the viewed history are candidates only when they share a related dataset's `dataset_id`; their copy ancestry must still reach the related association. Collections use explicit copy ancestry. Candidate lookup is scoped to the viewed history, so it does not fan out across importers.
- Ancestry uses primary-key joins, with the creating-job guard on the current item before its next hop. Hidden collection ownership, including nested membership, is checked only for the clicked item's ancestors and the mapping candidates, not every copy in the history. Distinct work sets keep downstream joins manageable.
- Ordinary job joins use `UNION ALL`; recursive ancestry keeps `UNION` so malformed cycles terminate. Mapping stops when it reaches a related association.
- The filter is recomputed on contents refreshes and pagination. Metadata scans scale with the current history size; relationship work scales with candidate copies, copy depth, and containing collections. One statement does not imply constant work.

</details>

## Risks

This is a reversible query change, but relationship boundaries and repeated-fetch costs need review.

<details><summary>Risk Details</summary>

- SQLite and PostgreSQL 18 both pass all eight related-filter API tests. Unit regressions cover pass-through/cache boundaries, nested hidden outputs, reused imported inputs, sibling copies of one dataset, cyclic links, and query count.
- PostgreSQL `EXPLAIN ANALYZE` probes cover 10,000 importers sharing two datasets, 2,002 ordinary collections, 2,002 copied collections, and nonempty copied collections. These are synthetic fixtures rather than a production performance guarantee.
- A second PostgreSQL comparison checks ordinary histories up to 500,000 datasets plus 500,000 collections and copied histories up to 20,000 of each. Consolidating metadata reduced a large ordinary late-click median from 35.6 to 27.4 ms; the original implementation measured 20.9 ms. Early-click improvements are not consistent. Copied-history timings remain close to the prior revision. These are warm synthetic measurements; residual scan and relationship costs remain.
- Dataset clicks in histories with copied collection elements: on a synthetic fixture with filter-style copied elements, 30,000 datasets per history and 540,000 background datasets, dev takes about 5 ms, the previous revision 786 ms (original history) and 1,179 ms (copy), and this revision 13 and 14 ms. At 100,000 per history and 3.2 million background datasets: dev 9 ms, previous revision 845 and 1,830 ms, this revision 18 and 24 ms. The query-count test cannot detect this kind of regression, so the size benchmark lives outside CI.
- An ordinary copy that does not share its source's dataset is not mapped back, matching `dev`. This includes deferred datasets materialized into a history through the API and some copy links recreated by history archive import. Clicking such a copy still follows its ancestry.
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

- `pytest test/unit/app/managers/test_JobConnectionsManager.py`: 27 tests, including 21 new regression/behavior cases.
- `pytest lib/galaxy_test/api/test_history_contents.py -k index_filter_by_related`: eight real-tool API tests; run on SQLite and PostgreSQL 18.
- `test_history_related_filter_copied_history`: existing browser regression copies a history, switches to it, and checks the highlight button includes the related item and excludes the unrelated one. It is unchanged in this revision; new-head browser CI remains to run.

</details>

## License

- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
