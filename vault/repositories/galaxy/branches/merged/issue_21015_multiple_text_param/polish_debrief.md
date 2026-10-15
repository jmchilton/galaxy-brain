# issue_21015_multiple_text_param — polish debrief (2026-10-08)

Polished from `4736fd1d066` to `96baea8456d`. One commit was added: "Test the editor's text list default; say how to fix newline values".

## CI

Fork CI on `4736fd1d066`:
- Backend suites (API, Integration, Unit, framework, linting): green.
- Packages: red on `ModuleNotFoundError: galaxy_test` in `seleniumtests/test_context.py`. This comes from #23947 and was reverted on dev by #23958, so it's unrelated.
- Playwright, Integration Selenium, Tool form harness, first and macOS startup: all died at "Restore client cache" (fork cache eviction), so no E2E ran in CI. I ran them locally under Playwright instead (see below).

## Checklist round (General + Workflow)

Everything passed except:
- **Selenium `test_multiple_text_parameter_connections` passed on base.** It only exercised #23802's connection rules.
  - Fix: it now also ticks "Set a default value", enters `--ex1,ex2` and `--ex3`, saves, and asserts the stored `["--ex1,ex2", "--ex3"]` and the two reloaded rows. It passes under Playwright (Galaxy 8081, Vite 5175).
  - Red check: reverting only the `get_default_parameter` text `multiple` line fails it at the missing value-list row.
- **Newline rejection back-compat.** I asked John, who chose to keep rejecting with a clearer message. The message "enter one value per entry" became "values cannot contain newlines; pass a list" (doctest updated, 15 pass).
- **Float list normalization unlisted.** It's now in the description.
- **Nit, not changed:** the conditional-expression statement in `FloatToolParameter.__init__`. It mirrors dev's `IntegerToolParameter`.

## Strengthening round

Description fixes:
- The dev editor-default column was wrong. Dev shows a list default as the repr string `"['a,b', 'c']"`, as the red output of the unit test confirmed, not as "its first item".
- The dynamic-select whitespace split claim was overstated (it only applies with no resolved options). Removed.
- The "400 names the bad entry" claim was half true. Reworded.
- Unlisted behaviour changes were added to Risks: empty entries rejected; numbers converted; rerunning a dev textarea invocation; the "a single value is required" editor error for text.
- Bold-italic sentences added for the misreadings "text isn't new like integers were" and "does this break workflows". The second is backed by IWC: 66 workflows with text params, none `multiple` (snapshot 2026-09-08).

Suggestion rejected after checking:
- The reviewer proposed a run-form row ("on dev a list default shows as a repr in the textarea"). Swapping dev's `basic.py` in shows the runtime field's value is already `['a,b', 'c']` on dev. I didn't add the row, and reverted the assertion I'd tried.

## Left for John

- Normalizing defaults and subworkflow inputs in `InputParameterModule.execute` is shared with integers. It's queued as `gx_issues/to_file/workflow_multiple_parameter_default_not_normalized.md` and isn't filed yet. The PR's Context mentions it as a follow-up.
- A multiple text feeding a single *text* tool input (only possible in hand-written or old workflows) now receives a list. This isn't in the description.
- Fork CI on `96baea8456d`. E2E will probably hit the cache eviction again until the setup-uv caches are pruned.
