# Codex review

Acted on the single finding in `87338280d79`: the carried other-history HDCA now goes through `_classify_hdca`; when it only maps over the input, the entry gets `map_over_type`. New test `test_build_collection_options_carries_other_history_map_over_selection` red on the previous head (`KeyError: 'map_over_type'`), green after.

Not acted on:
- Direct + map-over both possible (multi-type params): only the direct entry is carried, because the client keeps one `keep` entry per id. Which one was picked isn't recoverable server-side (build `value` drops `batch`/`map_over_type`).
- 26.2 `_carry_selected_hdca` has the same gap; forward merge should keep this branch's classification.

<details><summary>Details</summary>

- Scope `origin/release_26.1...HEAD` at `1293d18a69f`, read-only, brief = intent only.
- P2 correctness, `basic.py` `_carry_selected_hdca`: the carried entry never sets `map_over_type`, so a foreign `list:paired` picked for map-over on a `paired` input renders as a direct selection; `FormData.createValue` then emits `batch=false`. Confirmed with a throwaway build probe (uncommitted): `value` came back as `{'values': [{'id', 'src'}]}` and the carried option had no `map_over_type`.
- Coverage: no API tests run by Codex.

</details>
