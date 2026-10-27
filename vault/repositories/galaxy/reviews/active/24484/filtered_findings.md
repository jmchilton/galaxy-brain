# Filtered findings: #24484 (reviewed `baeca0d7dc6`)

- **default P1 1, "bump the pulsar-galaxy-lib pin" part**: re-argues the dependency the PR description already acknowledges (pulsar#553 is open; PyPI's latest is 0.16.0). The separate problem, passing `url` unconditionally, is kept as verified P2 1, and the floors bump is folded into it.
- **default P3 3, unused `path` dimension in `StagingUrlSigner`**: re-argues a choice the description calls out. It says the HMAC covers job, kind, object, path and expiry, and that extra files of composite inputs follow in a PR stacked on this one.
- **gx_test_challenger P3 1, drop `test_redirect_mode_asks_for_a_presigned_url_that_lasts_minutes`**: disproved on checking. It's the only check that redirect presigns stay short-lived, because the integration test patches the lifetime to 1s. The other three drops were kept as P3 4.
- **gx_test_challenger P2 2 detail, keep the negative `_metadata_file_with_path` test**: no longer applies, because P2 2's fix removes `_metadata_file_with_path`.
