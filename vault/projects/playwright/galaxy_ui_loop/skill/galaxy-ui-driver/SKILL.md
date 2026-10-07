---
name: galaxy-ui-driver
description: Drive a live Galaxy web UI (histories, uploads, tools, workflows) through Galaxy's own test vocabulary with the `gxui` CLI, falling back to playwright-cli on the same browser. Use to work through a GTN tutorial or IWC workflow as a user would, or to reproduce a UI behaviour. Don't use it to run Galaxy's E2E pytest suite (galaxy-playwright), to edit Galaxy's client components (@galaxyproject/galaxy-ui), or when the REST API alone would do.
allowed-tools: Bash(gxui:*), Bash(playwright-cli:*)
---

# galaxy-ui-driver

`gxui` talks to a daemon that holds one browser logged into Galaxy. Each verb is a method from
Galaxy's Selenium/Playwright test framework, so verbs **wait for the UI themselves** - never sleep
or poll. Output is one line of outcome plus ids; big things (snapshots, screenshots) go to files and
the verb prints the path.

## Start

- `gxui` (no args) prints the session status: Galaxy URL, CDP URL, transcript path. If it says
  "no gxui daemon" and you were not given one, run `gxui start --url <galaxy>`.
- `gxui help` lists verbs by domain; `gxui help <verb>` shows arguments and the Galaxy method
  behind it. Read it before guessing a verb.

## Three layers - use the first that works

1. **Verbs** - `gxui history-new NAME`, `gxui upload-url URL... --ext fastqsanger`,
   `gxui tool-search NAME`, `gxui tool-open ID`, `gxui tool-run` (prints the output hids),
   `gxui history-wait HID`, `gxui workflow-run NAME --inputs '{"label": 1}'`, ...
   A verb that returns has done what it says: uploads are `ok`, forms are rendered, `tool-run` has
   *submitted* (follow with `history-wait`). `history-wait` and uploads wait up to `--timeout`
   seconds (default 240) and fail at once on an error state; a timeout means still running - check
   `history-items` before retrying, so you don't upload twice.
   `workflow-extract NAME --input-names LABEL --exclude-hids HID` does a whole extraction.
   Tool parameters: `gxui tool-describe` maps the open form's labels (what tutorials say) to paths,
   with options and the conditional case that shows each field; `gxui tool-fill '{"path": value}'`
   sets them (data fields take a hid; put a conditional's selector and its fields in one call).
2. **Components** - name UI elements from Galaxy's `navigation.yml`:
   `gxui components history_panel` browses; `gxui component 'history_panel.item(hid=3).title' click`
   acts (click|check|uncheck|text|value|visible|absent|send-keys|clear-send-keys), with Galaxy's
   waits, up to `--timeout` (default 30 s). Use `check`/`uncheck` for styled checkboxes.
   `gxui call METHOD ARGS...` reaches any other public framework method.
3. **Escape hatch** - `playwright-cli -s=<session>` is already attached to the same page (snapshot,
   find, click by ref, eval, console). **Before each playwright-cli command or REST call, run
   `gxui gap "<what was missing>"`.** Gaps are the main output of a run - be specific.

Never run playwright-cli `open`, `close`, `attach`, `detach`, `state-load`/`state-save` or
`kill-all`: the browser belongs to gxui. If the CLI says its session is gone, report it with
`gxui gap` - don't open a new browser.

## Observing

- `gxui url` - current URL and title. `gxui history-items` - `hid state extension name` per item
  (an observation verb - fine under UI-only rules; it changes nothing).
- `gxui dataset-peek HID` - bounded peek text. `gxui snapshot [COMPONENT]` - accessibility tree
  to a file; scope it to a component, whole-page trees are large.
- `gxui screenshot LABEL` - PNG path.

## When things fail

A failed verb prints the error, URL, a screenshot path and a hint. Then:
- Check state with `gxui url` / `gxui history-items` / a scoped `gxui snapshot`.
- Retry once if the UI was mid-transition; otherwise drop a layer (and log the gap).
- A verb that outlives your shell's timeout keeps running in the daemon: `gxui last` returns
  its result.
- "browser died and was relaunched": login and page state are gone - report it.
- "no gxui daemon": the session is gone - stop and report it; don't try to start a new one.
- A JavaScript dialog blocks the page: `gxui dialog accept|dismiss`.

## Narrating

`gxui note "<text>"` writes to the transcript - use it when starting each tutorial box or step so
the transcript lines up with the task.
