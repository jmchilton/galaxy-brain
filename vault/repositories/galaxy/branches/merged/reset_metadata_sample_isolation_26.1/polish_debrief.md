Polished on 2026-10-25 and moved to `branches_ready_for_final_review`. No production or test edits were needed. John still needs to read every test/comment and choose a title; no PR was opened or GitHub comment posted.

- Wrote `pr_description.md`, four `[26.1]` title options in `pr_titles.md`, and `pr_tags.md` recommending `kind/bug` and `area/toolshed`.
- Fresh checklist review passed every applicable automated item; the human-read item remains unchecked. Workflow checklist does not apply. See `subagents/polish_checklist.md`.
- One fresh strengthening round returned nothing to add. Highlighted sentences answer audience and scope misunderstandings; shared installation/update callers are covered in Risks. See `subagents/polish_strengthening.md`.
- Checked live fork CI before polishing: queued, no failures. Rebased cleanly onto current `release_26.1` at `cf168b20f6a` before final checks, then force-pushed with lease to the `jmchilton` fork. New head: `c6e92c5ce8d8537c32b7516b0a069e1eefba4567`. All three commits have identical patches in `git range-diff`; no checklist item was affected. The new CI runs remain queued/pending, with no failures at the final live query. No existing PR was found.

## Validation

- `make format` passed after rebase: 2,565 files unchanged. `git diff --check` passed and the worktree is clean.
- Mypy on both changed files reports only the generator's two existing errors: unreachable statement at line 247 and unused ignore at line 865. Hardening reproduced these on the old base, and the generator is unchanged between that base and the new release base.
- Both API regressions passed again on the rebased head. The initial filter selected only `test_reset_ignores_tools_shipped_only_as_samples` (1 passed); the separately corrected selector ran `test_reset_reads_sample_files_from_each_revision` (1 passed). Used the `jmchilton:galaxy-toolshed-tests` skill, the existing virtualenv/frontend, `TOOL_SHED_TEST_OMIT_GALAXY=1`, and disabled Conda auto-init. Latest HTML report: worktree `run_toolshed_tests.html` (revision-local scenario).
- Existing hardening evidence remains applicable to unchanged patches: full repository API suite 40 passed; Tool Shed unit suite 99 passed, 12 skipped; both regression assertions failed with the original generator. No repeated full-suite or red runs were needed.
- Vault `make validate` passed: 126 files, zero errors, 15 advisory warnings. The previously recorded unrelated frontmatter error is no longer present.

## Label review

Galaxy's `doc/source/project/issues.rst` supports the recommended bug and Tool Shed labels. The release base's `.github/labeler.yml` does not match these two paths: its Tool Shed rule uses `lib/toolshed/**/*`, whereas these files are under `lib/galaxy/tool_shed/` and `lib/tool_shed/`. Recommend the central `area/toolshed` manually; no additional area labels are needed.

The queue and branch metadata now agree on the release target and final-review status. The description claims the observed reset repair, explicitly separates upload policy and empty-row retention, and documents persisted-metadata risks. No scope expansion or remaining development task was identified.
