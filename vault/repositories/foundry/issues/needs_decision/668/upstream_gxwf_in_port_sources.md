`gxwf draft-next-step` work items leave out the edges around a `TODO_*` port, so they can't show what feeds a port or which step consumes it.

Work items from two drafts (gxwf 1.15.0). The first has a wired and an unwired input port that read the same. In the second, `second` consumes `first/TODO_mid`, and nothing says so:

```text
$ gxwf draft-next-step mixed.gxwf.yml
TODO[in.TODO_wired]: assign the real wrapper input port name (semantic hint: 'wired')
TODO[in.TODO_unwired]: assign the real wrapper input port name (semantic hint: 'unwired')
TODO[out.TODO_output]: assign the real wrapper output port name (semantic hint: 'output'; referenced by workflow output 'result')

$ gxwf draft-next-step wired.gxwf.yml
TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input')
TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid')
```

<details><summary>Fixtures</summary>

```yaml
# mixed.gxwf.yml; `gxwf draft-validate` reports it as `draft valid`
class: GalaxyWorkflowDraft
inputs:
  reads: data
outputs:
  result:
    outputSource: only/TODO_output
steps:
  only:
    tool_id: TODO
    tool_version: TODO
    _plan_context: wired and unwired in-port in one step
    in:
      TODO_wired: reads
      TODO_unwired: {}
    out:
      - id: TODO_output
```

```yaml
# wired.gxwf.yml
class: GalaxyWorkflowDraft
inputs:
  reads: data
outputs:
  result:
    outputSource: second/TODO_output
steps:
  first:
    tool_id: TODO
    tool_version: TODO
    _plan_context: first drafty step
    in:
      TODO_input: reads
    out:
      - id: TODO_mid
  second:
    tool_id: TODO
    tool_version: TODO
    _plan_context: second drafty step sourced from another drafty step output
    in:
      TODO_input: first/TODO_mid
    out:
      - id: TODO_output
```

</details>

An out port reports the workflow outputs that reference it, but not the steps that consume it. The in side reports no edges at all. Naming a wired port only replaces a key, while changing what feeds a port changes the topology, so a reader planning from these items can't tell which kind of work is ahead. The work list is also the only place a consumer can learn that renaming `TODO_mid` affects `second`, because `draft-next-step` won't offer `second` until `first` is done.

`TODO_unwired: {}` also validates, although the draft format guide says "Only the boxes are incomplete, never the wiring".

## Context

Bug related to 🎯 galaxyproject/foundry#668, part 2. There, a run's brief called a port "still an unbound sentinel" and planned to bind it, when the draft already wired it to the previous step's `TODO_*` output. That account comes from the Foundry run and isn't reproduced here. Related to 🎯 galaxyproject/foundry#654, correction 4, which asks for a structured command that shows one step.

These strings aren't gxwf's alone: `gxformat2/draft.py` `_step_work_items` emits the same text, and `packages/schema/test/fixtures/expectations/next_draft_step.yml` is synced from gxformat2 (`scripts/sync-manifest.json`, group `workflow-expectations`), so the wording has to change there first.

## Proposed Approach

Add edges to both sides of each work item: the sources of an `in.TODO_*` port and the consuming steps of an `out.TODO_*` port. Separately, make `draft-validate` reject a `TODO_*` input port that has neither a source nor a default.

<details><summary>Details</summary>

```text
TODO[in.TODO_input]: assign the real wrapper input port name (semantic hint: 'input'; sourced from 'reads')
TODO[in.TODO_many]: assign the real wrapper input port name (semantic hint: 'many'; sourced from 'a/out', 'b/out')
TODO[in.TODO_default]: assign the real wrapper input port name (semantic hint: 'default'; no source: default value)
TODO[out.TODO_mid]: assign the real wrapper output port name (semantic hint: 'mid'; consumed by 'second/TODO_input')
```

- `stepWorkItems` discards the input value today ([`draft-checks.ts#L930`](https://github.com/jmchilton/galaxy-tool-util-ts/blob/f5470fe5/packages/schema/src/workflow/draft-checks.ts#L930)). `extractSourceRefs` already normalizes the source shapes, including list and multi-source forms.
- Consumer lookup needs a step-side index beside `OutputRefIndex`, built from each step's `in:` entries.
- The survey (`DraftSurveyReport`, the CLI text line, `draft_validate.md.j2`) can count input ports sourced from a drafty output. It is the only one of these outputs that covers steps not yet offered.
- Expected test and doc updates: `next_draft_step.yml` (through the gxformat2 sync), `packages/schema/test/draft-checks.test.ts`, `packages/schema/test/report-models-draft.test.ts`, `packages/cli/test/draft-validate.test.ts`, `docs/guide/draft-format.md`, and the generated `_templates-bundled.ts`.

</details>

## Alternative Approaches

Annotating the existing work items gives every consumer the answer in the output it already reads, without a new command or a second pass over the YAML.

<details><summary>Alternatives In Detail</summary>

### Alternative: Flag only drafty sources on input ports

<details><summary>Description</summary>

#### Details

galaxyproject/foundry#668 asks for an in-port work item that flags a source which is another drafty step's `TODO_*` output.

#### Why the proposed approach is preferred

`draft-next-step` walks steps in topological order and offers the first with work, so a consumer isn't offered while its upstream step still has a `TODO_*` output. On a valid acyclic draft that item is never printed. The edge is only visible from the producer's side.

</details>

### Alternative: Label unwired ports instead of rejecting them

<details><summary>Description</summary>

#### Details

Print `no source: this port is unwired` and keep `TODO_x: {}` valid.

#### Why the proposed approach is preferred

The draft format guide says the wiring is never incomplete, and Foundry's format note says the connection "MUST be present". A port with no edge and no default contradicts both, so failing validation is more useful than a label. If a real template needs that form, this alternative should win.

</details>

### Alternative: Leave it to a structured step command

<details><summary>Description</summary>

#### Details

The `gxwf draft-show-step` command proposed in galaxyproject/foundry#654 would let a consumer read one step's body directly.

#### Why the proposed approach is preferred

It requires a consumer to know to ask, and showing a step's own body doesn't show who consumes its outputs.

</details>

### Alternative: Document the distinction in Foundry only

<details><summary>Description</summary>

#### Details

Tell agents to read the draft's YAML for each `TODO_*` port.

#### Why the proposed approach is preferred

The brief in the Foundry run was derived from these reports, and the mistake was caught only by reading the YAML. A documented caveat doesn't put the edges in the output.

</details>

</details>
