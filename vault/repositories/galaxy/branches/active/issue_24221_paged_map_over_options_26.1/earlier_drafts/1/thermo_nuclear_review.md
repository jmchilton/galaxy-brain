# Thermo-nuclear code quality review

Acted on one finding: a stale docstring in `ToolForm.mergeFetchedOptions` still said "de-duplicating by id/src". Fixed it and folded the fix into the client commit, which is now `e4a0f756c63`. No structural blockers. The diff is small (+119/-26), no file grows past 1k lines, and it deletes two hand-rolled merges in favour of one helper. That helper is the right code-judo move for this fix.

Not acted on:
- **T2: `ToolForm`/`WorkflowRunDefaultStep` `mergeFetchedOptions` are still near-duplicates** (find input, merge options, copy `options_meta`, bump inputs). This duplication predates the branch. Extracting it would refactor two Options API components on a release branch. That belongs on dev, where ToolForm is `<script setup>`.
- **T3: two identity keys (`itemUniqueKey` vs private `pageMergeKey`)**. This is the known selection-identity issue (codex P1 / review L1) and is out of scope. On dev the fix is to unify on one key.
- **T4: server comment names the client merge contract (src, id, map_over_type)**. This is a minor layer leak, but it is dev's final wording, and keeping it matches the cherry-pick.
- **T5: `mergeDataOptions` could be `uniqBy(existing.concat(incoming), key)`**. That would also dedup inside `existing`, which changes behaviour slightly. lodash `uniqBy` is not used anywhere in the client. The explicit filter is clear enough.
- **T6: `emitted = result if isinstance(result, list) else [result]`**. This is pre-existing code, so changing it adds churn with no gain.

<details><summary>Full review</summary>

Scope: `dbe4f2f7e41..HEAD`: baseline tests, server `accumulate_with_filter`, client `mergeDataOptions`.

## Structural

No regression. The server change *removes* a moving piece (the `hit_limit` flag and the inner `break`). The rule "a row is never split across a page" is simpler than the old rule "stop mid-row at the limit". Pagination becomes row-atomic, so `has_more` (which counts rows) stays truthful without extra bookkeeping. This is the minimal code-judo fix for this bug.

On the client, two copy-pasted merges (`${id}_${src}` sets) collapse into one pure helper next to the existing option-identity helpers (`itemUniqueKey`, `containsDataOption`) in `FormData/types.ts`. That is the canonical layer, and the helper is typed (`DataOption[]`), with no casts or `any`.

## T1 (acted): stale docstring

`client/src/components/Tool/ToolForm.vue` `mergeFetchedOptions` doc said "de-duplicating by ``id``/``src``". The behaviour now dedups by src/id/map_over_type, which is the exact thing this branch changes. The stale doc would mislead the next reader into "fixing" it back. It now reads "de-duplicating by ``src``/``id``/``map_over_type``".

## T2: the remaining duplication is the whole `mergeFetchedOptions`

Both components still carry about 15 identical lines: find the target and incoming input by dotted name, merge `options[src]`, overwrite `options_meta[src]`, and bump the inputs array identity. The real reusable abstraction is something like `mergeFetchedInput(target, incoming, src)` in `Form/utilities`. It would leave each component with only its find-and-refresh glue. This would be a good dev follow-up. On a 26.1 backport it touches two Options API components for no behaviour gain, so I did not act on it.

## T3: two identity notions

`pageMergeKey` (src+id+map_over_type) sits beside the exported `itemUniqueKey` (src+id). Two identity keys for one concept is a smell. Selection and keying still use the narrower one, which is the codex P1 bug. The fix there is a single key. That is out of scope by instruction, and dev already does it as part of the 20657 work. The private, documented helper is the least-bad option for 26.1.

## T4: server comment knows about client merge identity

The loop comment in `pagination.py` describes how clients must merge pages. It is documenting the endpoint contract that offsets can land mid-row, so it is defensible, and it is dev's text verbatim. I left it.

## T5: `mergeDataOptions` body

Rewriting it with `uniqBy` would cut about 10 lines to 1. But it would dedup `existing` as well as `incoming`, and lodash `uniqBy` has no precedent in the client. The current filter also dedups duplicates within `incoming`, which is correct. I kept it.

## T6: Python `emitted` branch

The `if isinstance(...)` / `else` around `emitted` could be a conditional expression. This is pre-existing code and outside the diff hunk's intent.

## Tests

The baseline unit tests are a pure helper with a fake query, not mocks, which is good. The API test uses the existing `_create_hdca` / `_build_tool_param`. The vitest file uses plain fixtures with no mounting. The test style is clean, and there is nothing to strengthen without adding scope.

## File size

`ToolForm.vue` and `WorkflowRunDefaultStep.vue` both shrink. `types.ts` grows by 20 lines. `test_tools.py` was already well past 1k lines, and a 27-line test is not the place to split it.

</details>
