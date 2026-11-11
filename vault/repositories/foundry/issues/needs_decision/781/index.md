---
related_records:
  - foundry/issues/784
  - foundry/issues/796
---

# #781 Check Galaxy step state against the nf-core `ext.args` that summarize-nextflow captures

[Issue](https://github.com/galaxyproject/foundry/issues/781), opened by arash77's AI assistant (BioHackathon Europe 2026). Labels: `needs-triage`, `BioHackEU26`. No comments, PR or branch. Triaged 2026-11-11 against `origin/main` `3060503e`, together with #798, #784 and #796.

## Proposed labels

Staged in [issue_tags.md](issue_tags.md). Keep `BioHackEU26`.

- `roadmap/off`: John's call, 2026-11-11.
- `priority/v2`: the reference run found no flag mismatch. #647's unstranded featureCounts is a near miss, not an observed failure. Raise to mvp if you count silent flag loss as a correctness issue.
- `work/ready-implement`: #777 has landed, the report's shape is specified, and it doesn't depend on the other three.

## Derived status

`needs_decision` (`needs_decision_labels`), rule 3.

## Findings

Verified:

- #777 merged 2026-11-10. `summarize-nextflow` rev 20 records `resolved_args` (`ext.args`/`args2`/`prefix`, with selector, config path and `profile`).
- Nothing outside `summarize-nextflow` reads `resolved_args`. The only `ext.args` handling downstream is `convert-nfcore-module-to-galaxy-tool`'s `extra_args` param, which is about authoring wrappers, not parity.
- `review-galaxy-workflow` applies IWC review policy and takes `summary-galaxy-workflow`, not the Nextflow summary. So hosting the report there means adding an input. `validate-galaxy-workflow` is the other option the issue names.

## Fit with the others

This is the parameter slice of #784's section 3. Use the same dispositions the others use (carried / dropped with a reason / not applicable), so #784 can include the report as it is. It can be built now, before the joint research on #796, #784 and #798.

## Next

- Once labels are applied: implement. First decide where the check lives. John leans strongly against a new step (2026-11-11), so the options are `validate-galaxy-workflow`, the template's `_plan_*` plus advance, or `run-workflow-test`. The process→step mapping comes from the `_plan_*` provenance or the data-flow brief.
- Related: #791 (`ext.when` in `withName:` selectors is not captured), which could add a gate column to the same table.
