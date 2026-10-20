# selenium_only survey

Migration surface as of 2026-09-18, against dev `101e060a65c`.

## Shape of the backlog

140 `@selenium_only` decorators remain across `lib/galaxy_test/selenium/` and
`test/integration_selenium/`. They are **not** uniform:

| Reason | Count | Meaning |
|---|---|---|
| `"Not yet migrated to support Playwright backend"` | 132 | Blanket. Nobody has tried it. |
| multi-line with a pasted traceback | 3 | Diagnosed Playwright failure. |
| `"seletools drag_and_drop requires Selenium webdriver"` | 2 | Needs the drag gesture. |
| `"Uses Selenium Select class which requires tag_name attribute"` | 1 | Needs an element-API gap closed. |
| `"Fails in CI with KeyError: 'Name' - needs investigation"` | 1 | Pre-existing, not Playwright. |
| bare `@selenium_only` + explanatory comment | rest | Diagnosed; read the comment above it. |

Counts are as of the original survey. Re-measured on dev `48c7d7028fc` (2026-09-19)
the blanket total across `lib/galaxy_test/selenium` and `test/` is **134**.
`playwright_unlock_tool_form` takes it to 115, `playwright_unlock_uploads` to 100 and
`playwright_unlock_workflow_management` to 88;
#23592 and #23598 remove another 2 and 14 on top of that.

**The blanket 132 are the cheap surface.** Several pass unmodified — three of the
four merged playwright PRs were exactly this. Grepping for the blanket string is
not enough, though: a bare `@selenium_only` with no argument does not match a
search for the quoted reason, and the real cause sits in a comment above it.

## Diagnosed blockers (do not just drop the decorator)

| Test | Blocker |
|---|---|
| `test_change_password::test_change_password` | `Page.goto: net::ERR_ABORTED at http://localhost:8081/` |
| `test_visualizations::test_igv_loads_correct_genome` | strict-mode violation — `.n-input__input input` matches 2 elements |
| `test_stock_tours::test_core_deferred` | tour step 18 cannot find `a[href$="/?tool_id=cat1&version=latest"]` |
| `test_history_multi_view` | `seletools.actions.drag_and_drop` is Selenium-only |
| `test_library_contents::test_import_dataset_from_path` | pre-existing CI `KeyError: 'Name'`, unrelated to backend |
| `test_uploads::test_rules_example_3_list_pairs` | rule editor Apply covered by a closing vue-multiselect dropdown — diagnosed, unsolved (below) |
| `test_workflow_management::test_view` | needs a backend-neutral window/tab abstraction — `driver.switch_to.window` |

## Verified this session

`playwright_unlock_invocation_grid_sample_sheet` (#23592, off dev):

- `test_invocation_grid::test_grid`
- `test_workflow_run_inputs::test_sample_sheet_from_existing_filters_on_collection_type`

`playwright_unlock_histories_list` (stacked on #23589): 13 of the 14 tests in
`test_histories_list.py`. Only `test_tags` stays blocked — its tag editor never
renders under Playwright, so `.stateless-tags button` is never found. Its decorator
now records that instead of the blanket reason.

`playwright_unlock_tool_form` (off dev `48c7d7028fc`): all 24 tests in
`test_tool_form.py`, all 19 blanket decorators dropped. Seven failed on the first
pass and all seven shared one cause — see "Render races masquerade as backend gaps"
below. Verified 24/24 under Playwright and 8/8 under Selenium.

`playwright_unlock_uploads` (off dev `48c7d7028fc`): 16 of the 17 tests in
`test_uploads.py`. Only `test_rules_example_3_list_pairs` stays blocked — see the
overlay entry under "Diagnosed blockers". Three of the sixteen needed the last raw
`action_chains()` call site in the file ported to `move_to_and_click()` /
`send_keys_to_page()`.

`playwright_unlock_workflow_management` (off dev `48c7d7028fc`): 12 of the 13 tests
in `test_workflow_management.py`, all passing unmodified. Only `test_view` stays
blocked, on tab switching.

**Run the sweep on top of #23589, not dev.** Five of those thirteen fail on dev with
`'_PlaywrightDriverImpl' object has no attribute 'move_to_element'`: 
`select_history_card_operation` (`navigates_galaxy.py:807`) still calls
`action_chains()`, and #23589 replaces it with `hover()`. Any test touching a history
card hits this, so testing against dev understates what is already unlocked.

## Render races masquerade as backend gaps

`test_tool_form.py` cost seven apparent Playwright failures that were not Playwright
failures. `table#tool-parameters` (and `table#dataset-details`, `table#job-outputs`)
become **visible with only their header row**; the body populates a tick later. The
helpers took their `tbody` snapshot immediately after `wait_for_visible`, so
`find_elements(td)` returned `[]` and the tests failed as `assert []`. Selenium's
slower round-trips let the rows land first, so this only ever showed up under
Playwright.

The probe that settled it:

```
PROBE table text: 'Input Parameter\tValue'   # header only
PROBE tbody rows: 0
PROBE after sleep tds: 2
```

**Rule:** when a migrated test fails on an empty collection rather than a timeout or
an `AttributeError`, suspect a render race before suspecting the driver. Wait for a
row, not for the container.

**Corollary on cascades:** two of the seven (`test_rerun_deleted_dataset`,
`test_rerun_dataset_collection_element`) failed with unrelated-looking symptoms — a
`col_names` error-text timeout and a `hid=7` timeout — that were downstream of state
left by the earlier failures in the same run. Re-run a candidate in isolation before
recording a diagnosis for it.

## Fixed driver gap: current_url was the sync API's local mirror

`HasPlaywrightDriver.current_url` returned `page.url`, which the sync API keeps as
local state refreshed only while some Playwright call pumps its greenlet event loop.
A wait that polls `current_url` and calls nothing else therefore reads the same
stale URL for its whole timeout, even though the browser moved on. Selenium's
`driver.current_url` round-trips to the browser, so the backends disagreed.

Found via `test_custom_tools::test_create_custom_tool`, whose `save_tool` reads the
tool UUID out of the route that `CustomToolEditor.vue` pushes after a save. The tool
saved, the card appeared, the route changed - and a 30s poll never saw it. Slipping
any driver call into the loop body made it pass; that was the tell.

Fixed on `playwright_unlock_custom_tools`: `current_url` now evaluates
`window.location.href`, falling back to `page.url` when the execution context is
gone mid-navigation. Covered by `TestCurrentUrl` in `test/unit/selenium/test_has_driver.py`,
which polls after a `history.pushState` from the `basic.html` fixture and fails
against the old implementation under Playwright only.

**Rule:** a Playwright wait that reads only mirrored driver state and never calls
into the driver cannot observe change. Prefer a driver call inside any poll.

## Fixed driver gap: navigate_to gave up when the page redirected itself

`HasPlaywrightDriver.navigate_to` called `page.goto(url)` bare. When the page
assigns `window.location` while that navigation is still on the wire, Chromium
cancels the one that lost the race and Playwright raises
`net::ERR_ABORTED`. Selenium's `driver.get()` reports nothing at all in the same
situation - it just leaves you wherever the page went.

Found via `test_change_password`, whose only decorator reason was the raised
`ERR_ABORTED`. `FormGeneric.vue`'s `onSubmit` awaits the POST and then sets
`window.location = "/user?message=..."`; the test clicks Save and immediately calls
`home()`, so the two navigations collide. Two wrong hypotheses came first - a
`history.pushState` race and a `beforeunload` prompt - and a standalone probe ruled
both out before `window.location` reproduced it 3/3.

Fixed on `playwright_change_password`: `navigate_to` retries the `goto` once when,
and only when, the browser reports `ERR_ABORTED`. A server-side redirect never
raises, so the retry cannot fight one.

**Selenium has the same gap and it is not safely fixable there.** Its `get()`
surfaces no error, and "we did not land on the requested URL" is indistinguishable
from an ordinary redirect - retrying on that would fight every legitimate one. So
`TestNavigateTo` in `test/unit/selenium/test_has_driver.py` uses a Playwright-only
`playwright_driver_instance` fixture rather than the three-backend one. The
`selenium` and `proxy-selenium` parameters fail that assertion today; that is a real
latent gap, not a test defect.

**Rule:** a test that clicks a submit control and then navigates is racing its own
request on either backend. Wait for the outcome first.

## Fixed app bug: a watcher read its guard off the wrong parameter

`test_rules_example_3_list_pairs` was marked selenium-only for "Rule editor Apply is
intercepted by a closing vue-multiselect dropdown". That was the symptom, four steps
downstream of the cause.

`RuleCollectionBuilder.vue` declared `addColumnRegexGroupCount: function (oldVal, newVal)`.
Vue passes a watcher `(newValue, oldValue)`, so the `< 1` clamp tested the value the field
had just **left**. Emptying the field and typing `2` evaluated `"" < 1`, true, and put the
model back to `1`. The add-column-regex rule then ran with one group instead of two,
reported "7 row(s) failed to match specified regular expression", and every rule after it
was "Skipped due to previous errors" - so column E never existed, and the swap-columns
dropdown that "intercepted" Apply was simply open on "No elements found".

Only Playwright reached the bad branch: `clear()` is `fill("")`, which pushes `""` into the
bound model, where Selenium's `clear()` does not. Correcting the parameter alone was not
enough - clamping an *empty* field puts the old count back under the cursor and the next
digit lands beside it (`'12'`). An emptied field is mid-edit, not a count below the
minimum, so it is left alone.

Rule: when a Playwright-only failure points at a click being intercepted, check whether the
state the click depends on was ever built. The interception is often the last domino.

## Not a driver gap: the server, not the backend

Three of the decorators surveyed described real timeouts that had nothing to do with the
driver. Confirm any suspected gap under **both** backends against a server configured the
way the test framework configures one.

- `test_collection_edit.py` (both decorators): the Datatypes tab is
  `v-if="isConfigLoaded && config.enable_celery_tasks"`. `lib/galaxy_test/base/api.py` sets
  `enable_celery_tasks = True` for framework-launched Galaxy; an ad hoc `run.sh` server
  leaves it `false`, so the tab never renders and both backends time out identically.
- `test_igv_loads_correct_genome`: skips outright unless `/api/plugins` is non-empty, which
  needs `visualization_plugins_directory` set. Commented out, the registry loads nothing and
  all 49 plugins are invisible.
- `test_share_history_login_redirect` and `test_core_deferred`: no gap at all - the recorded
  failures no longer reproduce.

## Harness traps that look like Playwright gaps

Both of these produced convincing, wrong diagnoses before being run down:

- **Shared login user.** `GALAXY_TEST_END_TO_END_CONFIG` maps `login_email`/`login_password`
  onto `GALAXY_TEST_SELENIUM_USER_EMAIL`/`_PASSWORD` (`framework.py:119`). Setup then logs in
  as that account, but a test calling `fill_login_and_submit(user_email)` with no password
  sends `DEFAULT_PASSWORD` ("123456"). Result: "Invalid password" on a test that is fine in
  CI, where `login()` falls through to `register()`.
- **Cross-host session.** Driving Vite on `:5173` while Galaxy emits absolute
  `127.0.0.1:8080` links means any app-initiated navigation crosses origins and drops the
  session cookie. Target one host, or expect logged-in state to vanish mid-test.

Also: Selenium's headless mode here wants `pyvirtualdisplay`, so on macOS a Selenium control
run opens a real browser window. Closing it kills the driver and the run errors in seconds.

## Known driver gap: get_attribute is attributes-only

`PlaywrightElement.get_attribute` special-cases `"value"` and otherwise calls
Playwright's attribute reader. Selenium's `get_attribute` falls back to the JS
*property*, so `outerHTML`, `innerHTML` and `checked` return `None` under Playwright
where Selenium returns a value. Found by accident while probing the race above; not
yet traced to a specific failing test, so it is a latent gap rather than a diagnosed
blocker.

## Unsolved: the rule editor Apply overlay

`test_rules_example_3_list_pairs` is the one test in `test_uploads.py` still blocked.
In `rule_builder_swap_columns` two column selectors are set in turn. Selecting in the
first deactivates it only because the test then clicks the second one's trigger —
**nothing ever blurs the second**, so it keeps `multiselect--active` and its option
list covers the editor's Apply button:

```
after-select: ['multiselect select-basic',
               'multiselect select-basic multiselect--active']
overlay at button centre:
  SPAN.multiselect__option--highlight < LI.multiselect__element
  < UL.multiselect__content
  < DIV.multiselect__content-wrapper.multiselect-leave.multiselect-leave-active
```

What is established:

- `send_escape` on the widget's own `input.multiselect__input` clears
  `multiselect--active` (page-level `send_keys_to_page(Keys.ESCAPE)` does **not** —
  focus is not in the widget).
- 500ms later `document.elementFromPoint` at the button centre returns the button
  itself and all four `.multiselect__content-wrapper` elements are `display: none`.
- **Yet the Apply click still times out across 30s of Playwright retries.** Something
  re-establishes the overlay between the check and the click. Unexplained.

A plausible but unverified reading is that Playwright's retry loop moves the pointer
onto the fading option list and vue-multiselect keeps it alive. Worth testing before
anyone spends more time here.

**Cost note:** six 7-minute runs went into this single test. Timebox this class of
problem — ship the file with one decorator retained and the diagnosis recorded.

## Local Selenium viewport artifact

`test_uploads::test_rules_example_5_matching_collections` fails locally under
**Selenium** with `ElementClickInterceptedException` on the `rule-btn-okay` button at
point (858, 849). Dev's own unmodified `test_uploads.py` fails identically at the same
coordinates, so it is a local window-size artifact, not a regression and not a
Playwright matter. Same rule as the state-accumulation trap: reproduce against dev's
file before blaming a change.

## Local-run trap: state accumulates across runs

`~/galaxy_selenium_context.yml` pins a single `login_email`, so every local run
reuses the same Galaxy user. Tests asserting **absolute** counts therefore pass
once and fail afterwards.

`test_grid` creates 30 invocations and expects 25 on page 1 and the remaining 5
on page 2. A second local run sees 60 and fails `assert 25 == 5`. This is not a
backend issue — Selenium fails identically on the same polluted state. Verify a
suspicious count failure under both backends before blaming Playwright.

Pointing the config at a fresh `login_email` does not work around it. The config's
`login_email` / `login_password` map to `GALAXY_TEST_SELENIUM_USER_EMAIL` /
`_PASSWORD` (`framework.py:117`), and that path calls `submit_login`, which does not
register. Dropping `GALAXY_TEST_END_TO_END_CONFIG` entirely is what gives a fresh
random user per run, because `login()` then falls through to `register()`.

## Unverified locally: test_history_sharing

`test_history_sharing::test_share_history_login_redirect` fails here under **both**
backends — Playwright times out on `.loggedin-only`, Selenium raises
`NoSuchElementException` — with and without the context config. A failure both
backends share is not a migration blocker, so this says nothing about Playwright;
it needs an environment where the test passes under Selenium first. Do not record
it as a diagnosed Playwright blocker.

Note the test re-logs-in with `fill_login_and_submit(user_email)`, which uses the
hardcoded `DEFAULT_PASSWORD = "123456"` rather than any configured password — so it
implicitly assumes the browser user was created by `register()`.

## Unverified locally: the two invocation-export tests

`test_workflow_run::test_workflow_export_file_rocrate` and
`..._native` time out under Playwright waiting for
`[data-export-format="rocrate.zip"]` / `[data-export-format="tgz"]` to become
clickable. This is **not** a backend gap.

`GALAXY_TEST_SCREENSHOTS_DIRECTORY` captured `invocation_export_formats.png`
immediately after the Export tab click: the tab *is* active and the export view
*did* render — as `BioComputeObjectExportCard`, not `InvocationExportWizard`.
`WorkflowInvocationExportOptions.vue` picks between them on
`config.enable_celery_tasks`, and the local instance reports
`enable_celery_tasks = False` (`/api/configuration`). With the legacy card
rendered there is no `[data-export-format]` element on the page at all.

Consequence: do not restore `@selenium_only` on these two. They need a Galaxy
with celery tasks enabled — CI has one. Leave them unlocked and let CI verify.

Method note: the screenshot settled in one run what two rounds of DOM
speculation had not. When a Playwright timeout is "element never appeared",
capture the page before theorising about click interception or actionability —
the element may simply not be part of the rendered variant.

Corollary to the cascade rule already recorded above: of the four candidate
failures left over from the collapsed full-file run, two passed cleanly in
isolation (`test_workflow_run_pagination_legacy_form`,
`test_workflow_run_input_step_load_more_appends`) and two were environment-gated.
Zero of the four were real Playwright findings.

## action_chains() under Playwright is a silent-wrong-behavior trap

`HasPlaywrightDriver.action_chains()` (has_playwright_driver.py:831) returns
`self` — "a placeholder object that indicates it exists but isn't used the same
way". It is not a no-op and not a clear error: the caller then invokes
Selenium ActionChains methods on the *driver*, and what happens depends on
whether the driver happens to have a same-named method.

`test_workflow_run::_chipseq_data_entry` hit it as
`AttributeError: '_PlaywrightDriverImpl' object has no attribute 'send_keys'`,
which is the lucky case. The unlucky case is a method that *does* exist on the
driver with different semantics — that silently does the wrong thing and shows
up as an unrelated assertion failure much later.

This strengthens the design-doc item about deleting `action_chains()` from the
protocol and proxy: until it is gone, raising `NotImplementedError` from the
Playwright implementation would be strictly better than returning `self`.

Port applied (test-file local, no shared-code change):
`action_chains.send_keys(x)` x36 → accumulate into a `keys` list, one
`self.send_keys_to_page("".join(keys))`; the trailing bare
`action_chains.click()` (which clicked wherever Selenium had left the pointer)
→ an explicit `self.move_to_and_click(condition_cell)` on the cell the entry
started from. Needs Selenium verification because it changes Selenium behaviour
from implicit-pointer-position to an explicit target.

## Machine load invalidates job-completion timeouts

Three tests failed together on `content-item[data-hid=N][data-state="ok"]` /
`[data-description="collection created"]` timeouts. `uptime` showed a load
average of 17.6, driven by unrelated processes (Spotlight `mdworker` at 210%
CPU, plus a game) — not by the test run. Galaxy jobs simply were not finishing
inside the wait.

Check `uptime` before recording any "job never reached ok" failure, and re-run
with `GALAXY_TEST_TIMEOUT_MULTIPLIER=4` rather than diagnosing the test. A
`data-state="ok"` timeout is about the backend finishing work; it is almost
never a browser-driver difference.

## Also fails under Selenium: two more test_workflow_run tests

Both confirmed by a Selenium control run on this machine, so neither is a
migration blocker and neither earns a decorator:

- `test_runtime_parameters_simple_optional` — times out on
  `content-item[data-hid="1"][data-state="ok"]`. The Playwright screenshot
  (`workflow_run_optional_runtime_parameters_modified`) shows the form filled
  correctly with `3`, so the browser interaction is fine; the job never
  produced an ok dataset. Uses the `expression_null_handling_integer`
  expression tool.
- `test_upload_list_paired_from_workflow` — times out on hid 6. Selenium's
  richer message is the useful one: *"Failed waiting on history item 6 state to
  change to [ok] current state [UNKNOWN]"* — the item is not merely pending, it
  is unreadable.

Pattern worth keeping: when a Playwright timeout names a `data-state="ok"`
selector, run the Selenium control **before** anything else. The Selenium
wrapper reports the observed history-item state in the exception message, which
Playwright's wrapper does not — so the control run is both the discriminator and
the better diagnostic.
