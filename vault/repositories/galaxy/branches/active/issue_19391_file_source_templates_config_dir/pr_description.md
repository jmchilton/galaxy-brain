Implement 🎯 #19391 - admins can configure file source and object store templates as a directory of drop-in YAML files, added or removed by copying or deleting a file and restarting Galaxy.

```yaml
# galaxy.yml
galaxy:
  file_source_templates_config_dir: file_source_templates.d
```

```text
config/
├── file_source_templates.yml        ✅ loaded first, as before
└── file_source_templates.d/
    ├── 10_home_directory.yml        ✅ one template
    ├── 20_aws_public.yaml           ✅ or a list of templates
    ├── 30_dropbox.yml               ✅ commented out or empty → contributes nothing
    ├── 40_onedrive.yml.sample       ➖ skipped (not .yml/.yaml)
    ├── .50_scratch.yml              ➖ skipped (hidden)
    └── README.md                    ➖ skipped
```

✅ = loaded in filename order; ➖ = ignored.

Today every user-facing template lives in one `file_source_templates.yml` (or `object_store_templates.yml`), so offering or withdrawing a storage option means editing a shared list. Galaxy already ships one ready-made template file per service in `lib/galaxy/files/templates/examples/`, and they work unchanged as drop-ins:

```sh
cp lib/galaxy/files/templates/examples/production_dropbox.yml config/file_source_templates.d/30_dropbox.yml
```

***This adds `*_templates_config_dir` beside `*_templates_config_file`; it isn't the rename the issue title suggests, so existing configs keep working unchanged.***

***The directory is opt-in with no default: nothing new is read until an admin sets the option.***

***Object stores get the same option because their template loading is the same code; both use one shared loader.***

***A drop-in adds templates; it doesn't override a template with the same id from `file_source_templates.yml` (the first one loaded wins, as with `include:` today).***

<details><summary>How the templates are assembled</summary>

`load_raw_template_configs(inline, config_file, config_dir)` in `galaxy.util.config_templates`:

- Inline `file_source_templates` / `object_store_templates` in `galaxy.yml` replace the file and the directory, as they replace the file today.
- Otherwise templates from `*_templates_config_file` come first, then one `{"include": path}` entry per `.yml`/`.yaml` file in the directory, sorted by filename. Each file can hold a single template or a list, since that's what `include:` already accepts.
- A directory that is set but missing loads no templates and logs a warning naming the path.
- A relative directory path resolves against `config_dir`; absolute paths pass through.

The loader replaces four copy-pasted "inline, else file" blocks: both template managers and both blocks in `galaxy.dependencies`. The directory listing is a small reusable helper, `galaxy.util.config_files_in_directory`.

</details>

<details><summary>Side fixes</summary>

- Conditional dependencies ignored inline `file_source_templates`, so a template configured in `galaxy.yml` (e.g. Dropbox) didn't install its package (`dropboxdrivefs`). The shared loader fixes that; `test_inline_file_source_templates_install_their_dependencies` fails on `dev` at `check_dropboxdrivefs()`. Only sites with inline `file_source_templates` see a change in which packages install.
- An `include:` of an empty or comment-only file raised `AttributeError: 'NoneType' object has no attribute 'keys'` at startup. It now contributes no templates, which matters once commenting out a drop-in file is a normal way to disable it.
- A drop-in (or any `include:`) whose content isn't a template, such as a list of filenames, raised `AttributeError: 'str' object has no attribute 'keys'` without saying which file. It now raises a `ConfigurationError` naming the file.

</details>

An alternative was to let `*_templates_config_file` also accept a directory, as `tool_config_file` does. A separate option keeps the existing file working next to the directory and matches what the issue asks for.

## Risks

The new option names and their load order (file, then directory files by filename; inline replaces both) become an admin-facing config contract that's hard to change after release.

<details><summary>Risk Details</summary>

- Two new `galaxy.yml` options, `file_source_templates_config_dir` and `object_store_templates_config_dir`. Renaming or removing them later breaks admin configs.
- Load order and file filtering (`.yml`/`.yaml`, non-hidden, sorted by filename) are documented behaviour. Changing them later could reorder a site's template list or change which files load.
- Sites with inline `file_source_templates` will now get conditional dependencies installed for those templates on upgrade.
- Relative `include:` paths inside drop-in files resolve against Galaxy's working directory, not the including file. That's existing `include:` behaviour; it's now documented rather than changed.

</details>

<details><summary>Risk Review Advice</summary>

Check the option names and the documented semantics in `config_schema.yml` and `doc/source/admin/data.md`: file before directory, filename order, which files count, and inline replacing both. Those are the parts admins will build deployments around. The loader refactor itself is mechanical.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Startup fails naming the file for a malformed drop-in (YAML error with line) or one that doesn't hold templates (`ConfigurationError`); a directory option that is set but missing logs a warning naming the path.
- [x] Is the diff free of unrelated or stale generated changes? Yes! (Galaxy's prettier pre-commit hook also fixed two whitespace lines in `data.md`.)
- [x] Are unit tests not just testing the literal implementation? Yes. They assert the loaded template ids and their order, and which dependencies get installed.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test/unit/files/test_template_manager.py`: filename ordering and filtering (hidden, `.sample`, `.md`, empty and comment-only files), file before directory, a missing directory warning, a non-template drop-in named in the error, inline replacing both.
- `test/unit/objectstore/test_template_manager.py::test_manager_loads_config_dir`: a list of templates in one directory file.
- `test/unit/app/dependencies/test_deps.py`: templates in a directory install their dependencies; a relative `file_source_templates_config_dir` resolves against `config_dir`, and a `.d` directory is ignored until the option is set; inline file source templates install their dependencies (fails on `dev`).

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
