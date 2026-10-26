Title: Workflow rename leaves a literal `#{...}` in the output name when an empty placeholder sits right before another

A workflow rename template with two `#{...}` placeholders can skip the second one and leave it in the dataset name as literal text.

| Template | Input names | Result | Expected |
| --- | --- | --- | --- |
| `#{missing}#{input} suffix` | `input`: `reads.fastq` | `#{input} suffix` ❌ | `reads.fastq suffix` |
| `#{missing}_#{input}` | `input`: `reads.fastq` | `_#{input}` ❌ | `_reads.fastq` |
| `#{a}-#{b}` | `a`: `""`, `b`: `y` | `-#{b}` ❌ | `-y` |
| `#{a}#{b}` | `a`: `x`, `b`: `longer` | `x#{b}` ❌ | `xlonger` |
| `#{missing}__#{input}` | `input`: `reads.fastq` | `__reads.fastq` ✅ | |
| `#{input}#{missing} suffix` | `input`: `reads.fastq` | `reads.fastq suffix` ✅ | |

The skip happens when a placeholder resolves to an empty value and the next `#{` follows within one character, or to a one-character value and the next `#{` follows immediately. The most likely real trigger is a reference that doesn't resolve, which silently becomes `""` (#23896). A second, smaller problem in the same loop: inserted input names are scanned as template text, so an input named `ab#{b}` gets its `#{b}` expanded too (`#{a} x` renders `abother x`).

<details><summary>Why it happens</summary>

`RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`) walks the template with a cursor and replaces as it goes:

```python
start_pos = 0
while new_name.find("#{", start_pos) > -1:
    start_pos = new_name.find("#{", start_pos) + 2
    end_pos = new_name.find("}", start_pos)
    to_be_replaced = new_name[start_pos:end_pos]
    ...
    new_name = new_name.replace(f"#{{{to_be_replaced}}}", replacement)
```

`start_pos` points two characters past the `#{` it just handled, but it is an index into the string from before the replacement. After the replacement, the next placeholder starts at `old position + len(replacement) + gap`. If `len(replacement) + gap < 2`, that is before `start_pos`, so the next `find` never sees it.

Inserted values get rescanned for two reasons: the search resumes inside the inserted text, and `str.replace` rewrites every copy of a placeholder, including copies inside values inserted earlier.

The same helper is used by `execute` and `execute_on_mapped_over`, so plain outputs and mapped-over collection outputs are both affected.

</details>

<details><summary>Reproduction against the real helper</summary>

`dev` @ `3167c014a47`, Galaxy venv:

```python
from galaxy.job_execution.actions.post import RenameDatasetAction
from galaxy.model import PostJobAction

def r(template, input_names):
    action = PostJobAction("RenameDatasetAction", action_arguments={"newname": template})
    return RenameDatasetAction._gen_new_name(action, input_names, {})

r("#{missing}#{input} suffix", {"input": "reads.fastq"})  # '#{input} suffix'
r("#{a}#{b}#{c}", {"a": "", "b": "", "c": "z"})            # '#{b}z'
r("#{a} x", {"a": "ab#{b}", "b": "other"})                 # 'abother x'
r("#{a} #{b}", {"a": "#{b}", "b": "B"})                    # 'B B'
r("pre #{a", {"a": "x"})                                   # 'pre #{a' (unclosed, left as is)
```

This is a reproduction against the helper, not a user report. None of IWC's current rename templates use more than one placeholder.

</details>

## Context

Bug discovered while working on 🌿 [`issue_23896_rename_input_segments`](https://github.com/jmchilton/galaxy/tree/issue_23896_rename_input_segments). Bug related to 🎯 #23896 - unresolved references become `""`, the main trigger here. That branch's API regression test puts the valid reference first (`#{fastq_input1 | basename}#{input1} suffix`) only because the reverse order hits this bug. Rename references are documented in 🔀 #23877.

## Proposed Approach

Replace the cursor loop with a single `re.sub(r"#\{([^}]*)\}", resolve, new_name)`, where `resolve` does the existing lookup and `basename`/`upper`/`lower` operations. A single pass can't skip placeholders and doesn't rescan inserted values. The code already has `# TODO: Replace all matching code with regex`. The `${...}` `replacement_dict` step stays a separate pass afterwards.

<details><summary>Edge cases and tests</summary>

A prototype matches current output for unclosed `#{`, `#{a#{b}}`, repeated placeholders, and whitespace around names and `|` operations. The only intended change is that inserted values are no longer expanded.

Add the failing rows above, the re-expansion cases and the unclosed `#{` case to the parametrized rename unit test (`test/unit/job_execution/test_post_job_actions.py`, added on the #23896 branch). Optionally, reverse the template order in the #23896 API regression test.

</details>

## Alternative Approaches

The smallest fix is to move the cursor to the end of the inserted value (`position + len(replacement)`). That fixes the skip, but it only stops the rescan if it also replaces just the current occurrence, and it keeps the hand-rolled index tracking that caused the bug. The regex is about as short and removes the cursor completely, so we prefer it.

<details><summary>Alternatives In Detail</summary>

### Alternative: Fix the cursor arithmetic

<details><summary>Description</summary>

#### Details

Record where the current `#{` starts, replace only that occurrence, then set `start_pos = start + len(replacement)`.

#### Why the proposed approach is preferred

It works, but it also has to switch from `str.replace` to replacing just the current occurrence (otherwise a later placeholder still rewrites matching text inside an earlier value), and the index bookkeeping is the same kind of code that went wrong here. `re.sub` with a callback handles every occurrence in one pass with no state.

</details>

### Alternative: Document "don't put placeholders next to each other"

<details><summary>Description</summary>

#### Details

Leave the code alone and warn in the rename docs.

#### Why the proposed approach is preferred

Whether it triggers depends on runtime values (an unresolved reference or a one-character name), not only on the template, so authors can't reliably avoid it.

</details>

</details>
