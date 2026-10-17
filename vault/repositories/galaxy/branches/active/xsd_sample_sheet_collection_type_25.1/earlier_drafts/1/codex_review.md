Codex (read-only, `origin/release_25.1...HEAD`, head `0b14b1e8c4b`) returned **no findings**. Nothing to act on.

<details>
<summary>Codex coverage notes</summary>

- Read the diff plus `scripts/validate_tools.sh`, `tox.ini`, `common_startup.sh`, `type_description.py`, the collection type plugins, `sample_sheet_to_tabular.xml`, `data_fetch.xml`, the loader and macro code, `linters/xsd.py`, and `test_tool_linters.py`.
- Both core tools it newly selects validate under xmllint and lxml.
- It checked both collection patterns against 20,685 generated inputs and found no mismatches with the runtime rule.
- It didn't run full tox `validate_test_tools`, because the read-only sandbox blocks the writes `common_startup.sh` needs.

</details>
