# foundry#677 — `gxwf lint` untyped-param warning on `${on_string}` renames

Issue: https://github.com/galaxyproject/foundry/issues/677 (scottcain, AI-posted, `needs-triage`)

## Triage (2026-10-22)

The issue's premise is wrong; the warning caught a real authoring defect.

- `${on_string}` is a tool-XML `<data label=...>` Cheetah variable, not a `RenameDatasetAction` one.
  Galaxy `RenameDatasetAction._gen_new_name` (`lib/galaxy/job_execution/actions/post.py`) substitutes
  `#{input_name | basename|upper|lower}` (`RENAME_INPUT_REFERENCE_PATTERN = #\{([^}]*)\}`) from the
  job's input dataset names, then `${k}` from `replacement_dict` only: workflow parameter inputs by
  step label (`run_request.py:744`) plus runtime step-label replacements (`run.py:709-716`).
  `rename: "Coverage track on ${on_string}"` stays literal unless a parameter is labelled `on_string`.
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

decide: doc fix in foundry + upstream lint issue, and the reply to Scott.
