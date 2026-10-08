# Workflow rename `#{name }` with padding and no `|` operations renders empty

Agent-to-agent issue draft. Found 2026-10-06 while polishing `issue_23900_rename_single_pass` (fixes #23900). That branch's checklist subagent noticed that a parity test row (`#{ a }` → `""`) pins a quirk that real IWC workflows hit. The branch keeps the quirk on purpose, since it's out of scope there.

## Symptom

In a workflow `RenameDatasetAction` template, whitespace inside `#{...}` is stripped only when `|` operations follow. Without operations, the padded name is looked up as is, never matches, and the reference silently becomes `""`.

Reproduced against the real helper on the `issue_23900_rename_single_pass` worktree. `dev` behaves the same, because the lookup code is unchanged.

```python
from galaxy.job_execution.actions.post import RenameDatasetAction as R
from galaxy.model import PostJobAction as P
n = {"library|input_1": "reads.fastqsanger.gz"}
def r(t): return R._gen_new_name(P("RenameDatasetAction", action_arguments={"newname": t}), n, {})
```

| Template | Result |
| --- | --- |
| `Cutadapt on #{library.input_1 }` | `Cutadapt on ` ❌ |
| `Cutadapt on #{library.input_1}` | `Cutadapt on reads.fastqsanger.gz` |
| `Cutadapt on #{ input_1 \| basename}` | `Cutadapt on reads.fastqsanger` (stripped because an op follows) |
| `#{input_1 }` | `""` ❌ |
| `#{ input_1}` | `""` ❌ |

## Real-world hit

IWC `workflows/VGP-assembly-v2/Assembly-Hifi-Trio-phasing-VGP5/Assembly-Hifi-Trio-phasing-VGP5.ga`, step 19 (cutadapt 5.2+galaxy2, PJA `RenameDatasetActionout1`), has `"newname": "Cutadapt on #{library.input_1 }"`.
- It has been there since IWC `020c2e38a` (2023-09-27, "adding workflow and tests for assembly with Trio Data"). Checked against iwc `origin/main` `fc190a435`.
- That output has always been named `Cutadapt on ` on every Galaxy. Nobody noticed because nothing warns.
- It's the only padded reference among IWC's 6 `#{` rename templates.

## Cause

`RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`, the `resolve` callback on the #23900 branch, the loop body on `dev`):

```python
input_file_var = to_be_replaced
tokens = to_be_replaced.split("|")
operations = []
if len(tokens) > 1:
    input_file_var = tokens[0].strip()   # only stripped here
    ...
input_file_var = input_file_var.replace(".", "|")
if input_file_var in input_names: ...
else: endswith(f"|{input_file_var}") fallback ...
replacement = replacement or ""          # silent empty
```

## Proposed fix

Always strip: `input_file_var = tokens[0].strip()` regardless of `len(tokens)`.
- Galaxy parameter names can't contain whitespace, so a padded name never resolves today. Stripping can only turn `""` into the intended value.
- It's backward-incompatible only for workflows that rely on the output being empty, which is implausible.
- Update the parity row in `test/unit/job_execution/test_post_job_actions.py`. The #23900 branch adds `("#{ a }", {"a": "x"}, "")` with the comment "Names are only stripped when operations follow." It would become `"x"`.
- Add the VGP5 shape as a row: `("Cutadapt on #{library.input_1 }", {"library|input_1": "r.fq"}, "Cutadapt on r.fq")`.
- Sequencing: this lands after (or on top of) #23900's PR, since both touch `resolve` and the same test file.

## Related / bigger picture

- An unresolved rename reference silently becomes `""` (this case, and the #23896/#23918 mid-word change). That's the root of why this went unnoticed for 3 years. A separate, larger idea is to warn at workflow save/lint time (the editor's `FormOutput.vue` rename field, gxformat2 lint, or the workflow linting API) when a `#{...}` reference matches no input of the step. That's scope for a different issue, but it's worth a sentence in this one.
- Rename reference syntax is documented in #23877 (developer reference for inconsistent tool/workflow references). Whitespace handling could be noted there.
- Consider also notifying IWC (or opening an IWC PR) to drop the space in VGP5. That's useful regardless of the Galaxy fix, because deployed Galaxies won't get it for a while. Ask John before opening anything on IWC.

## Assign

It came out of John's #23900 branch work, so assign John and add it to `ISSUES.md` when it's filed.
