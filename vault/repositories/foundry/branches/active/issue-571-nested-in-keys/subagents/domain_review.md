# Foundry domain review: `issue-571-nested-in-keys`

Profile: `wf_foundry/reviewers/foundry_domain_review.md`. Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not exposed to this agent. Reviewed commit: `fd8662cc`, base `origin/main` `7453431d`.

Regenerated output matches its sources. The note in the cast is byte-identical to `content/research/gxformat2-schema/index.md`, the companion is the same blob in all three casts, and `Dashboard.md` shows rev 13 and rev 5. The nested `in:` key paragraph is correct.

Experiments ran from scratch files outside the worktree, on `gxwf` 1.15.0, gxformat2 0.28.0 (Galaxy's pin) and 0.29.1, and a shallow IWC clone at `980fc00`. No live Galaxy import was run.

## Findings

### P1 1: The map-form sentence teaches a reference the import converter rejects

§1 and the plan's own stop condition. `content/research/gxformat2-schema/index.md:56` says that in map form the step part "is the map key, even when the step also carries `id` and `label`." That holds for `validate_draft` and `gxwf draft-validate`. It does not hold for gxformat2's `python_to_workflow`, which Galaxy import (`lib/galaxy/managers/workflows.py:857`) and Planemo (`planemo/galaxy/workflows.py:640`) call. The two resolvers give opposite answers when a map-form step has a label that differs from its key.

| Step form | Reference | `validate_draft` / `draft-validate` | `python_to_workflow` (0.28.0 and 0.29.1) |
|---|---|---|---|
| List, `id` and `label` | by label | valid | converts |
| List, `id` only | by id | valid | converts |
| Map, key only | by key | valid | converts |
| Map, key and `id` | by key | valid | converts |
| Map, key and `label` | by key | **valid** | **`ValueError: invalid literal for int() with base 10: 'k1'`** |
| Map, key, `id` and `label` | by key | **valid** | **same `ValueError`** |
| Map, key and `label` | by label | **`references unknown step`** | **converts** |

The gate doesn't catch it. A two-step map-form draft with key references using `map_param_value` 0.2.0 reports `draft valid` and `Concrete: OK` under `--concrete --connections`. `gxwf draft-extract` keeps the key, `id` and `label`, and the extracted file then fails `python_to_workflow` with the same error. So the sentence steers an agent to a draft that passes every Foundry check and then fails on conversion, which is the step import depends on.

`implementation_debrief.md` concludes "this isn't an upstream disagreement." That compared `gxwf` with `validate_draft`, which are two copies of one rule, as the plan's check instructed. The plan's rule still applies: "If the two disagree, that's an upstream bug: drop the sentence and write issue text."

The form isn't exotic. The example in `content/research/galaxy-workflow-draft-format/index.md:84-88` uses key `fastp`, `label: trim and QC paired reads` and `outputSource: fastp/TODO_trimmed_paired`, the same key-plus-differing-label shape that fails in the table above once extracted.

Suggested fix: remove the map-form clause from this branch and keep the list-form sentence, which both resolvers agree on. File the issue text below through `workflow_libs`. If interim text is wanted, condition it per §1 without presenting it as guidance, for example "a map-form step whose label differs from its key has no reference that both `validate_draft` and the converter accept." Reproduce once against a live Galaxy before filing, since this review only called the converter function.

Draft issue text for `galaxyproject/gxformat2`:

> **`validate_draft` and `python_to_workflow` disagree on connection references for map-form steps with a label.** With steps `{k1: {label: L1, ...}, k2: {label: L2, in: {x: k1/o1}, ...}}`, `validate_draft` reports no topology errors and `python_to_workflow` raises `ValueError: invalid literal for int() with base 10: 'k1'`. With `in: {x: L1/o1}` the results flip: `validate_draft` reports `references unknown step` and the converter succeeds. Reproduced on 0.28.0 and 0.29.1. `galaxy-tool-util-ts` `draft-validate` 1.15.0 matches `validate_draft`, including under `--concrete`, so a draft can pass validation and fail import. Both should resolve the same names.

### P2 1: The rule sits behind a load that fires on a third of tool steps

§6.4 and §3. The trigger "wiring a parameter nested in a conditional or section" isn't an edge case. In IWC at `980fc00`, 1,157 of 3,258 tool steps (35.5%) use a `|` connection key, in 129 of 133 workflows, subworkflows included. Nearly every run will read the whole 8,808-byte note, about 90% of it unrelated to wiring, to get one rule. Step 3 ("Wire ports") never mentions the rule or the reference, so the agent's only prompt is the trigger line in the reference list.

Suggested fix: put the rule in step 3, then drop this reference. See the answer below for the sentence and reasoning.

### P2 2: The trigger misses the form Foundry drafts actually use, and the purpose omits the existing use

§6.4. "When a draft's steps carry both `id` and `label`" doesn't fire for a map-form step with a key and a differing `label` but no `id`, which is the `galaxy-workflow-draft-format` example and one of the failing rows in P1 1. Step 5 of the body also links `[[gxformat2-schema]]` for `rename:` behavior, and neither `purpose` nor `trigger` mentions that, so the agent gets no load condition for the use the debrief gives as the reason for adding the reference.

Suggested fix, if the reference stays: `trigger: "When wiring a nested parameter, when a step's label differs from its id or map key, or when setting an out: action such as rename."` Extend `purpose` to match, and resolve P1 1 first so the note gives a safe answer.

### P3 1: The note's opener invites reading a 126 KB companion this Mold doesn't need

§6.4. The note's opening paragraph (`:29`) says "Use it to inspect the structural vocabulary", and the new `SKILL.md` line says to read the companion "where that note directs." `gxformat2.schema.json` is 126,410 bytes, roughly twice the size of the draft schema this Mold already declares `upfront`, and `draft-validate --concrete` already performs that structural check. Applies only if the reference stays. Suggested fix: reword the opener to say the companion is for questions the note doesn't answer, or to prefer running `gxwf`.

### P3 2: The debrief's plan correction is wrong (branch record only)

`ortho_method|input` is in `Functional_annotation_of_sequences.ga` at IWC `980fc00`, in a subworkflow. `implementation_debrief.md` and `skunkworks_plan_review.md:59` say it isn't. The note's `input_type|i` is also there, on `kegg_pathways_completeness` at the top level, with `input_type` a conditional in `tool_state`, so the note needs no change. Suggested fix: correct both records so the claim isn't repeated.

## Is the ~4,000-line recast acceptable?

**The bundle size is acceptable. What it buys isn't enough, so I'd drop the reference and avoid the recast.** This is a judgment call for John, and shipping the reference as written wouldn't be harmful once P1 1 is fixed.

**Actual cost**

- Of the 4,000 lines, 3,926 are the vendored JSON and 74 are the note.
- The bundle goes from 295,613 to 433,381 bytes, up 47%. That's still smaller than `nextflow-summary-to-galaxy-template` (490 KB) and `summarize-nextflow` (1.7 MB).
- Files in the bundle cost nothing at runtime until read. The always-loaded cost is 517 bytes added to a 16.4 KB `SKILL.md`, in every invocation of a Mold that runs once per step.
- Git storage is near zero. The JSON is one blob, `526c8d28`, shared with the source and the other casts.
- The recurring costs are a third cast diff on every `sync:vendored`, and a large line count in this PR. Branch 1 adds a fourth copy by giving repair the same reference.
- Companions attach to the note, not the reference (`content-model.md:88`), so a Mold can't take the note without the JSON.

**Reference frontmatter, if kept**

| Field | Verdict |
|---|---|
| `kind: research` | Right. |
| `mode: verbatim` | Right, and matches siblings. |
| `load: on-demand` | Right. `upfront` would load 8.8 KB on every step for a rule that fits in a sentence. The two template Molds use `upfront`, but they run once and author the whole structure. |
| `evidence: corpus-observed` | Right for `in:` keys, which the corpus shows directly. Wrong for the step-part sentence, which came from validators and is contradicted by the converter (P1 1). Fine once that sentence goes. |
| `trigger` | Needs the rewrite in P2 2. |

**Mold body: change it.** Add to step 3:

> Key a parameter nested in a conditional or section by its `|`-joined path (`input_type|i`), and a repeat instance with `_N` (`queries_0|inputs2`). The selector value stays in `state`.

That's about 30 words against an 8.8 KB read on a third of steps, and it's a runtime instruction rather than research depth, so it doesn't conflict with §3. Remove the `([[gxformat2-schema]])` link from step 5 as well. Step 5 already states the rename rule, and `eval.md` already has a property for it. The cast on `main` has that link with no file behind it, so removing it also closes that gap. With both changes the Mold has no remaining need for the note, and the only cast change is `SKILL.md`.

**Eval: no change.** `draft-validate --concrete` already rejects wrong keys. A flat `input_param`, a dotted `input_param_type.input_param` and a bogus `nope|x` each gave `No parameter definition matching connection key`, while the correct key passed. A property here would restate a gate the body already runs (§6.3). This check needs the tool to be fetchable or cached, since uncached tools are skipped under `--offline`. Add a connection-reference property only after the upstream resolvers agree.

**Should the content live elsewhere?**

- The note is still the right home for the fuller statement, and it stays reachable through the template Molds and Branch 1.
- A pattern page is wrong. This is a format fact, not a construction practice, and the pattern pages already show the keys in use.
- `galaxy-workflow-draft-format` is wrong. It isn't in this Mold's bundle, and adding to it costs the six skills that carry it.
- If John prefers not to touch the body, the fallback is a small stub note, such as `gxformat2-step-wiring`, with no companion. Implement and repair could both load it on demand, and it would remove the recast for both. That fits §6.7 but adds a note for two sentences, so I rank it second.

**Other Molds carrying the note:** `nextflow-summary-to-galaxy-template` and `cwl-summary-to-galaxy-template`, both `load: upfront`. `freeform-summary-to-galaxy-template` doesn't carry it. Branch 1 adds `repair-galaxy-draft-topology`, on demand, and its `out:` action trigger is a better fit for this note than the use here, though its "wires a nested parameter" trigger has the same frequency question at a lower rate.
