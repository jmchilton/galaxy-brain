Follow-up to 🔀 #24399 - E2E tests for the 26.2 Upload Activity "Import from Data Library" route, plus fixes for the five bugs they surfaced.

On #24399 davelopez suggested testing the "modern" way to import from libraries: since 26.2, regular users go through the Upload Activity rather than the old library folder UI. Its only test imported one dataset, as an admin, into the current history. This adds the paths regular users take: a non-admin importing a public dataset someone else uploaded, and select-all in a library subfolder building a list in a picked, non-current history.

***The 26.2 route doesn't have #24399's bug (the list lands in the picked history); this PR is the coverage davelopez asked for, not a 26.2 port of that fix.***

Driving those paths for real turned up five bugs, each fixed here with a test that fails without it:

| Before | After |
|---|---|
| ![Long history name pushes "Choose another" out of view](screenshots/before_trunc_nospace.png) | ![Name truncates, link stays visible](screenshots/after_trunc_nospace.png) |
| A long history name pushes "(current)" and "Choose another" out of the target history banner. | The name truncates with an ellipsis; the link stays visible. |

- **Folder contents 500 for folders without a description.** Folders created by the fetch API store a null description, but `LibraryFolderMetadata.folder_description` was a required `str`, so `GET /api/folders/{id}/contents` failed validation and the folder wouldn't open. Now `str | None`, like the model column.
- **Folder contents 500 while a library upload is in progress.** The legacy library upload (import from directory) commits the library dataset before linking its LDDA; the contents query outer-joined and then dereferenced the missing LDDA. It now inner-joins, as `get_readme` already does, so the entry appears once linked.
- **Long target history names hide the change link** (screenshots above).
- **The "Change target history" tooltip lingers after the history picker closes.** The native `<dialog>` returns focus to its opener, and `vGTooltip` showed hover tooltips on any focus. Hover tooltips now ignore focus that isn't `:focus-visible`.
- **Library → list leaves duplicate hidden datasets.** The Upload Activity copies each library dataset into the history, then built the list with `copy_elements: true`, so a 2-element list left 4 hidden HDAs. It now uses the upload's own copies (2 HDAs), like the old library UI and fetch "to list" uploads. Only this two-step path (batches with library items) changes; fetch-API list uploads are untouched.

***The tooltip change is here because the new E2E caught the tooltip lingering; it reaches every hover-style `v-g-tooltip` (in the Tool Shed frontend, only GTable's): clicking an element no longer pops its tooltip instantly, it shows after the usual hover delay. Keyboard focus and `.focus`-only tooltips are unchanged.***

***`folder_description` becomes nullable in the API schema; those folders returned a 500 before, so no client could have depended on it.***

<details><summary>Tests</summary>

- `TestUploadActivityDataLibrary` (Selenium and Playwright):
  - the existing admin import, now set up through the API (`LibraryPopulator.fetch_to_folder`) instead of the admin import-dir UI;
  - a non-admin import of a public library dataset uploaded by another user;
  - select-all in a subfolder → list in a picked history. It asserts the list's name, type and element order, that the target history holds exactly the list's hidden elements, that the current history stays empty, that the change link stays inside the banner under a long name, and that no tooltip lingers after the picker closes.
- API `test_index_folder_without_description`: a fetch-created folder lists, and its contents return a null description.
- Unit `test_library_folder_contents_service.py`: a library dataset without an LDDA is left out of the page and `total_rows`.
- Vitest: `vGTooltip` keyboard focus, pending hover and `.focus`-only cases (Baseline, pass before and after), and the list request body in `useUploadBatchOperations`.
- The first four commits are Baseline tests that pass on unfixed code (with workarounds the fix commits remove). The two E2E helper commits make `start()` and "Add Selected" wait for their `aria-disabled` buttons to enable. Each fix commit's test goes red without it.
- `test_history_contents.py`'s library inheritance test now uses the new `LibraryPopulator.remove_library_dataset_restrictions` helper.
- `data_library_select_all` was broken on 26.2 (the test id sits on the hidden input of a `BFormCheckbox`); fixed in `navigation.yml`.

</details>

<details><summary>Commit order and splitting</summary>

Baselines (1-4), E2E helper waits (5-6), then one commit per fix (7-11). The two server fixes, the client fixes and the tooltip change can each be split into their own PR along those boundaries if reviewers prefer; fix 7's API test needs `fetch_to_folder` from commit 1.

</details>

## Risks

Risks are small - the one shared-behavior change is the galaxy-ui hover tooltip focus rule, which is cheap to walk back (a two-way door).

<details><summary>Risk Details</summary>

- Hover `v-g-tooltip`s (about 280 sites, plus GTable's in the Tool Shed frontend) no longer show on pointer or programmatic focus; they show after the hover delay. The Tool Shed wasn't run by hand.
- GTooltip in GLink/GButton (`useAccessibleHover`) still shows on any focus, so the two tooltip paths now differ.
- The tooltip fix is guarded only by E2E: happy-dom has no input modality, so a vitest would only test a stub.
- `folder_description` is now nullable in the API schema. It was a 500 before, so no client could have depended on a null.
- The inner join hides an in-progress library dataset until its LDDA is linked.
- All five bugs also exist on `release_26.1`; nothing here backports them.
- Forward merge to `dev` conflicts on `data_library_select_all`; take dev's selector.

</details>

<details><summary>Risk Review Advice</summary>

Look at `isNonKeyboardFocus` in `vGTooltip.ts`: decide whether a hover tooltip should ever show on pointer focus, and whether `useAccessibleHover` should follow in a `dev` PR. For the server, check that dropping unlinked library datasets from the folder contents query (to match `get_readme`) is the right reader-side fix rather than reordering the legacy upload's commits.

</details>

## Context

Follow-up to 🔀 #24399 (old library folder UI fix on 26.1). Alternative kept on 🌿[`selenium_upload_data_library_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/selenium_upload_data_library_alt_original_scope) - tests only: no product fixes, no `start()` wait and no subfolder/select-all coverage. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as is: tests, helper waits and the five fixes they surfaced.</summary>

- Expanded from tests-only after the tests found product bugs; each fix sits in its canonical layer with a red test.
- Declined here, left for `dev`: aligning `useAccessibleHover`, moving truncation into `TargetHistoryLink`, `createCollectionPayload`'s `copy_elements || true`, repairing other dead library selectors, reordering the legacy upload's commits.
- Recorded split options: one PR, tests / server / client, tooltip on its own, server fixes backported to 26.1.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Structurally sound for a release branch; four small cleanups applied.</summary>

- Added `LibraryPopulator.fetch_to_folder`, replacing two hand-built folder fetch payloads.
- Truncation targets SwitchToHistoryLink's `.history-link-click` instead of GLink's private `.g-link`.
- Dropped a defensive try/catch in `vGTooltip`.
- Added a request-body assertion for `copy_elements: false`.
- Deferred to `dev`: truncation inside `TargetHistoryLink`, sharing `isKeyboardFocus` with GPopover, splitting `upload_activity_helpers.py`.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Two implementation-only vitests dropped, three moved to a Baseline commit, one E2E check moved to components.</summary>

- Dropped a payload-literal test and a vitest that only proved a stubbed `:focus-visible` guard; the E2E covers both in real browsers.
- Three `vGTooltip` cases that pass on base became a Baseline commit, guarding that keyboard and `.focus`-only tooltips still work.
- The banner overflow check uses `navigation.yml` components instead of hardcoded selectors.
- Kept the API and unit tests: no API can create a library dataset without an LDDA deterministically.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings across the tests and five fixes.</summary>

- Codex reviewed the diff and its context read-only with only each fix's intent as a brief.
- It couldn't run tests in its sandbox; our own runs cover them.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests lead, then the helper waits, then one commit per fix.</summary>

- Moved the Add Selected wait next to the `start()` wait, ahead of the fixes; the final tree is unchanged.
- Baselines pass on unfixed server and client code on Selenium and Playwright; each fix's test fails without it at its own assertion.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Folders open instead of 500ing, the change link stays visible, no lingering tooltip, and a library list leaves only its own hidden datasets.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. One vitest also pins the `copy_elements: false` request body; the E2E checks the resulting history.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes - four Baseline commits lead and pass on unfixed code.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
