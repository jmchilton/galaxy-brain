# Implementation debrief

```
created .../stock_tools_review_clean/differential-review/snapshots/20261127T173504Z-revision-5e553bfe3035.json
  revision @ 5e553bfe3035 vs origin/release_25.1 (merge-base fa9176afc8f9)
  since 20261127T143029Z-revision-6cfe8e271c16:
    commits: 0 same, 24 rebased, 0 changed, 2 new, 1 dropped
    hunks:   36 carried, 0 changed, 2 new, 2 dropped
    new     68d387e9b24a Fix Extract Genomic DNA custom-sequence branch under Python 3
    new     5e553bfe3035 Print msg on exit
```

**STATUS: READY**, with the decisions below. John asked for the branch to be retargeted from `release_26.1` to `release_25.1` (2026-11-27). The previous debrief, for the 26.1 version, is `earlier_drafts/3/implementation_debrief.md`, and its "What it is" still describes the change.

- **Head:** `5e553bfe303` on `jmchilton/stock_tools_review_clean`, 26 commits on `origin/release_25.1` (`fa9176afc8f`). It was force-pushed with a lease over `6cfe8e271c1`, and then over the intermediate `d3fcf209ffa`.
- **Alts:** the 26.1 version is `stock_tools_review_clean_alt_release_26_1` (`6cfe8e271c1`, pushed; `alts/release_26_1.md`). `_alt_original_scope` is unchanged.
- **History:** the first 24 commits are the 26.1 commits rebased with no conflicts, and each has the same patch-id. The branch's own one-line stderr commit was dropped. In its place are `git cherry-pick -x` backports of upstream #23411 (`bdc35a1f6c2`, `bec0bd9966b`, authored by Enis Afgan). They fix the same bug and are on release_26.2 and dev.

## What changed with the target

- **Files:** on the 30 files the branch touches, 25.1 differs from the old base in only two:
  - The Qiskit tool. 25.1 has the older one, with a `qiskitjson` configfile and no credentials block. The branch's `./` hunk applies unchanged.
  - One blank line in the Extract Genomic DNA script.
- **Two stock files are missing on 25.1:** `interactivetool_tensorboard.xml` and `harmonize_two_collections_list_1.0.0.xml`. Neither had findings, and the branch doesn't touch them.
- **Extract Genomic DNA:** the subagent review found that the branch's `b""` fix would conflict with dev's #23411 on a forward merge. Its other hunk would also merge silently and break the error path. The backport merges into 26.1, 26.2 and dev with no conflicts under `tools/`. It also reads until EOF, which removes the "exactly k MiB" spin noted last round, and exits 1 on failure.
- **Framework:** the review compared the 25.1 and 26.1 code for everything the branch relies on at job time: `fill_template`, wrappers and element identifiers, `is_of_type`, sanitization, upload1's `transform_lines`, and `__ARCHIVE_TYPE__`. Nothing differs on this path. `52c5f9dc180` (data_column rejection) is on 25.1, so the reason recorded for the remaining data_column findings still holds.

## Validation on 25.1

All runs were sequential. The worktree's `.venv` was re-synced to 25.1's pinned, dev and test requirements.

- **Analyser** (`tool_security_static_findings` extract): vulnerability findings go from 171 to 92, and files with any finding from 62 to 48. The same extract reproduces 170 → 91 and 62 → 47 on 26.1. The extra finding is Qiskit 25.1's low `configfile-injection` on the user's own `ibmq_account|token` preference. The branch doesn't touch it.
- **Render comparison** (`render_compare.py`, base vs head): the output is byte-identical between the 25.1 and 26.1 frameworks for every non-Qiskit case, 420 lines. A 25.1 Qiskit case shows the same `./` argv change as on 26.1.
- **Tool tests** (scratch `test_toolbox_pytest.py` copy, empty skiplist, seven-tool conf): 9 passed. They are joiner2, Extract Genomic DNA 5 and 6, gtf2bedgraph, axt_to_fasta, axt_to_concat_fasta, Extract_features1, and vcf_to_maf_customtrack1 ×2. Tests 5 and 6 were rerun after the backport and passed.
- **Negative check on 25.1:** with the base commands, joiner2 (`cannot find 'tmp'`) and Extract Genomic DNA 5 and 6 (str + bytes) fail. So the bugs these commits fix exist on 25.1.
- **Error path after the backport:** a malformed or missing FASTA reports faToTwoBit's own message and exits 1.
- **API:** the upload1 and history import selections from `test_challenges_debrief.md` gave 12 passed and 1 skipped. The skip, `test_import_export_failed_job`, needs a framework tool conf.
- **Lint:** the results match base, except that joiner2's added test clears "No tests found".
- **Normal review:** `subagents/review_retarget_25_1.md`. It found one should-fix (taken) and nits only.

Test challenges weren't regenerated. Two upstream commits were added and no tests changed. The earlier reviews still apply to the 24 rebased commits, because their patches are unchanged.

## Decisions for John

1. **Support window.** 25.1 (2025-12-12) leaves the one-year window around 2026-12-12. If the PR doesn't merge by then, release_26.0 is the policy target. The branch's own changes merge into it without conflicts.
2. **`./` and `--` argv changes.** You approved them for 26.1. I've assumed that carries over to 25.1, since you asked for the whole branch there.
3. **Nits from the review** (none acted on):
   - HiGlass is the most involved backport, with three commits and no Galaxy tests.
   - upload1's separator commit fixes no bug on 25.1; it exists only for the dev analyser.
   - ML Jupyter's `pull_repo` mode starts working for the first time, and nobody has checked that the image ships `git`.
4. **Qiskit on 25.1:** the remaining finding is left alone. The token is the user's own, and 26.1's rewritten tool (`profile="26.0"`) can't be backported. 25.1's config also points at IBM's classic `ibm_quantum` endpoint, which is probably retired. That is out of scope.
5. **Still open from the last debrief:**
   - The PR split (`scope_evaluation.md`). The two #23411 commits go with the functional fixes.
   - Codex, still blocked by the host sandbox.
   - The two behaviour questions: the export option string, and HiGlass name collisions.
   - Housekeeping: the `galaxy/higlass-it:1.0` image, and the local `stock_tools_review_clean_pre_reshape` branch.
   - Not adding joiner2 to the sample conf.
   - The items you deferred.
