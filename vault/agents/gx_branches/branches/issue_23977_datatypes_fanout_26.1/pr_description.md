Toward 🎯 #23977 - stop per-row `/api/datatypes` requests on the Workflow Invocations list and share in-flight datatype/genome loads.

Opening the Workflow Invocations list sends `/api/datatypes?extension_only=false` once per grid row (62 times in #23977's measurement on test.galaxyproject.org, where the page as a whole got 96 × 429). Each row's state badge mounts a help term, and every help term loaded the full datatype list, even though invocation-state terms come from the bundled help YAML and never use it. The upload datatype and genome loaders cached only the finished result, so every caller that arrived before the first response sent its own request. A failed datatypes load was cached as an empty list for the rest of the session.

| Request source | `release_26.1` | This branch |
|---|---|---|
| 25 invocation-state help terms (`HelpText.test.ts`) | 25 × `/api/datatypes` | 0 |
| 10 concurrent datatype help terms | 10 × `/api/datatypes` | 1 |
| 10 concurrent `getUploadDatatypes` / `getUploadDbKeys` callers | 10 each | 1 each |
| `/api/datatypes` fails | `getUploadDatatypes` resolves to an empty list, cached for the session | rejects (Upload shows "Unable to load upload options: …"); the next call refetches |

Counts are from this branch's vitest tests run against both sources; each row's test fails on `release_26.1` at its count or rejection assertion.

***This is the datatypes half of #23977 only. The 429 backoff, the per-card `/counts` requests and the repeated `workflows/{id}?instance=true` requests are in the sibling branch 🌿 [issue_23977_client_api_fanout_26.1](https://github.com/jmchilton/galaxy/tree/issue_23977_client_api_fanout_26.1); the two merge in either order.***

***Invocation-state help terms no longer request datatypes, and every other caller shares one promise, so the page sends at most one `/api/datatypes` per load (the Upload dialog's) however often rows re-mount. That covers the 37 requests #23977 couldn't tie to rows too.***

***Nothing was re-measured against a rate-limited server; the 25 → 0 is the unit test's grid, not a live page count.***

***Behaviour change on a release branch: when `/api/datatypes` fails, Upload shows its existing "Unable to load upload options" alert instead of an empty format list, and `datatypeStore.fetchUploadDatatypes` now rejects; both of its callers handle that.***

***`utils/sharedPromise.ts` is added byte for byte by the sibling branch too, so either can merge first; `dedupeInFlight` is unused here and used there.***

<details><summary>What changed</summary>

- New `utils/sharedPromise.ts`: `memoizeUntilRejected` shares one promise with concurrent and later callers and forgets it after a rejection, so the next call retries; `dedupeInFlight` shares one in-flight call per key. The sibling branch adds the same file byte for byte (it uses `dedupeInFlight` for workflow instance fetches), so whichever merges second shows it in its diff until rebased.
- `Upload/utils.js`: `loadUploadDatatypes` and `loadDbKeys` go through `memoizeUntilRejected` instead of module-level result caches. `loadUploadDatatypes` now rethrows an HTTP error instead of building an empty list from missing data.
- `helpTermsStore.ts`: `useHelpForTerm` loads datatypes only for `galaxy.datatypes.extensions.*` terms (also when the term changes to one), through one shared `ensureInitialized`. A failed load ends `loading` (the term shows no help) and the next datatype term retries.
- `datatypeStore.fetchUploadDatatypes` rethrows; `DatatypesProvider` now does the catch-and-log it used to get from the store.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Same class of problem as 🎯 #19876. Sibling of 🌿 [issue_23977_client_api_fanout_26.1](https://github.com/jmchilton/galaxy/tree/issue_23977_client_api_fanout_26.1), split from it so the request dedupe can be reviewed apart from the retry/backoff changes.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Upload shows its existing "Unable to load upload options" alert until reload (the upload composable toasts "Unable to load upload formats"); a datatype help term stops loading and shows the existing "Something went wrong, no Galaxy help found…" message, and the next datatype term retries.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They count real requests at the mock server and check rendered help, `loading` and rejection; all but one new test outside `sharedPromise.test.ts` fail on `release_26.1` at those assertions (the genomes retry test guards behaviour the base already had).
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
- [x] Instructions for manual testing are as follows:

<details><summary>Tests and manual check</summary>

- `HelpText.test.ts`: 25 invocation-state `HelpText`s render their help and send no `/api/datatypes` (25 on `release_26.1`).
- `helpTermsStore.test.ts`: YAML terms load nothing; 10 concurrent datatype terms share 1 request; a term switching to a datatype term loads; a failed load is retried by a later term.
- `Upload/utils.test.ts`: concurrent datatypes and genomes callers share 1 request each; a failed datatypes request rejects and the next call refetches.
- `datatypeStore.test.ts`, `storeProviders.test.js`: the store rejects on failure and `DatatypesProvider` still stops loading.
- `sharedPromise.test.ts`: sharing, retry after rejection, synchronous throws, per-key in-flight sharing.

Manually:
1. Open the Workflow Invocations list with browser devtools' network tab filtered to `datatypes`. Exactly one `/api/datatypes` request (the Upload dialog's) instead of one per row.
2. Open the job information page of an upload job. Its format values are datatype help terms and still render their help.
3. Block `/api/datatypes` in devtools and reload. The Upload dialog shows "Unable to load upload options: …" (on `release_26.1` it shows an empty format list). Unblock it, and the next datatypes caller (e.g. a datatype help term) refetches without a reload.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
