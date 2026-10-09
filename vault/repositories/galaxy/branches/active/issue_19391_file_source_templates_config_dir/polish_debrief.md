# issue_19391_file_source_templates_config_dir — polish debrief

Polished 2026-10-07. Branch `8c73b104063` → `e4827867db5` (two follow-up commits, pushed to the jmchilton fork, no force-push).

## CI

Fork CI on `8c73b104063` was all queued, no reds. The push restarts it; a fresh run is needed on `e4827867db5` (Generated config files, Build docs, Python linting, Unit tests are the relevant checks).

## Checklist (GENERAL.md)

First pass failed "What does the user see when it fails?": a set-but-missing `*_templates_config_dir` (e.g. a typo) loaded zero templates silently. The sibling `_config_file` is silent because it has a default; the dir has none, and Galaxy's `config_directories_from_setting` / toolbox views warn on a missing dir. Fixed in `55e5440299a`: `log.warning` naming the path; `test_manager_ignores_missing_config_dir` became `test_manager_warns_about_missing_config_dir` (red first).

Other items passed. The `data.md` whitespace fixes are forced by Galaxy's prettier pre-commit hook (verified: prettier 3.6.2 fails on dev's `data.md`); CI doesn't enforce it. Generated files contain only the two new options.

Re-ran the checklist after the strengthening commit.

## Red on dev (verified on a detached `4fe00d9e7ab` worktree)

- `test_inline_file_source_templates_install_their_dependencies` fails at `check_dropboxdrivefs()` — cited in the description.
- Empty/comment-only `include:` raises `AttributeError` — cited.
- The dir tests can't be red on dev (option doesn't exist), so the description cites none of them as failing.

## Strengthening

Applied:
- `e4827867db5`: a drop-in/`include:` whose content isn't a template dict (e.g. a list of filenames) now raises `ConfigurationError` naming the file instead of `AttributeError: 'str' object has no attribute 'keys'`. Red-first test `test_manager_names_config_dir_file_that_is_not_a_template`. 563 passed / 30 skipped across files, objectstore, deps, user manager and template validation tests; ruff/black/isort clean.
- Description: "restarting Galaxy" in the opener (templates load at startup only); `cp` of a shipped `examples/production_dropbox.yml` as the show-first workflow; bold line that drop-ins add but don't override same-id templates (first wins); inline-deps change scoped to sites with inline `file_source_templates`.
- Implementation debrief: two stale lines corrected (missing dir now warns; the "default dir is friendlier" rationale died with the default).

Reviewer verified the description's dir tree by running the loader on it, built from real examples.

## Not done / for John

- Warn on duplicate `(id, version)` across file and drop-ins? Drop-ins make it likelier (copying in an example already in the main file).
- Migrate tours, toolbox views and `tool_config_file` dir expansion onto `config_files_in_directory`? Changes their order/dotfile behaviour.
- Name the file in pydantic validation errors (currently flattened list indexes)? Needs per-include tracking; bigger than this PR.
- Nit (not applied, one strengthening round): the missing-dir warning says "not found" even when the path is a file; "is not a directory" would be more precise. It also logs twice per startup (deps step + manager).
