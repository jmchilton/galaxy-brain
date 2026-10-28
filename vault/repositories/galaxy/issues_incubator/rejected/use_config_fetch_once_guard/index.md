# `useConfig(true)` never loads config

The fetch-once guard tests the computed ref instead of `.value`. **Recommendation:** rejected; fixed PR-first by the merged [`use_config_drop_fetch_once`](../../../branches/merged/use_config_drop_fetch_once/index.md) branch.
