# galaxy#24600 — Pulsar jobs with `default_file_action: none` fail when a tool uses extra files

Closed 2026-11-06 (completed) by John; fixed on `release_26.2` and `dev` by merged PR [#24702](https://github.com/galaxyproject/galaxy/pull/24702), merge commit `10ffdf8c742`. [Closing comment](https://github.com/galaxyproject/galaxy/issues/24600#issuecomment-6685105711).

[Issue](https://github.com/galaxyproject/galaxy/issues/24600). Our branch abandoned: [`issue_24600_pulsar_none_extra_files_25.1`](../../../branches/abandoned/issue_24600_pulsar_none_extra_files_25.1/index.md).

Pulsar `none`/no-op `rewrite` actions make both extra-files hooks raise `TypeError` (composite and Directory inputs reproduced in integration tests on dev 18296103e03) ([proposal](proposal.md), [debrief](debrief.md)).

## Verification of #24702 (2026-11-05)

Added the issue's repros to `test_pulsar_embedded_none.py` at the merge commit, embedded Pulsar, sqlite, `pulsar-galaxy-lib` 0.16.0.

- With fix: `composite_output_tests`, `dataset_path` index 1, and the module's 3 existing tools all pass.
- Fix removed: `composite_output_tests` and `dataset_path` index 1 fail with the original `TypeError`.
- Not run: Directory outputs, data-manager bundle paths, no-op `rewrite`. Read from code only.

## Left unfixed

- 25.0, 25.1, 26.0 and 26.1 lack the fix; no backport.
- `job_conf.sample.yml`: uncommented `default_file_action: none`, wrong action list, `galaxy_infrastructure_url1` typo. Fix available in `bf1ec9728a6`.
- The two repro tests aren't in the repo; #24702 added `composite_output` only.
