# Initial review: `issue-571-nested-in-keys`

Profile: `default` (`_shared/reviewers/default.md`). Model: Claude Opus 5.5 (`claude-opus-5-5`). Effort: not exposed to the agent. Reviewed commit: `fd8662cc` against `origin/main` `7453431d`.

**Verdict:** don't open the PR as is. The map-form sentence fails on the conversion path Galaxy import uses, and the plan's stop condition for this case applies. The nested-key paragraph is correct but omits a silent failure. The bundle cost is acceptable.

## P1

### P1 1: The map-form connection sentence fails on conversion when a step has a distinct `label`

The note says: "In map form it is the map key, even when the step also carries `id` and `label`." That holds for `gxwf draft-validate` and gxformat2's `validate_draft`. It doesn't hold for `python_to_workflow`, which Galaxy calls at `lib/galaxy/managers/workflows.py:857`. With a distinct `label`, the two sides require opposite references, so a draft that follows the note passes every Foundry gate and then crashes on conversion.

I ran this matrix on gxformat2 0.28.0 (the version in the Planemo `release_26.1` venv) and 0.29.1, with identical results, and on `gxwf` 1.15.0 draft validation:

| Form | Fields on step | Reference | `draft-validate` and `validate_draft` | `python_to_workflow` |
|---|---|---|---|---|
| List | `id`, `label` | label | valid | OK |
| List | `id`, `label` | id | `references unknown step` | `ValueError` |
| List | `id` | id | valid | OK |
| Map | none | key | valid | OK |
| Map | `id` | key | valid | OK |
| Map | `id` | id | `references unknown step` | `ValueError` |
| **Map** | **`id`, `label`** | **key** | **valid** | **`ValueError: invalid literal for int() with base 10: 'the_key'`** |
| Map | `id`, `label` | id | `references unknown step` | `ValueError` |
| **Map** | **`id`, `label`** | **label** | **`references unknown step`** | **OK** |
| **Map** | **`label`** | **key** | **valid** | **`ValueError`** |
| **Map** | **`label`** | **label** | **`references unknown step`** | **OK** |

Further evidence:

- **Extraction doesn't help.** `gxwf draft-validate --concrete --no-tool-state` reports `Concrete: OK` on the failing draft. `gxwf draft-extract` keeps the key references and the label, and the extract fails conversion the same way.
- **`gxwf convert` fails silently.** On that extract it writes `{'id': None, 'output_name': 'out_file1'}` as the downstream connection and leaves `workflow_outputs` empty on the producing step, yet it exits 0 and prints `Stateful conversion: 2/2 steps converted`.
- **Real runs have this shape.** `foundry-runs/nf2g-demo-rerun-7-10-2026-10-21/trial-001/phase-007-advance-galaxy-draft-step/iteration-009/workspace/galaxy-workflow.gxwf.yml` is a map-form workflow with human labels and key references, and it fails `python_to_workflow` with the same `ValueError`. About 134 of the `.gxwf.yml` files under `foundry-runs` are map form with a distinct label. These counts include repeated iteration copies.
- **The Foundry teaches this shape.** The worked example in `content/research/galaxy-workflow-draft-format/index.md` has key `fastp`, `label: trim and QC paired reads`, and `outputSource: fastp/TODO_trimmed_paired`.
- **Cause.** `gxformat2/draft.py` `_iterate_steps` yields the map key as the step's name (`yield from steps.items()`). `normalized/_format2.py:539-548` only fills in `id` and `label` from the key when they're absent, so an explicit `label` replaces the key as the name conversion can resolve. The failure surfaces at `normalized/_conversion.py:1136` (`step_id`).

The debrief's conclusion, "this isn't an upstream disagreement", compared `gxwf` with `validate_draft`. Those are two draft validators, and they agree with each other. Neither is the conversion path. The debrief does say import wasn't run, and I didn't run a live Galaxy either, but the crash is in the function Galaxy calls. I found no recorded run that reached a Galaxy import with this shape.

**Suggested fix.** Apply the plan's stop rule and DOMAIN_REVIEW §1: a suspected upstream bug gets written up as issue text, not documented as prose.

- Keep the list-form sentence, which all three surfaces agree on.
- Limit the map-form sentence to the undisputed case: "In map form, for a step with no `label`, it is the map key."
- Drop "even when the step also carries `id` and `label`".
- Correct the debrief.
- File the issue below. John should decide whether this branch waits for it and whether the `galaxy-workflow-draft-format` example changes in the meantime. Until then, map-form drafts with distinct labels stay exposed whatever this note says.

<details><summary>Draft upstream issue text</summary>

**`validate_draft` and conversion resolve map-form step references differently when a step has a `label`**

For a map-form step whose `label` differs from its key, `gxformat2.draft.validate_draft` (and `gxwf draft-validate`) resolves a `source` or `outputSource` by the map key and rejects a reference by label as `references unknown step`. `python_to_workflow` does the reverse: a reference by label converts, and a reference by key raises `ValueError: invalid literal for int() with base 10: '<key>'` from `step_id`. Reproduced on 0.28.0 and 0.29.1. No reference to such a step passes both. `gxwf draft-validate --concrete` reports OK on the key form. `gxwf convert` 1.15.0 emits `id: null` for the connection instead of an error.

```yaml
class: GalaxyWorkflowDraft  # GalaxyWorkflow for conversion
inputs: {inp: {type: data}}
outputs: {o: {outputSource: the_key/out_file1}}
steps:
  the_key:
    label: the_label
    tool_id: cat1
    tool_version: 1.0.0
    in: {input1: {source: inp}}
    out: [out_file1]
```

Expected: validation and conversion accept the same references. Conversion should also report an unresolved reference by name rather than through `int()`.

</details>

## P2

### P2 1: The nested-key paragraph omits the repeat's `state` entry, whose absence fails silently

The note says "The key names the path, and the conditional's selector value stays in `state`." For `_N` keys that's incomplete. The repeat entry must also exist in `state`, or the connection does nothing. The cited pattern calls this out: "The repeat is what creates the input terminals, so connections alone leave the tool with zero candidates. The job still succeeds and writes the text `null` into the output dataset." The verification workflow's `route_missing_pick_from` step pins it with `has_text: "null"`.

An agent following only this note, wiring `pick_from_0|value` and setting the selectors, would produce a valid draft whose job succeeds with wrong output. `implement-galaxy-tool-step`'s bundle doesn't carry the pattern, so the `[[conditional-route-between-alternative-outputs]]` link can't be followed from the cast.

**Suggested fix.** Add one sentence: "Each `_N` connection also needs its own entry in the repeat in `state`; without it the input terminal doesn't exist, and the tool can succeed with no candidates."

### P2 2: `eval.md` has no property for the new behavior

The wf_foundry rule for a Mold problem exposed by a run is to fix "the Mold and its eval". `content/molds/implement-galaxy-tool-step/eval.md` has a property for the `rename:` rule from this same note, but nothing for nested `in:` keys or for the step part of connections. Both #571 reports could recur with the eval still passing.

**Suggested fix.** Add fixture-independent assertions: a nested parameter's connection uses its `|`-joined key, each `_N` key has a matching repeat entry in `state`, and references name steps in the namespace the draft's form requires. Word the last one to match whatever survives P1 1.

## P3

### P3 1: The body's wiring step doesn't point at the note, and the trigger omits the existing rename citation

Sequence step 3, "Wire ports", is where #571's gap occurs, and it doesn't mention the note. The only body citation is step 5, on `rename:`, and the new `purpose` and `trigger` don't cover that use. Add `[[gxformat2-schema]]` to step 3 with the rule stated inline (see the bundle answer below), and widen `purpose` and `trigger` to include dataset `rename:`.

### P3 2: The preceding paragraph still says `step_id/output_id`

"`outputSource` names the producing step output, commonly `step_id/output_id`" sits one paragraph above the new text and now conflicts with it. #571's follow-up comment quotes this phrase as part of the confusion. Change it to `step/output` and let the new paragraph define the step part.

### P3 3: The size surprise isn't recorded

The plan estimated "~15 lines, plus a small recast", and the debrief doesn't mention the 3,926-line companion. Say in the debrief and the PR description that about 4,000 of the diff's lines are the vendored companion copied into a third bundle, so reviewers don't have to work it out.

## Is the ~4,000-line recast an acceptable cost?

**Yes.** Keep the reference. The cost is diff noise and disk, not context, as long as nothing directs an agent to read the schema during routine wiring.

| Cost | Measure |
|---|---|
| Added to `SKILL.md` on every load | 2 lines, about 480 characters (roughly 120 tokens) |
| Note, when its trigger fires | 8.8 KB (roughly 2,200 tokens) |
| Schema, only if an agent opens it | 126 KB (roughly 31,600 tokens) |
| Bundle on disk | about 360 KB to 484 KB, +34% |
| `casts/claude` on disk | +126 KB on 13 MB, about 1% |

Token figures use bytes divided by 4.

- **Load semantics.** `load: on-demand` means the file sits in the bundle and `SKILL.md` lists it with a trigger. Casting copies it, and nothing injects it into context.
- **The companion can't be left out.** `companions:` attaches to the note, so every Mold citing the note gets it (`content-model.md`). There's no per-reference opt-out.
- **Precedent.** `cwl-summary-to-galaxy-template` and `nextflow-summary-to-galaxy-template` already carry this note and companion. `tests-format.schema.json` (208 KB) ships in 7 casts. This same bundle already has `galaxy-collection-semantics.yml` as an on-demand companion, and it loads the 64 KB `galaxy-workflow-draft.schema.json` upfront, which costs far more per run than this change.
- **Advertising.** The new line reads "Sibling of `references/notes/gxformat2-schema.md`; read it where that note directs." The note's only direction is "Use it to inspect the structural vocabulary", which doesn't send an agent there for key addressing. Searching `foundry-runs` found no recorded read of the file outside `SKILL.md` copies, but the search covered only `.jsonl`, `.log` and `.md` files and those logs may not record reads, so this is weak evidence.
- **Side benefit.** Before this branch, step 5 of the cast cited `gxformat2-schema`, which wasn't in the bundle. This reference fixes that dangling citation.

The real inefficiency is elsewhere. Nested parameters are common, so the trigger will fire often and load 2,200 tokens for two sentences of rules, on a step that runs once per workflow step.

**Recommendation:** keep the reference for the detail and the rename guidance, and put the one-line `|` and `_N` rule directly in step 3 of the Mold body. That's about 60 tokens, always in view, and it avoids depending on the trigger firing.

Alternatives I rejected:

- **A small companion-free note for the key rules.** It saves 126 KB of disk and no runtime context, adds a note to maintain, and goes against #571's request to extend `gxformat2-schema`.
- **A per-reference companion opt-out in the caster.** This changes tooling and the verifier to save 1% of disk.
- **Putting the rules in `galaxy-workflow-draft-format`.** It has no `companions:` entry in its frontmatter, so it avoids the 126 KB. But it's 12.9 KB, larger than this note, and `implement-galaxy-tool-step` doesn't carry it now, so loading cost would rise. It's still the right place to fix the worked example from P1 1.

## Claims verified

- **`input_type|i`:** present on step 15 of `Functional_annotation_of_sequences` (`kegg_pathways_completeness`), inside a conditional (`select_input_type`, `__current_case__`). Checked in the pinned `iwc-src` fixture of the `pipeline-run-atacseq` worktree, read-only. The same workflow also has `input_param_type|input_param` and `style_cond|type_cond|pick_from_0|value`. The workflow ID is correct.
- **`style_cond|type_cond|pick_from_0|value`:** present in `verification/workflows/conditional-route-between-alternative-outputs/route-between-alternatives.gxwf.yml` and in the pattern. The selectors `pick_style` and `param_type` sit in `style_cond` and `type_cond`, and `pick_from` is a repeat, so "first instance of a repeat inside two conditionals" holds.
- **Sections:** #571 cites `advanced_settings|align_min_match_pident`, and gxformat2's `_join_prefix` joins with `|`. The rename paragraph's `queries_0.input2` is a separate syntax and is correct to differ.
- **List-form sentence:** correct on all surfaces. It explains the 96 errors #571 reported.
- **Plan correction:** `ortho_method|input` isn't among the workflow's `|`-joined keys, as the debrief says.
- **Generated output:** `make -k validate check-generated check-casts check-verify` exits 0 (278 files, 0 errors, 71 warnings), and `make check-assemble-pipelines` reports no drift in the output I read. The Dashboard and casts match their sources, and the worktree stayed clean. I didn't run the full `make check`.
- **Reference fields:** the new reference has the `trigger` that `mold-spec.md` requires for on-demand references.

No security findings.
