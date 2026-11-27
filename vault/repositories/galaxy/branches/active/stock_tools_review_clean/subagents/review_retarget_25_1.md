# Review: retarget of stock_tools_review_clean to release_25.1

**Acted on:** the should-fix. `d3fcf209ffa` was replaced by `git cherry-pick -x` of upstream `bdc35a1f6c2` and `bec0bd9966b` (#23411, Enis Afgan's authorship kept). The new head is `5e553bfe303`. Extract Genomic DNA tests 5 and 6 pass with the faToTwoBit env, and the bad and missing FASTA paths report faToTwoBit's message and exit 1. `git merge-tree` against 26.1, 26.2 and dev gives no conflicts under `tools/`. **Not acted on:**
- All the nits. HiGlass's size, upload1's separator fixing no bug on 25.1, and ML Jupyter's `git` question are recorded for John.
- The 25.1 support window closing around 2026-12-12. This is a decision for John.
- The Qiskit 25.1 configfile finding. It affects only the user's own job, and 26.1's rewritten tool can't load on 25.1.

Run via Claude Opus 5.5 (`claude-opus-5-5`).

**Verdict:** the retarget is sound. Nothing the branch relies on behaves differently at job time on 25.1. The command-building path (`fill_template`, the parameter wrappers, element identifiers, `is_of_type`, `transform_lines`, the history import action) is the same code on 25.1 and 26.1. 25.1 is the right target: `v25.1.0` is dated 2025-12-12, so it is the oldest release still inside the one-year window.

One should-fix: Extract Genomic DNA's stderr bug is already fixed upstream by galaxyproject/galaxy#23411 (`bdc35a1f6c2`, plus follow-up `bec0bd9966b`). That fix is on dev and release_26.2 but not on 26.1 or 25.1. The branch's `d3fcf209ffa` fixes the same lines a different way. Merged forward into 26.2 or dev, it conflicts on one hunk. Its other hunk merges silently into code where `stderr` is already a `str`, so it breaks the error path that both fixes repair. Replacing `d3fcf209ffa` with cherry-picks of the two upstream commits merges forward cleanly. No security issues were found.

## Findings

### Blocker

None.

### Should-fix

**1. Replace `d3fcf209ffa` with a backport of galaxyproject/galaxy#23411.**
- **Evidence:**
  - `git log --oneline origin/release_25.1..origin/dev -- tools/extract/extract_genomic_dna.py` lists `bdc35a1f6c2` ("Fix Extract Genomic DNA custom-sequence branch under Python 3", Enis Afgan, 2026-08-29) and `bec0bd9966b` ("Print msg on exit").
  - `gh pr view 23411` reports it was merged into dev on 2026-08-31 with milestone 26.2. `git merge-base --is-ancestor` puts it on release_26.2 and dev, and not on 26.0 or 26.1.
  - The branch record doesn't mention it.
- **Merge-forward hazard:** `git merge-tree --write-tree origin/dev HEAD` (the same happens with `origin/release_26.2`) gives `CONFLICT (content)` in `tools/extract/extract_genomic_dna.py`, at `chunks = []` against `stderr = b""`. The branch's second hunk, `raise Exception(stderr.decode(errors="replace"))`, merges without a conflict into dev's code, where `stderr = b"".join(chunks).decode(errors="replace")` is already a `str`.
  - If whoever resolves the merge takes dev's side of the conflict, every faToTwoBit failure reports `'str' object has no attribute 'decode'` in place of faToTwoBit's own message. That is the same kind of bug the commit fixes.
- **The upstream version is also better:**
  - It reads in chunks until EOF. That removes the "stderr exactly k MiB" spin noted in `review_revision.md`.
  - It exits non-zero on failure (`sys.exit(msg)`). Before, `stop_err` exited 0 and Galaxy caught the failure only from stderr.
- **Checked:**
  - I simulated the swap with plumbing only, without touching the worktree: `merge-tree --merge-base` cherry-picks of `bdc35a1f6c2` and then `bec0bd9966b` onto `HEAD~1`, with `commit-tree`, giving `a671a13451c`.
  - Both picks apply cleanly to 25.1.
  - Merging the result into `origin/release_26.1`, `origin/release_26.2` and `origin/dev` gives no conflicts in `tools/`, and the merge into dev leaves `extract_genomic_dna.py` identical to dev.
- **Action:**
  - Drop `d3fcf209ffa`, cherry-pick the two upstream commits with `-x`, and rerun Extract Genomic DNA tests 5 and 6 with the faToTwoBit env from `test_challenges_debrief.md`.
  - The exit-code change affects the file's other `stop_err` caller, the missing-sequence path. That tool has no profile, so stderr already failed those jobs; the job state doesn't change.

### Nits / judgment calls

**2. HiGlass is the most involved change for an older stable branch.**
- The three HiGlass commits (`f0dd8c1fc28`, `149a8e10de9`, `c5246f310a2`) restructure the whole loop over six type branches.
- The tool has no Galaxy tests, isn't in `tool_conf.xml.sample`, and has been checked only by render comparison and the container experiment in `review_rescope.md`.
- Galaxy's policy says intricate fixes push toward newer releases, and serious ones toward older. The record says John chose to publish fixes the triage judged exploitable, so keeping HiGlass on 25.1 is defensible.
- Split it off only if John wants the 25.1 diff minimal. Merged forward, it lands the same either way (see "Merge-forward" below).

**3. upload1's separator commit (`0d2716dda66`) has no bug to fix on 25.1.**
- `DynamicOptions.__init__` sets `self.separator = elem.get("separator", "\t")` before `load_from_parameter` evaluates `transform_lines` (`lib/galaxy/tools/parameters/dynamic_options.py:651` and `:635` on 25.1). So both the old and new expressions produce tab-joined lines. The `\t` in the XML attribute is a Python escape inside the eval'd string, so XML attribute normalisation doesn't touch it.
- It is a zero-risk no-op whose only purpose is the dev-based analyser. upload1 is also exempted in that review on branches 3 and 4.
- Fine to keep. If the PR is split, it fits better with the analyser work than with a 25.1 bug-fix PR.

**4. ML Jupyter `pull_repo` (`84c34319800`) turns on a mode that has never worked on any release.**
- The mismatch dates from `a55a56938b6` (2024-05-24).
- `REVIEW_FOCUS.md` prefers rejecting never-working input over supporting it. Removing the option would be the alternative, but it is a bigger UI change on a stable branch, and John already took this fix.
- It is still unverified whether the image ships `git`. If it doesn't, the job fails with a different error and no worse.

**5. The support window is short.**
- 25.1 leaves the one-year window around 2026-12-12.
- If the PR isn't merged by then, the policy points at release_26.0. The branch merges into 26.0 with no conflicts of its own (see "Merge-forward" below).

**6. The record still describes the 26.1 base.**
- In `index.md`, the Status section (head `6cfe8e271c1`) and the first Decision ("Clean branch on `origin/release_26.1`") still describe the pre-retarget state.
- The frontmatter and the PR link are updated.

## Details

### Q1: does anything behave differently on 25.1 at job time?

I compared the 25.1 and 26.1 framework code on the job-time path (`git diff origin/release_25.1 origin/release_26.1 -- <file>`) and read the 25.1 code in the worktree.

- **`lib/galaxy/util/template.py`:** the only difference is the `try/except ImportError` around `past.translation.myfixes`; the fixer list is the same. `fill_template` is identical: compile, the TreeDict / Python 2 retry on `NotFound`, and futurize. `#import shlex`, `#import re` and `#import os` compile into ordinary module imports on both. The ct3 pin differs only by a post-release (`3.4.0` on 25.1, `3.4.0.post5` on 26.1), and the venv now runs 3.4.0, so the established 25.1 renders already used 25.1's Cheetah.
- **Profiles:** HiGlass has no profile, so the Python 2 retry is enabled. ilastik is 23.0 and ML/Qiskit are 22.01, so they render as Python 3. That is the same on both releases. Nothing the branch added relies on the retry: in the ilastik comprehensions, the iterable is a top-level `$infiles` and the other names are plain locals.
- **`lib/galaxy/tools/wrappers.py`:** differs only in typing and import moves, plus a new unused `ElementIdentifierMapper.identifiers_by_dataset`.
  - `DatasetFilenameWrapper.element_identifier` (`wrappers.py:423`) returns the raw collection identifier, or `self.name` from the safe-string-wrapped dataset when there is none. That is the same on both, so the branch's `shlex.quote` and `replace('/', '_')` are needed and correct on 25.1 too.
  - `is_of_type` (`wrappers.py:472`) is present and identical: `datatypes_registry.get_datatype_by_extension` → `self.dataset.datatype.matches_any`.
- **`lib/galaxy/tools/evaluation.py`:**
  - The differences are expression error reporting, `validated_tool_state` / `runtimeify` for user-defined tools, the materializer's user context, and `_link_config_file`, which only matters for configfiles with an explicit `filename`. None of the touched tools has one; only the Jupyter/Qiskit `inputs` element uses `filename`, and the branch doesn't change it.
  - `__user__` is a `RawObjectWrapper` on both (`evaluation.py:674`).
- **`sanitize.py`:** 26.1 replaces `eval` of `string.*` presets with `getattr`. The presets resolve the same, so default sanitization of text, genomebuild and select values is the same.
- **`data_column`:** `52c5f9dc180` ("Reject non-numeric data_column values on deferred datasets") is on 25.1 (`git merge-base --is-ancestor 52c5f9dc180 origin/release_25.1`). So the debrief's reasoning for the 27 remaining `data_column` findings holds on 25.1. The rest of the `ColumnListParameter` diff is option listing (metadata `get_if_set`, `usecolnames`), not job-time values.
- **upload1:** `transform_lines` is evaluated with `{"self": self, "obj": obj}` on 25.1. 26.1 only adds an `is_loading_untrusted_tools()` short-circuit, which doesn't apply to stock tools. Paramfile handling in `upload_common.py` differs only in a comment.
- **History import:** `__ARCHIVE_TYPE__` comes from `managers/histories.py:366` and goes through `ImportHistoryToolAction` (`actions/history_imp_exp.py:103`) on 25.1. `unpack_tar_gz_archive.py` differs only in tuple-unpacking style; `-U/--url` and `-F/--file` are unchanged.

### Q2: each change as a 25.1 backport

| Commit(s) | Kind | 25.1 fit |
|---|---|---|
| `0d2716dda66` upload1 separator | no-op for the analyser | Fine, but no 25.1 bug (nit 3) |
| liftOver, axt ×3, gtf2bedgraph, interval2maf, blat, BEAM/master2gd_snp, SRMA, AskOmics/cellxgene, history import | quoting | Good: simple, behaviour-preserving for ordinary values |
| `ef121899116` Jupyter `./` and `git clone --` | argv hardening | Good. John's 26.1 reasoning (same meaning) applies unchanged |
| `8bb5e2fe6a5` ML `.ipynb` suffix | real bug (`".ipynb"'$jupyter_notebook'` concatenation) | Good |
| `14895a25708` Panoply/VRM/Phinch slashes | names with `/` failed before | Good |
| ilastik ×3 | quoting + duplicate check on link names | Good. No working job changes (names with `/` failed before) |
| HiGlass ×3 | restructure + quoting | Acceptable; most intricate (nit 2) |
| `c8085fced98` `is_of_type` | drops `$__app__` | Good; tests 5 and 6 cover it on 25.1 |
| `b1456a8bfc3` optparse `--` | argv hardening | Good |
| `74513abd445` shrimp_wrapper | template parse fix | Good (the tool can't run anyway: no SHRiMP 1.x) |
| `0a8348f87c1` joiner2 | real fix + test | Good. The test doesn't run in CI (joiner2 isn't in the sample conf) |
| `84c34319800` ML `pull_repo` | enables a never-working mode | Acceptable (nit 4) |
| `d3fcf209ffa` Extract Genomic DNA `b""` | duplicates upstream #23411 | Replace with the upstream backport (finding 1) |

No commit needs a migration, API change or new framework feature, so none has to stay on 26.1+.

### Q3: Qiskit on 25.1

- 25.1's tool (version 0.2, profile 22.01) writes `~/.qiskit/qiskit-ibm.json` from `$__user__.extra_preferences.get('ibmq_account|token', ...)`. That is the user's own preference, rendered into the user's own job, so the analyser's extra `configfile-injection` is self-only.
- Leave it:
  - JSON-escaping it would need `#import json` and a change to a tool the branch doesn't otherwise touch there.
  - 26.1's rewrite (credentials block, version 1.0) is `profile="26.0"`, so 25.1 can't load it and it can't be backported.
- The branch's only Qiskit change, `./` on the notebook names, applies the same way on 25.1. It matters there because `cleaned_name` allows a leading `-` (`[^\w\-\.]` keeps `-`).
- **Out of scope:** 25.1's Qiskit config points at the `ibm_quantum` channel and `auth.quantum-computing.ibm.com`. IBM has likely retired that classic platform, so the tool's IBM backend setup is probably already stale on 25.1. Nothing for this branch to do.

### Merge-forward

`git merge-tree --write-tree <newer> HEAD`:
- **release_26.0:** the only conflict is `lib/galaxy/job_execution/actions/post.py`, which comes from 25.1 commits not yet merged into 26.0 and also conflicts when `origin/release_25.1` alone is merged. No conflicts from the branch.
- **release_26.1:** clean. On every file the branch touches, the merged tree is byte-identical to `stock_tools_review_clean_alt_release_26_1` (`git diff --stat <alt> <merged> -- <touched files>` is empty). That includes Qiskit's `./` hunk landing on 26.1's rewritten tool.
- **release_26.2 and dev:** the `extract_genomic_dna.py` conflict and silent second hunk in finding 1. The other conflicts (post.py, test_post_job_actions.py) come from the base.
- **With the upstream backport in place of `d3fcf209ffa`:** no conflicts in `tools/` on 26.1, 26.2 or dev.

### Not re-done (already established by the caller)

I didn't redo: patch-id equality, the render comparisons, analyser counts, tool and API tests, or lint.

### Security

No vulnerabilities found and no security report written. The Qiskit token finding is self-only.
