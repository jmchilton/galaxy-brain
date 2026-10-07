# Workflow rename `#{name }` with padding inside the braces silently renders as empty

A workflow `RenameDatasetAction` reference with a space inside the braces, such as `#{input_1 }`, silently resolves to an empty string unless a `| operation` follows it.

With an input named `library|input_1` holding `reads.fastqsanger.gz`, on current `dev` (02a2e659909):

| `newname` template | Rendered name |
| --- | --- |
| `Cutadapt on #{library.input_1}` | `Cutadapt on reads.fastqsanger.gz` ✅ |
| `Cutadapt on #{library.input_1 }` | `Cutadapt on ` ❌ |
| `#{ input_1}` | _(empty)_ ❌ |
| `#{input_1 }` | _(empty)_ ❌ |
| `Cutadapt on #{ input_1 \| basename}` | `Cutadapt on reads.fastqsanger` ✅ |

The last row shows that the same padding works as soon as an operation follows. Nothing warns, either in the editor or at run time.

This affects a real IWC workflow. Step 19 of [`Assembly-Hifi-Trio-phasing-VGP5.ga`](https://github.com/galaxyproject/iwc/blob/622f8f4679f58adce00ffb5c3c9d24da08bc88ec/workflows/VGP-assembly-v2/Assembly-Hifi-Trio-phasing-VGP5/Assembly-Hifi-Trio-phasing-VGP5.ga#L627) (cutadapt, `library|input_1` connected) has `"newname": "Cutadapt on #{library.input_1 }"`. The template has been there since the workflow was added in September 2023, and the strip-only-with-operations logic dates to 2012, so on every Galaxy that output has been named `Cutadapt on ` with no input name.

<details><summary>Reproduction</summary>

```python
from galaxy.job_execution.actions.post import RenameDatasetAction as R
from galaxy.model import PostJobAction as P

n = {"library|input_1": "reads.fastqsanger.gz"}

def r(t):
    return R._gen_new_name(P("RenameDatasetAction", action_arguments={"newname": t}), n, {})

r("Cutadapt on #{library.input_1 }")  # 'Cutadapt on '
r("#{ input_1}")                      # ''
```

</details>

<details><summary>Cause</summary>

In `RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`), the reference name is stripped only on the branch that splits off operations:

```python
input_file_var = to_be_replaced
tokens = to_be_replaced.split("|")
operations = []
if len(tokens) > 1:
    input_file_var = tokens[0].strip()   # only stripped here
    ...
input_file_var = input_file_var.replace(".", "|")
# exact match, then "|<name>" suffix match; both miss on "input_1 "
replacement = replacement or ""          # silently empty
```

</details>

## Context

A follow-up to 🔀 #23943 (fixes 🎯 #23900), which added a parity test row pinning this behavior (`("#{ a }", {"a": "x"}, "")`, "Names are only stripped when operations follow") and left it out of scope. Related to 🎯 #23896 / 🔀 #23918 (another way a rename reference silently resolved to the wrong value) and 🔀 #23877 (developer docs for parameter references, which could note whitespace handling).

## Proposed Approach

Always strip the reference name, regardless of whether operations follow. Tool parameter names can't contain whitespace, so a padded name can never resolve today; stripping can only turn an empty result into the intended one.

<details><summary>Details</summary>

- Move `.strip()` out of the `len(tokens) > 1` branch (`input_file_var = tokens[0].strip()` unconditionally).
- In `test/unit/job_execution/test_post_job_actions.py`, flip the `#{ a }` parity row to `"x"` and add the VGP5 shape: `("Cutadapt on #{library.input_1 }", {"library|input_1": "r.fq"}, "Cutadapt on r.fq")`.
- The only behavior change is for workflows that rely on a padded reference rendering empty, which is implausible.
- Separately, IWC could drop the space in VGP5 so deployed Galaxies that don't have the fix name the output correctly.

</details>

## Alternative Approaches

The root reason this went unnoticed for three years is that an unresolved reference silently becomes `""`. Warning about that, at save/lint time or at run time, would catch this and other typos, but it is a larger change and doesn't fix existing workflows on its own. We prefer to strip now and track warnings as a separate improvement.

<details><summary>Alternatives In Detail</summary>

### Alternative: Warn on unresolved references instead of stripping

<details><summary>Description</summary>

#### Details

Flag a `#{...}` reference that matches no input of the step: in the workflow editor's rename field, in gxformat2/workflow lint, or in the job log when the rename runs.

#### Why the proposed approach is preferred

Warnings need someone to notice and edit the workflow; the padded reference has an obvious single intended meaning and can be resolved directly. Warnings are still worth doing in addition, for real typos.

</details>

### Alternative: Reject padded references as invalid syntax

<details><summary>Description</summary>

#### Details

Treat whitespace inside `#{...}` without operations as an error at save or import time.

#### Why the proposed approach is preferred

It breaks import of existing workflows (including the IWC one) to enforce a rule that `#{ x | basename}` already doesn't follow. Stripping makes both forms consistent.

</details>

</details>
