# Loops and branches: controller-owned or bundled? — 2026-10-15

Question (John): do we need loop and branch constructs in the Pi controller, or can they be bundled into one step?

## What the pipelines actually contain

- **Loops.**
  - Five Galaxy pipelines have one loop phase: `advance-galaxy-draft-step`.
    - It is an orchestrator Mold. One call concretizes one drafty step: pick, resolve wrapper, summarize, implement, `draft-validate`.
    - It owns a deterministic oracle, `gxwf draft-next-step`, which reports `draft: false` when the loop is done. On that last call it also writes `galaxy-workflow.gxwf.yml`. So the harness side is `while draft: invoke skill` (`content/meta/harness-pipelines.md`, "Orchestrator-as-contract").
  - The two CWL pipelines loop over three Molds: `summarize-cwl-tool` → `implement-cwl-tool-step` → `validate-cwl`, looping back on red. That's a multi-phase loop with a back edge. `harness-pipelines.md` already says a parallel CWL orchestrator is a tracked follow-up.
- **Branch.** Every `→ GALAXY`/`→ CWL` pipeline except the reviews has one: `test-data-resolution`. The chain is a source-specific Mold → `find-test-data` → `user-supplied`.
  - It isn't really a choice. Both Molds write the same artifact (`test-data-refs`), and the second is meant to fill only the inputs the first left unresolved (`nextflow-to-test-data` description).
  - Contract gap: `find-test-data` does not declare `test-data-refs` as an input, and `test-data-refs` has no schema. So "fill only the gaps" is prose, and "is anything still unresolved?" can't be checked by machine today.
  - `user-supplied` is a human gate. In an unattended evaluation it can only end as "blocked: needs data".
- **Precedent for bundling.** The discover-or-author `[branch]` used to be harness routing. It now lives inside `advance-galaxy-draft-step`, and the Mold owns it.
- **Prose harness today.** Under `--use-subagents` it already splits the two the same way: one subagent per loop iteration, and the whole branch chain in one subagent (`pipeline-*` SKILL.md, Run options).

## Cost evidence (#547)

- One paper→galaxy run: 20 loop iterations, one subagent each.
  - 121 min wall clock; only 6.5% of it was tool execution.
  - About 65 turns per step; 125M cache-read tokens.
- Iterations that reused an already-resolved wrapper took about half as long. That reuse already flows through the draft file (sibling pins), not through conversation memory.

## Options

| | A. Controller-owned loop and branch (B6 as planned) | B. Bundle each into one worker | C. Bundle into orchestrator Molds (content change) |
|---|---|---|---|
| What changes | `test-pipeline` runs `draft-next-step` itself between iterations and walks the chain on a predicate. | One Pi worker is told to repeat the skill until done, or to run the whole chain. | New Molds own the control flow, e.g. `resolve-test-data`; for CWL, an orchestrator like the Galaxy one. The pipeline becomes linear. |
| Loop fit | Good. The oracle is already deterministic and cheap; the cap comes from the template's drafty-step count plus the ledger's repair budget. | Poor. One session accumulates about 65 turns × N steps of context (1,300 turns at N=20), which risks compaction or overflow. One timeout covers everything; one failure loses every step. | The Galaxy loop body is already this. Folding the loop itself into a Mold gives option B's context problem. |
| Branch fit | Not yet possible: no `test-data-refs` schema, so there's no machine predicate, and the gap-filling input isn't declared. | Works today; it's what `--use-subagents` does. The worker's word decides when to fall through. | Best fit. It matches the discover-or-author precedent and fixes the contract gap where it lives. It changes 5 pipelines and every harness at once. |
| #476 criteria | Meets "distinct worker per loop iteration" and "controller-owned predicates". | Breaks both. | Meets them by making the branch not a harness branch. |
| Observability | One dashboard row per iteration, with per-iteration artifacts, hashes and usage. B4 can cross-check counts. | One row; iterations visible only in the trace. | Same as B for whatever is folded in. |
| Extra controller work | Optional per-iteration outputs (`galaxy-workflow` appears only on the last call). A run-scoped writable tool cache that persists across iterations, beyond declared artifacts; container mode loses it today. Record `iterations`/`selected`. Cost caps (#547). | Almost none. | None in the controller; the Mold authoring is content work. |
| Prose-harness parity | Same split as `--use-subagents` for the loop. | Matches neither the loop nor the default mode. | Every harness gets it. |

## Recommendation

- **Loop: controller-owned (A).**
  - It's the cheap case: a deterministic oracle already exists and the body is one Mold.
  - Bundling it is the expensive case: context grows linearly and failure takes everything.
  - Prerequisites: cost caps, optional outputs on intermediate iterations, and a run-scoped tool cache.
  - CWL multi-Mold loops: skip until a CWL orchestrator Mold exists, rather than building loop-group semantics.
- **Branch: bundle (C, falling back to B).**
  - Fix the contract first: give `test-data-refs` a schema with a per-input `resolved` flag, and have `find-test-data` read the earlier refs.
  - Then either fold the chain into an orchestrator Mold (C), or run the chain in one worker (B) with a deterministic post-check that every input is resolved.
  - `user-supplied` becomes a `blocked` phase status, not a fallback the controller pretends to take.
- **Side option:** start a run at phase N from a frozen earlier run's promoted artifacts (`--from`). This tests phases 9–13 without either construct, and keeps each phase's evaluation independent of upstream noise.

## Decisions (John, 2026-10-15)

1. Bundle the branch in the harness (option B), not as an orchestrator Mold. It's easier and more flexible, and it can still be promoted to a Mold later.
2. We fix the contract ourselves.
   - Done on `origin/feat/test-data-refs-schema` (`4a8f0837`): the `test-data-refs` schema plus `foundry validate-test-data-refs`.
   - All four producers declare it.
   - `find-test-data` takes the earlier refs as an optional input and keeps their resolved entries.
   - `paper-to-test-data` now reads the interface brief and leaves expected outputs to the test plan.
   - Opened as [#684](https://github.com/galaxyproject/foundry/pull/684) on 2026-10-16.
   - Follow-up: the assembler's generic branch text ("stop at the first that yields acceptable output") doesn't describe filling gaps.

## Open questions

1. Is `--from` (seed from a frozen run) wanted as an evaluation feature?
