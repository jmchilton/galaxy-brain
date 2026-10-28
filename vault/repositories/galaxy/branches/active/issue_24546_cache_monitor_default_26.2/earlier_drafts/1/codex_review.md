Run via gpt-6-sol at medium effort.

# Codex review

Acted on 1 of 2 findings. Fixed the confirmed P1 in `1d929033983` (see below). Refuted the P2.

Not acted on:
- **P2, serialized user stores lose the `external` pin.** Refuted. The only caller that rebuilds a store from a serialized dict with `config=None` is `lib/galaxy/metadata/set_metadata.py:194`, and it passes `disable_process_management=True`, so `enable_cache_monitor()` returns False first. No caller reaches the scenario.

<details><summary>Details</summary>

Scope: `git diff origin/release_26.2...HEAD` at `e2df6c93a28`. Codex reviewed every changed file plus s3/boto3/azure/cloud/onedata, celery, config schema, set_metadata and the tests. It couldn't run the tests (its Python 3.9 can't import Galaxy).

1. **P1, certain: XML cache defaults override the global monitor driver.** CONFIRMED.
   - `parse_caching_config_dict_from_xml` sets `monitor: "auto"` whenever `<cache>` omits it. `enable_cache_monitor` read that per-store `auto` ahead of `object_store_cache_monitor_driver`, then resolved it from Celery state.
   - Effect: with the gate now on by default, a global `external` plus an XML S3 store with a sized cache started a thread. A global `celery` with Celery off also started a thread instead of warning.
   - Fix: a per-store `auto` now defers to the global driver.
   - Red test: `test_xml_cache_without_monitor_defers_to_global_driver`.
2. **P2, certain: serialized user stores lose the monitor suppression.** REFUTED, see above. `config_to_dict` doesn't carry the driver for any store, but no rebuild path runs without `disable_process_management`.
</details>
