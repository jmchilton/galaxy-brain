Risks are minimal - planemo-only staging change with no persisted state, API or format commitments; reverting restores prior behavior (a two-way door).

<details><summary>Risk Details</summary>

- Profile `generic_risk_assessment`, Opus 5.5, low effort, reviewed `d3b58601`.
- Behavior change for every Galaxy workflow `stage_in` caller (`planemo run`/`test` and `upload_data`): values for parameter inputs now bypass staging entirely, so a job that relied on a parameter input receiving an uploaded dataset/collection would change. Galaxy already rejected that shape, so little could depend on it.
- Classification is a deny-list (`DATA_INPUT_TYPES`): any input type not in it, including future or unrecognized data aliases, is treated as a parameter and its value passed through raw instead of uploaded.
- Remote (`gxid://`, TRS) workflows now cost an extra Galaxy workflow download before staging; failure there fails the run earlier than before.
- Workaround in planemo rather than galaxy-tool-util; a later upstream fix should make this redundant, not conflict, but both paths would need reconciling.

</details>

<details><summary>Risk Review Advice</summary>

Check that `DATA_INPUT_TYPES` covers every data/collection type spelling Galaxy `.ga` and gxformat2 emit after `inputs_normalized`, since a miss silently skips uploads. Confirm `job_dir` derivation matches what `job_path` previously resolved relative paths against.

</details>
