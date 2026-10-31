# Foundry has no model of the managed Galaxy's dependency resolver: runs pick conda by default, and the debug taxonomy has no environment surface

- Target: galaxyproject/foundry (`run-workflow-test` Mold, `planemo-workflow-test-architecture`, `debug-galaxy-workflow-output` and `galaxy-tool-job-failure-reference`). planemo's default is intended, so nothing goes to planemo. The broken conda environment for iuc `gtftobed12` 357 is a tools-iuc wrapper problem already filed as tools-iuc #3609. Foundry tracking needed: no (this is the Foundry issue); a comment for tools-iuc #3609 is drafted below.
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-chipseq-v0-2026-10-30, phase 10 attempt 1 and phase 11 (debug), planemo master 2a815808, Galaxy release_26.1, 2026-10-30. Ledger `run-workflow-test-silent-on-dependency-resolver` (major), `gtftobed12-357-conda-env-missing-libssl-1-0`, `debug-taxonomy-lacks-environment-surface`.
- Existing issues/PRs: none in Foundry (searched biocontainers, dependency resolver, environment). tools-iuc [#3609](https://github.com/galaxyproject/tools-iuc/issues/3609) (open, "ucsc tools: update and move") already quotes the same `libssl.so.1.0.0` error for gtfToBed12; tools-iuc PR #8684 (merged 2026-10-26) only fixed lint, requirements still `357`. Local Mold fix `38400847` (run-workflow-test rev 8, worktree `pipeline-run-chipseq`, not pushed).

## Symptom
Attempt 1 ran `planemo test` without `--biocontainers`. Conda was not on PATH, yet the job script activated a mulled-v1 conda env under `~/miniforge3`. iuc `gtftobed12` 357 (`gtfToGenePred`) exited 127: `libssl.so.1.0.0` not found. 156 jobs ok, 1 error; 32 min lost. The same changeset ran green under `--biocontainers` in the atacseq run. The debug phase had to file it under "tool/job" and argue the environment cause outside its taxonomy. The job API `dependencies` field was `[]` although a conda env ran.

## Root cause
1. Planemo-managed Galaxy resolves with conda unless told otherwise, and galaxy-tool-util finds a conda prefix by probing `~/miniforge3`, `~/miniconda3`, ... (`find_conda_prefix`, `lib/galaxy/tool_util/deps/conda_util.py:70-81` on release_26.1); planemo auto-installs conda if absent (`--conda_auto_init` default true, `planemo/options.py` `conda_auto_init_option`). "No conda on PATH" does not mean "no conda". This is intended behaviour.
2. The `run-workflow-test` Mold (rev 7, step 2) and `planemo-workflow-test-architecture` say nothing about the resolver; the Mold even says tools install "from the Tool Shed/conda". Nothing asks the run to choose or record it.
3. `debug-galaxy-workflow-output` step 1 (`index.md:87`) forces one of five surfaces (tool/job, invocation, collection, missing output, assertion). None is "environment / dependency resolution", and the job-failure reference has no loader-error (exit 127, missing `.so`) row or a way to tell which resolver ran a job.
4. Wrapper side: `tools/gtfToBed12/gtfToBed12.xml` on tools-iuc master still requires `ucsc-gtftogenepred=357` and `ucsc-genepredtobed=357`. Conda now solves that set with openssl 1.1.1w (`planemo.log` 2654-2691), but the 357 binaries link `libssl.so.1.0.0`. Only one installable shed revision exists (33de73363690), so there is no newer pin to switch to.

## Evidence
`run-summary.md` attempt 1; `workflow-debug-report.md` (attempt 1 triage); ledger entries 19-21; Tool Shed installable revisions for gtftobed12 (one).

## Proposed fix
1. Keep `38400847` (Mold step 2: choose the resolver deliberately, prefer `--biocontainers` + `--docker_extra_volume` when Docker exists, record it; eval property). Revise one sentence: say that conda is used even when it's not on PATH (`~/miniforge3` probe, auto-init), so "conda absent" is not a reason to skip the flag.
2. `planemo-workflow-test-architecture`: a short "Dependency resolution" section with the same rule and how to see which resolver ran a job (conda `activate` lines in the job script vs a container command line; `dependencies` in the job API can be empty).
3. Debug Mold: add an environment/dependency surface (or a tool/job sub-case) with its evidence (resolver seen in the job script, dependency solve log, exit 127 / loader stderr), routed to a harness fix, not a workflow edit. Add the loader-error row to `galaxy-tool-job-failure-reference`.
4. Optional tool-pin note: flag iuc gtftobed12 33de73363690 as container-only until tools-iuc #3609 lands.

## Draft issue
**Title:** Choose and record the managed Galaxy's dependency resolver; add an environment surface to the debug taxonomy

A wb2g nf-core/chipseq run (2026-10-30) ran `planemo test` without `--biocontainers`. Conda was not on PATH, but galaxy-tool-util found `~/miniforge3`, so Galaxy built conda envs, and iuc gtftobed12 357 died at load time (`libssl.so.1.0.0`, exit 127; tools-iuc #3609). The same changeset passes under `--biocontainers`. Nothing in `run-workflow-test` or `planemo-workflow-test-architecture` mentions the resolver, and `debug-galaxy-workflow-output` has no surface for an environment failure, so the triage filed it as a tool/job failure. The job API `dependencies` field was empty, so the reference's evidence table points at the wrong field.

Proposal: the Mold chooses the resolver (`--biocontainers` + `--docker_extra_volume` when Docker exists; conda only with a recorded reason) and records it; the architecture note explains how planemo picks conda; the debug Mold gains an environment/dependency surface with job-script, solve-log and loader-stderr evidence, routed to a harness fix.

**Comment for tools-iuc #3609:**
> Still reproducible on 2026-10-30: gtftobed12 357 (shed changeset 33de73363690, the only installable revision) under conda resolution solves `ucsc-gtftogenepred=357`/`ucsc-genepredtobed=357` with openssl 1.1.1w, and `gtfToGenePred` fails with `error while loading shared libraries: libssl.so.1.0.0` (exit 127). The BioContainers image works. Bumping the ucsc requirements (e.g. 4xx, which solve cleanly today) would fix conda users.
