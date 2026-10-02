# galaxy#23838 - Write plain filter text before key:value tokens

- PR: https://github.com/galaxyproject/galaxy/pull/23838 (mvdbeek, base `dev`, milestone 26.2)
- Head: `99ce852fb46`
- Reviewed: 2026-10-01
- CI: 28/28 green (incl. client-unit-test)

## Summary

`getFilterText` emitted the `autoFilterKey` plain text after keyed tokens. In
`quoteStrings=false` mode (`splitPairs`, `client/src/utils/filtering.ts:395`) a value runs
unquoted up to the next `key:` token, so a trailing plain word is swallowed by the preceding
token's value. Fix: stable-sort the unspecified-text entry to the front
(`filtering.ts:580-585`).

**Verdict: approve.** Reordering is the right fix, not a workaround: in `quoteStrings=false`
mode the folding *is* the grammar (`name:my history` without quotes), and quotes are kept
verbatim, so quoting the serialized value isn't available. Plain text first is the only
position that grammar can't swallow. `quoteStrings=true` filters (`HistoryFilters`,
`HistoriesFilters`) tokenize on whitespace, so order changes their output text only, not meaning.

Verified locally:
- New tests + 3 updated `filterConversion` expectations fail on `origin/dev`, pass on head (red-to-green).
- Round-trip probe `parse(getFilterText(parse(t), t)) == parse(t)` holds on head for: `abc tag:foo`,
  `abc def tag:foo`, `abc tag:foo tag:bar`, `abc tag:'foo bar'`, `abc is:deleted` (history list), and
  `abc tag:foo`, `'ab c' tag:foo`, `abc def extension:txt`, `abc deleted:true` (`HistoryFilters`).
- Only mismatches were keys that aren't valid filters for that list (dropped by
  `getValidFilters`), which is expected.
- 26.1: `autoFilterKey` (5538f020389) is not an ancestor of `origin/release_26.1`, so dev-only
  is correct.
- Order-dependent callers: no Selenium expectation hit. `test_workflow_management.py:198`
  (`name:searchforthis tag:mytag`) uses an explicit `name:` key, so `unspecifiedTextKey` is unset
  and order is unchanged. The other string expectations (`CuratedWorkflowList.test.ts:203`,
  `pages.test.ts:299`) already put plain text first.

## Findings

1. **Low - untested second symptom: `is:` booleans were worse than tags.** On `origin/dev`,
   history list (`my`) `setFilterValue(setFilterValue("", "deleted", true), "name", "abc")`
   produced `is:deleted abc`, which parses to `{}`: the `is` value becomes `deleted abc`, isn't a
   valid bool, and **both** filters are dropped. Head gives `abc is:deleted`. Worth a case in the
   new `describe` (and a sentence in the description), since it's a harsher failure than the tag
   merge:
   ```js
   test("plain text next to an is: filter keeps both", () => {
       const my = getHistoryListFilters("my");
       const text = my.setFilterValue(my.setFilterValue("", "deleted", true), "name", "abc");
       expect(Object.fromEntries(my.getFiltersForText(text, true, false))).toMatchObject({
           name: "abc",
           deleted: true,
       });
   });
   ```
   (The new block uses `getHistoryListFilters("published")`, which has no `is:` filters, so it
   can't cover this.)

2. **Nit (optional) - sort comparator is cryptic.**
   `Number(b === k) - Number(a === k)` at `filtering.ts:583` needs the comment to be read.
   Pulling the unspecified-text entry out and prepending it says the same thing directly:
   ```ts
   const entries = Object.entries(filters);
   const plainIndex = entries.findIndex(([key]) => key === unspecifiedTextKey);
   if (plainIndex > 0) {
       entries.unshift(...entries.splice(plainIndex, 1));
   }
   ```
   Fine to leave as is.

Not raised (pre-existing, out of scope): in `quoteStrings=false` mode, plain text containing
`word:` (e.g. a URL) is still parsed as a key, both before and after this PR.

## Draft review

_This review was posted by Claude (AI assistant) on behalf of jmchilton._

Looks good. Reordering is the right fix: in `quoteStrings=false` mode the parser's "value runs to the next `key:`" rule is the grammar, and quotes are kept verbatim there, so putting the plain text first is the only position it can't swallow. I checked that the new tests and the updated `filterConversion` expectations fail on `dev` and pass here, and that `parse(getFilterText(parse(t), t))` round-trips for multi-word plain text, repeated tags, quoted tags, and `is:` booleans on the history list, plus the `HistoryFilters` (`quoteStrings=true`) cases. `autoFilterKey` isn't on `release_26.1`, so dev-only is right.

One suggestion: `is:` booleans had a worse version of this bug. On `dev`, setting `deleted` and then a name in the "my histories" list produced `is:deleted abc`, which parses to `{}`. Both filters are dropped, because the `is` value becomes `deleted abc`. This PR fixes that too (`abc is:deleted`), but the new tests use the published list, which has no `is:` filters. Could you add a case?

```js
test("plain text next to an is: filter keeps both", () => {
    const my = getHistoryListFilters("my");
    const text = my.setFilterValue(my.setFilterValue("", "deleted", true), "name", "abc");
    expect(Object.fromEntries(my.getFiltersForText(text, true, false))).toMatchObject({
        name: "abc",
        deleted: true,
    });
});
```

Optional: the sort comparator at `filtering.ts:583` takes some decoding. `entries.unshift(...entries.splice(plainIndex, 1))` (after a `findIndex`) says "move plain text to the front" more directly. Fine either way.
