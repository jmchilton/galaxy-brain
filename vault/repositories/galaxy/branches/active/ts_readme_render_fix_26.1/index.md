# ts_readme_render_fix_26.1

Base: `release_26.1`. Branch: [`jmchilton:ts_readme_render_fix_26.1`](https://github.com/jmchilton/galaxy/tree/ts_readme_render_fix_26.1). Worktree: `~/projects/worktrees/galaxy/branch/ts_readme_render_fix_26.1`.

Renders Tool Shed READMEs without Mako evaluation and sanitizes rendered HTML, including old-revision READMEs.

[Implementation](implementation_debrief.md) · [Initial implementation](initial_implementation_debrief.md) · [Codex review](codex_review.md) · [Test challenges](test_challenges_debrief.md) · [Thermo-nuclear review](thermo_nuclear_review.md) · [Scope evaluation](scope_evaluation.md)

Backport of a patch already deployed on the public Tool Shed servers; the fix commit stays identical to that patch, so `readme_util.py` changes go to a later `dev` PR. John approved pushing and normal queueing on 2026-10-11. Sibling local branches `ts_readme_render_fix` (25.0) and `ts_readme_render_fix_dev` hold the same change for other bases; only 26.1 was requested.

2026-10-11: rebased onto `32b8f0a3e83` (newest `release_26.1` commit already in `dev`; same diff, merges cleanly into `release_26.1`) and force-pushed so [`ts_readme_render_followups`](../ts_readme_render_followups/index.md) can merge it into `dev` for real and the later forward merge stays clean. John approved. Head `95c83c5d1e5`.
