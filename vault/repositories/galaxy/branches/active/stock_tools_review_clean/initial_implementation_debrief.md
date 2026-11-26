# Initial implementation debrief: stock_tools_review_clean

Branch `stock_tools_review_clean` on `origin/release_26.1` (`7e8075a360e`): 19 commits, pushed to `jmchilton/stock_tools_review_clean` (head `605f9b26407`). Only tool XML changes, one unit test, and one new tool test with its test-data file. The review is measured with the analyser from `jmchilton/tool_security_static_findings`, run from a scratch extract over the 204 stock XML files (172 under `tools/`, 32 under `lib/galaxy/tools/`).

Result: vulnerability findings go from 170 to 91, and files with any vulnerability finding from 62 to 47. Each of the 91 that remain is left for a stated reason (see below): upload1's exemption, an analyser false positive, a server-set value, or code John deferred. `uncheckable-template-code` and unchecked locations remain only on upload1, which is exempted.

## Decisions (John, 2026-11-26)

- **Disclosure:** push as is. The branch is pushed and tracking `jmchilton/stock_tools_review_clean`.
- **upload1:** exempted in the review (see below).
- **Data source size limit:** not now. The 26 data source tools are left as they are (section below).
- **Fix joiner2 and shrimp_wrapper** so they work as their authors intended, keeping ids and inputs. Done in commits 18 and 19.
- **Deferred:** HiGlass `uploaded_genomes`, the sample_sheet_to_tabular newlines, and all analyser changes.

## Commits

1. `0803734dbf3` Baseline tests for upload1's file_type options: unit test in `test/unit/app/tools/test_select_parameters.py`, passing before the change.
2. `a1decd9f417` Write upload1's file_type option separator literally.
3. `1bbe234424e` Quote liftOver's numeric arguments in its command.
4. `ad4a401d03f` Quote the axt converters' arguments in their commands (`axt_to_concat_fasta`, `axt_to_fasta`, `axt_to_lav`).
5. `d690f3bbb63` Quote gtf2bedgraph's arguments in its command.
6. `0a7d85cb87a` Quote interval2maf's build and species options.
7. `3a8cd9c4eb9` Quote blat_wrapper's genome build argument.
8. `05d69b88157` Quote BEAM's and master2gd_snp's file and build arguments.
9. `55841453027` Quote SRMA's range option.
10. `d7f75b38363` Quote AskOmics' user name and cellxgene's --var-names value.
11. `820f347112d` Pass notebook names to cp and jupyter as ./ paths in the Jupyter tools (Jupyter 1.0.0/1.0.1/1.0.3, ML and Qiskit). The ML notebook's `git clone` also gets `--` before the URL.
12. `2b4b7cb8fa6` Replace slashes in dataset names that Panoply, VRM Editor and Phinch use as file names.
13. `d549aac528b` Quote element identifiers in ilastik's command with shlex.quote.
14. `c437a0ec8ae` Quote HiGlass' file names and values in its command.
15. `a5a116687d3` Quote the history import tool's archive type option.
16. `1356cb2d074` Check for GFF input with is_of_type in Extract Genomic DNA.
17. `4e5b690b17d` End options before the positional arguments of two optparse tools (`Extract_features1`, `vcf_to_maf_customtrack1`).

18. `917c41da640` Fix the paired-end branch of SHRiMP's command template.
19. `605f9b26407` Write Relational join 2's sorted inputs to the working directory (adds a `<test>` and `test-data/joiner2_out.tabular`).

Commits 1–2 are the upload1 PR. The rest are per-tool or small groups and can be split however is convenient.

## joiner2 and shrimp_wrapper fixes

**Versions:** neither tool's version is bumped. Stock tool versions are bumped only with a backup copy of the old version, so existing workflows keep resolving it; see the discussion on galaxyproject/galaxy#21648, where a grep fix's bump was reverted (`e5027b0f5b5`). A bug fix keeps the version. Both tools failed on every job before, so no earlier result changes.

**shrimp_wrapper (`917c41da640`)**
- **Fix:** removed the stray `)` from the paired-end `#elif`. The template now compiles.
- **Review:** its one finding is a low `option-injection` on `'$param.spaced_seed'`. That is the same positional-script false positive as shrimp_color_wrapper, and the script only accepts a digits-only seed.
- **Proof:**
  - The tool's `<test>` can't run here. `rmapper-ls` (SHRiMP 1.x) isn't on bioconda, and the test's data files (`shrimp_phix_anc.fa`, `shrimp_wrapper_test1.fastq`) aren't in `test-data/`.
  - Instead, I rendered all four branches (single/paired × skip/full). Before the fix each failed with a Cheetah `ParseError`.
  - I ran each rendered command with the real `shrimp_wrapper.py`, a stub `rmapper-ls` on `PATH`, and small FASTQ and FASTA inputs. All four exit 0. The wrapper passed the expected `-s … -h …` options and files to the mapper, and the single-end runs produced the coordinate table.
  - This proves the template and wrapper plumbing, not SHRiMP's alignments.

**joiner2 (`605f9b26407`)**
- **What was wrong:** `$input1.tmp` was an attribute lookup on the dataset, so every command build raised `NotFound: cannot find 'tmp'`.
- **Fix:**
  - Each input is sorted on its join column into a file in the job's working directory: `sort -k 'N,N' '$input1' > input1.tmp`.
  - The two files are joined with `join -1 N -2 M`, and the output still goes through `tr " " "\t"`.
  - The steps are chained with `&&`. The `rm -rf` is dropped, because the working directory is cleaned with the job.
  - The sort key is narrowed from `-k N` (field to end of line) to `-k N,N`, so `sort` and `join` compare the same field in any locale.
- **Review:** no findings.
- **Proof:**
  - **New `<test>`:** joins `1.bed` and `2.bed` on column 2. The expected output was generated by running the rendered command and checked against an independent Python join: 49 rows, same set. Lines are compared sorted, because row order depends on the locale.
  - **Framework runner:** passes with the fix. The same test against the original command fails (`cannot find 'tmp'`).
  - **No baseline commit:** a baseline-tests commit wasn't possible, since no test can pass on the original. The test goes in with the fix.

## upload1

Exempted in the review (decision 2026-11-26). The exemption is implemented in the review and refusal code on the dev-based security branches, not here. This branch keeps `$getVar('output%i')` and `'$paramfile'` unchanged and makes no Galaxy code change for upload1.

- **Changed:** the `file_type` options' `transform_lines` wrote `self.separator`. `<options>` has no `separator` attribute, so it was always the default tab, and the expression now writes `\t` itself. This drops the `inputs` `template-reflection` finding. The baseline test loads the real `upload.xml` `file_type` param with a mock registry and pins the options: Auto-detect, then sorted `(ext, ext)` pairs. It passed before and after, and fails if the separator is broken.
- **Why `getVar` can't go with a tool-only change:**
  - upload1 has no `<outputs>`; `upload_common.create_job` adds `output0..N`, one per uploaded dataset. Their count isn't derivable from `$files`.
  - Nothing in `param_dict` lists the outputs.
  - The analyser models only declared outputs, so looping over a Galaxy-provided list swaps the reflection finding for a low `option-injection`.
- **`$paramfile`:** a false positive. `ToolEvaluator.build_param_dict` sets it to `<job dir>/upload_params.json` after sanitizing, and `upload.py` reads its arguments by position.

Branch 3 (`jmchilton/tool_security_runtime`, default `enforce_code` + `strict`): I ran its `ToolSecurityReviewer.check_job` from an archive, on upload1 variants with realistic job values.

| Variant | Real paramfile, `enforce_code` | Real paramfile, `enforce_data` / `enforce_all` | paramfile `-x`, `enforce_code` | paramfile `-x`, `enforce_data` / `enforce_all` |
|---|---|---|---|---|
| Today (`getVar` loop + `$paramfile`) | refused `uncheckable-template-code` | refused `uncheckable-template-code` | refused `uncheckable-template-code` | refused `option-injection` |
| `$paramfile` only (`getVar` resolved) | runs | runs | runs | refused `option-injection` |
| Loop over a Galaxy-provided output list, no analyser change | runs | runs | runs | refused `option-injection` |
| Paramfile as a Galaxy-written configfile | runs | runs | runs | runs |

- A low `option-injection` never refuses a real upload1 job. It is enforced only from `enforce_data` on, and `check_job` runs after `build_param_dict` has set the real absolute path.
- Only the reflection, through `uncheckable-template-code`, refuses today's jobs, at every level. So exempting upload1 in the review covers it.

## Before and after (204 files)

Vulnerability findings:

| Rule | Severity | Before | After |
|---|---|---|---|
| shell-injection | high | 15 | 1 |
| nested-interpreter | high | 1 | 0 |
| nested-interpreter | low | 1 | 1 |
| configfile-injection | high | 4 | 4 |
| configfile-injection | low | 4 | 4 |
| path-traversal | medium | 11 | 0 |
| argument-injection | medium | 34 | 2 |
| argument-injection | low | 13 | 9 |
| option-injection | low | 87 | 70 |
| **Total** | | **170** | **91** |

Other measures:

| Measure | Before | After |
|---|---|---|
| Files with any vulnerability finding | 62 | 47 |
| Files whose worst vulnerability is high / medium / low | 5 / 19 / 38 | 2 / 2 / 43 |
| Files with no findings at all | 85 | 90 |
| `uncheckable-template-code` | 2 (upload1, extract_genomic_dna) | 1 (upload1) |
| Classified unchecked locations | 3 | 1 (upload1) |
| Capability: `template-app-access` | 27 | 26 (Extract Genomic DNA no longer reads `$__app__`) |
| Capability: `template-reflection` | 3 | 1 (upload1's `getVar`) |

All other capability counts are unchanged. Reports: `before.json` and `after2.json` (after the joiner2 and shrimp_wrapper fixes) in this session's scratchpad. They hold per-tool detail, so they stay out of the vault.

### The 91 remaining vulnerability findings, by reason

| Findings | Reason | What's needed |
|---|---|---|
| 1 | upload1 `$paramfile` | Exempted. |
| 40 | Low `option-injection` on quoted values passed to a shipped script that reads `sys.argv`/`@ARGV`/`$1..` by position. Tools: genbank, liftOver, CreateInterval, axt ×2, changeCase, cutWrapper, fixedValueColumn, gff_filter_by_attribute, gff_filter_by_feature_count, gtf2bedgraph, the cellxgene configfile script, nine MAF tools, blat, shrimp_color, shrimp_wrapper, sift's shell wrapper, bar_chart, gsummary. | Analyser change. A leading dash can't make these values options. |
| 27 | `data_column` values: joiner, mergeCols, sorter, maf_by_block_number, linkToDavid, linkToGProfile, lps, sift, bar_chart, grouping, higlass `valuecol`. | Analyser change. Since `52c5f9dc180` (in release_26.1 and the analyser branch), Galaxy rejects non-numeric columns when it can't check them. The analyser still taints them "only when the referenced dataset is empty". |
| 5 | Export tools' `__EXPORT_HISTORY_COMMAND_INPUTS_OPTIONS__` (a multi-word option string the action builds on the server, split on purpose) and `__EXPORT_TO_URI__` (set by the action) | Analyser change, or a framework change that passes them as separate parameters. |
| 4 | maf_filter: `${repr(value)}` in a Python configfile | Analyser change. `repr()` of a `str` is a Python string literal, but the analyser only treats `repr` of a list as escaped. |
| 3 | Values that follow `--`: Extract_features1 (1) and vcf_to_maf_customtrack1 (2) | Analyser change. Its shell model ends options for the next word only. |
| 3 | Data configfiles that are a single user value (grep and grep 1.0.1 pattern files; data_fetch's `request_json`). A newline only adds the user's own patterns, or is JSON whitespace. | Analyser change. |
| 2 | history import: `b64encode()` output in option position | Analyser change. The analyser's encoder alphabet includes `-` and `_`, which only `urlsafe_b64encode` produces. |
| 2 | HiGlass `uploaded_genomes` | Deferred (John): it is a string used as a dict, so this is dead or crashing code. |
| 1 | HiGlass dbkey echoed inside `#if dbkey in $existing_genomes` | Analyser change. It doesn't narrow a value tested for membership in a literal list. |
| 1 | gpass: `${base_name}` inside a word that begins with `${extra_files_path}/` | Analyser change. It counts any value in a word that starts with a placeholder as leading the word. |
| 1 | ncbi_datasets: `type="file"` param | Analyser change. The analyser says file params aren't sanitized, but `FileToolParameter` uses the base `to_param_dict_string` and is sanitized (checked: `a'b;c` renders as `a__sq__bXc`). |
| 1 | sample_sheet_to_tabular: an element identifier with a newline adds a row to the output table | Deferred (John). |

Other analyser gaps seen while fixing, and how I handled them:
- The analyser treats any argument of `echo` or `printf` that starts with a value as an option. ilastik uses a real indent instead, `echo '  '<name>`.
- `shlex.quote()` drops the value's known start.
- `base64` isn't in the harmless-module list (`template-import` medium on the history import tool).

## How behaviour was checked

- **Render comparison:** `render_compare.py` in the scratchpad renders each changed tool's command and configfiles at `HEAD`/base and at the working tree, with probe values, and compares the `shlex.split` argv. Cases covered every branch of each changed template.
- **Argv identical for ordinary values:** liftOver, axt ×3, interval2maf, blat, BEAM, master2gd_snp, SRMA (including an empty range), AskOmics, cellxgene, imp_history, Extract Genomic DNA (gff, gff3 subclass, interval, history reference).
- **Expected, harmless differences:**
  - Jupyter tools: `./` prefixes on the same working-directory files, and `git clone --`.
  - HiGlass: `./` on the bigbed intermediate files, and `echo ''` where it printed an empty line before.
  - ilastik: duplicate names in its error message are indented.
  - Values with spaces are now one word (gtf2bedgraph, HiGlass, ilastik).
  - Names with `/` become `_` (Panoply, VRM Editor, Phinch, ilastik, HiGlass); before, they named missing directories and the command failed.
- **optparse tools:** I fed the before and after argv to each script's own parser (`doc_optparse` for Extract_features1, the script's `OptionParser` options for vcf_to_maf_customtrack). Options and positional arguments parse identically.
- Every changed XML parses with lxml (`xmllint` isn't installed on this host). ruff, black and isort are clean on the one changed Python file.

## Tests

- **Unit:** `test/unit/app/tools/test_select_parameters.py`, 9/9 pass before and after the separator change.
- **Tool tests (framework runner):** a tool conf of the 12 changed tools that have `<tests>`, run on the branch and on base `7e8075a360e` from an archive. Conda was off, and `builds.txt.sample` was used for the dbkey tests.
  - Branch and base gave identical results and identical errors.
  - Pass on both (6): Extract_features1 (1), gtf2bedgraph (1), vcf_to_maf_customtrack1 (2, after installing `galaxy_sequence_utils` into the venv), axt_to_concat_fasta (1), axt_to_fasta (1).
  - Fail on both, environment (4): blat_wrapper (no blat binary), master2gd_snp (output differs only in the test input's dbkey, `?` vs `hg19`), srma_wrapper (2: no reference data table, and a Python 3 bug in the wrapper).
  - Skipped on both (10): Extract genomic DNA ×7 and Interval2Maf1 ×3 are in the framework skiplist.
  - Not collected: liftOver1 and hgv_beam.
  - So Extract Genomic DNA's `is_of_type` change and liftOver are covered only by render comparison.
- **API:** run one after the other with pytest directly. This host needs `-p no:postgresql`, and `run_tests.sh` failed loading the postgresql plugin.
  - `lib/galaxy_test/api/test_tools_upload.py`: 70 passed, 1 skipped, 6 failed. All 6 failures were `dbkey 'hg19'` invalid because the test server's builds list was empty. Rerun with `builds_file_path=tool-data/shared/ucsc/builds.txt.sample`, `test_upload_dbkey`, `test_upload_multiple_files_*` and `test_multiple_files_posix_lines` (7) all pass. So all of the file passes.
  - `lib/galaxy_test/api/test_libraries.py` (its legacy library uploads go through upload1): 36 passed, 2 skipped.
- **Interactive tools:** none have tests. Covered by render comparison only.
- **joiner2 and shrimp_wrapper:** see their section above.
  - joiner2's new framework test: 1/1 passes, and fails against the original command.
  - shrimp_wrapper: the template renders in all four branches, and all four run end to end against a stub mapper. Its `<test>` can't run here (no SHRiMP 1.x binary, data files missing).

## Tools left alone on purpose

- **Security test examples:** confirmed that no security test or spec case in the three security branches uses a shipped tool. They use `test/functional/tools/` and `lib/galaxy/tool_util/security/spec/tools/`. The only stock-shaped text is a synthetic snippet in `test_review.py` that copies upload's `value_from` conditional.
- **upload1:** exempted, as above.
- **Deferred by John:**
  - HiGlass `uploaded_genomes`. It is initialised as `""` and then assigned by key, so a labelled chromosome-size upload that matches a built-in genome raises `TypeError`, and the bedgraph branch for a custom genome indexes a string. Making it `{}` would make that feature work, which is a behaviour change. The two remaining lows are on this code.
  - sample_sheet_to_tabular. An element identifier containing a newline adds a row to the output. Replacing newlines changes the output for such identifiers.
  - Export tools' option string (above): it needs a framework change, not a tool change.

## Remaining capability findings (inherent)

| Rule | Count | Tools | Why it stays |
|---|---|---|---|
| `capability-network` | 71 | data sources and interactive tools, plus a few commands that name URLs or run `curl` | That is the tools' purpose. |
| `capability-container` | 38 | interactive tools | They run in their images. |
| `template-app-access` | 26 | data-source tools | They read `$__app__.config.output_size_limit` to pass `data_source.py` its size limit. Removing it needs a Galaxy change; see the next section. |
| `tool-sanitize-off` | 26 | the same data-source tools | They pass URLs from the remote site unsanitized. |
| `capability-api-key` | 17 | interactive tools | They talk to Galaxy as the user. |
| `capability-privilege` | 5 | geoexplorer, guacamole, ilastik, radiant, rstudio_bioc | `chown` or `sudo` inside their containers. |
| `capability-background` | 4 | bam_iobio, ethercalc, openrefine, rstudio | They start their servers with `&`. |
| `capability-persistence` | 1 | paraview | `service`. |
| `tool-code-file` | 5 | microbial_import, axt_to_lav, lav_to_bed, maf_to_bed, maq_cs_wrapper | Legacy `<code>` hooks. Removing them changes behaviour. |
| `template-import` | 2 | export_remote, imp_history | `galaxy.util.filesystem_safe_string`, and `base64`. Both are needed; `base64` could be added to the analyser's harmless modules. |
| `template-reflection` | 1 | upload1 | `getVar`, exempted. |

Gratuitous capability uses that were removed: Extract Genomic DNA's `$__app__` / `__class__` datatype check, and upload1's `self.separator`.

## Data source tools and `$__app__.config.output_size_limit`

**Decision (John, 2026-11-26): not now.** These tools are unchanged on this branch. The analysis below is kept for later.

At branch 3's default (`enforce_code` + `strict`), this read gives `uncheckable-template-code`. That refuses every job of the 26 stock data-source tools that use it (all of `tools/data_source/` with `tool_type="data_source"` except ncbi_datasets), 17 of them in the sample tool_conf. It is probably the largest remaining set of stock refusals. There is no tool-only fix that keeps behaviour, so I changed nothing.

**What the value is:**
- Each command is `python '$__tool_directory__/data_source.py' '$output' $__app__.config.output_size_limit`.
- `data_source.py` takes the limit only from `argv[2]` (0 when it is missing). It refuses a download whose `Content-Length` is above a non-zero limit.
- `config.output_size_limit` is `int(kwargs.get("output_size_limit", 0))`. It is not in `config_schema.yml`; `doc/source/admin/jobs.md` says job_conf `<limits>` replaced it. So it is 0, meaning no check, unless an admin still sets the legacy key. It can't be None.
- The job_conf `output_size` limit is enforced separately for all jobs by `JobWrapper` from the job's output sizes, so that limit is unaffected either way.

**Where else the script could get it:** nowhere today. The JSON params that `DataSourceTool.exec_before_job` writes into the output file carry only `GALAXY_DATATYPES_CONF_FILE`, `GALAXY_ROOT_DIR` and `TOOL_PROVIDED_JOB_METADATA_FILE` in `job_config`.

**Pulsar and remote compute:** the number is rendered into the command on the Galaxy side at job prep, so Pulsar sees a literal. The JSON params are also written by Galaxy before the job and staged with the output, so a value moved there reaches remote compute the same way.

**Options:**
- **Smallest Galaxy-side change, safe for 26.1 (recommended):**
  1. Add `OUTPUT_SIZE_LIMIT=app.config.output_size_limit` to `json_params["job_config"]` in `DataSourceTool.exec_before_job`.
  2. In `data_source.py`, use `params["job_config"].get("OUTPUT_SIZE_LIMIT")` when present, falling back to `argv[2]`, then 0. Keep the fallback for third-party data source tools that still pass the argument.
  3. Drop the argument from the 26 XMLs.

  No analyser change is needed, because the command keeps only `'$output'`. That is about 5 Python lines plus the XML edits.
- **Same approach as upload1's paramfile:** set a `param_dict` key in `build_param_dict`. This needs an analyser change too, because the analyser would treat the new name as a tainted job parameter.
- **Drop the argument only:** a behaviour change for deployments that still set the legacy key, since their data-source downloads would no longer be refused up front. The job_conf limit would still apply where configured.

## Decisions for John

Resolved 2026-11-26 (see "Decisions" at the top):
- joiner2 and shrimp_wrapper: fixed.
- HiGlass `uploaded_genomes`, sample_sheet newlines, analyser changes: deferred.
- Data source size limit: not now.
- Disclosure: pushed as is.

Still open:
1. Export tools: keep the server-built option string and accept its findings, or split it into separate job parameters in `history_imp_exp.py`?
2. The `./` and `--` argv changes in the Jupyter, HiGlass and optparse commits change the words passed but not their meaning. Are those acceptable for a release_26.1 PR?

Not done yet: the normal review subagent, and the snapshot and hardening steps.
