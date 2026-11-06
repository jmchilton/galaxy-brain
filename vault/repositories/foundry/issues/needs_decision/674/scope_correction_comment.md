This covers the rest of Expected after [John's comment on the second-workflow line](https://github.com/galaxyproject/foundry/issues/674#issuecomment-6697972255). The gap is real: the interface tier has no rule for shape-changing params or per-element values. Two of the premises behind the prescribed fix don't match Galaxy, so it shouldn't be implemented as written.

**"No runtime subgraph selection" is false.** `when:` works on tool and subworkflow steps, and `conditional-route-between-alternative-outputs` documents one-of-N routing (enum, `map_param_value` booleans, gated alternatives, `pick_value`). The actual gap is that `nextflow-summary-to-galaxy-interface` references neither conditional note, so "keep as scalar" reaches it with no route to how. Carrying one path with `kind: dropped` entries stays available for branches that can't be carried, as the fallback.

**"NO Galaxy expression" for per-element parameters is false.** A mapped `param_value_from_file` gives per-element values:

- `lib/galaxy_test/workflow/map_over_expression.gxwf.yml` feeds one to a tool parameter, with per-element output.
- `test_run_workflow_conditional_step_map_over_expression_tool` skips one of two elements through a mapped `when`.

Both are on `release_24.2` through dev. A [live run](https://github.com/jmchilton/galaxy-brain/tree/f4e9c0bf/vault/repositories/foundry/issues/needs_decision/674/verification) confirms differing values reach their own elements: a list holding 1 and 3 ran `head -n 1` and `head -n 3` (Planemo 0.75.47, Galaxy `release_26.1`). IWC has the wiring through an intermediate mapped step in `epigenetics/consensus-peaks/consensus-peaks-atac-cutandrun`, where the values happen to be identical. Elements pair by index, not identifier, so the value collection must match the data collection in structure and order.

**Known bugs belong in tracked fixes, not in a prohibition:** #653, #661, #667, galaxyproject/galaxy#22817. One point is still open: #661 reports a 500 connecting into a tool conditional's test parameter, while #667 reports that kind of edge running green on usegalaxy.org. Per-element strandedness into salmon's `--libType` depends on it.

**Revised scope:**

1. `nextflow-params-to-galaxy-inputs`: keep the step-set vs step-argument test. Link the conditional notes for routing. Default to one workflow that carries as much of the source's scope as conditionals allow, especially when the source already dispatches on tool. A cut is the exception and gets a `kind: dropped` entry with its reason.
2. `nextflow-to-galaxy-channel-shape-mapping`: add meta-driven parameterization built on mapped `param_value_from_file`, with its evidence tier and open bugs. Run-once-and-re-run becomes a fallback.
3. Correct the "`when` is step-level" framing in `iwc-map-over-lifecycle-survey` and `cleanup-sync-and-publish-nonempty-results`, and check `galaxy-conditionals-patterns`: a mapped `when` can skip individual elements. Keep the filter/classifier advice for routing data, because skipped elements stay in the output collection as nulls (#661). Update `nextflow-workflow-io-semantics`.
4. Reference the conditional note from `nextflow-summary-to-galaxy-interface`, then recast.

The fan-in recipe stays with #661.

***Posted by agent [wf_foundry](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/wf_foundry/AGENTS.md) using model claude-opus-5-5 on John's behalf.***
