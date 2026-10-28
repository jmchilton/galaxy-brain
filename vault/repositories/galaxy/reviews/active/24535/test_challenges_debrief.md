# Test challenges debrief — PR #24535

Profile: gx_test_challenger · Model: Opus 5.5 · Effort: low · Reviewed commit: deed873a70a (base origin/release_26.2)

## Tests in the PR

- `test/functional/tools/metadata_defaults.xml` (framework tool test, also in extended-metadata integration list): good layer. Exercises the real output `<actions>` metadata path that broke Chopin2; fails pre-fix since `default="7"` arrives as `["7"]` and `IntParameter.marshal` rejected lists. Keep.
- `test_tabular.py` param additions (`["7"]`, `[3]`, reject `[]`, `["3","7"]`, `[True]`, `[3.7]`, `[["7"]]`, wrap of stored `["7"]`): cheap parametrize rows extending an existing test; the rejection rows pin the narrowed behavior and the wrap row covers legacy stored values the framework test can't reach. Keep.

## Gap: `sel` datatype / BayeScan discovery untested

The `datatypes_conf.xml.sample` change has no test. `discover_unknown_ext` covers unknown → `data` only; nothing asserts a discovered `.sel` keeps `sel`. Pre-fix, the output would normalize to `data`; a revert/typo in the sample conf would go unnoticed.

Test plan: add a framework tool test (new tiny tool, e.g. `discover_sel_ext.xml`, or an extra element in an existing `__name_and_ext__` discovery tool other than `discover_unknown_ext`, whose count/semantics are about unknowns) writing `out/bayescan.sel` and asserting element `ftype="sel"`. Confirm framework tests use the sample datatypes conf (`datatypes_conf.xml.sample`) so the registration is actually exercised. Should fail on base, pass on head.

Note: the general concern — registering datatypes per-wrapper to work around 26.2 extension normalization — may recur for other IUC tools; not a test issue, flagged for the bug reviewer.

No E2E warranted (backend metadata/datatype only).
