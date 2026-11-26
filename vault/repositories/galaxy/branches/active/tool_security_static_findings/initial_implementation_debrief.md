# Initial implementation debrief

```
created .../tool_security_static_findings/differential-review/snapshots/20261126T021109Z-implementation-e9e1d8eb1a59.json
  implementation @ e9e1d8eb1a59 vs origin/dev (merge-base ce63095e7a8a)
  first snapshot: 85 commits, 76 files, 78 hunks
```

Source: `jmchilton/tool_security_review_spec` at `d5f7cb05e917051657a06accc7aa42fe9b5eda90`, which stacks on `mvdbeek/tool-security-review-on-load`. The other session's worktree and branch were not touched.

## What was built

- **82 cherry-picks** (`-x`, authorship kept: mvdbeek's analyser series and John's spec, codes and analyser follow-ups), with runtime hunks dropped as they came.
  - Skipped: the 21 runtime-only commits plus `107c00e066f`, whose "static" files all turned out to be runtime.
  - No commit had to be hand-ported. Conflicts were limited to `mypy.ini` and `MANIFEST.in`.
- **`96ccf8ac160` Frame the review as static findings only.**
  - `codes.py` (refusal codes) removed.
  - Spec cases keep `doc`/`tool`/`review` only; red/green job, `code`, `known_bypass`, sweep and harm models removed.
  - Four job-only cases dropped (`review_failed`, `check_failed`, `strict_check_failed`, `refused_when_unsure`; the last one's static expectation is still pinned by `not_analysed_strict`).
  - `enforced()`/`enforced_findings()` removed.
  - Docs page rewritten for offline CLI use; generated cases section kept fresh by its test.
  - `MANIFEST.in` lists `cases.yml` and the 39 spec tools.
- **`2709679ab68` Lint for dev's Python 3.11 floor**: pyupgrade fixes, `StrEnum`, 3.9 guard removed, Cheetah source typed.
- **`e9e1d8eb1a5` Review fixes** (see `subagents/review_port.md`):
  - Python 3.8 leftovers and `Report.added_by_rewrites` removed.
  - Docs say `--judge` covers vulnerability findings, how to install, and what `checkable` means.
  - `galaxy-tool-security-review` console script.

## Decisions

- **The `ToolParameterSanitizer` move to `galaxy.tool_util.parser.sanitize` is kept**, because `charsets.py` imports it.
  - It keeps dev's latest content (no `eval`).
  - Its only importer is `basic.py`. No downstream clone imports the old path, so there is no compatibility shim.
- **Job-check data is kept**: `Report.writes`/`closers`/`reads`/`rewritten` and the `Finding` breakout fields are still computed and emitted by `--json`. That keeps analyser output identical and lets a value-level check stack on it later.
- **Analyser output is unchanged**: `review_tool_source(...).to_dict()` on 386 tools is byte-identical between the last cherry-pick and the framed head.
- **Cheetah needs no packaging change**: galaxy-tool-util already gets CT3 through `galaxy-util[template]`.
- **The CLI exit code stays 0**, as on the source branch.
- **rerere**: the first picks recorded about 14 `rr-cache` resolutions in the shared Galaxy clone. Those could have silently resolved the other session's rebases, so they were deleted and the rest of the port ran with `rerere.enabled=false`.

## Open for John

- **History.** About 40 cherry-picked messages still describe runtime behaviour that is gone. Some commits add code a later commit removes (`codes.py`, the timeout pair, the Python 3.8 support pair). Two commits carry a misleading "Baseline tests" prefix.
  - Option 1: keep the 84 picks, reword only.
  - Option 2: squash per the plan in `subagents/review_port.md`. That would give one mvdbeek analyser commit, a few topical John commits, and one spec/docs commit, with `Co-authored-by` trailers.
  - Not done without a decision, because it rewrites how authorship is presented.
- **About 20 analyser comments still say "the job check".** These are comment-only changes in mvdbeek's code, best folded into the history pass.

## Tests

- `test/unit/tool_util/security`: 535 passed.
- With the sanitizer-affected parser and app tests: 700 passed.
- The CLI runs on the spec tools.
- ruff, black, isort and pre-commit are clean.
- `mypy` (from `lib/`) is clean for the security package and `sanitize.py`.
- The wheel built from `packages/tool_util` contains the spec files.
