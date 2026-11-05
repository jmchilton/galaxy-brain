Run via claude-opus-5-5 (subagent, default effort).

Acted on all four real findings and most nits. Reproduced the wrong container claim by rendering planemo's job config myself before changing the text.

Not acted on:

- Adding a `galaxy-workflow` input and a chain rule to `find-test-data` (fix proposed for finding 2). Scoped its staging step to workflow inputs. A later check in `implement-galaxy-workflow-test`, from the Codex review, covers fixed-state values.
- Conf at the run root (recommended fix for finding 3). Dropped the artifact declaration instead, which keeps the issue's `test-data/` path.
- Test-plan Molds other than `workflow-brief-to-galaxy-test-plan` (finding 4). The flag appeared in that one, and the others don't carry it today.
- `gxjobconfinit` in the note's `sources:` and pinning the tools-iuc link. Prose names the behavior, and the pinned planemo and Galaxy sources cover the claims.

<details><summary>Full review</summary>

**Verdict: needs changes.** Core recipe right and reproduced, 4 real problems.

1. Container paragraph wrong for Planemo-managed runs. Planemo's generated job config adds `$defaults,<test-data>:<test-data>:ro` for Docker and Singularity (`_handle_job_config_file`, `gxjobconfinit`). `--job_config_file` replaces that config, so the note's advice added a machine-bound flag and dropped the rest of the generated config.
2. Fixed-state tables can't be detected and can miss staging. `find-test-data` has no workflow input, step 1 limits work to unresolved labels, and the chain skips the Mold when every label is resolved.
3. Nested `default_filename` invisible to run tooling. `run-classify.ts` and `run-manifest.ts` scan depth one only, and `npm run validate` doesn't catch it.
4. The test-plan symptom isn't prevented. No test-plan Mold mentions data tables, and the eval on `find-test-data` can't reach a plan.

Nits: "rules out" overstated `nextflow-to-galaxy-reference-data-mapping` (cite `nextflow-params-to-galaxy-inputs`); eval's value-to-table clause relied on free text and "path column" assumed a name; wrapper test databases are trimmed and should come from the pinned revision; `run-workflow-test` section should say a staged table is ignored outside the local managed engine; `sources:` gaps.

Checked and correct: search order, `.sample` fallback only in the first two directories, unsuffixed file silently ignored, flag replaces discovery, `${__HERE__}` per file, `docker_galaxy` and `external_galaxy` don't read the file. Probe rebuilt and reproduced: red exit 1 with the "no legal values" log line, green exit 0 with the staged path on the command line.

Not checked: container runtime behaviour, IWC CI's Planemo engine, whether the probe's wrapper exercised the shed-install table merge.

</details>
