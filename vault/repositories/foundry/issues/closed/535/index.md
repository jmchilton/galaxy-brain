# foundry#535 — Prove the IWC review pipeline on a real PR and accept its policy pin

[Issue](https://github.com/galaxyproject/foundry/issues/535)

Closed 2026-11-06 at John's request, with the pin as the deliverable. Real use will show whether the pipeline works, and problems get their own specific issues.

Labels at seeding (2026-10-06): `enhancement`, `priority/mvp`, `agent/implement`, `roadmap/main`. `work/in-progress` left on at close, matching other closed issues, which keep their `work/*` label.

Branch [`issue-535-accept-iwc-policy-pin`](../../../branches/merged/issue-535-accept-iwc-policy-pin/index.md), [#752](https://github.com/galaxyproject/foundry/pull/752), merged 2026-11-06 as `7453431d`, covers items 1, 2 and 5. [Status comment](https://github.com/galaxyproject/foundry/issues/535#issuecomment-6670113645).

## Findings, 2026-11-05

The issue body is stale in these ways:

- iwc#1366 merged 2026-09-26, merge commit `fa25be50`. The blocker is gone.
- The review command's blob (`8112aa5`) is the same at the old pin, the merge commit, IWC `main` and Foundry's vendored copy. Re-pinning is provenance only.
- The Copilot instructions changed by one mirror note.
- Both IWC entries are URL-sourced, so `check:vendored` needs no local checkout, and `make check` already includes it. It only shows vendored bytes match the pin.
- Five fixtures are thin, not three: `failed-validation/` and `hardcoded-sample-value/` as well.

## Not done at close

Left undone on purpose, untracked, for whoever picks up a specific follow-up:

- Item 4: the two harness gates. Both stop before phase 3, so neither needs a Planemo test run.
- Item 3: real end-to-end run. Check test data and tool cost before choosing a PR; iwc#1497 is +7/−2 but runs a metagenomic assembly workflow. Follow `agents/wf_foundry/TEST_PIPELINE.md` and `RUN_QUEUE.md`.
- Item 6: fixture parity.
- `review-galaxy-workflow` and `galaxy-workflow-review` stay `status: draft`.
- The semver and unlabelled-output differences stay recorded only, not raised with IWC.
- `examples/clean-passing/` and `examples/with-foundry-context/` `galaxy-workflow-pr-context.json:58` say base Copilot requirements are the ones the checklist carries, now slightly off.
