# Planemo issue triage

Triage index for `galaxyproject/planemo` issues, per [`ISSUES_INDEX.md`](../_shared/ISSUES_INDEX.md); detail lives in `vault/repositories/planemo/issues/`. PR reviews are tracked in `PULL_REQUESTS.md`; live gaps with no issue yet are in [`WORTH_FILING.md`](WORTH_FILING.md).

GitHub state last refreshed: 2026-10-06. Issues here are unassigned by default. Only the issues below are triaged; Planemo's other ~170 open issues are not listed.

## Waiting on John (`needs_decision`)

- [#1720](https://github.com/galaxyproject/planemo/issues/1720) — appliance: rebuild it or take its docs down; decide: which. [notes](../../repositories/planemo/issues/needs_decision/1720/index.md)
- [#1267](https://github.com/galaxyproject/planemo/issues/1267) — workflow_lint and editor Best Practices lint different structures; not implemented; decide: close-with-ask? [notes](../../repositories/planemo/issues/needs_decision/1267/index.md)
- [#1535](https://github.com/galaxyproject/planemo/issues/1535) — `mulled-search` GitHub 401; live bug filed in the wrong repo; decide: transfer to galaxy-tool-util? [notes](../../repositories/planemo/issues/needs_decision/1535/index.md)
- [#1589](https://github.com/galaxyproject/planemo/issues/1589) — `HelpInvalidRST` on local images; wrong repo; decide: transfer to galaxy-util (docutils settings)? [notes](../../repositories/planemo/issues/needs_decision/1589/index.md)
- [#1731](https://github.com/galaxyproject/planemo/issues/1731) — interactive tools show no URL; reporter says containers were still downloading; decide: close? [notes](../../repositories/planemo/issues/needs_decision/1731/index.md)
- [#580](https://github.com/galaxyproject/planemo/issues/580) — `.shed.yml` key order; IUC standards don't define one; decide: agree on an order. [notes](../../repositories/planemo/issues/needs_decision/580/index.md)
- [#1411](https://github.com/galaxyproject/planemo/issues/1411) — reported regression was never a regression; decide: ask the reporter for the exact command? [notes](../../repositories/planemo/issues/needs_decision/1411/index.md)
- [#315](https://github.com/galaxyproject/planemo/issues/315) — Add functionality for converting Galaxy tool to CWL; CWL-gated; decide: is CWL supported? [notes](../../repositories/planemo/issues/needs_decision/315/index.md)
- [#486](https://github.com/galaxyproject/planemo/issues/486) — Implement additional CWL backends for run and test.; CWL-gated; decide: is CWL supported? [notes](../../repositories/planemo/issues/needs_decision/486/index.md)
- [#728](https://github.com/galaxyproject/planemo/issues/728) — Introduce CWL option for guessing secondaryFiles.; CWL-gated; decide: is CWL supported? [notes](../../repositories/planemo/issues/needs_decision/728/index.md)
- [#1484](https://github.com/galaxyproject/planemo/issues/1484) — CWL steps that return arrays of files should be discovered datasets; CWL-gated; decide: is CWL supported? [notes](../../repositories/planemo/issues/needs_decision/1484/index.md)
- [#1078](https://github.com/galaxyproject/planemo/issues/1078) — Need to reinstall planemo every time after using it; needs reproduction; decide: ask the reporter or close? [notes](../../repositories/planemo/issues/needs_decision/1078/index.md)
- [#746](https://github.com/galaxyproject/planemo/issues/746) — All tests fail with dbkey error; needs reproduction; decide: ask the reporter or close? [notes](../../repositories/planemo/issues/needs_decision/746/index.md)
- [#1194](https://github.com/galaxyproject/planemo/issues/1194) — `planemo shed_update` updates suites before contained tools; needs reproduction; decide: ask the reporter or close? [notes](../../repositories/planemo/issues/needs_decision/1194/index.md)
- [#1423](https://github.com/galaxyproject/planemo/issues/1423) — Input staging problem: History not found; needs reproduction; decide: ask the reporter or close? [notes](../../repositories/planemo/issues/needs_decision/1423/index.md)
- [#1584](https://github.com/galaxyproject/planemo/issues/1584) — SyntaxWarning:; needs reproduction; decide: ask the reporter or close? [notes](../../repositories/planemo/issues/needs_decision/1584/index.md)

## In motion (`wip`)

- [#542](https://github.com/galaxyproject/planemo/issues/542) — planemo shed_lint --fail_fast broken?; PR [#1710](https://github.com/galaxyproject/planemo/pull/1710). [notes](../../repositories/planemo/issues/wip/542/index.md)
- [#667](https://github.com/galaxyproject/planemo/issues/667) — shed_lint is missing options in lint; PR [#1729](https://github.com/galaxyproject/planemo/pull/1729). [notes](../../repositories/planemo/issues/wip/667/index.md)
- [#1476](https://github.com/galaxyproject/planemo/issues/1476) — planemo's configuration of bioblend's api key prevents running commands without authentication that don't require it; PR [#1700](https://github.com/galaxyproject/planemo/pull/1700). [notes](../../repositories/planemo/issues/wip/1476/index.md)
- [#1489](https://github.com/galaxyproject/planemo/issues/1489) — Default python version to loosely defined; PR [#1704](https://github.com/galaxyproject/planemo/pull/1704). [notes](../../repositories/planemo/issues/wip/1489/index.md)
- [#1536](https://github.com/galaxyproject/planemo/issues/1536) — `--test_data` option of `planemo t` does not work; PR [#1725](https://github.com/galaxyproject/planemo/pull/1725). [notes](../../repositories/planemo/issues/wip/1536/index.md)
- [#1625](https://github.com/galaxyproject/planemo/issues/1625) — planemo test crashes when workflow test specifies non-existent outputs; PR [#1728](https://github.com/galaxyproject/planemo/pull/1728). [notes](../../repositories/planemo/issues/wip/1625/index.md)
- [#1629](https://github.com/galaxyproject/planemo/issues/1629) — workflow_test_init fails with FileNotFoundError when workflow input labels contain forward slashes (/); PR [#1724](https://github.com/galaxyproject/planemo/pull/1724). [notes](../../repositories/planemo/issues/wip/1629/index.md)
- [#1667](https://github.com/galaxyproject/planemo/issues/1667) — Global config values bypass click.Path conversion (resolve_path is dead code); PR [#1714](https://github.com/galaxyproject/planemo/pull/1714). [notes](../../repositories/planemo/issues/wip/1667/index.md)
- [#1668](https://github.com/galaxyproject/planemo/issues/1668) — planemo run --no_wait crashes with UnboundLocalError for tools; PR [#1712](https://github.com/galaxyproject/planemo/pull/1712). [notes](../../repositories/planemo/issues/wip/1668/index.md)
- [#1680](https://github.com/galaxyproject/planemo/issues/1680) — Deduplicate planemo.io.wait_on in favor of galaxy.util.wait.wait_on; PR [#1711](https://github.com/galaxyproject/planemo/pull/1711). [notes](../../repositories/planemo/issues/wip/1680/index.md)
- [#1693](https://github.com/galaxyproject/planemo/issues/1693) — workflow_lint --iwc should error, not warn, when a workflow has no test cases; PR [#1695](https://github.com/galaxyproject/planemo/pull/1695). [notes](../../repositories/planemo/issues/wip/1693/index.md)
- [#1694](https://github.com/galaxyproject/planemo/issues/1694) — workflow_lint --iwc does not check the date on the newest CHANGELOG heading; PR [#1697](https://github.com/galaxyproject/planemo/pull/1697). [notes](../../repositories/planemo/issues/wip/1694/index.md)
- [#1705](https://github.com/galaxyproject/planemo/issues/1705) — Workflow test collection assertions are silently skipped unless spelled `element_tests`; PR [#1723](https://github.com/galaxyproject/planemo/pull/1723). [notes](../../repositories/planemo/issues/wip/1705/index.md)
- [#1175](https://github.com/galaxyproject/planemo/issues/1175) — `test --serve`; draft PR [#1708](https://github.com/galaxyproject/planemo/pull/1708), stacked on #1701, no closing keyword. [notes](../../repositories/planemo/issues/wip/1175/index.md)
- [#1686](https://github.com/galaxyproject/planemo/issues/1686) — embedded Galaxy run engine; draft PR [#1701](https://github.com/galaxyproject/planemo/pull/1701), no closing keyword. [notes](../../repositories/planemo/issues/wip/1686/index.md)

## Queued (`queued`)

- [#1139](https://github.com/galaxyproject/planemo/issues/1139) — machine-readable lint, tool side; next: tool-side JSON report first (nearly free). [notes](../../repositories/planemo/issues/queued/1139/index.md)
- [#1360](https://github.com/galaxyproject/planemo/issues/1360) — machine-readable lint, workflow side; next: after the tool-side JSON report. [notes](../../repositories/planemo/issues/queued/1360/index.md)
- [#1721](https://github.com/galaxyproject/planemo/issues/1721) — `docker_galaxy` engine broken; next: drop the stale `bgruening/galaxy-stable` fallback, un-skip its one test. [notes](../../repositories/planemo/issues/queued/1721/index.md)
- [#1722](https://github.com/galaxyproject/planemo/issues/1722) — `metadata_source`/`format_source` lint gaps; next: fix in galaxy-tool-util. [notes](../../repositories/planemo/issues/queued/1722/index.md)
- [#577](https://github.com/galaxyproject/planemo/issues/577) — planemo lint should warn about interpreter tag on version_command; build-next (XS/S); next: implement. [notes](../../repositories/planemo/issues/queued/577/index.md)
- [#1515](https://github.com/galaxyproject/planemo/issues/1515) — Back up tool_test_output.* rather than overwriting; build-next (XS/S); next: implement. [notes](../../repositories/planemo/issues/queued/1515/index.md)
- [#1413](https://github.com/galaxyproject/planemo/issues/1413) — planemo lint workflow tests improvement; build-next (XS/S); next: implement. [notes](../../repositories/planemo/issues/queued/1413/index.md)
- [#1077](https://github.com/galaxyproject/planemo/issues/1077) — Understanding output of planemo workflow_lint; build-next (XS/S); next: implement. [notes](../../repositories/planemo/issues/queued/1077/index.md)
- [#258](https://github.com/galaxyproject/planemo/issues/258) — When linting check that two params don't have the same name at the same level in the xml; build-next (XS/S); next: implement. [notes](../../repositories/planemo/issues/queued/258/index.md)
- [#1516](https://github.com/galaxyproject/planemo/issues/1516) — configure log level - decrease current output; build-next (S–M); next: implement. [notes](../../repositories/planemo/issues/queued/1516/index.md)
- [#807](https://github.com/galaxyproject/planemo/issues/807) — tool test linting; build-next (M); next: implement. [notes](../../repositories/planemo/issues/queued/807/index.md)
- [#1613](https://github.com/galaxyproject/planemo/issues/1613) — Improve version linter; build-next (M); next: implement. [notes](../../repositories/planemo/issues/queued/1613/index.md)
- [#1449](https://github.com/galaxyproject/planemo/issues/1449) — Return inputs ID in --test_output_json outputs; build-next (M); next: implement. [notes](../../repositories/planemo/issues/queued/1449/index.md)
- [#96](https://github.com/galaxyproject/planemo/issues/96) — linting: Check sample loc files exist under tool-data/; build-next (M); next: implement. [notes](../../repositories/planemo/issues/queued/96/index.md)
- [#706](https://github.com/galaxyproject/planemo/issues/706) — Lint does not notice missing tool_data_table_conf.xml.sample; build-next (M); next: implement. [notes](../../repositories/planemo/issues/queued/706/index.md)
- [#1342](https://github.com/galaxyproject/planemo/issues/1342) — Rename the default branch to `main`; build-next (admin); next: implement. [notes](../../repositories/planemo/issues/queued/1342/index.md)
- [#1672](https://github.com/galaxyproject/planemo/issues/1672) — repo-level data-manager/data-table linting; galaxy#23229 merged; next: implement. [notes](../../repositories/planemo/issues/queued/1672/index.md)

## Blocked on others (`blocked`)

None yet.

## Untriaged (`untriaged`)

- (assigned) [#135](https://github.com/galaxyproject/planemo/issues/135) — Refactor planemo.shed module
- (assigned) [#1137](https://github.com/galaxyproject/planemo/issues/1137) — new option
