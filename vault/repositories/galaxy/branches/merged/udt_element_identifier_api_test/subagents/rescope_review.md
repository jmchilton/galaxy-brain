# Re-scope normal review debrief

Verdict: approve for UDTs. Acted on: the commit message overclaimed a Cheetah fix. Reworded (`2d506996bef`) to say Cheetah still falls back to the dataset name, and dropped the restating comment.

Not acted on:
- Fixing Cheetah (`ElementIdentifierMapper` also keying converted HDAs' parents, plus a new `identifier_single_tabular.xml` test tool): XML-tool behavior is beyond the UDT bug. It's listed in the issue text as a follow-up.
- Carrying identifiers per input name instead of as transient ORM attributes: optional hardening. The pattern already exists in `meta.py`.

<details><summary>Full review</summary>

- Cheetah lookup: `__populate_wrappers` builds the mapper from `job.io_dicts()` (converted HDA) but queries it with `input_values[input.name]` (original HDA), so it misses and `element_identifier` falls back to `self.name`. The UDT path works (keyed by converted id, looked up by `hda_entry.id`).
- Stale identifier leak: no new practical leak. The copy runs within one `execute`. Same exposure as `meta.py:508/544`. Same-HDA-twice-in-a-list gives last-wins (pre-existing).
- Job cache: converted mapped jobs now persist `|__identifier__`, so searches can match on it. That's stricter and correct. Older jobs miss the cache once.
- Rerun strips and remap copies `|__identifier__`, consistent.
- Workflows: `process_dataset` unwraps DCE before reading. Irrelevant here, since both paths get the identifier from the DCE.
- Nits: the comment restated the code (dropped). The API test is real (csv is not a `Tabular` subclass, so it goes through `csv_to_tabular`).
</details>
