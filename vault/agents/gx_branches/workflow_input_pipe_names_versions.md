# Workflow input pipe names — three comparison versions

Prepared 2026-09-16; all three branches pushed to `jmchilton` with John's approval.
These are comparison branches, not three committed PR plans: choose the desired
scope before opening anything. The original
`workflow_input_pipe_names` branch is preserved at `645a358780`.

All three variants are based on freshly fetched `dev` (`93d70cf46ed`). All reject
pipes in newly saved workflow input labels, including legacy data-input names
carried in tool state, and retain the API import/update regression coverage.
Tool-step labels are not restricted by this input-specific rule.

| Behavior | Validation only | Top-level correction | Nested correction |
| --- | --- | --- | --- |
| Reject invalid input names on import/update | Yes | Yes | Yes |
| Correct legacy input labels in the current editor workflow | No | Yes | Yes |
| Rewrite parent subworkflow input interfaces and connections | No | No | Yes |
| Copy referenced legacy subworkflows before changing them | No | No | Yes |
| Rewrite `when` expressions or other expression text | No | No | No |

## 1. Validation only

Branch: `workflow_input_pipe_names_validation`.

Head: `6955e15470`; implementation diff in `workflows.py`: 25 additions, 7 deletions.

[PR description](branches/workflow_input_pipe_names_validation/pr_description.md).

Legacy workflows still load with their original input labels. Authors must fix
invalid input names manually before saving those inputs. No automatic label
replacement, connection remapping, hidden workflow copy, or expression rewriting.

Final rebased validation: 13 focused unit tests passed; Ruff, test-file mypy,
and `git diff --check` passed.

## 2. Top-level autocorrection

Branch: `workflow_input_pipe_names_top_level`.

Head: `c896bb579d`; implementation diff in `workflows.py`: 58 additions, 7 deletions.

[PR description](branches/workflow_input_pipe_names_top_level/pr_description.md).

Adds deterministic editor-time pipe-to-underscore replacement for the inputs of
the workflow currently being edited, with suffixes to avoid label collisions.
It recognizes older labels carried in tool state. Parent subworkflow steps,
their connections, referenced subworkflows, and expressions remain untouched.
"Top-level" means the workflow requested from the editor API, not a restriction
on whether that workflow can be reused elsewhere as a subworkflow.

Final rebased validation: 15 focused unit tests passed; Ruff, test-file mypy,
and `git diff --check` passed.

## 3. Nested autocorrection, no expression rewriting

Branch: `workflow_input_pipe_names_nested`.

Head: `05184b9bab`; implementation diff in `workflows.py`: 120 additions, 11 deletions.

[PR description](branches/workflow_input_pipe_names_nested/pr_description.md).

Adds parent input-interface and connection remapping. Referenced subworkflows
are copied before renaming so the originals are not changed. Both
`input_connections` and gxformat2 `in` dictionaries are remapped.

`when` text is preserved byte-for-byte. Editor upgrade messages and save-time
logs warn that expressions must be reviewed manually when the nested interface
changes. There is no string substitution, parser, or attempt to rewrite other
expression text.

This is deliberately not a complete semantic migration: a `when` referencing an
old input name needs manual repair before the upgraded workflow is run. Removing
expression rewriting therefore does not remove the nested copy/remapping weight
or make automatic upgrades safe without author review.

Final rebased validation: 15 focused unit tests passed; Ruff, test-file mypy,
and `git diff --check` passed.

## Recommendation

Start with validation-only if the goal is a narrow, easily reviewed rule change.
Consider top-level correction as a separate follow-up. The nested variant is the
comparison point for how much machinery remains even after expression rewriting
is removed, not an assertion that it is ready to open without a policy decision.

Fork CI for the newly pushed comparison branches still needs to be reviewed. The
existing original-branch CI does not establish that these variants are green.
The approved review comment is awaiting confirmation of the closed PR number
before posting; branch links have been verified live.
