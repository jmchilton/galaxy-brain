# upload

Selected originator: `client/src/utils/upload.test.ts`.

Read `PROBLEM_AND_GOAL.md`, `LOOP_ITERATION.md`, and all of the client README's unit-testing section. The suite already exercised the real upload builders and submission functions, with TUS isolated and requests handled by MSW. Retained those boundaries.

Changes:

- Named tables expose the original filename inputs and expected results together. Split independently failing empty-list/missing-content validations; empty and whitespace-only inputs now execute independently.
- Replace ad hoc output casts with object expectations of the same fields. Keep reference checks for files and explicit list/pair lengths and ordering.
- Use `useServerMock()`'s inferred endpoint handlers and `response.untyped(...)` for the deliberately sparse job/dataset responses. Keep error status, error message, response headers, and scenario-specific handler placement.
- Reset the TUS mock implementation before each submission scenario; clearing calls alone allowed a previous scenario's progress implementation or rejection to survive. Scoped shuffled execution verifies isolation.
- Replace mutable nullable body captures and duplicate interfaces with local arrays of unknown request bodies and direct nested expectations. Each partial-upload case now requires exactly one submission, the original session IDs, remaining names in order, and exact array lengths. Installed Vitest's equality implementation rejects arrays with differing lengths, including nested arrays in `toMatchObject`.
- Build a real File directly with the original content and empty MIME type, fixing its irrelevant timestamp at zero. Name the empty composite case after the actual observed submission, and strengthen the TUS error callback check to include the expected error.

Coverage audit: baseline **77**, final **90**, all passing. Every original input/output pair remains. Executed cases by group: legacy payload 10→12; Galaxy filename recognition 2→6; prefix stripping 2→3; URL filename cleaning 8→13; content parsing 7→8. File-item creation 2, pasted-item creation 3, URL-item creation 4, payload building 9, collection building 11, API fetching 2, and upload submission 17 remain unchanged in count. The thirteen additional executions isolate existing assertions; no original scenario was removed. Local/URL/pasted/composite conversion, deferred options, decompression, Galaxy prefixes, paired collection traversal, identity/order of local files, API failures, custom chunk size, progress, cancellation alignment, partial submission and failure suppression remain covered.

Reuse: existing production item builders remain the compact fixture constructors; existing common element defaults and local File helper are retained. A shared upload-request or row factory would move the cancellation inputs and expected payload away from the scenario. Existing UI `defaultModel` contains unrelated row state and adds defaults to intentionally sparse legacy inputs, so it was not used to replace those boundary casts. No new helper or supporting consumer edits.

Guidance: the existing README already covers tables, helper scope, inferred API handlers, untyped sparse responses and awaiting returned promises. No README addition or worthwhile unresolved marginal advice emerged.

Validation: `NODE_OPTIONS=--no-webstorage pnpm exec vitest run src/utils/upload.test.ts src/utils/strings.test.ts --sequence.shuffle --sequence.seed=80107 --reporter=json --outputFile=/private/tmp/jest_readability_batch08_upload_final.json` passes **95/95** cases across the two physical files, including **90** upload cases. Scoped ESLint reports zero warnings/errors; Prettier checks pass. Full client typechecking is performed by the driver.

Independent review caught a missing second URL `src` assertion during consolidation; the driver restored `src: "url"` alongside its original URL before final validation.
