# Test challenges review — PR #24826

Profile: gx_test_challenger (`_shared/reviewers/gx_test_challenger.md`). Model: Claude Opus 5.5. Effort: low. Reviewed commit: `4c330c4ed47de5048ea172e64ec186604767c24e`.

Details and test plan: [test_challenges_debrief.md](test_challenges_debrief.md).

The two new unit tests are reasonable regression tests that reuse existing helpers and avoid mocks.

## P2 1 — Add a framework tool test for the optional-ext pattern

The bug reaches users through tool XML, and `test/functional/tools/discover_default_ext.xml` already covers default-ext fallback for discovered collections. Add an output (to that tool or a sibling) that uses the PR's Unzip pattern `^(?P<designation>\.*[^\.]+(?:\.(?P<ext>.*))?)$` on an extension-less file, with a collection `format=` set, and assert the element's `ftype` is that default. The unit tests set no `default_ext`, so the `collector.default_ext` arm of the new `ext` property is currently untested; only the `"data"` fallback is.

## P3 1 — Cover primary (non-collection) discovery

`has_element_identifier` now gates every regex match in `DatasetCollector.match`, including `discover_datasets` on plain `<data>` outputs. A framework-test output on a `<data>` element with the same pattern would show primary discovery still works with the new fallback and skip.

## P3 2 — Small unit-test cleanups

Drop the intermediate `filenames[0].match.ext == "data"` assertion (the final `extension == "data"` check covers the behavior), and use `tempfile.TemporaryDirectory()` as the neighbouring test does instead of leaking `mkdtemp()` directories.
