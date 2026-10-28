# Normal review debrief

Verdict: merge as-is. Acted on the one docstring correction (None only while dependencies are pending; a new conversion returns its output HDA). No bugs found.

Not acted on:
- `users.py` `new_len` None → AttributeError while len is pending: pre-existing on base, out of scope.
- `_get_or_create_converted` checks the `get_converted_dataset` value but returns `get_converted_files_by_type`: kept to preserve bam/bai metadata behaviour.
- Other callers (`genomes.py`, `dbkeys.py`, data-provider `registry.py`, tool-input implicit conversion in `tools/actions`): left out; data-provider registry is the best follow-up candidate.
- No tests for `_search_features` / custom-build paths: no test tool consumes `len`; acceptable for size.

<details>
<summary>Full review</summary>

- Bai/metadata fake HDA has no permission rows → accessible; no regression.
- New conversion belongs to requester's history → accessible.
- LDDA works (checks `.dataset`); admin bypass and anonymous behave as for public datasets.
- 403 is right vs. fresh conversion: `get_converted_files_by_type` would keep returning the first association, so fresh conversions would pile up unseen.
- Tests: baseline + 403 path covered; shared `_fasta_with_tabular_conversion` helper is good reuse.
</details>
