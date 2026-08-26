# PR 23234 — Perf/history search index

- https://github.com/galaxyproject/galaxy/pull/23234
- Author: joachimwolff (states the code was written by Claude Code / Opus 5, reviewed and
  tested by the submitter against a copy of a production DB)
- State: OPEN, 0 reviews, 0 comments at time of writing
- Size: 13 files, +696/-42
- Worktree reviewed: `/Users/jxc755/projects/worktrees/galaxy/pr/23234` @ `473ec9f1c5`,
  merge-base `origin/dev`
- Sibling: **#23233** ("Add: history search fuzzy"), opened six minutes earlier

## Verdict

**Request changes.** The diagnosis is right and the two structural moves — stop issuing an
unbounded query per keystroke, stop putting every match in the DOM — are the right moves.
But the diff introduces a user-visible regression on the *most common* path (a red
"No histories found." shown for the entire duration of the whole-list fetch, with no
spinner in the history selector modal), it has a silent-partial-results race that has no
recovery path, and the new API test was spliced into the body of an existing one and cut
its tail off. Separately, the ranking layer and the fuzzy matcher are near-verbatim
reimplementations of `client/src/components/Panels/utilities.ts`, and the windowing works
around the absence of virtualization that the codebase already has a library and a
precedent for.

None of that is hard to fix — the four blockers below are a handful of lines each.

## What is actually new here vs. inherited from #23233

`git merge-base pr23233 HEAD` is `origin/dev` — #23233's work is **re-authored under
different SHAs on this branch, not merged**. Five files are byte-identical between the two
branches and ship if either merges:

| File | Owner |
| --- | --- |
| `lib/galaxy/util/search.py` (+28) | 23233 |
| `lib/galaxy/managers/history_contents.py` (+80) | 23233 |
| `lib/galaxy_test/api/test_history_contents.py` (+41) | 23233 |
| `test/unit/util/test_search.py` (+39) | 23233 |
| `client/src/components/History/HistoryFilters.js` (+3/-1) | 23233 |
| `client/src/utils/filtering.ts` — `splitNameSearchTerms`, `isCloseMatch`, `containsTerms` (~+97) | 23233 |

Genuinely new in 23234:

- `HistoryScrollList.vue` (+71/-23) — the local-search / windowing pivot
- `HistoryScrollList.test.ts` (+142, new file)
- `historyStore.ts` (+48) — `loadAllHistories` + `allHistoriesLoaded`
- `filtering.ts` — `nameMatchScore` (`:283-315`, ~+43), the ranking layer
- `filtering.test.js` — the `ranks literal matches above similar ones` case (+12 of +55)
- `HistoriesFilters.js` (+2/-2) — `contains("name")` → `containsTerms("name")`
- `lib/galaxy/managers/histories.py` (+19/-16) — the `EXISTS` refactor
- `lib/galaxy_test/api/test_histories.py` (+29)

Findings below are scoped to the new work except where marked *(23233)*.

## Verifying the PR's three claims

1. **"`ScrollList` is not virtualized."** True. `ScrollList.vue:231-234` renders one
   `<slot name="item">` per entry of `items` with no windowing of its own.
2. **"`getHistoryList` omits `limit` when a query is present."** True and worth stating
   plainly, because it is the real bug. `historyStore.ts:418-431`: `limit` stays `null`
   whenever `queryString` is non-empty, and `history.services.ts:87-90` only appends
   `&limit=` when `limit !== null`. So every search issued `GET /api/histories?view=summary
   &order=update_time&offset=0&q=name-contains&qv=…` with no bound at all.
3. **"`loadMore()` returns early while busy, dropping the newer filter."** True —
   `dev`'s `loadMore` opened with `if (!busy.value && …)` and had no queue or retry. Note
   the search box is already debounced 500 ms (`FilterMenu.vue:68`, `:217` →
   `DelayedInput`), so this fired on pauses in typing rather than literally per keystroke;
   with a 2.4 s unbounded response it still overlapped constantly.

**"Matches are now held in memory and revealed a window at a time" is not virtualization,
and the PR is honest about that** (`HistoryScrollList.vue:69-75`). See P2-c for what that
costs.

## Blocking findings

### P1-a — Every search shows "No histories found." for the whole duration of the fetch

`busy` is now set in exactly one place: the server-pagination branch of `loadMore`
(`HistoryScrollList.vue:243`). The filter watcher (`:93-108`) and `onMounted` (`:86-91`)
call `historyStore.loadAllHistories()` without touching it. The template gates the empty
state on that same ref:

```html
<!-- HistoryScrollList.vue:351 -->
<BAlert v-if="!busy && hasNoResults" class="mb-2" variant="danger" show>No histories found.</BAlert>
```

with `hasNoResults = props.filter && filtered.value.length == 0` (`:79`).

Failure scenario, concretely: open the history selector modal (Switch to history). The
store holds the first `PAGINATION_LIMIT = 10` histories. Type `mrd2020`. The watcher fires,
`loadAllHistories()` starts a sequence of 500-at-a-time requests, `busy` stays `false`,
`filtered` is empty because none of the 10 loaded histories match — and the panel renders a
red **"No histories found."** until the last page lands. On the reporter's 2,300-history
instance that is ~5 requests; on a 50k account, ~100.

`SelectorModal.vue` is the worst case because its only loading signal is the component's own
`busy` (`:136` `:loading="busy"` on `FilterMenu`, `:149` `:loading.sync="busy"`), so there is
no spinner either. `MultiviewPanel.vue:118` and `HistoryGraphPanel.vue:46` are better off —
they pass `historiesLoading || loading` from the store, so the FilterMenu spins — but they
still render the red alert underneath it.

This is a regression: on `dev`, `loadMore(true)` set `busy = true` around the fetch, which
is exactly what suppressed this alert.

**Fix:** either wrap the two `loadAllHistories()` call sites in `busy`, or drop the local
ref and read `historiesLoading` from the store (which `loadAllHistories` already maintains
via `setHistoriesLoading`, `historyStore.ts:387`/`:407`) — the latter is less state and
fixes both call sites at once.

### P1-b — A search can be answered against a partial list, silently and permanently

```ts
// historyStore.ts:383-386
async function loadAllHistories() {
    if (allHistoriesLoaded.value || historiesLoading.value) {
        return;
    }
```

The `historiesLoading` arm returns **without awaiting the in-flight load and without
retrying**. `historiesLoading` is set by `loadHistories`, which is called on app start by
`composables/userHistories.js:12` and `stores/userStore.ts:181`, and by this component's
own `loadMore` (`HistoryScrollList.vue:245`).

Failure scenario: the panel mounts, `userHistories` kicks off `loadHistories()`, the user
types before it settles. The watcher awaits `loadAllHistories()`, which returns instantly
having done nothing. `allHistoriesLoaded` stays `false`, but **nothing re-triggers the
load** — the watcher only fires on the next change of `props.filter`. If that keystroke was
the last one, the user is now looking at the results of searching 10 histories out of
2,300, with no error, no spinner, and no "load more": `loadMore` bails at `:240`
(`if (props.filter || serverExhausted.value) return;`) precisely because a filter is set.
Scrolling cannot recover it. Clearing and retyping the same text does not either, because
`newVal === oldVal` short-circuits at `:96`.

Wrong results presented as complete is worse than the slowness this replaces.

**Fix:** hold the in-flight promise on the store and return it, so concurrent callers await
the same load rather than skipping it — e.g. a module-scope `let allHistoriesPromise:
Promise<void> | null` returned on re-entry and cleared in the `finally`. That also removes
the `allHistoriesLoaded || historiesLoading` double-guard. It is ~6 lines and it is the same
in-flight-dedupe idea `useKeyedCache` already applies elsewhere in the client.

### P1-c — The new API test was inserted into the middle of an existing test and severed its tail

`lib/galaxy_test/api/test_histories.py`. On `dev`, `test_index_advanced_filter` (`:275`) ran
from its `_different_user` fixture through the published/archived assertions — it created
`history_0`, published it, created an archived history, and then asserted the
`is:published` × `show_archived` × `show_own` matrix against that fixture.

The new `test_index_search_by_tag_and_multiple_terms` was inserted at `:333`, between the
`name_contains = "Archived"` block and that matrix. The result:

- `test_index_advanced_filter` now **ends at `:331`** and has lost five assertion blocks —
  including the nested `_different_user` case that covered "published+archived histories
  from *other* users appear when `show_own=False`".
- Those blocks now live at `:362-386`, inside the new test's `with self._different_user(...)`
  — a user who created two histories, neither published nor archived. Their expected counts
  (`== 2`, `== 1`, `== 2`, `== 3`) are now satisfied only by rows that the *previous* test
  left in the database. They pass by pytest definition-order luck, not by their own fixture.

That is coverage deleted from the test that earned it and re-parented onto global state.
Neither test now means what its name says.

**Fix:** move `:362-386` back into `test_index_advanced_filter`, and put
`test_index_search_by_tag_and_multiple_terms` after it (or after
`_create_history_then_publish_and_archive_it`). Then re-run both; if the relocated
assertions still pass in isolation, good — if they don't, that itself is the bug this
splice was hiding.

## Reuse findings

### P2-a — `nameMatchScore` and `isCloseMatch` already exist, in `Panels/utilities.ts`

This is the headline for a review weighted toward reuse. Two independent duplications:

**The fuzzy matcher.** `filtering.ts:256-278` `isCloseMatch` is
`Panels/utilities.ts:646-673` `closestSubstring` rewritten:

| | `closestSubstring` (dev) | `isCloseMatch` (PR) |
| --- | --- | --- |
| algorithm | DL distance vs. sliding windows of the value | same |
| widths tried | `[len, len-d, len+d]` | `[len, len-d, len+d]` |
| max distance | `floor(query.length / 5)` | `floor(query.length / 4)` |
| minimum length | `MINIMUM_DL_LENGTH = 5` (`:117`) | `MINIMUM_FUZZY_LENGTH = 5` (`:229`) |
| transpositions | `levenshteinDistance(q, s, true)` | `levenshteinDistance(q, s, true)` |

Same shared `@/utils/levenshtein`, same tunable, same loop, two different divisors. There is
now no single answer to "how close does a Galaxy search have to be to count as a typo".

**The ranking ladder.** `filtering.ts:283-315` `nameMatchScore` returns
100/90/80/75/70/60/50/10 for exact / prefix / substring / separator-squashed variants /
all-words / edit-distance. `Panels/utilities.ts` already expresses that ladder as data:

```ts
// Panels/utilities.ts:184-192
const TOOL_SEARCH_KEYS: SearchCommonKeys = { exact: 5, startsWith: 4, name: 3, description: 2, combined: 1, wordMatch: 0 };
const TOOL_SECTION_SEARCH_KEYS: SearchCommonKeys = { exact: 4, startsWith: 3, name: 2, wordMatch: 1, description: 0 };
```

and `searchObjectsByKeys<T extends { id: string }>` (`:463`) applies it, falls back to
`closestSubstring` when nothing matches literally, and returns `{ id, order }` pairs that
`createSortedResultPanel` (`:603`) sorts. It is exported, generic, and has its own test file
(`utilities.test.ts:74`). `HistorySummary` satisfies `{ id: string }`.

I am not claiming `searchObjectsByKeys` drops in unmodified — it is shaped around
panel-building and `combined` name+description keys. But that is the abstraction this
feature wants, and the choice was made without engaging with it. Two candidate resolutions,
in order of preference:

1. Lift the scoring core out of `Panels/utilities.ts` into a shared module
   (`utils/search-ranking.ts`, say) taking `SearchCommonKeys` and returning ordered ids,
   and have both the tool panel and the history list call it. Then `closestSubstring`
   becomes the one edit-distance implementation.
2. If that refactor is too wide for this PR, at minimum export `closestSubstring` and have
   `isCloseMatch` call it, so the divisor and minimum length are decided once.

Naming the other callers that would want a shared version, since "does this leave behind a
reusable abstraction" is the question: `WorkflowList`, `DatasetList`, the invocations list,
`PageList` and `VisualizationList` all use the same `Filtering` + `ScrollList` pair and all
rank by nothing at all today. A `nameMatchScore` that lives in `utils/filtering.ts` and is
imported by exactly one component is not yet that abstraction, but it is one small step from
being it — see P2-c.

### P2-b — The window works around virtualization the codebase already ships

`client/package.json:153` depends on `vue-virtual-scroll-list@^2.3.5`, and
`client/src/components/History/Multiple/MultipleViewList.vue:6` already uses it — in the
multi-history view, i.e. the sibling of the panel this PR is fixing.

`RENDER_PAGE_SIZE` windowing and virtualization solve different halves of the problem, and
the PR picks the weaker half:

- `renderLimit` is **monotonic within a search** — it is reset only by the filter watcher
  (`:100`) and only grows in `loadMore` (`:237`). Scroll to the bottom of a 2,300-history
  *unfiltered* list and you end up with 2,300 cards in the DOM: exactly the stall the PR is
  fixing, deferred rather than removed.
- Virtualization bounds the DOM by viewport regardless of how far the user scrolls, and
  would make `RENDER_PAGE_SIZE`, `renderLimit`, `visible`, and the `props.filter ?
  filtered.length : totalHistoryCount` juggling at `:345` all unnecessary.

If windowing is kept anyway, it belongs in `ScrollList` rather than in one of its callers —
`ScrollList` is used by the workflow list, invocations list and dataset lists, which have
the identical problem. As written, no other list can benefit.

## Correctness and scaling

### P2-c — `user:'exact'` silently becomes a substring match

`histories.py:191` in the `EXISTS` refactor:

```python
elif key == "user":
    stmt = stmt.where(user_exists_filter(self.model_class.user_id, term.text))
```

`term.quoted` is dropped. The replaced `append_user_filter` (`index_filter_util.py:63-67`)
went through `text_column_filter`, which is `column == term.text` when quoted and
`ilike('%…%')` otherwise (`:21-26`). `user_exists_filter` (`:87-96`) is unconditionally
`ilike('%…%')`.

Failure scenario: an admin searches the published/shared history index for `user:'alice'`.
On `dev` that returns histories owned by `alice`. After this PR it also returns histories
owned by `alice2`, `alicew` and `malice`. Quoting is the documented way to ask for an exact
match in this syntax, and it now does nothing on this field.

**Fix:** either give `user_exists_filter` a `quoted` parameter mirroring `tag_exists_filter`,
or build the inner `where` from `text_column_filter(model.User.username, term)`. The latter
reuses the existing helper and is one line. Note `tag_exists_filter` *does* thread `quoted`
through, so the shape is already established two functions up.

The rest of the refactor checks out. Tag semantics are preserved: `dev` aliased a fresh
`HistoryTagAssociation` outer join per term, so `tag:a tag:b` required both conditions
satisfiable independently — which is what two independent correlated `EXISTS` clauses give
you. Raw-text terms have no `quoted`, so the `or_(name ilike, tag EXISTS, user EXISTS)`
composition at `:207-216` matches the old `or_(name ilike, tag_cond_on_alias, alias.username
ilike)`. `stmt.distinct()` (`:236`) and the base `outerjoin(model.User)` (`:155`) both
remain, so the claimed "no measurable difference" is unsurprising — the tag joins went away
but the DISTINCT that they motivated did not.

Two notes on that hunk:

- The comment at `:167-171` ("Deliberately not passing this through `filter_terms`…")
  describes a decision this PR did not make — `dev` already called `parse_filters_structured`
  directly here, unchanged in the diff. Reads as if the term cap were removed by this
  change. Reword or drop.
- Since the author reports no measurable gain, the honest options are to drop this hunk (and
  keep the PR client-only) or to keep it and fix P2-c. Keeping an unmeasured refactor that
  also changes `user:` semantics is the one combination not worth having.

### P3 — `loadAllHistories` at 50k histories

Not blocking, but the scaling story deserves stating since the PR's numbers come from a
2,300-history instance.

- `LOAD_ALL_LIMIT = 500` (`historyStore.ts:42`) → 100 **sequential** round trips for 50k
  histories, each awaited before the next (`:390-399`). Nothing bounds the total.
- `setHistories` (`:170-191`) is called once per page, and each call rebuilds the entire
  stored map: `enrichedHistories.reduce((acc, h) => ({ ...acc, [h.id]: h }), {})` is
  quadratic in page size, and the `Object.values(storedHistories.value).forEach` re-copies
  everything loaded so far. It was written for 10-item pages. Across 100 pages that is a few
  million object writes.
- Each `setHistories` replaces `storedHistories.value`, which fires the `historiesProxy`
  watcher (`HistoryScrollList.vue:119-127`), which invalidates `filtered` (`:129-172`) —
  so the full filter + `nameMatchScore` sort runs once per page, over a list that is growing
  toward 50k.
- Within one sort, `nameMatchScore` is called from inside the comparator (`:153`), i.e.
  O(n log n) times per item rather than once. Hoisting the scores into a `Map` before
  sorting is a two-line change and removes the only place where `isCloseMatch`'s Levenshtein
  can run tens of thousands of times.

Combined with P1-a this is the shape of the worst case: a large account types one character
and gets a red "No histories found." while the tab does a hundred round trips and a hundred
increasingly expensive sorts. Capping the load (and falling back to the server query beyond
the cap) or at least batching `setHistories` into one call would bound it.

### P3 — `allHistoriesLoaded` is invalidated by any history create/delete

`handleTotalCountChange` (`:355-363`) sets `allHistoriesLoaded = false`, and it is called
from `createNewHistory`, `copyHistory`, `deleteHistory`, `deleteHistories`,
`restoreHistory`, `restoreHistories` (`:240`, `:246`, `:279`, `:297`, `:310`, `:324`). So
creating one history discards the completeness flag and the next search re-fetches the
entire list. Correct, but for a large account it means the P3 cost above is paid again after
every ordinary history operation. A targeted `setHistory` + count adjustment would avoid it;
at minimum the doc comment at `:51-52` should say this rather than "Reset when the set of
histories changes", which reads as cheaper than it is.

The flag is also over-named: `loadAllHistories` calls `getHistoryList(offset, limit)` with
no query, i.e. the default index — own, non-deleted, non-purged, non-archived. Archived and
deleted histories are never in it. That matches `dev`'s behaviour so nothing regresses, but
"the user's full history list is in the store" (`:51`) is not what the flag means, and
`hideDeleted` / the deleted+archived badges (`:303-327`) imply otherwise.

### P3 — The client name filter and the histories API now disagree

`HistoriesFilters.js:4` switches `name` to `containsTerms`, which matches each whitespace-
or separator-delimited term independently. `histories.py:189` still does
`text_column_filter(name, term)` — one literal `ilike '%…%'`. #23233 taught
`history_contents.py` to split terms; nothing taught `histories.py`.

So the comment at `filtering.ts:221-224` — *"Keep in sync with `NAME_TERM_SEPARATORS` in
`lib/galaxy/util/search.py`, which the backend applies to the same filter"* — is true for
history *contents* and false for *histories*. It is not a live bug here, because this PR
makes the history list search purely client-side, and `HistoryDatasetPicker.vue:147` (the
only remaining server-side `HistoriesFilters` caller) gets a stricter server result that the
looser client filter will not discard. But it is a divergence someone will trip over.

Also worth deciding deliberately: `containsTerms` makes multi-word searches noticeably
looser. Searching `history 1` now matches `history 21`, because `1` is a substring of `21`.
That is a real behaviour change for anyone whose history names are numbered.

### P3 — Ranking overrides pinned/current ordering

`filtered`'s comparator (`:151-171`) puts `nameMatchScore` ahead of the
current-history-first and pinned-first rules. In `MultiviewPanel`, searching therefore
demotes pinned histories — the rows that correspond to what is actually on screen — below
better name matches. Defensible for a search, but it is a silent change to a UI contract;
confirm it was intended.

## Test quality

**No existing test was weakened by content** — but see P1-c, which is a structural
equivalent and is the one hard problem in this section.

`HistoryScrollList.test.ts` (new, 6 cases). All 6 pass. Three of them are genuinely
discriminating against `dev`:

| Case | Pins what | Would fail vs `dev`? |
| --- | --- | --- |
| `renders a bounded window rather than every match` (`:106`) | 2,000 stored → 50 `propItems` | **yes**, `dev` passes all 2,000 |
| `reveals more matches when scrolled without refetching` (`:116`) | `load-more` → 100, no fetch | **yes** |
| `starts a new search back at the top of its own results` (`:129`) | `renderLimit` reset on filter change | **yes** |
| `fetches the whole list once and does not query per search` (`:71`) | `loadAllHistories` called 3× for 3 filter changes | trivially — the action does not exist on `dev` |
| `searches on a term shorter than the old three character minimum` (`:91`) | `loadAllHistories` called for `"ab"` | trivially, same reason |
| `does not fetch anything when there is no search text` (`:100`) | no call with empty filter | trivially, same reason |

Two specific problems with the first three rows of the lower half:

- **`fetches the whole list once` asserts the opposite of its name.** It expects
  `loadAllHistories` to have been called **3 times** for 3 filter changes. That is fine as
  a statement about the component, but the property the PR is selling — the list is fetched
  *once* — lives entirely in `historyStore.loadAllHistories`'s `allHistoriesLoaded` guard,
  which `createTestingPinia` stubs out. The name should describe what is asserted, and the
  guard needs its own store-level test. Its companion assertion,
  `expect(loadHistories).not.toHaveBeenCalledWith(true, expect.stringContaining("alpha"))`,
  would also pass against a component that never calls `loadHistories` at all.
- **`historyStore.ts` gains 48 lines and zero tests.** `loadAllHistories` is where the
  pagination loop, the short-page termination, the `historiesOffset` hand-off and both P1-b
  and P3 live. `SelectorModal.test.js` already demonstrates the pattern for testing this —
  msw over `/api/histories` and `/api/histories/count` with a real `createPinia` (`:57-67`) —
  so a `historyStore` test for "two concurrent callers issue one page sequence" and "a short
  page ends the loop" is cheap.
- `searches on a term shorter than the old three character minimum` tests that a *fetch*
  happens, not that a 2-character search produces *results*. The user-visible property is
  that typing `ab` now shows matches; mount with `makeHistories(...)` containing an `ab`
  name and assert `propItems`. One line more, actually discriminating.

`filtering.test.js` (+55): the `containsTerms` cases *(23233)* are good behaviour tests —
they assert the matcher's contract in both directions, including the narrowing cases
(`umi bowtie` → false, `___` → false) that stop it from becoming a match-everything.
`ranks literal matches above similar ones` (`:277`) is the one new case and it pins the
ordering the PR body promises, including the `mrd2020-022` example from the report. Good.

`test_histories.py` — the new assertions themselves are the right ones (tag-only match,
multi-tag AND, dedup of a multi-tag history, free-text hitting tags, raw-term AND) and they
do exercise the `EXISTS` path. They just need to be extracted from the middle of
`test_index_advanced_filter` (P1-c). Nothing covers `user:` at all, quoted or unquoted,
which is why P2-c is invisible to CI.

## What's good

- **The diagnosis is correct and specific.** All three claimed causes check out against the
  code, and the unbounded-query one (`historyStore.ts:418-431`) is a genuine bug that would
  be worth fixing even if nothing else in this PR landed.
- **Removing the three-character minimum is right** and costs nothing server-side — the
  histories index has no minimum-length contract; the gate was purely a client-side guard
  against the unbounded query, and the local search makes it unnecessary.
- **The `EXISTS` helpers were reused, not reinvented.** `tag_exists_filter` and
  `user_exists_filter` already existed in `index_filter_util.py` for the workflow index;
  `histories.py` now calls them rather than growing its own. That is exactly the right
  instinct, and the docstring on `tag_exists_filter` explaining why it beats the per-term
  outer join is already in `dev` — the PR just took the advice.
- **`@/utils/levenshtein` was reused** rather than a new distance implementation added
  (the wrapper around it is the duplication, not the kernel).
- **Comments explain why, not what**, and the `HistoryScrollList.vue:69-75` comment is
  unusually honest — it says outright that this is not virtualization. Reviewing a PR whose
  comments don't oversell it is a pleasure.
- Copying `filteredHistories` before sorting (`:149-151`) is a real bug caught: with no
  filter that array *is* `historiesProxy`, and the pre-existing code sorted it in place from
  inside a computed.
- All Python imports are module-level; no dead code, no commented-out blocks, no drive-by
  reformatting.

## Relationship to #23233, and merge order

This branch **re-authors** #23233's commits rather than merging them — `git merge-base
pr23233 HEAD` is `origin/dev`, and `abf859eb71 Merge history-search-fuzzy: reuse its
separator/typo tolerant matcher` merges a local branch, not the PR's ref. So the same
`filtering.ts`, `search.py`, `history_contents.py` and both test files exist twice with
different SHAs.

If 23233 merges first, this branch will conflict on all five files — cleanly resolvable
(the content is identical) but noisy, and any review feedback applied to 23233 will have to
be applied here by hand. Recommended:

1. Land #23233 first — it is smaller, self-contained, and its backend half is the part with
   independent value.
2. Rebase this branch onto `dev` afterwards and drop the duplicated commits
   (`364521daaa`, `75ce9a567b`, `1dd15c4912`, and the `abf859eb71` merge), leaving 23234 as
   the client pivot + the `histories.py` refactor.
3. Retitle accordingly — the current diff reads as one PR containing two features.

Two things carried in from 23233 that its own review should look at, noted here only so
they are not lost:

- `history_contents.py:774-788` builds the name filter as
  `or_(all_words_present, squashed_separators_contains, word_similarity(...) >= 0.3)`. None
  of the three disjuncts is index-usable: `func.replace(func.lower(name), …)` defeats any
  expression index, and `word_similarity(a, b) >= 0.3` does **not** use the `<%` operator,
  so a `gin_trgm_ops` index cannot serve it either. On a 27k-item history that is a
  sequential scan with a trigram computation per row, per search. For a PR series about
  search performance, that deserves an EXPLAIN.
- `_trigram_support` (`:80`) is a module-level dict keyed on `str(bind.url)`. Fine
  functionally, but the URL can carry credentials; keying on `bind` or the dialect+database
  name would be safer.

## Verification

- `pnpm install --frozen-lockfile`: clean.
- `npx vitest run src/components/History/HistoryScrollList.test.ts src/utils/filtering.test.js
  src/components/History/Modals/SelectorModal.test.js` under
  `NODE_OPTIONS=--no-experimental-webstorage` (Node 25 is present; `client/.node_version`
  pins 22.20.0 and Node 25's experimental `localStorage` global otherwise breaks the setup —
  same workaround as PR 23235): **3 files, 29 tests, all passing.** `SelectorModal.test.js`
  is untouched by the PR and still passes; its fixture is 15 histories, comfortably under
  `RENDER_PAGE_SIZE`, so the windowing does not disturb it.
- Backend tests not run (per standing instruction), so P1-c's "passes by definition-order
  luck" is an inference from the fixture contents, not an observed run. It should be checked
  by running `test_index_search_by_tag_and_multiple_terms` on its own.
- Worktree left unmodified.

## Bottom line

**Must change before merge:**

1. Set `busy` (or read `historiesLoading`) around `loadAllHistories`, so a search does not
   render "No histories found." while the list is loading. — P1-a
2. Make `loadAllHistories` return the in-flight promise instead of skipping, so a search
   started during another load is not silently answered from a partial list with no
   recovery. — P1-b
3. Move `test_index_search_by_tag_and_multiple_terms` out of the body of
   `test_index_advanced_filter` and restore that test's published/archived assertions. — P1-c
4. Restore quoted-exact semantics for `user:` in the `EXISTS` refactor, or drop the
   `histories.py` hunk (it is admittedly unmeasured). — P2-c

**Should change:**

5. Reconcile `isCloseMatch` with `closestSubstring` — at minimum share one implementation
   and one max-distance rule. — P2-a
6. Hoist `nameMatchScore` out of the sort comparator into a precomputed map. — P3
7. Add a `historyStore` test for `loadAllHistories` (dedupe, short-page termination); make
   `fetches the whole list once` assert what its name says. — Test quality

**Worth discussing, not blocking:**

8. Use `vue-virtual-scroll-list` (already a dependency, already used by
   `MultipleViewList.vue`) instead of a monotonic render window — or move the window into
   `ScrollList` so the other lists get it. — P2-b
9. Decide whether ranking should outrank pinned/current ordering in multiview. — P3
10. Bound `loadAllHistories` (or batch `setHistories`) for very large accounts. — P3
11. Teach `histories.py` the same term-splitting `history_contents.py` learned, or correct
    the "keep in sync with the backend" comment in `filtering.ts`. — P3

The feature is worth having and the underlying diagnosis is sound. Items 1–3 are each a few
lines; item 4 is one line. With those and a rebase over #23233, this is close.
