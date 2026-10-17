# Normal review (collection_semantics change): issue_24218_can_map_over_parity_26.0

**Top line:** No blockers. Took nit 2: server test now asserts `paired_or_unpaired` can't map over `list:paired_or_unpaired` and names both new labels; amended into `c217ced0660`. Skipped nit 1.

Not acted on:
- Nit 1: add "(or ``paired_or_unpaired``)" to the "each rank is a ``list`` or a ``paired``" intro. Skipped: that sentence is about exact-match types, and `paired_or_unpaired` is the exception (it consumes `paired`). Adding it would mislead.

<details><summary>Details</summary>

- Semantics verified against server: `paired` and `paired_or_unpaired` both fail `can_match_type` and `has_subcollections_of_type` for `list:paired_or_unpaired`, so `is_valid: false` is right.
- `then: "tool(i=C)"` + `is_valid: false` matches section neighbors (`COLLECTION_INPUT_LIST_NOT_CONSUMES_PAIRS`). The `mapOver(C) is invalid` form belongs to the later paired_or_unpaired section, where mapping is plausible; here C has lower rank than the input.
- Labels follow `COLLECTION_INPUT_<input>_NOT_CONSUMES_<collection>`; neighbor's `PAIRED_OR_NOT_PAIRED` is a pre-existing outlier, not copied.
- Linked test names match `terminals.test.ts:388` and `:394` exactly.
- Placement: right after the existing `rejects paired:paired -> list:paired_or_unpaired` example; anchors in the same block.
- md byte-identical to `generate_docs()` output (cmp in scratch dir). No `.pre-commit-config.yaml` / `.prettierignore` in repo, so skipped local hooks won't be flagged by CI.
- No security concerns.

</details>
