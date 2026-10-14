# Examples of marginal readability changes

The frozen assessment at `7a5aa84d83dce57572a67450020a5fd0177a97af` contains **177 unique score-3 commits**, out of 493 unique reviewed commits (35.9%). Score 3 means the whole commit did not earn the rubric's threshold for a readability commit. These changes remain outside the requested removal of the 77 score-2 commits.

The 12 examples below are selected to show different reasons for a marginal score. They are not a random sample, and these headings do not imply measured counts for each pattern. Scores and explanations come from the linked assessment results; the changes were also checked against their archived historical diffs. SHAs refer to the frozen assessment history. `prune_plan.json` maps them to the current commits preserved on `vitest_readability_with_churn`.

## Renaming already meaningful tests

- **`75cc1da599ac8fabc83c36937cb898c64826a9b0` — `client/src/utils/color.test.js`** ([review](result_42.json)). Changes `test` to `it`, renames the suite to `keyedColorScheme`, and makes its one test title more specific. The same three exact primary/darker/dimmed color assertions remain. The original short test was already understandable; this is a naming preference rather than a repaired test defect.
- **`ccad3b3ccb66de0248eaae4f0001549d1df23307` — `client/src/api/client/rateLimiter.test.ts`** ([review](result_02.json)). Renames the 429-response spy, retry-loop variable, helper and cases, removes comments restating checks, and moves spy clearing to `beforeEach`. Status, retry messages, retry count and no-retry checks retain their strength. Most of the diff is renaming, so the rubric caps the overall gain at 3.

## Equivalent syntax without stronger checks

- **`06710cbdf8248d8f6e77a5f54a4cbccaf105587e` — `client/src/style/headingScale.test.ts`** ([review](result_42.json)). Its sole changed line replaces `Number(base![1])` with `Number(base?.[1])`, after the same assertion that the regex matched. No input, behavior or assertion changes. It removes TypeScript punctuation without fixing a wrong result the old test allowed.
- **`0e12a1c9c796e7265989c0c591d296843482dbaf` — `client/src/components/Datatypes/index.test.ts`** ([review](result_09.json)). Replaces `await getDatatypesMapper().then(...)` with a directly awaited local mapper and renames the suite/test. All four hierarchy assertions are identical. The original promise chain was already awaited, so this does not fix unawaited assertions.

## Query and lifecycle modernization

- **`63fb44749e11c77a918c980bffb2699d6bf50873` — `client/packages/ui/src/components/GCheckbox.test.ts`** ([review](result_01.json)). Adopts auto-unmount, changes selected `find`/`findComponent` queries to `get`/`getComponent`, removes inferred DOM casts, and uses optional indexing for the emitted native event. The original tests already failed on missing controls or incorrect state/events. The changes are harmless convenience and hygiene rather than stronger coverage.
- **`44d704a326917eab91594912438d3ae7d22367f2` — `client/packages/api-client/src/client.test.ts`** ([review](result_01.json)). Replaces deleting/reconstructing `window.location` through `as any` with `vi.stubGlobal` and cleanup, hoists the mock, removes unused locals and improves names. Exact client options and HTTP-method checks remain. The review found no hidden wrong-type result or observed leak to justify treating ordinary cast removal and cleanup as a defect fix.

## Repackaging already clear cases

- **`3d2a4cc75c847d0e57b2afe44251a9811f0568d9` — `client/src/utils/parseBool.test.ts`** ([review](result_43.json)). Converts the boolean, string and non-string examples into `it.each` tables. Every input and expected result remains, including case-insensitive true strings and rejected values. Tables provide individual case reporting, but the original tiny tests were already clear and meaningful; no duplicate scenario or weak assertion was repaired.
- **`be7b9fccc9baa47650b7c8dd8f9c893a5e0b7232` — `client/packages/ui/src/publicClasses.test.ts`** ([review](result_01.json)). Splits the combined GButton/GLink/GDropdownItem class check into three tests and removes `as object` mounting workarounds. The same public classes and existence checks remain. The former combined case was short and sound, so this is a presentation improvement below the commit threshold.

## Real gains diluted by other changes

- **`12b5c4ac99b0fc3d7ee414d18fb1364b518c900f` — `client/src/composables/keyedCache.test.ts`** ([review](result_35.json)). Replaces the vacuous `expect(true).toBe(true)` timer check with loading, request-count and stored-item checks; also corrects boolean predicate wiring. Those are useful repairs. However, most hunks rename cases or swap equivalent boolean matchers across the file, with added typing/cleanup. The whole commit scored 3 because the narrow gains were bundled with disproportionate churn. A smaller commit preserving those repairs could be worth keeping.
- **`543ff11bd309e891322dde074fc2b0fe1d7e262a` — `client/src/components/Dataset/DatasetView.test.js`** ([review](result_08.json)). Replaces locally constructed URL comparisons with actual rendered navigation links, verifies tab child `datasetId` props, and consolidates the loading mount. These strengthen fidelity substantially. But it deletes explanations of why the loading request never resolves and why `.dataset-view` cannot coexist with the loading branch. The rubric's deleted-why-comment cap makes the overall score 3. This is a candidate for restoring explanations rather than discarding the assertion gains.

## Useful work outside the original readability defect gate

- **`5ec62a2a0003c5635a24a9b0e7f946bc5b6009fb` — `client/src/stores/userToolsServiceCredentialsStore.test.ts`** ([review](result_41.json)). Extracts credential literals into new shared factories in `client/tests/test-data/userCredentials.ts` and adopts the existing registered-user factory. A second consumer uses the credential factories later in the same batch. Reuse is real, but the producer's original fixtures were already fully typed and its checks did not improve; the review found no original gate defect.
- **`b0546b47e16ee92bd14ff73cb9984fb5617bc0f6` — `client/src/components/Visualizations/VisualizationFrame.test.js`** ([review](result_27.json)). Adds a new plugin-404 scenario with exact error text, no iframe and no load emission. This is useful new coverage, but the old fixtures did not exercise that failure and the commit does not repair an existing readability defect. Its score reflects this rubric's narrow purpose, not a conclusion that the added coverage has no value.

Score 3 therefore needs judgment before further removal: some commits are cosmetic, while others contain worthwhile assertions mixed with neutral churn or a lost explanation. The current request removes score 2 only; these examples identify possible later cleanup without applying it.
