# summary-nextflow models only the process body: config publishDir/ext.args (#665) and pipeline `bin/` helpers, including committed binaries

- Target: galaxyproject/foundry (`summarize-nextflow` schema `Process`, resolver, Mold §4/§5). Foundry tracking needed: yes. Config half: comment on #665; helper half: new, extends #665 item 3.
- Seen in: /home/ubuntu/foundry-runs/prose-nf2wb-hic-2026-11-01, phase 1, 2026-11-01. Ledger ids `snf-mold-config-process-settings-unmodelled` (gap, major), `snf-mold-bin-helpers-unmodelled` (gap, major; Mold half in local 131ad3b4, see 08).
- Existing issues/PRs: **#665** (open, `needs-triage`, rnaseq 3.27.0): no publishDir resolved from `conf/modules*.config`, no `ext.args`/`ext.args2`/`ext.prefix`, no `template` body. It does not mention `bin/` helpers. Downstream: #672 / PR #710 (open; galaxy-user-tool-authoring vendoring for `bin/` scripts and templates, scripts only). CLI tool-FK half is 16 item 32.

## Symptom
nf-core/hic 2.1.0 (`fe4ac656`):
- No module declares `publishDir`; all publishing, with params-gated `enabled:` (`save_reference`, `save_aligned_intermediates`, `save_pairs_intermediates`, `hicpro_maps`, `save_raw_maps`), and every `ext.args`/`ext.args2`/`ext.prefix` live in `conf/modules.config:46-288` `withName` blocks. That is where most user params reach command lines: `min_mapq` → `-q` (`:94`), `keep_multi` → `--multi` (`:93`), `min_insert_size` → `-s` (`:108`), `keep_dups` → `-d` (`:140`), `ext.args2 = !params.dnase ? "-F 4" :""` (`:54`). The correction pass filled `publish_dir` by hand and dumped the bindings into one warning string.
- 9 of 29 processes run pipeline-bundled helpers: six Python scripts, one bash script and two committed x86-64 ELF executables (`bin/build_matrix`, `bin/cutsite_trimming`; sources in `bin/src/*.cpp`). Their conda directive names an interpreter package (`conda "conda-forge::sed=4.7"` on TRIM_READS, `modules/local/hicpro/trim_reads.nf:5`; `python=3.9` on MERGE_STATS; `gawk=5.1.0` on MERGE_VALID_INTERACTION), and the CLI made that package the tool (sed, python, gawk). Nothing in the summary says the real executable is a repo file, or whether it is a script or a binary.
- The valid-pair, duplicate and statistics semantics live in those helpers, so the phase-2 brief had to cite them directly (`workflow-brief.md:81`).

## Root cause
One root, as #665 says: the summary reads a process as if the `process { }` body were all of it.
- Schema `Process` keys are `aliases, conda, container, in_subworkflows, inputs, meta, module_path, module_tests, name, outputs, publish_dir, script_excerpt, script_summary, tool, when`: no config directives, no template, no helpers.
- Mold §4 reads `publishDir` only as a process directive; nothing reads config `withName`/`withLabel` process settings except 16-19's `ext.when` proposal.
- Mold §5 (rev 21) nulls `tool` only when several packages are declared. A single interpreter package passes as "the" tool. The resolver has no `bin/` scan (16 item 32).
hic adds two cases #665 lacks: plain `bin/` scripts (Nextflow stages `bin/` onto PATH, so the script token is a bare command), and committed binaries, which cannot be vendored as script text at all (PR #710 covers scripts and templates only).

## Evidence
- `summary-nextflow.cli.json`: every `processes[].publish_dir` null; BUILD_CONTACT_MAPS/TRIM_READS → `sed`, MERGE_STATS/SAMPLESHEET_CHECK → `python`, MERGE_VALID_INTERACTION → `gawk` (SPLIT_COOLER_DUMP → `gawk` is right: inline `awk`, `modules/local/split_cooler_dump.nf:24`).
- `summary-nextflow.json` warnings `source fact (config bindings ...)`, `source fact (pipeline helpers, no schema field)`, `processes[].tool changed`; `phase1-notes.md` §2 "Helper scripts", §7 items 2-3.
- `file bin/*` (phase-1 probe): two ELF executables, six `#!/usr/bin/env python`, one bash.
- `template 'dumpsoftwareversions.py'` (`modules/nf-core/custom/dumpsoftwareversions/main.nf:23`): the #665 template case also occurs here.

## Proposed fix
Extend #665 rather than open a parallel issue:
1. #665 items 1-2 as written (publishDir from the selector chain, verbatim `ext.*` closures with selector and source path:line). Share the config reader with 16 fix 15 (`ext.when`).
2. Generalise #665 item 3 to `Process.helpers[]`: `{path, kind: script | binary | template, language, source_path?}`, detected by matching script-body command tokens against files in `bin/` and module `templates/`; for a binary, record `source_path` when `bin/src/` holds its source (hic: `bin/src/build_matrix.cpp`).
3. Mold §5: `tool` is null when the script runs a helper or template rather than the declared package (local 131ad3b4 already says this; 08 has the verdict), and the helper goes in `helpers[]` once it exists, not only `warnings[]`.
4. Integration case on nf-core/hic: TRIM_READS `tool == null`, `helpers[0] == {path: "bin/cutsite_trimming", kind: "binary", source_path: "bin/src/cutsite_trimming.cpp"}`; a `withName: 'GET_VALID_INTERACTION'` `ext.args` closure is carried verbatim.

## Draft issue
### Draft comment for #665
Second pipeline, nf-core/hic 2.1.0 (`fe4ac656`). Items 1-2 recur in full: no module declares `publishDir`, and `conf/modules.config:46-288` holds all publishing (params-gated `enabled:` for `save_reference`, `save_pairs_intermediates`, `hicpro_maps`, …) and every `ext.args`, which is where `min_mapq`, `keep_multi`, `keep_dups`, the insert-size filters and the DNase `-F 4` switch reach command lines.

Item 3 is wider than templates. 9 of 29 hic processes run pipeline-bundled `bin/` helpers that Nextflow stages onto PATH: six Python scripts, one bash script, and two committed x86-64 ELF executables (`bin/build_matrix`, `bin/cutsite_trimming`, sources in `bin/src/`). Their conda directive names only the interpreter (`conda-forge::sed=4.7`, `python=3.9`, `gawk=5.1.0`), so `processes[].tool` comes out `sed`/`python`/`gawk`. Proposal: generalise item 3 to `Process.helpers[] {path, kind: script|binary|template, language, source_path?}` detected from script tokens against `bin/` and `templates/`, and leave `tool` null when a helper does the work. A binary can't be vendored like a script; recording its source path lets downstream authoring rebuild instead.
