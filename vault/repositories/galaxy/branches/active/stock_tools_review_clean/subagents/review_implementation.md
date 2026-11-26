Run via Claude Opus 5.5 at high effort.

**Coordinator:** I acted on finding 1, the duplicate-name collisions after slash replacement: ilastik's check now compares the replaced names, and the other tools were checked. I didn't act on these:
- **SIFT `data_column` in awk (finding 2):** it's in tool code this branch doesn't touch, and it's in the deferred analyser triage.
- **ml_jupyter `endswith` (finding 3):** the bug already exists on release_26.1, and fixing it changes behaviour. It's listed for John.
- **blat_wrapper (finding 4):** the quoting is partial, but the behaviour is kept.

**Reviewer's top line:** Nothing needs to be acted on before hand-off. This is a clean, carefully-verified branch: I re-rendered every changed command with Galaxy's own tool parser and confirmed argv is byte-identical for ordinary values on all behaviour-preserving commits, the upload1 unit test passes 9/9, every changed XML parses, and the joiner2 fix reproduces its committed expected output exactly (49 rows). I found no introduced or remaining exploitable issue that this branch is responsible for. The points below are two low/informational edges and some nits a maintainer PR might want to tidy; none block the hand-off.

Things I did **not** act on (read-only review) and why:
- The two low notes (slash→underscore filename collision; SIFT awk data_column) are either strictly-better-than-before edge behaviour or pre-existing untouched code already covered by the deferred analyser triage. Not regressions from this branch.
- The nits (partial quoting in blat_wrapper, a pre-existing ml_jupyter `endswith` bug adjacent to edited lines) are out of this branch's stated scope.

## Ranked findings

**1. (Low / informational) Distinct element identifiers can collide after `/`→`_` replacement — ilastik, HiGlass, Panoply/VRM/Phinch.**
`str(...).replace('/', '_')` maps two *different* identifiers such as `a/b` and `a_b` to the same filename, so the second `ln -s` / `cp` / `mv` can clash. In ilastik the earlier duplicate-identifier guard checks *raw* identifiers, so it won't catch a post-replacement collision. Severity is low because a slash-bearing name was already broken before this branch (it named a non-existent subdirectory and the command failed), so this is strictly an improvement for the common case. File refs: `tools/interactive/interactivetool_ilastik.xml:39`, `interactivetool_higlass.xml` (every `#set $safe_name = ...replace('/', '_')`), `interactivetool_panoply.xml:16`, `interactivetool_vrm_editor.xml:20`, `interactivetool_phinch.xml:15`. Suggested fix (optional): none required; if desired, derive the ilastik duplicate check from the post-replacement names so a genuine collision is reported instead of silently overwriting.

**2. (Low / informational, pre-existing & out of scope) SIFT (`hgv_sift`) data_column values flow into awk *program text*, not just argv.**
`sift_variants_wrapper.sh` builds awk source from `$chrom_col`, `$pos_col`, `$allele_col`, `$strand_col`, `$comment_col`. That is a sharper shape than the generic "leading dash" option-injection the analyser reports. However: (a) `tools/phenotype_association/sift.xml` and `sift_variants_wrapper.sh` are **not modified by this branch**; (b) a non-numeric column value is only accepted when the referenced dataset is empty/deferred (commit `52c5f9dc180`, already on this base, rejects otherwise); (c) Galaxy's sanitizer strips `$ ; & ' " ` and backtick, which blocks awk field injection and string-literal construction, so I could not demonstrate command execution — worst realistic case is an awk syntax error / failed job. This is exactly the "27 data_column findings → analyser change, deferred" bucket in the debrief. Flag it for whoever does the analyser work; no branch action. (Non-sensitive: public stock Galaxy code, already a documented finding class — no separate security report warranted.)

**3. (Nit) Pre-existing latent bug in `interactivetool_ml_jupyter_notebook.xml:119`, adjacent to edited lines.**
`#if not $cleaned_name.endswith(".ipynb"'$jupyter_notebook'):` passes a stray second argument to `str.endswith`. It is present on `origin/release_26.1` and the branch edits neighbouring lines but not this one, so a PR reviewer will see it in the diff context. Out of scope; optional to fix opportunistically. The "previous notebook" render path still produced identical before/after argv, so this branch introduces nothing here.

**4. (Nit) Incomplete quoting in `tools/metag_tools/blat_wrapper.xml:4`.**
Only `$source.dbkey` was quoted; `$input_query $output1 $iden $tile_size $one_off` stay unquoted. Behaviour is preserved and the targeted finding is reduced, but the quoting is partial. Acceptable under the stated scope (reduce findings without changing behaviour); no action needed. Same pattern (partial, deliberate) is fine elsewhere.

**5. (Confirmation) No version bumps required — reasoning is sound.**
Behaviour-preserving quoting/`is_of_type`/`./`-path commits do not change any tool output, and joiner2 + shrimp_wrapper failed on *every* prior job (template would not compile / `NotFound: tmp`), so no historical result changes. Galaxy convention bumps a stock tool's version only alongside a backup copy of the old version; a pure bug fix keeps the version. Matches the debrief and galaxyproject/galaxy#21648 precedent.

**6. (Observation) PR splitting / open questions look right.**
Commits are one-topic and cleanly separable: upload1 (commits 1–2, with a real "Baseline tests" commit first), the functional fixes joiner2 (`605f9b26407`) and shrimp_wrapper (`917c41da640`), and the per-tool quoting group. joiner2's test necessarily ships with its fix (no baseline can pass on the broken original); this is correctly explained. The two open questions for maintainers (Jupyter `./`+`--` and HiGlass argv reshaping changing *words* but not *meaning*; export option-string handling) are reasonable to raise rather than decide here.

## What I verified (details)

<details>

**Behaviour preservation (argv re-render, Galaxy `get_tool_source` + `fill_template`, `shlex.split` compare), before = `origin/release_26.1`, after = worktree:**
- Identical for ordinary values: liftOver (single/multiple), axt_to_lav / axt_to_fasta / axt_to_concat_fasta (typical + unknown build), gtf2bedgraph, interval2maf (cached/user), blat (database/history), beam, master2gd_snp (tab/no-tab), srma (incl. empty range), askomics, cellxgene (plain/var_names/unique), imp_history (url/file), extract_genomic_dna (gff / gff3-subclass / interval / history-ref), all four Jupyter tools' notebook paths (scratch/open/run/github).
- Differences are the expected, benign ones: `./`-prefixed working-dir filenames (Jupyter/HiGlass); `git clone --` (ml jupyter); HiGlass `echo` vs `echo ''` on the empty `uploaded_genomes` (both write one empty line); `-- `/optparse reordering in extract_GFF_Features and vcf_to_maf_customtrack (parsed options+positionals unchanged); single-word quoting of space-bearing values; `/`→`_` in names that previously named missing dirs and failed.

**Semantic checks:**
- `is_of_type('gff')` == old `isinstance($input.datatype, get_datatype_by_extension('gff').__class__)`: `is_of_type` → `datatype.matches_any([...])` → `isinstance(self, <gff class>)`, and `matches_any` also matches subclasses, identical to the old check; it additionally drops the `$__app__` read (capability reduction). `wrappers.py:472` / `data.py:967`.
- upload.xml separator: `<options>` default separator is `\t` (`dynamic_options.py:658`); writing `\t` literally is equivalent. Unit test pins `[Auto-detect, bed, fasta, tabular]`.
- imp_history `'--$__ARCHIVE_TYPE__'`: `__ARCHIVE_TYPE__` is the enum `url`/`file` (`schema.py:582`, set in `services/histories.py:285`/`managers/histories.py:388`), so it renders to the single token `--url`/`--file`, matching `unpack_tar_gz_archive.py`'s optparse `-U/--url`, `-F/--file`. Not user free-text.
- `--` end-of-options: extract_GFF_Features uses `doc_optparse` (optparse — honours `--`); vcf_to_maf_customtrack uses optparse `OptionParser` with options `-p/-s/-n/-g` before `--` and positionals (out_file, dbkey, inputs) after — `len(args) >= 3` preserved. `${vcf_source}` is a fixed `-p`/`-s` select, safe unquoted.
- BEAM wrapper: `'map=...'`/`'ped=...'` quoting is transparent to the `case $1 in map=*)` dispatch (shell strips quotes first).
- joiner2: rendered command reproduces committed `test-data/joiner2_out.tabular` exactly (49 rows, equal under sort); writes `input1.tmp`/`input2.tmp` to the job working dir (not beside the dataset), drops `rm -rf`, narrows `-k N` → `-k N,N` so sort and join compare the same field. New `<test>` uses `sort="true"`, appropriate since row order is locale-dependent.

**Tests / lint:** `test/unit/app/tools/test_select_parameters.py` 9/9 pass (`-p no:postgresql`). All 20 changed XML files parse under lxml.

**Spot-check of "false positive" triage:** `ncbi_datasets` `type="file"` param does use base `to_param_dict_string` and is sanitized (`basic.py:697`/`344`) — the "file params aren't sanitized" analyser claim is indeed a false positive, matching the debrief. The data_column "only when dataset empty" framing matches commit `52c5f9dc180` on-base.

Scratch scripts for this review: `/tmp/claude-1000/-home-ubuntu-projects-repositories-galaxy-brain-vault-agents-gx-workhorse/52deed79-ad2e-4e58-a0fe-98c0cdb37367/scratchpad/review/` (and the author's `render_compare.py` + `cases/`).

</details>
