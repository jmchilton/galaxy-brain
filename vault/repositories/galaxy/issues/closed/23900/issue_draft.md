# Workflow rename leaves a later `#{...}` unresolved when an earlier replacement is shorter than its placeholder

Agent-to-agent handoff. Found while polishing branch `issue_23896_rename_input_segments` (fix for #23896). That issue's scope is narrow segment matching, so this was deliberately left out of it. Not filed yet.

## Bug

`RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`, ~lines 216-270 on `dev` `3167c014a47`) walks the template with a cursor:

```python
start_pos = 0
while new_name.find("#{", start_pos) > -1:
    start_pos = new_name.find("#{", start_pos) + 2
    end_pos = new_name.find("}", start_pos)
    to_be_replaced = new_name[start_pos:end_pos]
    ...
    new_name = new_name.replace(f"#{{{to_be_replaced}}}", replacement)
```

`start_pos` is an index into the string *before* the replacement. When the replacement is shorter than `#{...}`, the string shrinks. The next placeholder can then start before `start_pos`, so `find("#{", start_pos)` never sees it and the placeholder stays in the output name.

## Reproduction (real helper, Galaxy venv, any recent `dev`)

```python
from galaxy.job_execution.actions.post import RenameDatasetAction
from galaxy.model import PostJobAction
def r(t, n):
    return RenameDatasetAction._gen_new_name(PostJobAction("RenameDatasetAction", action_arguments={"newname": t}), n, {})
```

| Template | input_names | Result | Expected |
| --- | --- | --- | --- |
| `#{missing}#{input} suffix` | `{"input": "reads.fastq"}` | `#{input} suffix` 😬 | `reads.fastq suffix` |
| `#{a}#{b}` | `{"a": "x", "b": "longer"}` | `x#{b}` 😬 | `xlonger` |
| `#{a}-#{b}` | `{"a": "", "b": "y"}` | `-#{b}` 😬 | `-y` |
| `#{input}#{missing} suffix` | `{"input": "reads.fastq"}` | `reads.fastq suffix` | works as intended (the long replacement comes first) |
| `#{missing} and #{input}` | `{"input": "reads.fastq"}` | ` and reads.fastq` | works as intended (the gap is long enough) |

😬 = a literal `#{...}` ends up in the dataset name.

Triggers when an earlier placeholder resolves to something shorter than its own `#{...}` text and the next `#{` is close enough to fall behind the cursor. Common triggers:
- a reference that doesn't resolve (it becomes `""`; see #23896, e.g. IWC ivar workflows use `#{input}` where the input is `input_bam`);
- short values with `basename`;
- adjacent placeholders such as `#{a}#{b}`.

The same helper serves `execute` and `execute_on_mapped_over`, so both ordinary outputs and mapped collection outputs are affected.

## Evidence it matters

- The new API regression test on `issue_23896_rename_input_segments` (`lib/galaxy_test/api/test_workflows.py`, `_run_rename_ignores_partial_input_segments`) uses the template `#{fastq_input1 | basename}#{input1} suffix`. The valid reference comes first only to avoid this bug: with the order reversed, the test can't show #23896's fix. Nothing in the code explains that order.
- Still needed: a real workflow (IWC or similar) with two placeholders where the first is empty or short. Check IWC rename templates (`git grep RenameDatasetAction -- '*.ga'` in `~/projects/repositories/iwc`). As of `fc190a435` all 6 IWC templates have a single placeholder, so none is affected. The filed issue should say plainly that the evidence is a reproduction, not a user report.

## Suggested fix

- The code already carries `# TODO: Replace all matching code with regex`.
- Use `re.sub(r"#\{([^}]*)\}", resolve, new_name)` with a function that does the lookup and runs the operations. It replaces in one pass with no cursor.
- That also stops a replacement value from being re-expanded. Today an input's name that contains `#{...}` is scanned as template text: `#{a} x` with `{"a": "ab#{b}", "b": "other"}` renders `abother x` (verified). The result is only a cosmetic name, but it's still wrong.
- Watch for:
  - an unclosed `#{` (e.g. `pre #{a`) is left as is today (verified); keep that;
  - `${...}` `replacement_dict` substitution, which runs afterwards and should stay separate;
  - identical placeholders appearing twice (current `str.replace` replaces all of them, which regex does too).

## Tests

- Unit tests: `test/unit/job_execution/test_post_job_actions.py` exists on the #23896 branch with a parametrized `test_rename_input_references(template, input_names, expected)`. Add the 3 failing rows above, plus the re-expansion case and an unclosed `#{`. If #23896's PR hasn't merged when this is picked up, either stack on that branch or create the test file.
- Optional API test: reverse the template order in the #23896 regression, or add a workflow test with `#{missing}#{input} suffix`.

## Issue framing notes

- Opener: rename templates with more than one `#{...}` can leave a literal placeholder in the output name.
- Lead with the table above.
- Related: #23896 (it supplies the empty-string trigger) and the rename docs in #23877.
- Not a security issue.
- Proposed approach: the regex single pass. Alternative: recompute the cursor from the replacement length. That's smaller but keeps the fragile loop and the value re-scanning.
