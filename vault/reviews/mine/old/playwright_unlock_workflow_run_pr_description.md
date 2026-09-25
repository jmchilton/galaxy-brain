Drops all 24 blanket `@selenium_only` decorators from
`lib/galaxy_test/selenium/test_workflow_run.py`, continuing the file-by-file
sweep. Removing `@selenium_only` cannot affect Selenium runs — it only skips
under Playwright.

### The one code change

`_chipseq_data_entry` held the last raw `action_chains()` site in the file.
Under Playwright `HasPlaywrightDriver.action_chains()` returns `self`, so the
Selenium `ActionChains` calls landed on the driver and died with
`AttributeError: '_PlaywrightDriverImpl' object has no attribute 'send_keys'`.

The 36 `send_keys` calls now accumulate into a list sent in one
`send_keys_to_page()`. The trailing bare `action_chains.click()` depended on
wherever Selenium happened to leave the pointer; it is now an explicit
`move_to_and_click()` on the cell the entry started from. Under Selenium this
also collapses 36 round-trips into one.

### Verification

28 of 34 pass under Playwright locally. The other six are not backend gaps and
so are not decorated:

| Test | Why it does not pass here |
| --- | --- |
| `test_workflow_export_file_rocrate`, `..._native` | Local Galaxy has `enable_celery_tasks` false, so `WorkflowInvocationExportOptions` renders the legacy BCO card instead of `InvocationExportWizard` — no `[data-export-format]` element exists to click. A screenshot taken right after the Export-tab click confirms the tab opens correctly. CI has celery enabled. |
| `test_runtime_parameters_simple_optional` | Fails identically under Selenium here; the screenshot shows the form correctly filled with `3`, so the job, not the browser, is the problem. |
| `test_upload_list_paired_from_workflow` | Fails identically under Selenium here (`history item 6 state ... current state [UNKNOWN]`). |
| `test_collection_input_sample_sheet_chipseq_example_from_list_pairs` | Passes under Selenium. Its Playwright failures are history-item-state waits that land on a different hid each run, on a machine sitting at load average 20–39. Unreproducible as a backend difference. |

The other chipseq test, `..._from_uris`, passes under **both** backends, which
is what verifies the `_chipseq_data_entry` port.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
