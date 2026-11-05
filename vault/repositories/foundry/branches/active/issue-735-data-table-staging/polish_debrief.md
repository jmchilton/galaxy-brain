# Polish debrief

Run via claude-opus-5-5 at default effort. One strengthening round.

Applied:

- Corrected overclaims: "that test runs" (funcscan never ran), "no longer asks" (the Mold never asked), "What Planemo discovers" (Galaxy expands `${__HERE__}`), "needs no dependencies" (needs Python, also accepts a history dataset), "three contract gaps" (two).
- Answered misreadings in prominent text: Planemo-managed only, the probe isn't funcscan, Mold text isn't enforced by tooling.
- Opener changed from `Fix` to `Implement`: the issue's Expected list is delivered, but no rerun has shown it fixing the reported case.
- Saved both probe layouts and a results excerpt to `probe/`. Full `out.json` files left out because they carry job user details.
- Added a Verification Gap: a data-table-only wrapper with a filter hasn't been run.

Left over:

- Run a one-step `iuc/amrfinderplus` workflow with `--biocontainers` and no `--job_config_file`. It would remove the container and data-table-only hedges, but Docker is down. On arm64, emulated amd64 images may need a custom job config.
- Run the `find-test-data` cast on the funcscan scenario and apply the eval.

Questions for John:

- Should the deterministic staged-table property become a real `foundry validate-*`, and should `test-data-refs` get the ledger's `data_table` block?
- funcscan's arm64 job config hardcodes an absolute `test-data` mount. Is a harness-level fix a separate issue?
