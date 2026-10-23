Thanks for the report. The warning was right about `${on_string}`, but the lint did have real gaps, and digging into it turned up fixes in four places.

**The premise.** `${on_string}` isn't a rename variable. It's a Cheetah variable available only in a tool wrapper's `<data label="...">`. Galaxy's `RenameDatasetAction` (`lib/galaxy/job_execution/actions/post.py`) fills in just two forms:

- `#{input}` is the name of the dataset bound to that tool input. Nested inputs use `.`, and `| basename`, `| upper` or `| lower` are optional. Example: `#{gtf_to_extend} BREW3R extended`.
- `${label}` is the value of the workflow parameter input with that label.

Any other `${name}`, including `${on_string}`, is an informal, untyped workflow parameter. The UI run form asks for a free-text value. An API or Planemo run sends no `replacement_params`, so the dataset is literally named `Coverage track on ${on_string}`. There's no `${input_name}` variable either: the input's name is `#{input_name}`. IWC agrees: no `.ga` rename uses `${on_string}`. The `${X}` renames there all name declared parameter inputs (e.g. `${Haplotype}`), and the per-input renames use `#{...}`.

To name these outputs after their input, use `rename: "Coverage track on #{<tool input name>}"`.

**Where the lint was actually wrong**

- It flagged renames that reference a declared parameter input, e.g. `Chromosome File for ${Haplotype}` in IWC. Those are filled from the input, so they shouldn't warn.
- Python and TypeScript disagreed. gxformat2 used `re.match`, so it only caught `${...}` at the start of a string. That's why `planemo workflow_lint` stayed silent on `Coverage track on ${on_string}`. The TS port searched the whole string, so `gxwf lint` was the one that caught it.

**What changed**

- Foundry, #702 (open): `gxformat2-schema` documents the rename syntax above, and `implement-galaxy-tool-step` gets the rule plus an eval property, so the authoring skill stops writing tool-XML variables into renames.
- gxformat2, galaxyproject/gxformat2#271 (merged, not yet released): searches the whole string, exempts renames that reference a declared parameter input, and emits one warning per reference naming the `${name}`, the action, the output and the fix. A `${data_input_label}` rename now points to `#{...}`.
- galaxy-tool-util-ts, jmchilton/galaxy-tool-util-ts#195 (merged, not yet released): the same change for `gxwf lint`, with identical messages and shared fixtures. Once it's released, an IWC sweep shows 0 untyped-parameter warnings in both linters.
- Galaxy, galaxyproject/galaxy#24381 (draft, for 26.1): the workflow editor's best-practices lint had the same false positive for declared labels (galaxyproject/galaxy#24379), and its one-click "extract untyped parameter" fix could never clear the warning. The PR aligns the editor lint and the run form with runtime: only rename `${name}` with no matching parameter input warns or prompts.
- Planemo, galaxyproject/planemo#1750 (open): `planemo run` and `planemo test` should stop silently producing literal `${...}` names. The proposal is to send a loud `<DEPRECATED_PARAMETER_UNSET>` value for each undeclared parameter and warn, pointing at declaring a parameter input.

So the reserved-token allow-list the issue asked for isn't needed: there are no reserved `${...}` rename tokens. The fix is "warn unless it's a declared parameter-input label", which is what the gxformat2 and TS lints do now. I'll leave this issue open until #702 merges.
