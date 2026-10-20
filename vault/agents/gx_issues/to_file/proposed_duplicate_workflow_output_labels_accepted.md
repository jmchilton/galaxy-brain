# The workflow API saves workflows whose outputs share a label

The workflow API accepts and saves a workflow in which two outputs have the same label, and invocations of it then hide all but one of those outputs.

| Request (on `dev`) | Result |
| --- | --- |
| `POST /api/workflows/upload` with `cat_a/out_file1` and `cat_b/out_file1` both labelled `out_a` | ⚠️ 200; both outputs stored as `out_a` |
| `PUT /api/workflows/{id}` with the same change | ⚠️ 200; new version stores both as `out_a` |
| Invoke it | ⚠️ 2 jobs run; invocation `outputs` is `{"out_a": …}`, which is **one** dataset |

⚠️ = accepted, should be a 400 (or, for the invocation, should list both).

Step labels in the same request are rejected with `Duplicated step label`, and workflow extraction rejects duplicate output labels with a 400. The editor flags duplicates (🔀 #20335) but still saves them after a "may not run correctly" confirm. Nothing on the server stops them.

<details><summary>Reproduction (excerpt of a temporary API test)</summary>

```python
DISTINCT = """
class: GalaxyWorkflow
inputs:
  input1: data
outputs:
  - id: out_a
    outputSource: cat_a/out_file1
  - id: out_b
    outputSource: cat_b/out_file1
steps:
  cat_a: {tool_id: cat1, in: {input1: input1}}
  cat_b: {tool_id: cat1, in: {input1: input1}}
"""

def dup(native):
    for step in native["steps"].values():
        for o in step.get("workflow_outputs", []):
            if o["label"] == "out_b":
                o["label"] = "out_a"
    return native

wf_id = self.workflow_populator.upload_yaml_workflow(DISTINCT)
resp = self.workflow_populator.create_workflow_response(dup(self.workflow_populator.download_workflow(wf_id)))
put = self._put(f"workflows/{wf_id}", data={"workflow": dup(self.workflow_populator.download_workflow(wf_id))}, json=True)
inv = self.workflow_populator.invoke_workflow_and_wait(resp.json()["id"], history_id=history_id, inputs={"0": {"src": "hda", "id": hda["id"]}}).json()
```

Output on `dev` @ `2cca856`:

```
native upload status: 200
stored labels: [('cat_a', 'out_file1', 'out_a'), ('cat_b', 'out_file1', 'out_a')]
PUT status: 200
labels after PUT: [('cat_a', 'out_file1', 'out_a'), ('cat_b', 'out_file1', 'out_a')]
invocation outputs: {"out_a": {"id": "d9abeb98649a6a7e", "workflow_step_id": "2234cb1fd1df4331", "src": "hda"}}
jobs run: 2
```

</details>

## Context

This is the server-side half of 🎯 #20230, which reported duplicate-labelled outputs missing from the invocation Outputs tab; the thread notes that "it should not be possible to create such a workflow". 🔀 #20335 closed it with editor-side warnings only, so editor saves, `.ga`/format2 uploads, TRS imports and API clients can all still store such workflows. Labels are how outputs are addressed: invocation `outputs`, `output_collections` and `output_values`, and a subworkflow step's outputs, are dicts keyed by label (last one wins), while `WorkflowInvocation.get_output_object(label)`, used by report `output=` references, returns the first match.

The server does have a check, but it can't fire. In `WorkflowContentsManager.__walk_step_dicts` (`lib/galaxy/managers/workflows.py`):
- the duplicate check runs only when `workflow_outputs` is a dict. Editor saves, `.ga` files and gxformat2 conversion all send a list of `{output_name, label, uuid}`, and `__module_from_dict` would turn a dict into its bare keys anyway, dropping labels;
- inside that dict branch, it tests and records the *step* `label`, not `output_label`;
- the output-uuid check next to it reads `step_dict["output_uuid"]` and records the step `uuid`.

The dict branch dates to 2015 and no test covers it.

## Proposed Approach

Check the list form `__module_from_dict` actually reads: collect each workflow output's `label` and `uuid` across all steps and raise `DuplicatedIdentifierException`, as step labels already do. Remove the dead dict branch. Add API tests that upload and update a workflow with duplicate output labels and expect a 400.

## Alternative Approaches

Rejecting matches step labels, workflow extraction and the editor's own error state. The main cost is old `.ga` files that already contain duplicates (the editor serializer already reports them as "Ignoring duplicate labels"), so warning or renaming is the fallback if that breaks too much; fixing only the invocation serialisation leaves the other label lookups ambiguous.

<details><summary>Alternatives In Detail</summary>

### Alternative: Warn or rename instead of reject

Accept the workflow and return a warning, or rename duplicates (`out_a`, `out_a_2`). That's kinder to existing `.ga` files, but warnings leave invocations ambiguous, and renaming silently changes the labels that reports, subworkflow connections and API clients rely on.

### Alternative: Fix only the invocation serialisation

List every output under a duplicated label. That treats the symptom; `get_output_object`, subworkflow outputs and report references stay ambiguous.

</details>
