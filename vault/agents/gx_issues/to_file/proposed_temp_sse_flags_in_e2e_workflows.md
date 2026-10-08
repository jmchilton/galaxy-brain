# CI: "TEMP" SSE/notification overrides never reverted; two of three are dead config keys

A "revert before merge" config block from #22513 is still in the Playwright and Integration Selenium workflows on `dev`, turning on notifications but not SSE.

```yaml
# .github/workflows/playwright.yaml (lines 23-26), same in integration_selenium.yaml
env:
  # TEMP: shake down SSE/notification system across full UI surface — revert before merge
  GALAXY_CONFIG_OVERRIDE_ENABLE_NOTIFICATION_SYSTEM: '1'      # applied: non-default (default false)
  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_HISTORY_UPDATES: '1'      # dead: option removed, silently ignored
  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_ENTRY_POINT_UPDATES: '1'  # dead: option removed, silently ignored
```

What every E2E run actually gets:

| Option | Default | What CI runs with |
|---|---|---|
| `enable_notification_system` | `false` | `true` ⚠️ |
| `enable_sse_updates` | `false` | `false` ❌ (nothing sets it) |

⚠️ non-default config with no stated reason · ❌ the thing the block was meant to exercise is off

So the block fails both ways:

- **No SSE shakedown.** SSE stays off, and has since the flags were collapsed (2026-04-28, before #22513 merged).
- **Non-default config everywhere.** Every Playwright and Integration Selenium run tests with notifications on, and the only explanation in the workflow is "TEMP".
- **Tests can't opt out.** `GALAXY_CONFIG_OVERRIDE_*` is applied after the test's own config kwargs, so it wins over anything an integration_selenium test sets in `handle_galaxy_config_kwds`.

<details><summary>How it got here</summary>

- `cc289e93f18` (2026-04-23), *"TEMP: enable notification/SSE flags across all UI test workflows"*, added the block to `selenium.yaml`, `playwright.yaml` and `integration_selenium.yaml`. The commit message ends with *"Revert before merging."*
- `bbb4cdc5f1d` (2026-04-28), *"Collapse SSE feature flags into single enable_sse_updates"*, replaced `enable_sse_history_updates` and `enable_sse_entry_point_updates` with a single `enable_sse_updates`. It updated the schema, server, client and tests, but not the workflow env.
- Both commits came in with #22513 (merged 2026-04-30). The revert never happened.

Neither old name appears anywhere in `lib/`, `client/src` or `test/` on `dev`.

</details>

<details><summary>Why the dead keys fail silently (reproduced on <code>dev</code>)</summary>

`load_app_properties` (`lib/galaxy/util/properties.py`) copies every `GALAXY_CONFIG_OVERRIDE_*` variable into the properties dict without checking it. It applies them after `kwds`, which is why they also beat a test's `handle_galaxy_config_kwds`. `GalaxyAppConfiguration._update_raw_config_from_kwargs` (`lib/galaxy/config/__init__.py`) then keeps only keys in the schema (or its deprecated aliases). Any other key is dropped without a warning.

Running with the workflow's env and no config file:

```python
os.environ["GALAXY_CONFIG_OVERRIDE_ENABLE_NOTIFICATION_SYSTEM"] = "1"
os.environ["GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_HISTORY_UPDATES"] = "1"
os.environ["GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_ENTRY_POINT_UPDATES"] = "1"
c = GalaxyAppConfiguration(override_tempdir=False, **load_app_properties())
```

```text
enable_notification_system = True
enable_sse_updates = False
hasattr enable_sse_history_updates = False
```

The only warnings logged were "No Galaxy config file found" and an unrelated `email_ban_file` path warning. Nothing mentioned the unknown keys.

</details>

## Context

A follow-up to 🔀 #22513 (SSE for history and notification updates). Found while working on 🔀 #23976 (stop running the Selenium backend in CI), which deletes `selenium.yaml` and its copy of the block but leaves the ones in `playwright.yaml` and `integration_selenium.yaml`.

## Proposed Approach

Do the revert the commit asked for: delete the TEMP comment and all three `GALAXY_CONFIG_OVERRIDE_*` lines from `playwright.yaml` and `integration_selenium.yaml`, so the general E2E suites run a default Galaxy again. Nothing in `lib/galaxy_test/selenium` depends on notifications being on. The integration_selenium tests that need them (`test_notification_sse.py`, `test_sse_reconnect.py`, `test_entry_point_sse.py`, `test_workflow_run_notification.py`) already set `enable_notification_system` / `enable_sse_updates` themselves, right next to their assertions.

<details><summary>Diff</summary>

```diff
 # .github/workflows/playwright.yaml and .github/workflows/integration_selenium.yaml
-  # TEMP: shake down SSE/notification system across full UI surface — revert before merge
-  GALAXY_CONFIG_OVERRIDE_ENABLE_NOTIFICATION_SYSTEM: '1'
-  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_HISTORY_UPDATES: '1'
-  GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_ENTRY_POINT_UPDATES: '1'
 concurrency:
```

Also apply it to `selenium.yaml` if this lands before #23976.

</details>

## Alternative Approaches

The other option is to keep a UI-wide shakedown on purpose and fix it so it actually turns SSE on, either on every run or only on the weekly scheduled run. That makes sense if the SSE path should get ongoing exposure across the whole UI suite. But targeted tests already cover it, and that decision should be made on purpose. It doesn't justify keeping a block labeled "TEMP" that has been doing the wrong thing since April.

<details><summary>Alternatives In Detail</summary>

### Alternative: Make the shakedown real and permanent

<details><summary>Description</summary>

#### Details

Replace the two dead keys with `GALAXY_CONFIG_OVERRIDE_ENABLE_SSE_UPDATES: '1'`, and replace "TEMP … revert before merge" with a comment saying why the E2E suite runs non-default. A cheaper variant limits this to the weekly cron run: both workflows already have an `if: github.event_name == 'schedule'` step that writes `GALAXY_CONFIG_OVERRIDE_*` lines to `$GITHUB_ENV`, so the two settings could go there instead.

#### Why the proposed approach is preferred

The targeted integration_selenium tests are easier to debug than a UI-wide failure that only appears with SSE on. With SSE on in every run, the client stops polling for history, entry-point and notification updates (per the `enable_sse_updates` description and the `config.enable_sse_updates` checks in `historyStore` / `entryPointStore` / `notificationsStore`). The default polling path would then lose its E2E coverage. The schedule-only variant avoids that and costs little, but weekly-only failures tend to get less attention, and it still can't be opted out of by individual tests.

</details>

</details>
