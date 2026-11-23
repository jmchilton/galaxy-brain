# Test challenges review — galaxy#25028

- Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`)
- Model: Claude Opus 5.5, effort: low
- Reviewed commit: cd5a9c371480edfb1814193e0146f20dca52ec18
- Debrief: [test_challenges_debrief.md](test_challenges_debrief.md)

Overall: coverage is placed well — a new framework tool exercised across three integration configs, including a new Pulsar `rewrite_parameters` + remote extended metadata config that didn't exist. No E2E needed.

## P2 1 — Drop unit tests duplicating the tool tests
`test_extended_metadata_from_work_dir_keeps_written_output[0,2]` and `test_extended_metadata_from_work_dir_single_match` assert the same contents (`written to output` / `stray 0`) as the three `<test>` blocks of `from_work_dir_glob_output_written.xml`, which already run under the extended, Pulsar extended and Pulsar rewrite-parameters integration modules. Keep only `test_extended_metadata_from_work_dir_output_missing`, the sole coverage of the new ERROR-state export in `set_metadata_portable`.

## P2 2 — Missing-output case: integration coverage is partial and disagrees with unit expectation
Integration only checks write_output=false with 0 strays and expects `ok` + empty content (output path exists remotely); the unit test expects `error` for missing output with 0 and 2 strays. Parametrize `test_from_work_dir_output_not_written_is_empty` over stray_files 0 and 2 (2 strays exercises the glob-mismatch fallback when nothing was written) and assert the intended state, so the end-to-end behavior for the multi-match/no-output case is pinned rather than only inferred from the unit layer.
