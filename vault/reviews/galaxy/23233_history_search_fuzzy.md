# PR 23233 — Add: history search fuzzy

- https://github.com/galaxyproject/galaxy/pull/23233
- Author: joachimwolff (states the code was written by Claude Code / Opus 5, reviewed and
  tested by the submitter)
- State: OPEN, 0 reviews, 0 comments at time of writing; opened 2026-07-31
- Size: 7 files, +330/-1
- Worktree reviewed: `/Users/jxc755/projects/worktrees/galaxy/pr/23233` @ `1d1321d65c`,
  merge-base `origin/dev`
- Sibling: **#23234** ("Perf/history search index"), which re-authors this PR's commits

## Verdict

**Request changes.** The idea is good and the client half is well-written. But the PR ships
*two different fuzzy matchers* — one in SQL, one in TypeScript — for the same filter, and
they do not agree. On `dev` they agreed exactly (both were a plain lowercase substring
test), and the history panel relies on that agreement in a place where being wrong destroys
data: a bulk delete/purge in "select all in query" mode resolves its target set from the
*server* matcher while the checkboxes the user just confirmed came from the *client*
matcher.

Separately, the headline feature — typo tolerance — is inert on a stock Galaxy. Nothing in
the repository installs `pg_trgm`, so `_supports_trigram` returns `False` on every default
deployment and the `word_similarity` clause never runs. The client-side fuzzy matcher runs
unconditionally. That is not a fallback arrangement; it is the divergence above, permanently
on, everywhere.

The reuse story is also weak in two specific places where Galaxy already has the thing being
rewritten: `galaxy.model.database_utils.supports_skip_locked` for the capability probe, and
`Panels/utilities.ts`'s `closestSubstring` for the edit-distance matcher.

None of this is deep. The blocking items are a shared separator constant, a decision about
which matcher wins, and either shipping `pg_trgm` properly or dropping the trigram clause.

## What the PR does

Server, for `q=name-contains` on history contents only:

- `lib/galaxy/util/search.py:16-42` — new `NAME_TERM_SEPARATORS` regex and
  `split_name_search_terms(value, max_terms=8)`, which lowercases, splits, dedupes and caps.
- `lib/galaxy/managers/history_contents.py:756-793` — `HistoryContentsFilters._parse_orm_filter`
  intercepts `name`/`contains` and returns an `orm_function` filter that ORs three clauses:
  1. every term appears (`AND` of `lower(name) LIKE '%term%'`),
  2. `replace(replace(replace(replace(lower(name),' ',''),'-',''),'_',''),'.','')` contains
     the concatenated terms,
  3. `word_similarity(lower(query), lower(name)) >= 0.3`, only when `pg_trgm` is present.
- `history_contents.py:80-98` — `_supports_trigram(session)`, a module-global dict keyed on
  `str(bind.url)` caching a `SELECT 1 FROM pg_extension WHERE extname='pg_trgm'`.

Client:

- `client/src/utils/filtering.ts:221-315` — `splitNameSearchTerms`, `isCloseMatch`,
  `containsTerms`. Same three-stage ladder: all-terms-present, separator-squashed contains,
  then Damerau-Levenshtein within `floor(query.length / 4)`.
- `client/src/components/History/HistoryFilters.js:19` — `name` handler goes
  `contains("name")` → `containsTerms("name")`.

The wire format is unchanged (`getQueryDict` still sends the raw value), which is why the
same string is now interpreted by two different matchers.

## Blocking findings

### P1-a — Bulk delete/purge operates on a different set than the checkboxes showed

This is the one that matters. Two facts, both in `dev` today:

```js
// HistoryPanel.vue:541 — what the user sees ticked
:selected="isSelected(item)"
// selectedItems.ts:68-70 — in query-selection mode, that is the *client* matcher
if (isQuerySelection.value) {
    return filterClass.testFilters(currentFilters.value, item as Record<string, unknown>);
}
```

```js
// SelectionOperations.vue:442-449 — what actually gets operated on
const items = this.getExplicitlySelectedItems();   // [] in query selection
const filters = HistoryFilters.getQueryDict(this.filterText);
const result = await operation(this.history, filters, items, extraParams);
```

So "Select all → Delete (permanently)" sends `name-contains=<raw text>` with **no item
list**, and the server re-derives the match set with its own matcher. On `dev` the two
matchers were the same function, so this was safe by construction. This PR makes them two
unrelated functions and does not reconcile them.

I ran both matchers side by side (client logic transcribed verbatim from `filtering.ts`,
server logic from `history_contents.py` in its no-`pg_trgm` configuration). Verified
disagreements:

| dataset name | query | client `containsTerms` | server (no pg_trgm) |
| --- | --- | --- | --- |
| `sample:1 counts` | `sample1` | **true** | false |
| `annotation;gtf` | `annotationgtf` | **true** | false |
| `RNAseq (paired) sample` | `rnaseqpaired` | **true** | false |
| `UMI-tools deduplicate` | `umitoos` | **true** | false |
| `Filter on data 12` | `fitler` | **true** | false |
| `control` | `contro1` | **true** | false |

Concretely: a history contains `UMI-tools deduplicate` among others. The user types `umitoos`,
sees it listed and ticked, hits **Delete (permanently)**. The server resolves
`name-contains=umitoos` against its own clauses, matches nothing, and purges nothing. The
user believes the dataset is gone. (The `filtering.test.js` case at `:265` asserts exactly
this input matches client-side, so this is the PR's own documented behaviour.)

The reverse direction is worse and needs `pg_trgm` installed. `isCloseMatch` bails
immediately when the name is shorter than the query:

```ts
// filtering.ts:257-259
if (query.length < MINIMUM_FUZZY_LENGTH || value.length < query.length) {
    return false;
}
```

`word_similarity` has no such rule — it scores the query against the best-matching extent of
the name, so a name shorter than the query can score well above 0.3 (e.g. query `alignment`
against a dataset named `align`). Then the server matches, the client hides the row, the
checkbox is never shown, and a bulk purge takes it anyway. I could not execute this against
a live PostgreSQL with `pg_trgm` from this worktree, so treat the specific pair as a worked
example; the asymmetry in the code is not in doubt.

**Fix, pick one:**

1. Make the server authoritative and have the client stop second-guessing it — i.e. the
   local re-filter uses the same conservative rules the server can actually express, and the
   fuzzy stage is dropped client-side. Simplest, and it is what `historyItemsStore`'s
   re-filter is *for* (hiding items that no longer match, not inventing matches).
2. Keep both, but make query-selection bulk operations send explicit item ids rather than
   the filter dict. Bigger change, and it caps at the loaded window.
3. Keep both and prove agreement with a shared fixture table driving assertions on both
   sides. Given three-plus behavioural stages and a database-dependent branch, I do not
   believe this is achievable — but if it is attempted, the test is the deliverable.

Whatever is chosen, `SelectionOperations.runOnSelection` is the code path that has to be
argued about explicitly in the PR description.

### P1-b — The fuzzy half never runs on a stock Galaxy

`grep -rn "CREATE EXTENSION"` across the whole repository returns exactly one hit, and it is
`pgcrypto` in `scripts/cleanup_datasets/pgcleanup.py:719`. There is no migration, no config
option, no documentation change, and no `galaxy.yml` note that creates or requires `pg_trgm`.
`CREATE EXTENSION pg_trgm` also generally needs superuser, which Galaxy's DB role commonly
is not.

So on a default PostgreSQL install `_supports_trigram` caches `False` and clause 3 is never
emitted; on SQLite it is never emitted; and the PR's title feature exists only client-side,
over whatever happens to be in `historyItemsStore` already. That is worth saying plainly in
the PR body, because "history search fuzzy" reads as a server capability.

If the intent is to ship it as a real server capability, it needs: a migration that does
`CREATE EXTENSION IF NOT EXISTS pg_trgm` (with a graceful skip when not permitted), a
`GIN (lower(name) gin_trgm_ops)` index, and the query rewritten to use the `<%` operator
(with `pg_trgm.word_similarity_threshold` set) rather than `word_similarity(...) >= 0.3` —
the function-and-constant form cannot use the index, so as written it buys the dependency
without the payoff.

If the intent is opportunistic ("nice if the admin has it"), then it is a per-deployment
behaviour fork in a search users compare notes about, and P1-a's divergence becomes
deployment-dependent too. I would drop clause 3 from this PR and land the separator work,
which is the part that is unambiguously good.

### P1-c — The two separator sets inside the backend do not agree with each other

`lib/galaxy/util/search.py:19`:

```python
NAME_TERM_SEPARATORS = re.compile(r"[\s\-_.,:;/\\|()\[\]{}'\"]+")
```

`lib/galaxy/managers/history_contents.py:71`:

```python
NAME_SEPARATORS_TO_SQUASH = (" ", "-", "_", ".")
```

The query is split on ~22 characters; the *column* is squashed on 4. So `squashed =
"".join(terms)` has `:;,/\|()[]{}'"` removed from it that were never removed from the name it
is compared against. Clause 2 therefore cannot fire for any name containing one of the
missing separators — rows 1–3 of the P1-a table are all this bug, not the fuzzy one.

Meanwhile the client squashes with the **full** set:

```ts
// filtering.ts:227
const NAME_TERM_SEPARATORS_GLOBAL = /[\s\-_.,:;/\\|()[\]{}'"]+/g;
```

On the point the task asked about specifically: the two *split* regexes do agree character
for character (`[` needs no escape inside a JS character class, so `\[` and `[` are the same
class member). It is the squash sets that diverge, and the "Keep in sync with
`NAME_TERM_SEPARATORS`" comment at `filtering.ts:221-224` only covers the split, so it reads
as reassurance for a thing that is not the problem.

**Fix:** one definition. Put the separator characters in `galaxy/util/search.py` as a plain
string and derive both the regex and the squash tuple from it, then have `_squash_separators`
iterate that. Four extra `replace()` calls become twenty-two, which is ugly enough to be an
argument for dropping clause 2 in favour of doing the squash comparison only when the query
actually has no separators — but at minimum the sets must be the same set.

## Reuse findings

### P2-a — `_supports_trigram` reimplements `galaxy.model.database_utils.supports_skip_locked`

Galaxy already has a module whose entire job is "does this database support X":

```python
# lib/galaxy/model/database_utils.py:154-160
@lru_cache(maxsize=1)
def supports_skip_locked(engine: Engine) -> bool:
    """Return True if the database bound to `engine` supports the `SKIP_LOCKED` parameter."""
    stmt = text("SELECT 1 FROM job WHERE false FOR UPDATE SKIP LOCKED")
    return _statement_executed_without_error(stmt, engine)
```

with `supports_returning` next to it and `_statement_executed_without_error` (`:163-171`)
doing the probe on its own connection with a rollback. It is already imported into
`model/__init__.py:163` and called from `:5124`.

`_supports_trigram` (`history_contents.py:80-98`) reproduces this in a manager module and is
worse on each axis:

| | `supports_skip_locked` | `_supports_trigram` |
| --- | --- | --- |
| home | `model/database_utils.py`, beside its peer | `managers/history_contents.py` |
| cache | `@lru_cache(maxsize=1)` on the engine | hand-rolled module dict keyed on `str(bind.url)` |
| connection | its own, with an explicit rollback | the request's session |
| failure | returns `False`, transaction untouched | `except Exception` + `log.warning`, caches `False` forever |

On the URL-key concern raised during the #23234 review: I checked it and it is **not** a
credential leak. SQLAlchemy 2.0.51's `URL.__str__` masks the password
(`postgresql://galaxy:***@dbhost:5432/galaxy`), so the key carries username, host and
database name only. The real objections are the ones in the table — running a probe on the
caller's session, and a module-global dict that persists across tests and across a
`create_engine` swap. Both vanish if the existing helper is used.

**Fix:** add `supports_trigram(engine)` to `lib/galaxy/model/database_utils.py` with
`@lru_cache`, probing with something like `SELECT word_similarity('a','a')` (which tests the
function rather than the catalog row, and so also covers a schema-search-path problem the
`pg_extension` query would miss), and call it with `self.app.model.session.get_bind()`.
`jobs.py:463-477` `supports_materialized_hint` is the other precedent worth reading — a
manager-level capability check that caches `dialect_name` at `__init__` instead of probing
per call.

Related, smaller: the docstring claims support "cannot change while Galaxy is running". An
admin can `CREATE EXTENSION pg_trgm` at any moment; it just needs a restart to take effect.
Say that instead.

### P2-b — `isCloseMatch` is `closestSubstring` rewritten with a different divisor

Independently confirmed (this is the finding the #23234 review flagged as belonging here):

| | `closestSubstring`, `Panels/utilities.ts:646-673` | `isCloseMatch`, `filtering.ts:256-278` |
| --- | --- | --- |
| distance fn | `levenshteinDistance(q, s, true)` from `@/utils/levenshtein` | identical |
| windows tried | widths `len`, `len - d`, `len + d` | identical |
| max distance | `Math.floor(query.length / 5)` | `Math.floor(query.length / 4)` |
| minimum length | `MINIMUM_DL_LENGTH = 5` (`:117`, applied at `:546`) | `MINIMUM_FUZZY_LENGTH = 5` (`:229`) |
| returns | the matching substring or `null` | `boolean` |

Two constants named the same thing with the same value, one constant with the same role and
a different value, and one algorithm written twice. After this PR there is no single answer
to "how close does a Galaxy search have to be to count as a typo" — the tool panel says
`/5`, the history panel says `/4`, and neither divisor has a justification in either file.

`closestSubstring` is module-private, so reuse requires exporting it. That is the whole fix:
export it (or lift it to `@/utils/levenshtein` beside the kernel it wraps), have
`isCloseMatch` be `closestSubstring(q, v) !== null`, and pick one divisor deliberately. If
`/4` is right for names, it is right for tools too.

### P2-c — Nothing reusable is left behind

`splitNameSearchTerms` is exported but has exactly one caller (`containsTerms`);
`containsTerms` has exactly one caller (`HistoryFilters.js:19`). Every other list in the
client still uses `contains("name")`, and the `Filtering` constructor still injects
`contains("name")` as the default name handler (`filtering.ts:379-384`), so nothing picks
this up implicitly either.

Concrete call sites that want the same behaviour and do not get it:
`components/Workflow/List/workflowFilters.ts:78`, `components/History/historyList.ts:8`,
`components/History/HistoriesFilters.js:4`, `components/ToolsList/ToolsList.vue:172`,
`api/fileSources.ts:116`, `api/objectStores.templates.ts:56`, and the admin grids
(`Grid/configs/adminQuotas.ts:206`, `adminGroups.ts:170`, `adminRoles.ts:180`,
`adminForms.ts:128`). There is also an ad-hoc name matcher at
`composables/useEntityMentions.ts:104` (`(item.name ?? "").toLowerCase().includes(...)`)
that is doing this by hand for `@`-mentions.

Server-side the asymmetry is the same: `HistoryContentsFilters` learns to split terms;
`HistoryFilters` in `managers/histories.py` does not. The `filtering.ts:221-224` comment
saying the backend "applies [this] to the same filter" is true only for history contents.

The right shape is probably `containsTerms` becoming the default name handler in the
`Filtering` constructor once the semantics are settled, so every list gets it and every list
gets the same one. That is a follow-up, but it is the difference between this landing as an
abstraction and landing as a one-off.

## Correctness and cost

### P2-d — The client matcher is slow enough to block the render, measured

`historyItemsStore.getHistoryItems` (`:34-61`) is a `computed` returning a closure that
re-filters the whole cached array on every invocation, and `HistoryPanel.vue:113` calls it
inside another computed on the render path. `saveHistoryItems` uses `mergeArray`
(`:97-99`), so items **accumulate** for the session — scrolling a long history leaves
thousands of entries in that array.

`isCloseMatch` is reached only when the first two stages fail, i.e. for *non-matching* items
— which is almost all of them on a narrowing search. Its cost is O(|value| × |query|²).
Transcribing the exact implementation and running it over 2,000 realistic dataset names:

| query | matches | time |
| --- | --- | --- |
| `bowtie` (6 chars, matches everything) | 2000 | 1.0 ms |
| `trimmomatic quality report` (26 chars, matches nothing) | 0 | **469 ms** |
| `a very long dataset name fragment someone pasted in` (51 chars) | 0 | 295 ms |

Half a second of synchronous main-thread work per search change, on top of the 500 ms
`DelayedInput` debounce, and it gets *worse* as the user types more to narrow down — the
opposite of the intended feel. This is a performance PR series; this belongs in it.

Cheap mitigations if the fuzzy stage stays: skip it when `terms.length > 1` (a multi-word
query that failed both literal stages is rarely a typo), cap `query.length`, or hoist the
`value.replace(NAME_TERM_SEPARATORS_GLOBAL, "")` out of the per-item path.

### P3 — Server cost, stated precisely

The #23234 note's version of this was too pessimistic in one direction and too optimistic in
another, so, for the record:

- **There is no index on `history_dataset_association.name` on `dev` either.** The only
  `Index(...)` on an HDA-adjacent table is `ix_history_dataset_anno_assoc_annotation`
  (`model/__init__.py:12258`), and the only index-adding HDA migration is
  `55f02fd8ab6c_add_index_on_hda_extension.py`. `name-contains` has always been a
  `LIKE '%…%'` scan. This PR does not regress the index story because there was none.
- **The scan is bounded** for `/api/histories/{id}/contents`:
  `_contents_common_query_for_contained` (`:508-509`) and `_for_subcontainer` (`:537-538`)
  both apply `history_id == …` before the name predicate, so the cost is O(items in this
  history), not O(table).
- **Except when it isn't.** `/api/datasets` goes through the same `HistoryContentsFilters`
  (`webapps/galaxy/services/datasets.py:361`) with `container = None`
  (`:364-366`), which falls to the `History.user_id == user_id` join — every dataset the
  user owns, across every history. That endpoint gets the new three-clause filter for free
  even though its client (`api/datasets.ts:42`) never asked for it and still filters
  locally with plain `contains`. That is both the unbounded case and a second, undocumented
  client/server divergence.
- The filter is evaluated **twice per request**: `contents()` and `contents_count()`
  (`datasets.py:368-379`, and the same shape in `services/history_contents.py`).
- Per row the cost goes from one `ILIKE` to *N* `ILIKE`s plus four nested `replace()` calls
  plus a fifth `LIKE` plus, where enabled, a `word_similarity()` — which builds the trigram
  set for the row's name every call. On a 27k-item history that is 27k trigram computations
  per search, twice.

An `EXPLAIN (ANALYZE)` on a real history with and without the change would settle the actual
number, and given this is a performance series it should be in the PR body.

### P3 — The 0.3 threshold cites the wrong pg_trgm setting

```python
# history_contents.py:76-78
# Minimum trigram word-similarity for a name to count as a typo-tolerant match.
# 0.3 is pg_trgm's own default threshold; misspellings of a real word land
# comfortably above it while unrelated names do not.
```

0.3 is `pg_trgm.similarity_threshold`, the default for the `%` operator over `similarity()`.
The default for `word_similarity()` / `<%` is `pg_trgm.word_similarity_threshold = 0.6`.
So the chosen value is *half* pg_trgm's own default for the function actually being called,
and the comment's justification is for a different function. Either use 0.6 and say so, or
keep 0.3 and justify it on its own terms — but the OR composition means clause 3 can only
*add* rows, so halving the threshold makes results noisier with no recall floor to argue
against.

(The argument order is right, for what it's worth: `word_similarity(query, name)` scores the
query against the best extent of the name, which is what the comment at `:779-782` claims.)

### P3 — Single-character terms, and a policy `search.py` already has

`split_name_search_terms` imposes no minimum term length, while the module it lives in has
`DEFAULT_MIN_RAW_TERM_LENGTH = 4` and drops shorter raw terms in `filter_terms` — two
different answers to the same question, ten lines apart.

The consequence is the looseness the #23234 review noticed, and it is real here too: `umi 1`
matches `umi 21`, `umi 100`, `umi_v1`, because `1` is a substring of all of them. More
generally any query containing a single-character token stops narrowing on that token.
Whether that is acceptable is a product call, but it should be a deliberate one; a minimum
of 2 for terms *other than the last* (the last being mid-typing) would keep the useful cases.

Escaping is handled correctly, incidentally — `column.contains(term, autoescape=True)`
(`:775-777`) and `_convert_op_string_to_fn`'s `partial(op_fn, autoescape=True)`
(`base.py:1222-1223`) mean `%` and `_` in user input are literal, and the existing
`test_index_filter_by_name_ignores_case` case asserting `qv=%` returns 0 still holds under
the new path (`%` is not a separator, so it stays a single term).

## Test quality

**No existing test was weakened, deleted, or spliced.** I checked this specifically, since
the sibling PR did exactly that in `test_histories.py`. The new
`test_index_filter_by_name_matches_words_in_any_separator` is inserted at
`lib/galaxy_test/api/test_history_contents.py:977`, cleanly between the end of
`test_index_filter_by_name_ignores_case` (which ends at `:975` with its own
`assert len(contents_response) == 0`) and the `@skip_without_tool("cat_data_and_sleep")`
decorator of `test_index_filter_by_related_items`. No assertions were re-parented. Clean.

`test/unit/util/test_search.py` (+39, 6 cases) — all six would fail against `dev` with an
`ImportError`, and all six test the function's contract rather than its internals
(interchangeable separators, lowercasing, dedupe, the cap with both default and explicit
`max_terms`, empty and separators-only input). Good tests.

`client/src/utils/filtering.test.js` (+43, 4 cases) — behaviour-level, via
`HistoryFilters.getFiltersForText` + `testFilters` rather than by calling `containsTerms`
directly, which is right. They would fail against `dev`'s `contains("name")` for real
reasons (`umi-tools` does not literally appear in `UMI tools dedup`). The negative cases
(`umi bowtie` → false, `___` → false, `bowtie2` → false) are what stop this from being a
match-everything test. **17 tests pass**, run locally.

`lib/galaxy_test/api/test_history_contents.py` (+41) — good coverage of the separator
behaviour in both directions, including the trailing-separator-while-typing case and the
separators-only case.

What is **not** covered, and should be:

1. **The trigram clause has zero tests, in any configuration.** The API test runs on SQLite,
   where `_supports_trigram` returns `False`, so clause 3 is never emitted. Nothing tests
   `_supports_trigram` itself, nothing tests `_squash_separators`, and nothing tests
   `name_filter`'s SQL construction. The most complex and most deployment-sensitive code in
   the PR is exercised by nothing. A unit test that compiles the filter against both a
   sqlite and a postgresql dialect and asserts the clause count would be cheap.
2. **No test asserts the client and server agree.** Given P1-a, that is *the* test this PR
   needs. The client test at `:265-275` (`name filter tolerates a misspelling`) has a comment
   asserting the agreement — "The server matches these with trigram similarity; the local
   re-filter has to accept them too or it would discard the rows it was sent" — that is
   false on every deployment without `pg_trgm`. A comment claiming a property no test checks
   and the code does not have is the exact failure mode to watch for in generated code.
3. **`/api/datasets` name search is untested** under the new semantics, despite inheriting
   them.

## What's good

- **`orm_function` was the right vehicle and it was reused, not invented.** The union query
  needs the filter applied to both the HDA and HDCA branches with a different class each;
  `_union_of_contents_query:449-453` already handles that, and `extension_filter`
  (`:815-826`) is the in-file precedent. The comment at `:790-792` explaining *why* an `orm`
  filter would not work (`_apply_orm_filter` only rewrites a lone `BinaryExpression` and
  silently drops anything else) is accurate and is the kind of comment worth having.
- **All Python imports are module-level**, folded into the existing `sqlalchemy` block. No
  function-local imports, no dead code, no drive-by reformatting.
- **`split_name_search_terms` is a pure function in the right module**, exported through
  `__all__`, with a docstring that explains the *why* rather than the *what*, and it is unit
  tested independently of the SQL.
- **`@/utils/levenshtein` was reused** rather than a new distance kernel added — the
  duplication is the wrapper, not the algorithm.
- **The wire format is unchanged**, and there is a test pinning that
  (`filtering.test.js:277-281`). Keeping the split server-side rather than sending
  pre-split terms is the right call.
- **The client tests are negative-case-aware.** Fuzzy-match tests that only assert positives
  are worthless; these assert both.
- The `Filtering` machinery was used as designed — `containsTerms` is a `HandlerReturn`
  alongside `contains`/`equals`, not a special case bolted into `testFilters`.

## Relationship to #23234, and merge order

`git merge-base` of the two branches is `origin/dev` — #23234 **re-authors** these two
commits under different SHAs rather than building on this PR, despite its body claiming a
dependency. Five files are byte-identical across the branches (`util/search.py`,
`managers/history_contents.py`, `test_history_contents.py`, `test/unit/util/test_search.py`,
`HistoryFilters.js`); `filtering.ts` and `filtering.test.js` are this PR's content plus
23234's ranking layer.

Plan of record is to land this one first and have 23234 rebase and drop the duplicated
commits. **If that rebase does not happen, every finding above has to be applied to 23234 by
hand.** The ones that will not survive a naive conflict resolution:

- **P1-a** gets *worse* in 23234, not just carried over. 23234 switches
  `HistoriesFilters.js` to `containsTerms` as well, so the histories list — whose server
  side (`managers/histories.py:189`) still does a single literal `ilike` and was never
  taught to split terms — acquires the same divergence with none of the mitigation.
- **P1-c** (the separator sets) lives in both `search.py` and `history_contents.py`, both
  byte-identical in 23234. Same fix, twice, unless rebased.
- **P2-b** must be resolved here, because 23234 adds `nameMatchScore` on top of
  `isCloseMatch` — a third consumer of the divisor question. Fixing it after 23234 lands is
  strictly more work.
- **P2-d** compounds in 23234: `nameMatchScore` is called from inside a sort comparator
  there, so the 469 ms above gets multiplied by O(log n).

## Verification

- `pnpm install --frozen-lockfile`: clean.
- `npx vitest run src/utils/filtering.test.js` under `NODE_OPTIONS=--no-experimental-webstorage`
  (Node 25 present, `client/.node_version` pins 22.20.0): **17 tests, all passing.**
- Python tests **not run** — no `.venv` in the worktree and bootstrapping was out of scope.
  `test/unit/util/test_search.py` is a pure-function suite with no Galaxy app fixture, so it
  should be uncontroversial, but I did not observe it pass.
- API/integration tests not run, per standing instruction.
- The client/server matcher comparison in P1-a was executed against a transcription of both
  implementations, not against a live Galaxy. The transcriptions are line-for-line from
  `filtering.ts:237-315` and `history_contents.py:759-793`; the `pg_trgm`-enabled direction
  could not be executed at all.
- `str(URL)` password masking checked against SQLAlchemy 2.0.51 directly.
- Worktree left unmodified.

## Bottom line

**Must change before merge:**

1. Resolve the client/server matcher divergence, and state in the PR body what happens to
   `SelectionOperations.runOnSelection`'s query-selection bulk delete/purge. Today the
   checkboxes and the destructive operation disagree, and on `dev` they did not. — P1-a
2. Either ship `pg_trgm` properly (migration + `gin_trgm_ops` index + the `<%` operator) or
   drop the trigram clause. Shipping a feature that is inert on every default deployment,
   while its client-side counterpart runs everywhere, is the worst of the three options. — P1-b
3. Make `NAME_TERM_SEPARATORS` and `NAME_SEPARATORS_TO_SQUASH` one definition. Clause 2
   currently cannot fire for any name containing `:;,/\|()[]{}` — three of the six verified
   divergences in P1-a are this bug alone. — P1-c

**Should change:**

4. Replace `_supports_trigram` with a `supports_trigram(engine)` in
   `lib/galaxy/model/database_utils.py`, `@lru_cache`d, probed on its own connection —
   the pattern `supports_skip_locked` already establishes ten lines away. — P2-a
5. Export `closestSubstring` and have `isCloseMatch` call it, with one agreed max-distance
   divisor. `/4` here vs `/5` in the tool panel is an accident, not a decision. — P2-b
6. Bound the client fuzzy stage — it is 469 ms of blocking main-thread work on a 26-character
   query over 2,000 cached items, and grows as the user types. — P2-d
7. Add coverage for the trigram branch and for `_squash_separators`; the API test runs on
   SQLite and never reaches either. Fix or delete the `filtering.test.js:267-268` comment
   claiming the server matches those inputs — it does not, on any default deployment. — Tests
8. Correct the 0.3 comment: that is `similarity_threshold`, not
   `word_similarity_threshold` (0.6). — P3

**Worth discussing, not blocking:**

9. `/api/datasets` inherits the new semantics unbounded by `history_id` and with a client
   that still filters locally with plain `contains`. Intended? — P3
10. Single-character terms stop narrowing (`umi 1` matches `umi 21`); `search.py` already has
    a `DEFAULT_MIN_RAW_TERM_LENGTH = 4` policy ten lines away. — P3
11. Make `containsTerms` the default `name` handler in the `Filtering` constructor once the
    semantics settle, so the workflow, dataset, history and admin lists get the same search
    instead of this staying a history-contents one-off. — P2-c
12. Get an `EXPLAIN (ANALYZE)` into the PR body. This is a performance series and the change
    goes from one `ILIKE` per row to five-plus, evaluated twice per request. — P3

The separator work is genuinely good and I would like to see it land. Item 3 is a
one-constant fix, item 2 is a deletion or a migration, and item 1 is a decision rather than
a large change — but item 1 has to be made explicitly, because the current answer is "the
delete button and the checkboxes consult different oracles".
