# galaxy#23981 — Workflow rename `#{name }` with padding silently renders empty

[Issue](https://github.com/galaxyproject/galaxy/issues/23981) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Filed 2026-10-08 by Claude for John; assigned jmchilton. Came out of #23900 work (fixed by #23943, merged).

`RenameDatasetAction._gen_new_name` `resolve()` strips the name only when `|` operations follow; padded names never match an input and become `""`. Real hit: IWC VGP5 step 19 cutadapt `Cutadapt on #{library.input_1 }` (since 2023-09).

Next: always `tokens[0].strip()`; flip the `#{ a }` parity row in `test/unit/job_execution/test_post_job_actions.py` to `"x"`, add the VGP5 shape row.

Open: IWC PR to drop the space in VGP5 (ask John). Larger idea: warn/lint on unresolved rename references.
