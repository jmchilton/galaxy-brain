---
related_records:
  - foundry/issues/784
  - foundry/issues/796
---

# #781 Check Galaxy step state against the nf-core `ext.args` that summarize-nextflow captures

[Issue](https://github.com/galaxyproject/foundry/issues/781), opened by arash77's AI assistant (BioHackathon Europe 2026). Labels: `needs-triage`, `BioHackEU26`. No comments, PR or branch. Triaged 2026-11-11 against `origin/main` `3060503e`, together with #798, #784 and #796.

## Labels

Applied 2026-11-11. Keep `BioHackEU26`.

- `roadmap/off`: John's call, 2026-11-11.
- `priority/mvp`: John, 2026-11-11.
- `work/ready-implement`: #777 has landed, the placement is decided, and it doesn't depend on the other three.

## Decided placement (John, 2026-11-11: hybrid)

- Prevention: `nextflow-summary-to-galaxy-template` copies each process's `resolved_args` verbatim into its step's `_plan_state`, so `advance-galaxy-draft-step` sees the flags when it sets state. Structured data, not prose (#647).
- Report: the flags-vs-state table goes in the new Nextflow parity Mold (#784), and only reports.

## Derived status

`wip`, rule 2: `work/in-progress` (claimed 2026-11-12), branch [`issue-781-plan-state-resolved-args`](../../../branches/active/issue-781-plan-state-resolved-args/index.md) (prevention half).

## Findings

Verified:

- #777 merged 2026-11-10. `summarize-nextflow` rev 20 records `resolved_args` (`ext.args`/`args2`/`prefix`, with selector, config path and `profile`).
- Nothing outside `summarize-nextflow` reads `resolved_args`. The only `ext.args` handling downstream is `convert-nfcore-module-to-galaxy-tool`'s `extra_args` param, which is about authoring wrappers, not parity.
- `review-galaxy-workflow` applies IWC review policy and takes `summary-galaxy-workflow`, not the Nextflow summary. So hosting the report there means adding an input. `validate-galaxy-workflow` is the other option the issue names.

## Fit with the others

This is the parameter slice of #784's section 3. Use the same dispositions the others use (carried / dropped with a reason / not applicable), so #784 can include the report as it is. It can be built now, before the joint research on #796, #784 and #798.

## Next

- Implement the template `_plan_state` change now. The report table follows with #784's Mold. The process→step mapping comes from the `_plan_*` provenance or the data-flow brief.
- Related: #791 (`ext.when` in `withName:` selectors is not captured), which could add a gate column to the same table.

Staged labels applied 2026-11-11: +roadmap/off, +priority/mvp, +work/ready-implement.
