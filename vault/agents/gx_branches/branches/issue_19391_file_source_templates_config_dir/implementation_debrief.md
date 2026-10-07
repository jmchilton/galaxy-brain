# Implementation debrief: `issue_19391_file_source_templates_config_dir`

Fixes [#19391](https://github.com/galaxyproject/galaxy/issues/19391). Based on `dev` at `4fe00d9e7ab`. Commits: `e6ed6b6de72` (feature) and `fe1b6a52ca4` (review fixes). Pushed to `jmchilton`.

## Change

- New options `file_source_templates_config_dir` and `object_store_templates_config_dir`, default `<config_dir>/file_source_templates.d` / `object_store_templates.d`. They are added **alongside** `*_templates_config_file`, not as a rename (the issue title says "change"; renaming would break existing configs).
- Object store templates got the same option for sibling parity. The code paths are identical.
- Shared loader `load_raw_template_configs(inline, config_file, config_dir)` in `lib/galaxy/util/config_templates.py`:
  - Inline `*_templates` replace the file and dir, as before.
  - Otherwise file templates come first, then each non-hidden `.yml`/`.yaml` file in the dir, sorted by filename. Each dir file is added as an `{"include": path}` entry, so it can hold a single template or a list.
  - A missing dir is silent, same as a missing file.
- The loader replaces 4 copy-pasted "inline else file" blocks: both template managers and both blocks in `lib/galaxy/dependencies/__init__.py`.
  - The file-source deps block used to ignore inline `file_source_templates`. It now honors them.
  - Both deps blocks now catch `OSError` the same way.
- `galaxy.util.config_files_in_directory(directory, extensions)` returns non-hidden matching files, sorted. It's a reusable helper for this listing.
- `_expand_include` treats an empty or comment-only include as `[]`. Before this, it raised `AttributeError`, which matters once commenting out a drop-in file is a normal way to disable it.
- Regenerated `galaxy.yml.sample`, `galaxy_options.rst`, `_galaxy_config_schema_attributes.py`. The `config_manage.py` type override is `str | None`, matching the sibling `_config_file`.
- Docs: `doc/source/admin/data.md`, in both the object store and file source sections.

## Why a default dir

A `path_resolves_to` option with no default logs "Trying to resolve path ... empty/None" at every startup (`_resolve_paths`). `.d` has no precedent among Galaxy options, but it is the standard Unix drop-in convention, and `config/*` is gitignored.

## Tests

Red first, then green:

- `test/unit/files/test_template_manager.py`:
  - filename ordering and filtering: dotfiles, `.sample`, `.md`, empty and comment-only files;
  - file before dir;
  - missing dir;
  - inline overrides both.
- `test/unit/objectstore/test_template_manager.py`: dir loading.
- `test/unit/app/dependencies/test_deps.py`:
  - object store templates dir;
  - file source templates found through the **default** `.d` location, which covers schema default and path resolution;
  - inline file source templates, which is the gap this fixes.

255 unit tests pass across template, deps, user object store/file source manager, and config tests. Ruff, black and isort are clean. Mypy shows no new errors: run from `lib/`, the only errors are the pre-existing lxml-stub ones in `util/__init__.py`.

## Review suggestions not acted on

- **Duplicate `(id, version)` across file and dir is silent.** `find_template_by` is first-wins. This is pre-existing with includes. A warning in `raw_config_to_catalog` would be cheap, but it's a separate concern.
- **Relative `include:` paths resolve against Galaxy's CWD, not the including file.** This is pre-existing, and changing it could break current configs. I documented it instead.
- **Tours (`tours/_impl.py`) and toolbox views (`toolbox/views/sources.py`) have their own unsorted listdir loops.** They could switch to `config_files_in_directory` as a follow-up. That would change their order and dotfile behavior slightly, so I left them out here.
- **Alternative design: let `*_templates_config_file` accept a directory**, as `tool_config_file` does. I rejected it because the issue asks for a dir option, and a default drop-in dir is friendlier. Worth a line in the PR description.
- Prettier's pre-commit hook also fixed 2 unrelated whitespace lines in `data.md`. I kept them because the hook requires it.

## Follow-ups

- Optional: a duplicate template id/version warning.
- Optional: migrate tours and views to `config_files_in_directory`.
