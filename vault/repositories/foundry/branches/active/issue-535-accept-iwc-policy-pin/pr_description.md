Toward 🎯 #535 - the IWC review prompts still cite a proposal that upstream has since accepted.

galaxyproject/iwc#1366 merged on 2026-09-26, but Foundry still describes its policy as unaccepted:

| | Before | After |
| --- | --- | --- |
| Review command source | `jmchilton/iwc@d7012eb` | `galaxyproject/iwc@fa25be5`, the #1366 merge commit |
| Review command status | "proposed, not accepted" | accepted |
| Copilot instructions source | `galaxyproject/iwc@b80bc92` | `galaxyproject/iwc@fa25be5` |
| Claude-versus-Copilot comparison | "not yet performed" | recorded, with two differences |

**This changes no review behavior.** The review command's bytes are identical at both pins, and `make casts` produces no diff. The only prompt text change is the one line #1366 added to the Copilot instructions. No Mold casts that vendored copy, and the review command reads the pull request base's copy at review time, so moving this pin doesn't reach a review.

**This doesn't prove the pipeline.** It covers items 1, 2 and 5 of #535. No phase has run on a real pull request, and `review-galaxy-workflow` and `galaxy-workflow-review` stay `status: draft`. #535 stays open for the real run, the two harness gates and fixture parity.

From reading both files, the command's checklist includes the Copilot requirements with two differences, now recorded in `workflow-pr-review-command`:

| | Copilot instructions | Review command |
| --- | --- | --- |
| Semantic versioning | "Follow semantic versioning" | Sends an apparently breaking change to human versioning review |
| Unlabelled outputs | "ALL `workflow_outputs` sections must have human-readable labels" | Checklist only judges labels that exist |

The command also says to apply the union of both requirement sets, which covers an unlabelled output in principle, but `review-galaxy-workflow` works the checklist in order, so a run can still miss one. I recorded both rather than changing anything, because the checklist is upstream's and this issue leaves it out of scope.

<details><summary>Verification</summary>

- Moving the Copilot pin alone makes `check:vendored` report drift on that entry, and re-vendoring clears it.
- Vendored copies match both IWC `main` and `fa25be5`, which is why the pin doesn't need to be newer: review command blob `8112aa5` (also at `d7012eb`), Copilot blob `e5c243c`.
- `make check` steps pass except `check-vendored`, which reports drift on 8 entries resolved through local upstream checkouts. The same 8 appear on the untouched base, and neither IWC entry is among them.
- `make test` passed 496 of 496 on the first commit. The second commit edits only two notes, and reruns on it failed only with 60-second timeouts, on a different set of tests each time, while the machine was under heavy load. CI is the clean run for that commit.

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door).

## Context

Builds on 🔀 #509, which added the pipeline and the refresh procedure this follows. Items 3 and 4 of #535, the real end-to-end run and the harness gates, are what can move the Mold and Pipeline off `status: draft`.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>No findings at <code>a449e174</code>.</summary>

Read the issue, both prompts and framing notes, the review Mold and Pipeline, and the vendoring code, and compared both vendored prompts byte-for-byte with the pinned commit. It ran before the second commit.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-535-accept-iwc-policy-pin/codex_review/). Run via gpt-6-sol at medium effort.

</details>
