# foundry#677 — `gxwf lint` untyped-param warning on `${on_string}` renames

Issue: https://github.com/galaxyproject/foundry/issues/677 (scottcain, AI-posted, `needs-triage`)
Branch: `issue-677-rename-syntax` on `origin`, worktree `~/projects/worktrees/foundry/branch/issue-677`, commit `ef8abda3` on `da00dea6` (second commit applies the informal-parameter correction below).
PR: https://github.com/galaxyproject/foundry/pull/702 (opened 2026-10-22; body from [pr_description.md](pr_description.md)).
Gaps 2 and 3 (lint precision, Python/TS parity) handed to tooling agents by John (2026-10-22).
Upstream lint PRs: [gxformat2#271](https://github.com/galaxyproject/gxformat2/pull/271), [galaxy-tool-util-ts#195](https://github.com/jmchilton/galaxy-tool-util-ts/pull/195); records: [gxformat2 lint_untyped_params](../../../../gxformat2/branches/active/lint_untyped_params/index.md),
[galaxy-tool-util-ts lint_untyped_params](../../../../galaxy-tool-util-ts/branches/active/lint_untyped_params/index.md).
Planemo runtime side: https://github.com/galaxyproject/planemo/issues/1750 (send `<DEPRECATED_PARAMETER_UNSET>` for informal params + warn).

Fix placement: `gxformat2-schema` paragraph, but only 2 casts package that note (cwl/nextflow template),
so `implement-galaxy-tool-step` also got a one-line rule + eval property.

## Triage (2026-10-22)

The issue's premise is wrong; the warning caught a real authoring defect.

- `${on_string}` is a tool-XML `<data label=...>` Cheetah variable, not a `RenameDatasetAction` one.
  Galaxy `RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`) substitutes
  `#{input_name | basename|upper|lower}` (`RENAME_INPUT_REFERENCE_PATTERN = #\{([^}]*)\}`) from the
  job's input dataset names, then `${k}` from `replacement_dict` only: workflow parameter inputs by
  step label (`run_request.py:744`) plus runtime step-label replacements (`run.py:709-716`).
  `rename: "Coverage track on ${on_string}"` stays literal unless a parameter is labelled `on_string`.
  Correction (workflow_libs, 2026-10-22): there's no such label, so Galaxy treats `on_string` as an informal
  replacement parameter (`get_informal_replacement_parameters`). Both UI run forms prompt for it as
  free text and fill whatever the user types; only API/planemo runs (no `replacement_params`) leave
  it literal. Keep this in mind for the reply to Scott: "literal names" holds for API runs only.
- IWC: 0 `.ga` renames use `${on_string}`; `${X}` renames reference declared parameter labels
  (`${Haplotype}`, `${Taxonomic abundance summary table name}`); 6 use `#{...}`.
- Not a foundry bug: the check is gxformat2 `lint.py:_check_json_for_untyped_params` and its TS port
  `galaxy-tool-util-ts` `packages/schema/src/workflow/lint.ts:341` (`UNTYPED_PARAM_RE`).

## Real gaps

1. Foundry: no note says which rename syntax to use. Only use is an example
   (`advance-galaxy-draft-step/examples/brew3r-1step-degraded`: `#{gtf_to_extend} BREW3R extended`).
   Fix: short rename-syntax guidance (`#{input}` per-input naming; `${label}` only for a declared
   parameter input; `${on_string}` is tool-XML only) where steps get authored.
2. Upstream lint precision (gxformat2 + galaxy-tool-util-ts): warn only when `${name}` isn't a declared
   parameter-input label. Today IWC's `${Haplotype}` renames are false positives in TS.
3. Upstream parity: Python uses `re.match` (start-anchored), TS uses `.test` (search). Python misses
   mid-string refs (`Chromosome File for ${Haplotype}`), which is why planemo stayed silent here.

Next: open PR (Refs #677), reply to Scott on the premise.
