# ts_readme_render_fix_26.1

Status: `ready`. Base: `release_26.1`. [PR #24053](https://github.com/galaxyproject/galaxy/pull/24053) (open, not draft; fresh CI pending).

Base: `release_26.1`. Branch: [`jmchilton:ts_readme_render_fix_26.1`](https://github.com/jmchilton/galaxy/tree/ts_readme_render_fix_26.1). Worktree: `~/projects/worktrees/galaxy/branch/ts_readme_render_fix_26.1`.

Renders Tool Shed READMEs without Mako evaluation and sanitizes rendered HTML, including old-revision READMEs.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Codex review](codex_review.md) · [Test challenges](test_challenges_debrief.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md)

Backport of a patch already deployed on the public Tool Shed servers; the fix commit stays identical to that patch, so `readme_util.py` changes go to a later `dev` PR. John approved pushing and normal queueing on 2026-10-11. Sibling local branches `ts_readme_render_fix` (25.0) and `ts_readme_render_fix_dev` hold the same change for other bases; only 26.1 was requested.

2026-10-11: rebased onto `32b8f0a3e83` (newest `release_26.1` commit already in `dev`; same diff, merges cleanly into `release_26.1`) and force-pushed so [`ts_readme_render_followups`](../ts_readme_render_followups/index.md) can merge it into `dev` for real and the later forward merge stays clean. John approved. Head `95c83c5d1e5`.

## TICK — 2026-10-11

John opened [draft PR #24053](https://github.com/galaxyproject/galaxy/pull/24053) with title “[26.1] Improved Rendering of Tool Shed READMEs”, base `release_26.1`, exact head `95c83c5d1e509e770f7306b08b2f5c215032b3e1`. The branch was already tracked, so this reconciles its existing entry rather than adding a new branch. CI remains pending; no duplicate PR or rebase performed.

## TICK — 2026-10-12

All 58 prior-head upstream checks settled successfully/skipped with no failures; the PR was mergeable and its recorded draft blocker was CI. Cleanly rebased all four patches onto actual release_26.1 `5ee1f4050fad3acd580667789de58dc08fe70777`; range-diff confirms all patches identical, including the deployed README fix. All **8 README unit cases pass**, including old/latest Mercurial revisions. The first local command omitted the virtualenv bin directory from PATH and failed to find hg; rerunning with the existing virtualenv’s hg resolved both setup errors. Published to `jmchilton:ts_readme_render_fix_26.1` with an exact old-head lease and took the PR out of draft under standing authorization. Verified OPEN, non-draft, correct base and head `18e611e706e36f8fdb2174ade84e73e63edd6a93`. Fresh upstream CI is queued/running; prior green results are not claimed for this head. No description or comment changed.
