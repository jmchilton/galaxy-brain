# Conditional-step knowledge covers only `$(inputs.when)`: no negated or compound gates, and no rule for gate-only step inputs

- Target: galaxyproject/foundry (`content/patterns/galaxy-conditionals-patterns.md` and `content/research/galaxy-workflow-draft-format/index.md`). Galaxy already supports what the run needed, so nothing goes upstream for the knowledge gap. The gxwf side (gate inputs make `--connections` skip) is finding [22](22-gxwf-connections-gate-input-cascade.md). Foundry tracking needed: yes (this is the Foundry issue).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-atacseq-v0-2026-10-29, phase 2 (data-flow) and phase 4 (template, Mold rev 8), 2026-10-29. Ledger: `conditionals-patterns-silent-on-inverted-and-compound-when` (major), `draft-format-silent-on-gate-only-step-inputs` (minor).
- Existing issues/PRs: none for negation or gate-only inputs. Related: [#653](https://github.com/galaxyproject/foundry/issues/653) (gxwf tool-state rejected gate-expression connection keys by name; with gxwf 1.15.0 this run's 149 tool states, 58 with named gate keys, pass `--strict-state`, so that half looks fixed), [#661](https://github.com/galaxyproject/foundry/issues/661) (no fan-in recipe after `when`-gated branches; same pattern page), finding [11](11-galaxy-when-skip-model-operation.md) (gated model operations fail on Galaxy).
- chipseq: v0 (/home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30): phase 2 (ledger `conditionals-patterns-silent-on-compound-gates-and-skip-propagation`) needed 5 compound gates (`skip_qc || skip_fastqc`, nested peak annotation/QC) and the no-propagation rule (Galaxy `workflow/modules.py:2196-2203` on release_26.1). Phase 10 attempt 4 hit the rule: under `skip_consensus_peaks` the ungated IGV session step listed the skipped (null) consensus BED; repair R2 added `__FILTER_NULL__`. The test plan had warned, but no static check flags a gated output feeding an ungated consumer (a possible gxwf lint; not filed). Same proposal plus that rule, cf. #661.

## Symptom
nf-core/atacseq exposes 14 `skip_*` toggles (inverted sense) and nested gates (`skip_peak_annotation && skip_peak_qc`). The pattern page documents one form only, so data-flow had to read Galaxy source to learn whether `$(!inputs.when)` or multi-input expressions work, or whether it needed one `map_param_value` inversion step per toggle (~13 extra steps). The template then verified the expressions with planemo probe workflows (`.scratch/whentest`, `whentest2`). It found that `$(inputs.a && !inputs.b)`, `$(!inputs.when)`, `$(inputs.g == null)` for an absent optional int, `$(inputs.m != null)` and `$(inputs.aligner == 'bwa')` all run or skip as expected on release_26.1. The template added a `_plan_in` sentence to each of the 58 steps with gate-only inputs, its own convention, so per-step agents would not treat the keys as unresolved wrapper ports.

## Root cause
Confirmed. Both notes stop at the IWC idiom:
- `galaxy-conditionals-patterns.md:41`: "receive a boolean through an input named `when` and declare `when: $(inputs.when)`". Nothing on negation, compound or null tests, or extra named inputs. IWC itself uses only `$(inputs.when)`, with negation done by `map_param_value` (driver P3 notes). So corpus precedent can't answer this.
- Galaxy passes every step input that isn't a tool input to the expression. `lib/galaxy/workflow/modules.py` (`ToolModule.execute`, dev `:3269-3290`) builds `extra_step_state` from `step.inputs` missing from `execution_state.inputs`, including map-over iteration elements, and `evaluate_value_from_expressions` (`:461-490`) evaluates the whole expression. On release_26.1 it runs in a QuickJS sandbox (`lib/galaxy/tools/expressions/js_engine.py`).
- `galaxy-workflow-draft-format/index.md:32,38-42` defines topology (including "`when:` guards") and the wrapper-port TODO tiers. It never says that an `in:` key feeding only the gate is a topology-tier, non-TODO key that the per-step loop must keep.

## Evidence
- Run ledger `when-expression-negation` (resolved by the template, probe results quoted above). Decision `when-expression-gates-adopted` records the residual risk: no IWC precedent.
- Final workflow: 149 steps, 64 with step inputs that aren't tool inputs (58 in the template draft, per the ledger); planemo attempt 3 green (340 jobs ok, 15 skipped, including gffread, 8 narrow MACS2 and 6 preseq jobs skipped by these gates).

## Proposed fix
1. Pattern page: add a "Negated and compound gates" section. Any step input not consumed by the tool is visible as `inputs.<name>`; `!`, `&&`, `||`, `== null` work on release_26.1 (cite `modules.py` and the probe). Keep `map_param_value` inversion as the IWC-precedent alternative and say when to prefer it (a target Galaxy older than the verified release, or IWC submission). Note that gates belong on tool steps only (finding 11).
2. Draft-format note: name gate-only inputs as a topology-tier construct. Their keys are real labels, never `TODO_`. The per-step loop preserves them, and draft-next-step/draft-validate should not report them as ports.
3. Add a pattern verification fixture for one compound gate, so the claim is tested and not just cited.

## Draft issue
**Title:** galaxy-conditionals-patterns covers only `$(inputs.when)`; document negated/compound gates and gate-only step inputs

An nf-core/atacseq Workflow Brief → Galaxy run (2026-10-29) had 14 inverted `skip_*` toggles and nested gates. The pattern page shows only `when: $(inputs.when)` on a boolean, so the data-flow phase read Galaxy source to learn whether `$(!inputs.when)` and expressions over several named step inputs work, or whether each toggle needs a `map_param_value` inversion (+~13 steps). The template phase verified them with planemo on release_26.1: `$(inputs.a && !inputs.b)`, `$(!inputs.when)`, `$(inputs.g == null)`, `$(inputs.m != null)` and `$(inputs.aligner == 'bwa')` all behaved as expected. The final 149-step workflow, with 58 gated steps, passed planemo.

Galaxy exposes every step input that isn't a tool input to the expression (`ToolModule.execute` builds `extra_step_state`; `evaluate_value_from_expressions`). `galaxy-workflow-draft-format` doesn't say such gate-only `in:` keys are topology, not wrapper ports, so the template had to invent a `_plan_in` convention so the per-step loop wouldn't drop them.

Proposal: a "Negated and compound gates" section on the pattern page (with the IWC `map_param_value` alternative and when to prefer it), a gate-only-input rule in the draft-format note, and a verification fixture. Related: #653, #661.
