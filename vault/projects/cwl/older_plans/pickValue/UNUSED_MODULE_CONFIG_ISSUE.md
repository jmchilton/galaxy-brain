# Remove unused `enable_beta_workflow_modules` config option

## Problem

`enable_beta_workflow_modules` is defined in the config schema and documentation but **nothing in the application reads it**. No code gates module visibility on this setting. The `pause` module (the only "beta" module it was meant to hide) is always available regardless of this config value.

The option creates false expectations — admins may set it to `false` thinking it disables beta modules, but it has no effect.

## Locations

| File | What | Action |
|------|------|--------|
| `lib/galaxy/config/schemas/config_schema.yml:2960` | Schema definition (type, default, desc) | Remove entry |
| `lib/galaxy/config/sample/galaxy.yml.sample:2239-2242` | Sample config comment + commented-out default | Remove block |
| `doc/source/admin/galaxy_options.rst:4004-4013` | Admin docs section | Remove section |
| `run.sh:40` | `export GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES="true"` | Remove line |
| `lib/galaxy/config/config_manage.py` | Migration helpers for deprecated options | Add `"enable_beta_workflow_modules": _DeprecatedAndDroppedAction()` so existing configs don't error on upgrade |
| `test/unit/config/config_manage/1607_root_filters/config/galaxy.ini:973` | Old test fixture with commented-out option | Remove line |
| `test/unit/config/config_manage/1607_root_samples/config/galaxy.ini:973` | Old test fixture with commented-out option | Remove line |

## Steps

1. Add `"enable_beta_workflow_modules": _DeprecatedAndDroppedAction()` to the deprecated options dict in `config_manage.py`
2. Remove the schema entry from `config_schema.yml`
3. Remove the sample config block from `galaxy.yml.sample`
4. Remove the docs section from `galaxy_options.rst`
5. Remove the env var export from `run.sh`
6. Remove commented-out lines from the two test fixture `.ini` files
7. Run config management unit tests: `pytest test/unit/config/ -v`

## Notes

- This is a standalone cleanup, no functional changes
- If we later want to gate modules behind a config flag, we should wire it end-to-end (config -> API -> frontend palette filtering) rather than reintroduce a dead option
