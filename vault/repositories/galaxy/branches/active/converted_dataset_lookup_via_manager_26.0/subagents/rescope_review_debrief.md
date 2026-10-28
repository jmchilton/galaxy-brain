# Re-scope review debrief

Verdict: ship as minimal 26.0 backport; no bugs. Acted on: dropped the pending-`len` 400 guard (unreachable — neither `fasta_to_len` nor `len_to_linecount` declares converter deps — and asymmetric with `new_linecount`); added a one-line comment on why `converted/{ext}` doesn't use the helper.

Not acted on:
- Inject `hda_manager` into the registry instead of `trans.app.hda_manager`: larger signature change than a backport needs.
- Registry dependency datasets (`get_converted_dataset_deps`) aren't checked: kept narrow; noted.
- No tests for feature search / registry paths: acceptable for backport.

<details><summary>Full review</summary>

- Every `get_data_provider` caller passes a context with `.app`; no LDDA callers, and LDDA would work anyway.
- Agrees with leaving `dbkeys.py`/`genomes.py` out: they start from the user's saved build and only read server file paths.
- Imports/comments fine; `test_converted_ext_checks_conversion_access` covers the real case.
</details>
