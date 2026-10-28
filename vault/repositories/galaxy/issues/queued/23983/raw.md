# Temporary SSE/notification flags left in E2E workflows; two are dead config keys

Filed from: gx_branches session 2026-10-08, noticed while removing `selenium.yaml` (#23976).

## What's on dev

`cc289e93f18` (mvdbeek, 2026-04-23, "TEMP: enable notification/SSE flags across all UI test workflows") added to the workflow-level `env:` of `selenium.yaml`, `playwright.yaml` and `integration_selenium.yaml`:

```yaml
  # TEMP: shake down SSE/notification system across full UI surface — revert before merge
  GALAXY_CONFIG_OVERRIDE_ENABLE_NOTIFICATION_SYSTEM: '1'
  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_HISTORY_UPDATES: '1'
  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_ENTRY_POINT_UPDATES: '1'
```

Commit message: "Revert before merging." It merged anyway with #22513 (`sse-notifications`, merged 2026-04-30). Still on dev as of `9fd083720a7` (2026-10-08) in `playwright.yaml:23-26` and `integration_selenium.yaml:23-26`. (#23976 deletes `selenium.yaml`, taking its copy with it.)

## Why it matters

1. **Two of the three flags are dead.** `bbb4cdc5f1d` (2026-04-28, same PR, "Collapse SSE feature flags into single enable_sse_updates") replaced `enable_sse_history_updates` and `enable_sse_entry_point_updates` with `enable_sse_updates`. Neither old name exists in `config_schema.yml` or anywhere in `lib/`/`client/src` on dev. `lib/galaxy/util/properties.py:115-119` copies any `GALAXY_CONFIG_OVERRIDE_*` into properties without checking the key, so these are silently ignored. Net effect: E2E runs with `enable_notification_system: true` and SSE **off** (`enable_sse_updates` default `false`). The "SSE shakedown" isn't shaking down SSE, and hasn't since the flag collapse.
2. **CI tests a non-default config.** `enable_notification_system` defaults to `false` (`config_schema.yml` ~4722), yet every Playwright and Integration Selenium run has it on. Failures or passes there don't reflect a default Galaxy, and nobody reading the workflow is told why beyond "TEMP".
3. Dedicated coverage already exists without the env: `test/integration_selenium/test_notification_sse.py` and `test_entry_point_sse.py` set `enable_sse_updates` (and notification config) in `handle_galaxy_config_kwds`.

## Suggested resolution (pick one, maintainer call)

- **Revert as intended:** delete the TEMP comment and all three lines from `playwright.yaml` and `integration_selenium.yaml`. Rely on the dedicated integration_selenium SSE tests.
- **Keep a deliberate shakedown:** replace the two dead keys with `GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_UPDATES: '1'`, drop "TEMP … revert before merge", and say why the E2E suite runs non-default (and maybe only on the scheduled run, not every PR).

Either way, worth deciding with mvdbeek (author) whether the shakedown is done. Don't @-mention in the filed issue without John's OK.

Side idea (separate issue, maybe): `load_app_properties` could warn on `GALAXY_CONFIG_OVERRIDE_*` keys that aren't in the schema. That would have caught the dead keys after the flag collapse.

## Evidence commands

```sh
git show cc289e93f18 --stat
git show -s bbb4cdc5f1d
git grep -n "ENABLE_SSE\|ENABLE_NOTIFICATION_SYSTEM" origin/dev -- .github
git grep -n "enable_sse_history_updates\|enable_sse_entry_point_updates" origin/dev -- lib client/src   # no hits
```
