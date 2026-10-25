# Codex review

Acted on the single finding (P2, confirmed): `ftpfile` params default to `multiple=True` (`lib/galaxy/tools/parameters/basic.py:766`), so the helper's `get_bool("multiple", False)` stopped splitting `value="a.txt,b.txt"` for ftpfile tests. Fixed in `6caf89ba51d` by defaulting `multiple` to true for `ftpfile`; unit test `test_ftpfile_value_split_on_commas` red before, green after. Framework `select_comma_value` / `multi_select` still pass.

Not acted on: nothing.

<details>

Scope `git diff origin/release_25.1...HEAD` at `4b8173d90ec`, read-only `codex exec`. Files reviewed: verify/parse.py, interactor.py, parser/interface.py, parser/xml.py, parser/util.py, parameters/case.py, tools/parameters/basic.py, the new tool + conf, test_toolbox_pytest.py, unit tests. Codex ran parser unit tests (15 passed); didn't run framework tests.

Finding: "Preserve the implicit multiple-value default for FTP parameters" (P2, correctness, certain). A tool with `<param name="files" type="ftpfile"/>` and test `value="a.txt,b.txt"` previously parsed to `['a.txt', 'b.txt']`; at HEAD it parsed to `['a.txt,b.txt']`, so the runtime got one combined filename. Verdict: CONFIRMED.

</details>
