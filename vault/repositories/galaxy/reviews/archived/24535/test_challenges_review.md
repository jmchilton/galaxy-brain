# Test challenges review — PR #24535

Profile: [gx_test_challenger](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/reviewers/gx_test_challenger.md) · Model: Opus 5.5 · Effort: low · Reviewed commit: deed873a70a

Details: [test_challenges_debrief.md](test_challenges_debrief.md)

### P2 1: No test for `sel` datatype registration / BayeScan-style discovery

The `sel` registration in `datatypes_conf.xml.sample` is untested; `discover_unknown_ext` only checks that unknown extensions become `data`. Add a framework tool test that discovers `out/<name>.sel` via `__name_and_ext__` and asserts `ftype="sel"` (fails on base where it normalizes to `data`). A small dedicated tool is cleaner than overloading `discover_unknown_ext`.

### P3 1: Tests otherwise appropriate

`metadata_defaults` framework tool is the right layer for the Chopin2 regression and the `test_tabular.py` parametrize rows are cheap and pin rejection cases plus legacy stored `["7"]` unwrap. No drops/rewrites recommended. (Informational; no action.)
