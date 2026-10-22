Title: Document rename post-job action syntax

Refs #677.

`gxwf lint` warned on `rename: "Coverage track on ${on_string}"`, and the warning was right. `${on_string}` is a tool-XML `<data label=...>` variable, not a rename one. Galaxy's `RenameDatasetAction` fills in only two forms:

- `#{input}` becomes the name of the dataset bound to that tool input. Nested inputs use `.`, and `| basename`, `| upper` or `| lower` are optional.
- `${label}` becomes the value of the workflow parameter input with that label.

Anything else stays literal in the dataset name. IWC agrees: no `.ga` rename uses `${on_string}`, and its `${X}` renames name declared parameter inputs.

**Changes**
- `gxformat2-schema` (rev 4): a paragraph on rename syntax after the step `out:` actions, sourced to Galaxy v26.1.1 `post.py`.
- `implement-galaxy-tool-step` (rev 10): a one-line rule under "Preserve testability". It's there because this skill doesn't package `gxformat2-schema`.
- `implement-galaxy-tool-step` eval: a new property that fails a rename using a tool-XML variable.
- The affected casts and `Dashboard.md` are regenerated. Docs only, so there's no changeset.

The lint's own gaps are tracked separately in the gxformat2 and galaxy-tool-util-ts tooling: the warning should fire only for `${name}` that isn't a declared parameter label, and Python's `re.match` misses mid-string references while TS doesn't.

Checks: validate, check-generated, check-casts, check-verify, check-assemble-pipelines, check-fixtures all green.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
