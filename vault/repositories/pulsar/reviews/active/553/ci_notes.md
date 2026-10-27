# CI at reviewed head

Reviewed `8594de636006348eb72dc597753791f3531a3835` on 2026-10-26.

Pulsar lint, formatting, typing, unit tests, install-wheel tests, test-ci matrix, and resilience checks pass. Galaxy `dev` framework jobs (directory and extended) pass.

The [Galaxy master/directory framework job](https://github.com/galaxyproject/pulsar/actions/runs/40369419138/job/121735812809) fails before running tests: collection imports Galaxy's Pulsar runner, which requests `build_client_manager` from `pulsar.client`. That symbol is absent on the PR base as well. This is an existing Galaxy-master/Pulsar API mismatch rather than a staging regression in this PR.

No GitHub comments or reviews existed when checked.

Vault validation: `make validate` passed (127 files, 0 errors, 15 advisory warnings). PR head was rechecked and remained unchanged.
