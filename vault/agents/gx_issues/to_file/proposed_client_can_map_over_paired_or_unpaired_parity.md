# Workflow editor maps collections over `:paired_or_unpaired` inputs that the server can't map over

The client's `CollectionTypeDescription.canMapOver` says yes to six `paired_or_unpaired` cases where the server's `can_map_over` says no.

| Output collection | Input collection | Client `canMapOver` (dev) | Server `can_map_over` (dev) | Editor connection |
| --- | --- | --- | --- | --- |
| `paired` | `list:paired_or_unpaired` | ✅ | ❌ | accepted as a map-over with empty type `""` 💥 |
| `paired_or_unpaired` | `list:paired_or_unpaired` | ✅ | ❌ | accepted as a map-over with empty type `""` 💥 |
| `list` | `list:list:paired_or_unpaired` | ✅ | ❌ | accepted as a map-over with empty type `""` 💥 |
| `list` | `list:paired_or_unpaired` | ✅ | ❌ | direct connection, so this mismatch has no effect yet |
| `list:paired_or_unpaired` | `list:paired_or_unpaired` | ✅ | ❌ | direct connection, so this mismatch has no effect yet |
| `list:list` | `list:list:paired_or_unpaired` | ✅ | ❌ | direct connection, so this mismatch has no effect yet |
| `list:list` | `list:paired_or_unpaired` | ✅ | ✅ | map-over `list` (correct) |
| `list` | `paired_or_unpaired` | ✅ | ✅ | correct |
| `paired_or_unpaired` | `paired_or_unpaired` | ❌ | ❌ | direct connection (correct) |

✅/❌ = what `canMapOver` / `can_map_over` returns. 💥 = the editor lets you draw a connection that the server's map-over logic rejects.

In the 💥 rows the editor accepts the connection and marks the step as mapped over a collection of type `""`. At run time map-over is decided by the server's `can_map_over` (`query.py`, `tools/parameters/basic.py`, `workflow/map_over.py`), which rejects all of these pairs. So the step isn't mapped over at all, and the collection goes straight to an input of a different type. The editor saves a workflow whose map-over the server doesn't agree with.

<details><summary>Why</summary>

`canMapOver` in `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts` answers every case where the output has no more ranks than the input before it gets to the "cannot map over self" rule:

```ts
if (this.rank <= other.rank) {
    if (normalizedOther == "paired_or_unpaired") {
        return !normalizedThis.endsWith("paired");
    }
    if (normalizedOther.endsWith(":paired_or_unpaired")) {
        return !normalizedThis.endsWith(":paired");
    }
    // Cannot map over self...
    return false;
}
```

So any output of the same or lower rank that doesn't end in `:paired` "maps over" any `X:paired_or_unpaired` input. Python's `can_map_over` (`lib/galaxy/model/dataset_collections/type_description.py`) checks for self first, then for a `:other` suffix, then requires *extra* outer ranks for the compound case:

```python
return higher_ranks.endswith(higher_ranks_required) and higher_ranks != higher_ranks_required
```

Both files say they mirror each other and must "keep in sync".

The editor connection is accepted because `InputCollectionTerminal._effectiveMapOver` (`terminals.ts`) only skips a map-over result that equals `NULL_COLLECTION_TYPE_DESCRIPTION`. `effectiveMapOver` returns `new CollectionTypeDescription("")` for these pairs. That is a different object, so `attachable` accepts the connection when no sibling constraints get in the way.

</details>

<details><summary>Reproduction</summary>

These are the vitest assertions that fail on `dev` (in `collectionTypeDescription.test.ts`, `ct = (t) => new CollectionTypeDescription(t)`). The first two also appear in Python's `test_compound_paired_or_unpaired_can_map_over`. The rest follow the same rule:

```ts
expect(ct("paired").canMapOver(ct("list:paired_or_unpaired"))).toBe(false); // dev: true
expect(ct("list").canMapOver(ct("list:paired_or_unpaired"))).toBe(false); // dev: true
expect(ct("list").canMapOver(ct("list:list:paired_or_unpaired"))).toBe(false); // dev: true
expect(ct("paired_or_unpaired").canMapOver(ct("list:paired_or_unpaired"))).toBe(false); // dev: true
expect(ct("list:paired_or_unpaired").canMapOver(ct("list:paired_or_unpaired"))).toBe(false); // dev: true
```

The table was produced by running both implementations from `origin/dev` (7c86d742327) over the same type pairs. `release_25.1` and `release_26.0` give the same client results.

</details>

## Context

Bug found while reusing `canMapOver` for tool form collection matching on 🌿 [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode), which works on 🎯 #20657. The client logic came in with 🔀 #19377. Python got its compound `:paired_or_unpaired` handling in 🔀 #22170, and 🔀 #22565 renamed it to `can_map_over` to match `canMapOver`, but the client was never brought in line. 🎯 #21271 tracks broader `paired_or_unpaired` usability.

## Proposed Approach

Rewrite `canMapOver` to check rules in the same order as Python: self check first, then the `:other` suffix match, then `paired_or_unpaired` (anything but `paired`), then `X:paired_or_unpaired` with the "extra higher ranks" requirement. Then port Python's compound test cases to `collectionTypeDescription.test.ts`. This is already done in [`00e2bf07047`](https://github.com/jmchilton/galaxy/commit/00e2bf07047080f79e2abd42e6a2773035d4bb9b) (about 40 source lines and 8 test lines). With it, the client and server agree on every row above.

<details><summary>Approach details</summary>

- Red first: the assertions in the reproduction block, plus `list:list:paired` and `list:list:list` over `list:paired_or_unpaired` staying ✅. `00e2bf07047` covers the first three. It still needs the `paired_or_unpaired` and `list:paired_or_unpaired` output cases.
- The rewrite has no `rank <= other.rank` branch. The self check and the extra-rank check cover what it did.
- Also run `terminals.test.ts`, the editor connection suite that uses `canMapOver`.
- Backport: the client code is the same on `release_25.1`, apart from the `normalizeCollectionType` (sample sheet) calls on 26.0 and later. On 25.1 the server doesn't support compound `:paired_or_unpaired` map-over at all (`has_subcollections_of_type` returns false even for `list:list` over `list:paired_or_unpaired`). So a 25.1 backport removes the 💥 rows but doesn't make the two sides match fully. The 26.0 server already has the compound handling, so a 26.0 backport matches fully.

</details>

## Alternative Approaches

We could keep the `rank <= other.rank` branch and patch its two `paired_or_unpaired` returns, or replace the hand-ported test with one case table that both pytest and vitest run. The patch keeps the rule order different from Python, and that difference is how this bug got in. The shared table is the better long-term guard, but it's a larger change and doesn't backport well. A straight port fixes the bug now and leaves the table as a follow-up.

<details><summary>Alternatives In Detail</summary>

### Alternative: Patch the rank branch in place

<details><summary>Description</summary>

#### Details

Inside `if (this.rank <= other.rank)`, return `false` for `X:paired_or_unpaired` inputs unless the output has extra outer ranks.

#### Why the proposed approach is preferred

It's a smaller diff, but the client would still evaluate rules in a different order from the Python it says it mirrors, so the next change on either side can drift again unnoticed. Matching Python's rule order makes the two easy to compare line by line.

</details>

### Alternative: Shared parity table

<details><summary>Description</summary>

#### Details

Put (output, input, expected) triples for `accepts` and `canMapOver` in one fixture, for example next to the "Type Compatibility Algebra" section in `collection_semantics.yml`, and have both `test_type_descriptions.py` and `collectionTypeDescription.test.ts` run them.

#### Why the proposed approach is preferred

It catches any future drift, not just this one, but it adds new test infrastructure on both sides. Worth doing as a follow-up. It isn't needed to fix this bug.

</details>

</details>
