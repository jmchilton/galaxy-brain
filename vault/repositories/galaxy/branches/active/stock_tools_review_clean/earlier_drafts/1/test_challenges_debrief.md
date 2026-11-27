Run via Claude Opus 5.5 at high effort.

# Test challenges debrief: stock_tools_review_clean

**Top line:** I dropped the upload1 unit test, because the upload API tests already cover it. I kept the joiner2 `<test>`. No other changed tool needs a new tool `<test>`. One new commit, pushed:

- `15e81e6d910` Drop the unit test for upload1's file_type options. It restores `test/unit/app/tools/test_select_parameters.py` to `origin/release_26.1`.

**When history is reworked:** drop `0803734dbf3` (Baseline tests) and `15e81e6d910` together. The upload1 PR is then just `a1decd9f417`. Its baseline is the existing upload API tests, which pass before and after the change.

Not acted on:
- **joiner2's `<test>` doesn't run in CI.** `main_tools.yaml` runs only `lib/galaxy/config/sample/tool_conf.xml.sample`, and joiner2 isn't in it. No stock tool in `test/functional/tools/sample_tool_conf.xml` sets a precedent for adding it there. The test stays as the tool's own test, run by planemo or a custom tool conf. Adding joiner2 to the sample tool conf would ship it to new deployments, which is John's call.
- **No E2E tests.** The branch changes no UI. The interactive tools run in containers and have no tests at any layer.

## Unit test: upload1 `file_type` options (`0803734dbf3`), dropped

The test loaded the real `upload.xml` `file_type` param with a mock registry and pinned the option list.

- **Covered by API tests.** Every upload1 job checks `file_type` against these options.
  - `test_upload1_paste_bad_datatype` checks that an unknown type is rejected.
  - `test_upload1_paste` and `test_upload_posix_newline_fixes_by_default` (`txt`), `test_upload_decompresses_if_uncompressed_type_selected` (`fastqsanger`), `test_upload_decompress_off_if_compressed_type_selected` (`fastqsanger.gz`) and `test_csv_upload` (`csv`) check that real types are accepted.
- **Proof:** I broke the separator in the working tree (`"%s,%s"` in place of `"%s\t%s"`) and ran those tests. 5 failed with `an invalid option ('txt') was selected (valid options: auto)`; the bad-datatype test and one other passed. I restored the file, and the same 7 tests passed. The unit test also failed under the break, so it added nothing the API tests miss.
- **What only the unit test pinned:** labels equal to values, sort order, and Auto-detect first. Those matter only to upload1's tool form, and the client never renders it: `ToolBox.vue`, `UploadItem.vue` and `Home.vue` open the upload modal for `upload1`.
- The other 8 tests in the file are unchanged and pass.

## Tool test: joiner2 (`605f9b26407`), kept

- **Right layer.** A tool `<test>` is the idiomatic test for a stock tool, and the fix makes a broken tool work.
- **Fails without the fix**, because the job can't be built (`cannot find 'tmp'`). That broken job is the bug being fixed, and the initial debrief records that run.
- **Data:** it reuses `1.bed` and `2.bed`. `sort="true"` makes the comparison independent of locale. `sort` and `join` run in the same locale, so the set of joined rows doesn't depend on it.
- **Rerun:** passes 1/1 under the framework runner, with a tool conf of joiner2 only.

## Changed tools with thin tests

| Tool | Change | Tests | Evidence |
|---|---|---|---|
| `__IMPORT_HISTORY__` | `'--$__ARCHIVE_TYPE__'` quoted | No `<test>`, but the API history import tests run it | I ran `test_histories.py -k "test_import_export or test_import_1901_histories"`: 5 passed, 2 skipped (tools missing from the test conf). This covers both branches: `url` (`test_import_export`, which reimports by URL) and `file` (`test_import_1901_histories`). The initial debrief hadn't run these. |
| upload1 | separator literal | API tests | Above. |
| Extract Genomic DNA | `is_of_type` | 7, all in `known_broken_tools.txt` | Render comparison and the `matches_any` equivalence. A new test would hit the same data table gap. |
| liftOver | quoting | 4, commented out (they need chain files) | Render comparison. |
| axt_to_lav, interval2maf, blat, BEAM, master2gd_snp, SRMA, AskOmics, cellxgene, Jupyter ×5, HiGlass, ilastik, Panoply, VRM, Phinch | quoting, `./` paths, `/` replacement | none, or blocked by the environment | Render comparison. For pure quoting, the argv is the behaviour, so a tool test would add nothing. The interactive tools can't run outside their containers. |
| shrimp_wrapper | template parse fix | 4, but SHRiMP 1.x isn't packaged and the test data is missing | All four branches rendered, and each ran against a stub mapper. |
| gtf2bedgraph, axt_to_fasta, axt_to_concat_fasta, Extract_features1, vcf_to_maf_customtrack1 | quoting, `--` | existing tests, which pass on the branch and on base | Nothing to add. |

## Mocks and helpers

There are no remaining branch unit tests, mocks or API tests to restructure. No new API test code was added, so no helpers are needed.

## Test results

- `test/unit/app/tools/test_select_parameters.py`: 8 passed (after the drop).
- `lib/galaxy_test/api/test_tools_upload.py` (upload1 explicit-type and paste tests, 7 selected): 7 passed. With the separator broken: 5 failed, 2 passed.
- `lib/galaxy_test/api/test_histories.py` (import tests): 5 passed, 2 skipped.
- joiner2 framework test: 1 passed.
- API and framework runs were sequential, with pytest directly and `-p no:postgresql`.
