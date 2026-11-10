`validate_draft` accepts a draft whose steps form a cycle, although `_topo_ordered_steps` counts on it to report one.

```yaml
class: GalaxyWorkflowDraft
inputs:
  seed: data
outputs: {}
steps:
  a:
    tool_id: TODO_a
    in:
      x: b/out
      y: seed
    out:
      - id: out
  b:
    tool_id: TODO_b
    in:
      x: a/out
    out:
      - id: out
```

On `main` (`b0241ee`), `validate_draft` returns `ok: True` with no errors, and `next_draft_step` offers `a`. The result is the same for a step sourcing its own output, and for this cycle inside a nested draft subworkflow. I didn't test a cycle that crosses a subworkflow boundary.

`_topo_ordered_steps` drains a cycle alphabetically, and its comment says "validate_draft reports the underlying problem". `validate_draft` has no cycle check, so nothing reports it.

Expected: `validate_draft` reports a `topology_errors` entry naming the steps in the cycle, and `ok` is false.

- Keep the check in draft validation. `format2/synthetic-cycle.gxwf.yml` is an existing non-draft fixture used by the layout and interop tests.
- `@galaxy-tool-util/schema` has the same gap and the same comment in `topoOrderedSteps`: gxwf 1.15.0's `draft-validate` prints `draft valid` on this workflow. It syncs its draft fixtures and expectations from here, so a new `synthetic-draft-bad-*` case reaches it that way, and the check itself needs porting.
- The merged `issue_215_draft_port_edges` branches for jmchilton/galaxy-tool-util-ts#215 document that a step isn't offered while a step feeding it still has work, "cycles aside". That caveat can go once cycles are rejected.

Found while triaging galaxyproject/foundry#668.
