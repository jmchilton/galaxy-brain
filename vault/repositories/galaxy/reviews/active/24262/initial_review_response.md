

<details><summary>Automated Review Details</summary>

- Review profile [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) was run via Opus 5.5 at medium effort.
- Review profile [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) was run via Opus 5.5 at medium effort.
- Review profile [learning_galaxy](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/learning_galaxy.md) was run via Opus 5.5 at medium effort.
- Verification was run as documented [here](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/PROCESS_INITIAL_REVIEW.md) via Opus 5.5 at medium effort.

</details>

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door). It is client-only, with no API or artifact changes.

## Automated Review Findings

### About

These are broken into P1 (must fix), P2 (should fix), and P3 (smaller nits). These ratings are agent defined and the priority to John may be different and called out above. If anything is rated P3 and not called out as important by John above - please don't feel compelled to act on them or respond to them.

You're contributing to a repository John cares about and you deserve a human response. If any of these don't make sense or are missing important context - please push back and accept John's apology.

The fixes marked below are on the review branch [`pr_24262_review_0`](https://github.com/jmchilton/galaxy/tree/pr_24262_review_0), based on the reviewed commit; its three commits are linked on the findings they fix.

### P2 1: Tag-save queue is copied between HistoryCard and WorkflowCard (implementation verified)

`HistoryCard.vue` and `WorkflowCard.vue` each add the same ~35-line state machine (`tagsSaved`, `pendingTagSaves`, `lastSavedTags`, `lastTagSaveFailed`, `onTagSavesDone`, `sameTags`). Only the save call and the target object differ. `HistoryCard.test.ts` and `WorkflowCard.test.ts` repeat the same four scenarios, along with their `deferred()` and `addTag()` helpers. Each test mounts a whole card to exercise a generic algorithm.

Move the queue into one composable that both cards call. Branch `pr_24262_review_0` adds `client/src/composables/serialTagSaves.ts` (`useSerialTagSaves({ setTags, onFailed })` returning `saveTags(tags, save)`). The save closure still captures the item id when the edit is queued, so behavior is unchanged. The cards drop to a few lines each (commit `7cf62c963ca`). With the queue in one place, the four race scenarios could be tested once against plain async functions, leaving one or two thin wiring tests per card. Those wiring tests could use MSW (`useServerMock`) instead of `vi.mock` of the service modules, as `client/README.md` prefers, so the history path also runs the real `historyStore.updateHistory`. The review branch leaves the PR's card tests as they are.

<details><summary>Details</summary>

`client/src/utils/lastQueue.ts` (`LastQueue`) is an existing per-key serial queue in which the latest task wins. It would also skip superseded intermediate saves. Each tag save sends the full list, so skipping is safe. Adopting it is optional, and it is not part of the fix. It would need `new LastQueue(0, true)`, because a skipped task otherwise resolves `undefined` exactly like `updateHistory` does. It also has no "drained" signal, so the pending count would still be needed. A shared composable also gives `DatasetList.onTags` and the grid `updateTags` handlers a drop-in fix later: they don't wait for the previous save, so they carry the same out-of-order risk.

</details>

Fixed in [7cf62c963ca](https://github.com/jmchilton/galaxy/commit/7cf62c963ca658836ad5fbda0f614a2bac40aaeb).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P2 2: No E2E test covers the editor closing on a non-first card (implementation verified)

The second symptom in #24011 is deterministic. On the default last-updated sort, a tag save re-sorted the card to the top, the input lost focus and the editor closed. The unit tests can only check a stand-in for this: that no `refreshList` was emitted. `test_histories_list.py::test_tags` adds one tag and then filters by it, so it passes on `dev`.

Add a test to `lib/galaxy_test/selenium/test_histories_list.py`, or extend `test_workflow_management.py::test_tagging`. It should open the tag editor on a history card that is not first in the list and add two tags in a row with the shared `tagging_add([a, b], auto_closes=False, parent_selector="#g-card-history-<id> ")`, which keeps using the same open input and so fails on `dev`. Then it should check that the card stayed where it was, reload the page and check that both tags are there. The race interleavings themselves should stay as unit tests, because Selenium can't time them. Commit `4a893c0207d` on `pr_24262_review_0` adds `test_histories_list.py::TestSavedHistories::test_tag_editor_stays_open_on_non_first_card`, which uses the last card in the list. Run under Playwright against a local Galaxy, it passes on the branch and fails with the PR's `HistoryCard.vue` swapped for the merge-base version, because the card jumps to the top after the first tag.

Fixed in [4a893c0207d](https://github.com/jmchilton/galaxy/commit/4a893c0207d139357be120fe830a8d03bd179889).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort and [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 1: Post-save restore doesn't need `sameTags` (implementation verified)

`onTagSavesDone` writes `lastSavedTags` back only when `!sameTags(current, lastSavedTags)`. Writing it back every time after a successful final save gives the same result, and `sameTags` can go. Commit `73a590377f8` on `pr_24262_review_0` does this on top of P2 1. All 15 card and list tests still pass, including "shows the saved tags again when a list reload during the save brought back older ones".

Fixed in [73a590377f8](https://github.com/jmchilton/galaxy/commit/73a590377f84f3574a395fabdc8fe0568daa8eeb).

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort. Verified via Opus 5.5 at medium effort.

</details>

### P3 2: `deferred()` test helper is now copied in several places

`deferred()` is defined in `HistoryCard.test.ts`, `WorkflowCard.test.ts`, `CuratedWorkflowList.test.ts` and `utils/sharedPromise.test.ts`, the last one typed. Consider moving the typed version into a shared test helper and importing it. This becomes moot if the race scenarios are tested once, as P2 1 suggests.

<details><summary>Discovery & Verification Agent Details</summary>

Discovered by [default](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/default.md) via Opus 5.5 at medium effort and [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) via Opus 5.5 at medium effort.

</details>
