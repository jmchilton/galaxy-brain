# Edit one step's parameters from a completed invocation and rerun, reusing unchanged upstream jobs

A user looking at a finished invocation should be able to click a tool step, change its parameters, and rerun — with upstream steps reused from the job cache and only the edited step and its downstream recomputed.

Today the only path is "Rerun" on the whole invocation, which opens the full run form (and loses run-time step settings, see `workflow_rerun_drops_step_parameters.md`). The user has to find the step among dozens, remember to turn on job caching, and hope.

What it should look like:

1. Open `/workflows/invocations/I`, click step 5 in the graph. The step card header has **Edit parameters and rerun**. Absent or disabled with a reason for input steps, subworkflow steps and non-terminal invocations.
2. A focused form for that one step, prefilled with the values that actually ran. Connected inputs are read-only ("Connected to `out_file1` from step 3"). Values set at run time are marked; edited values are marked "changed from previous run"; a reset control restores them.
3. A **What will run** panel lists the edited step and everything downstream of it, and says the rest is *expected* to reuse earlier jobs.
4. Submit creates a new invocation J with job reuse forced on. A banner on J reads "Rerun of invocation I with step 5 edited". Steps 1–4 complete immediately as reused jobs; a sibling branch not downstream of step 5 is reused too.
5. To edit more steps, chain: edit step 7 from J; the result reuses jobs from both I and J.

This is the "parameter sweep one node at a time" loop that analysts doing downstream analysis (DE, clustering, plotting) live in. Galaxy already has every piece — invocation graph, step card, run form, job cache — they just aren't connected.

## Context

Builds on 🔀 #22144 (read-only Step Config tab in the invocation graph) and the rerun page. Needs `workflow_rerun_drops_step_parameters.md` fixed first. Provenance link between I and J proposed in `invocation_rerun_lineage.md`.

The wording matters: Galaxy's job cache can't promise "only this subgraph recomputes". Reuse fails on changed tool versions, deleted outputs, renamed inputs, skipped conditional steps and non-deterministic tools. The UI should say "reuses equivalent completed jobs".

## Proposed Approach

Every edit-and-rerun is a new, complete, immutable invocation; the workflow stays the template and the edit is a run-time override. Reuse the `/workflows/rerun?invocation_id=` route with a `step=` query, mount a single `WorkflowRunDefaultStep` overlaid with the exported request's step parameters, compute the downstream closure client-side from `input_connections`, and submit with `use_cached_job: true`.

<details><summary>Scope for a first version</summary>

- Top-level tool steps only; one edited step per rerun.
- Gate on workflow shape using the same predicates that force the legacy full form today (replacement parameters inside tool steps, disconnected required runtime inputs, resource parameters). Gated workflows link to the whole-workflow rerun with a message that step settings aren't carried over.
- Selects whose options come from a connected input need the upstream output from the source invocation fed into option refresh; until that resolver exists, gate those steps with a reason.
- Target history: original by default, optional new history.

Out: subworkflow steps, multi-step edit sessions, editing before the first run (fusing the graph into the run form), saving the edit back to the workflow.

</details>

## Alternative Approaches

Rejected: mutable invocations / resume-from-node (patching a run in place breaks provenance and is far more work); fusing the run graph into the full run form so any node can be edited before a run (much bigger, and doesn't help the "I already ran it" case); a server-side per-step eligibility endpoint (same answer as the client-side predicates).
