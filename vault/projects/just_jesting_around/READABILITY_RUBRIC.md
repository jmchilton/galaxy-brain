# Readability commit rubric

This rubric judges whether a single readability commit to a test was worth making. It was derived from 20 randomly sampled `vitest_readability` commits, iterations 03–74, then checked against a second, disjoint sample of 20 (iterations 05–74), whose findings tightened the gate list and the caps. It complements [REFACTORING_METRICS.md](REFACTORING_METRICS.md). The metrics count signals across the branch; this asks whether one diff paid for itself.

## Score

**5: clear win.** The commit fixes something a test reader couldn't see was wrong, or removes a lot of noise, and makes the test shorter or plainer. Typical fixes:
- a vacuous or tautological check;
- a suite that tests its own mock;
- cast soup;
- a broken shared helper.

Examples:
- `b9b77871867` UpgradeForm: two `expect(wrapper.find(...)).toBeTruthy()` checks that could never fail.
- `33e4a9979f2` api-client integration: mocked `openapi-fetch` replaced with the real client.
- `137840ccccc` WorkflowListTabs: shared `setupMockConfig` fixed at the root, with all consumers run.

**4: net positive and proportionate.** Someone new to the file reads it faster, nothing is lost, and the diff is about the size of the gain. Small costs are fine.
- Example: `57154efce01` activities, where `makeLintData(0, 0, 2, 1)` becomes `{ totalAttribute: 2, resolvedAttribute: 1 }`.

**3: marginal.** Harmless and small: modernised options, `find`→`get`, nicer names. A reviewer wouldn't object but wouldn't miss it. Leaving the file alone was just as good.
- Example: `b0a62cbf43e` FormDrilldown, whose own note says "already small… changes are light".

**2: not worth the churn.** Readability is flat or worse. The diff mostly adds ceremony or reshuffles code, without fixing a defect anyone observed.
- Example: `6ffc722c302` Tool/utilities, where a 7-line stub becomes 17 lines of descriptor save/restore, though Vitest already isolates files.

**1: harmful.** One of these:
- a check is loosened or dropped;
- the test now exercises a mock instead of the code;
- behaviour or coverage is lost without saying so.

No commit in the sample scored 1.

**Leave it alone (no commit)** when the original has no defect you can name, or when the best honest score is 3 or less. Specifically, leave it alone when:
- the test is short, the setup is local, the names are fine, and every check would fail on a wrong result;
- the only available changes are API modernisation, matcher swaps of equal strength, teardown hygiene with no observed leak, or renames.

Bump `iterated` anyway and record one line saying why.

## Criteria

**1. Fidelity (assertion strength).**
- Good: a check now fails on more wrong outputs. Examples:
  - exact instead of substring;
  - asserting request params or call counts;
  - a silent no-op helper that now throws;
  - flushing before a negative check.
- Bad: checks loosened, dropped, folded into a looser `toMatchObject`, or left weak next to edited lines.
- Signals:
  - `.toBeTruthy()` → `.toBe(true)` on `.exists()` is neutral. The metrics count it as a win; this rubric doesn't.
  - Exact call-shape checks on a library's internals are a cost.

**2. Reader cost.**
- Good:
  - inputs and expected values visible in each test;
  - named options instead of positional booleans or numbers;
  - one obvious arrange/act/assert flow;
  - names that state behaviour and condition.
- Bad:
  - net new control flow in test bodies (try/finally, if); replacing loops with a table is a gain;
  - an `it.each` column that selects which assertion runs (a column used only as an expected value is fine);
  - `expect` inside MSW handlers, where a failure surfaces as a network error;
  - deeply nested `objectContaining` where `.some()` read fine;
  - `vi.fn<T>()` on every mock.
- Signal: read the after-file cold. Is any test harder to explain aloud than before?

**3. Proportion (churn vs gain).**
- Good: diff size matches what was fixed. A 300-line rewrite that removes 20 casts is fine (`724a4d2a181` tusUpload).
- Bad:
  - most hunks neutral;
  - hoists or imports reshuffled;
  - constants and mocks renamed to less specific names;
  - "ownership" teardown added everywhere.
- Signals:
  - the share of hunks tagged gain;
  - a review note longer than the diff;
  - validation effort far beyond the change (`8d7341cecc0` installed a coverage provider in /tmp for a `find`→`get` change).

**4. Reuse.**
- Good:
  - adopting an existing fixture or helper;
  - fixing a shared helper at the root and running all its consumers;
  - a new shared factory with a second consumer in the same batch.
- Bad:
  - a new helper with one consumer;
  - working around a broken shared helper locally;
  - changing a shared helper without running its consumers;
  - a parallel helper next to a canonical one.
- Signal: count the consumers of each new export at commit time.

**5. Knowledge kept.**
- Good: "why" comments, such as regression causes, config conditions and non-obvious constraints, are kept or improved. Names get more specific.
- Bad: a "why" comment deleted or cut to a cryptic line (`57074ebb0a7` login-routes dropped the require_login reachability note). Dropping a comment that only restates the test name or the assertion is fine.
- Signal: `git diff` lines starting `-  //` with no matching `+`.

**6. Honest record.**
- Good: the note says what was wrong, what changed, and what was lost or left.
- Bad:
  - claims the diff contradicts (`284883738b4` says it reuses `tests/vitest/deferred`; the diff uses `Promise.withResolvers`);
  - overstated framing, such as a subject implying a bug the old code didn't have (`f47fe00f830` "Await datatype mapper" — it was already awaited), or a "fix" for a leak isolation already prevents;
  - a preservation ledger standing in for a readability argument.
- Signal: check every factual claim in the note against the diff.

## Red flags (cap the score)

Cap at 1:
- a check removed or loosened without a stated reason;
- the test now asserts against its own mock;
- coverage or behaviour lost without saying so.

Cap at 2:
- net new control flow in test bodies, or an `it.each` column that selects which assertion runs;
- teardown/restore hunks are 50% or more of changed lines and the note cites no observed leak (a failing test, a leaked timer, a coverage delta);
- a shared helper changed without running all its consumers;
- a note or subject claim the diff contradicts.

Cap at 3:
- a "why" comment deleted without replacement;
- no defect from the gate list (step 1 below) in the original;
- most hunks are renames or reordering.

## How to apply (back-out gate before committing)

1. **Before editing**, name the defect in the original by quoting the `-` line and the wrong result it lets through. Count only:
   - a vacuous or weak check;
   - assertions that run unawaited;
   - a test of its own mock;
   - casts hiding a wrong type, or `as unknown as` cast soup (an `as object` or inference workaround alone is not a defect);
   - opaque positional arguments;
   - setup copied across three or more cases;
   - duplicate cases;
   - a misleading test name, mock or comment;
   - an untested behaviour the fixture already exercises;
   - order dependence or flakiness;
   - a broken shared helper.

   If you can't name one, stop: leave the file alone. "Owned teardown" or "required boundary" without a quoted line is not a defect.
2. **After editing**, tag each hunk as gain, neutral, or cost, and revert neutral and cost hunks a gain doesn't need. Check the red flags.
3. **Score**, netting mixed commits: score the diff as if the cost hunks were reverted, then drop one level if more than a third of changed lines are cost hunks. Commit only at 4 or 5. If the review note is longer than the diff, the commit is probably a 3; recheck it. Otherwise run `git restore` on the file, still bump `iterated`, and add one line to the batch report: `left alone: <reason>`. "Readable enough" is a valid reason.
4. **Write the note** as defect → change → anything lost. Keep it shorter than the diff for small diffs. Validation evidence belongs in a log path, not in prose.
