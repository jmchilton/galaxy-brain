# foundry#535 — Prove the IWC review pipeline on a real PR and accept its policy pin

[Issue](https://github.com/galaxyproject/foundry/issues/535)

Labels at seeding (2026-10-06): `enhancement`, `priority/mvp`, `agent/implement`, `roadmap/main`. Now `work/in-progress`.

Branch [`issue-535-accept-iwc-policy-pin`](../../../branches/active/issue-535-accept-iwc-policy-pin/index.md) covers items 1, 2 and 5 and must not close the issue. [Status comment](https://github.com/galaxyproject/foundry/issues/535#issuecomment-6670113645).

## Findings, 2026-11-05

The issue body is stale in these ways:

- iwc#1366 merged 2026-09-26, merge commit `fa25be50`. The blocker is gone.
- The review command's blob (`8112aa5`) is the same at the old pin, the merge commit, IWC `main` and Foundry's vendored copy. Re-pinning is provenance only.
- The Copilot instructions changed by one mirror note.
- Both IWC entries are URL-sourced, so `check:vendored` needs no local checkout, and `make check` already includes it. It only shows vendored bytes match the pin.
- Five fixtures are thin, not three: `failed-validation/` and `hardcoded-sample-value/` as well.

## Remaining

- Item 4: walk the two harness gates. Both stop before phase 3, so neither needs a Planemo test run.
- Item 3: real end-to-end run. Check test data and tool cost before choosing a PR; iwc#1497 is +7/−2 but runs a metagenomic assembly workflow. Follow `agents/wf_foundry/TEST_PIPELINE.md` and `RUN_QUEUE.md`.
- Item 6: fixture parity, best after the real run.
- Then `status: draft` can come off the Mold and Pipeline.
