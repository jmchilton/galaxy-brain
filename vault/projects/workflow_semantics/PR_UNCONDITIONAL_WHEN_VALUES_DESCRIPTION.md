## The bug

A subworkflow step with **no** `when` expression could fail an invocation with an
`IndexError`.

`SubWorkflowModule.execute` builds one `when_value` per mapped element. With no `when`
expression every one of them is `None` — but `[None, None]` is still truthy, so it gets
stored on the `collection_info` and handed to the child invocation as though the
subworkflow were conditional. The steps inside then start reading conditions by element
position:

```
lib/galaxy/model/dataset_collections/structure.py:128, in _walk_collections
    when_value = self.when_values[index]
IndexError: list index out of range
```

It only surfaces when a step inside the subworkflow maps over a **longer** collection than
the one mapped over the subworkflow: two elements outside, three inside, and the walk runs
off the end of the list at `index=2`. Same length and it goes unnoticed, because every
value in the list is `None` anyway.

The invocation fails with `unexpected_failure`.

## The fix

Collapse the all-`None` list to `None` before it goes anywhere. No condition means no
condition, not one placeholder per mapped element.

```python
conditional_values = when_values if any(value is not None for value in when_values) else None
```

## Test

Framework test `subworkflow_mapping_per_step`: one subworkflow with two unrelated
collections mapped inside it — a step reading the data input the subworkflow was mapped
over (2 elements) and a sibling reading the subworkflow's own collection input
(3 elements). Both outputs are asserted flat, at 2 and 3 elements, so the test also fails
if the two are multiplied together or matched up element by element.

Verified red→green: against the pre-fix code it fails with the `IndexError` above; at HEAD
it passes.

The differing element counts are the point. An earlier 2-and-2 version of this test passed
with the bug present.

## Docs

None. The Subworkflows section of `collection_semantics.yml` lives in the follow-up PR
instead, so this one is the bug and its regression test and nothing else. The framework
test is registered as an example there.
