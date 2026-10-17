Codex (read-only, `origin/release_25.1...HEAD`, head `5d35c8c7db3`, after the re-scope) returned **no findings**. Nothing to act on.

<details>
<summary>Codex coverage notes</summary>

- Read the diff plus `convert_sample_sheet.xml`, `sample_sheet_to_tabular.xml`, `data_fetch.xml`, `validate_tools.sh`, `common_startup.sh`, `tox.ini`, `.circleci/config.yml`, `type_description.py`, `sample_sheet_workbook.py`, `tools/__init__.py`, `parameters/basic.py`, the loader and macro code, and `linters/xsd.py`.
- Validated 3,288 collection-type cases with lxml/libxml2.
- Ran xmllint on both newly included core tools and checked shell syntax.
- Didn't run full tox, because it needs filesystem writes.

</details>
