# Galaxy UI Skill — design

Task 2 of [GALAXY_UI_SKILL.md](GALAXY_UI_SKILL.md). Why this shape is argued in
[GALAXY_UI_SKILL_RESEARCH.md](GALAXY_UI_SKILL_RESEARCH.md). All Galaxy refs are against dev as of
2026-10-06.

## Status and next steps (2026-10-06)

**Done:**
- **Research.** CLI vs MCP; the decision is a CLI skill (`GALAXY_UI_SKILL_RESEARCH.md`).
- **This design.** The skill is named `galaxy-ui-driver` (renamed from `galaxy-ui`: dev's
  `@galaxyproject/galaxy-ui` component package arrived in #23924) and its CLI `gxui`.
- **Loop design** (`GALAXY_UI_SKILL_LOOP.md`).
- **Phase 0, run 1.** Codex + playwright-cli on GTN `galaxy-intro-short` against
  test.galaxyproject.org passed verification (`GALAXY_UI_SKILL_RUNS.md`).
- **Spikes S1–S3 are all resolved** (below).
- **The harness** is source in `galaxy_ui_loop/`, with state in `~/.cache/gxui-loop`. See its
  README.
- **Prerequisite PR 1** is branch `selenium_context_timeout_handler`, approved at `46aebb27457`.
  The gx_branches process owns it from here.
- **Prerequisite PR 2** is branch `playwright_remote_debugging_port` @ `da5054d39f3`, handed to
  gx_branches (needs CI + polish).
- **`gxui` MVP, external first** (John's call): `galaxy_ui_loop/gxui/` + `skill/galaxy-ui-driver/`,
  run against the local-only `gxui_base` worktree (dev + PRs 1–2; how to run and recreate it is in
  `galaxy_ui_loop/README.md`). 17 tests pass (`galaxy_ui_loop/tests/test_gxui.py`). Findings below
  under "MVP findings".
- **Arm A is wired** (`ARM=A ./run.sh`). runA1 crashed (gxui bug, fixed); runA2 and runA3
  **passed** all 13 boxes. runA3: 18.8 min, 3 gaps (runA2: 25.3 min, 14 gaps; arm B run1: 17.5
  min). Fresh input is flat across arms; arm A spends more turns and output. See
  `GALAXY_UI_SKILL_RUNS.md`.

**Next, in order:**
1. **runA3's gxui list** (`GALAXY_UI_SKILL_RUNS.md`): `workflow-run` inputs via
   `input_select_field`, `history-share`, `call --list`, `dataset-copy`; then expand snippets and
   take n=3 per arm before quoting any delta.
2. **Prerequisite PR 4 (public tool-form filler + `tool-describe`).** Larger. Lift it out of
   `RunsToolTests`, which then calls it.
3. **Upstream the Galaxy-side findings** as small gx_branches PRs: "MVP findings" below, plus the
   runA2/runA3 Galaxy-side lists in `GALAXY_UI_SKILL_RUNS.md` (obsolete `step-label` in
   `workflow_run_specify_inputs`, stale Multiview ids, opacity-0 extraction checkboxes). Tool Shed
   `tool_open` first.
4. **Loop, in parallel:**
   - Expand GTN `{% snippet faqs/... %}` includes before handing `tutorial.md` to the agent.
     phase0-run1 got them unexpanded.
   - Do runs 2–3 of arm B to get an n=3 baseline.

**Open questions for John:**
- Should the skill live in `claude-jmchilton-plugins` or `galaxy-skills`?
- REST during UI runs: allowed for staging and verification only, or always counted as a gap?
- Should `drive-scenario` be retired into `galaxy-ui-driver`?
- Test-server leftovers on John's test.galaxyproject.org account: run1, runA2 and runA3 each left
  a link-accessible "My Analysis…" history, a "Next Analysis…" history, a "QC and filtering…"
  workflow and an invocation; runA1 left one history. Keep them or clean them up? Runs add more
  each time.

## MVP findings (2026-10-06)

Gaps in Galaxy's test abstractions that building `gxui` against live Galaxy exposed. Each is a
small upstream PR candidate:
- **`tool_open` cannot open Tool Shed tools.** The panel's `id:` filter becomes
  `id_exact:(<guid>)` unescaped (`client/src/components/Panels/utilities.ts:257`), so a GUID's `/`,
  `+` and `:` find nothing; and `tool_panel.tool_link` expects `?tool_id=<id>`, while real links
  URL-encode the versioned GUID. Only simple ids like `cat1` (all the E2E suite uses) work. `gxui`
  opens the form's URL for GUIDs meanwhile.
- **Private helpers verbs need:** `BaseUploadContext._start_and_wait_for_uploaded_hids` (upload
  verbs), `HasPlaywrightDriver._selenium_locator_to_playwright_selector` (component-scoped aria
  snapshots).
- **No path → `SmartTarget` resolver.** `resolve_component_locator` returns a `LocatorT`; `gxui`
  wraps it in a small `Target` to get Galaxy's waits.
- **Undocumented methods.** `logout`, `history_panel_rename`, `display_dataset`,
  `show_dataset_details`, `open_history_multi_view`, `workflow_import_submit_url` and others have
  no docstring, so help falls back to text written in `gxui`.
- **Workflow extraction helpers exist** (`navigate_to_workflow_extraction`,
  `extract_workflow_name_and_submit`); the verb table's "no helper" was stale. But the step-toggle
  and output-rename helpers (`extract_workflow_toggle_job`, `extract_workflow_rename_output`) live
  in the test class in `test_workflow_extraction.py`, not `NavigatesGalaxy`, so `gxui` re-does them.
  Input-card rename has no `navigation.yml` components at all.
- **Cold start.** Importing `galaxy_test.selenium.framework` takes ~25 s the first time; a warm
  `gxui start` is ~10 s.
- **Dialogs.** The passive listener also records dialogs `accept_alert` handles, so the "dialog
  open" hint can be stale after such verbs.
- test.galaxyproject.org's footer confirms it runs commit `67c3f964d355`.

## Shape

```
agent ──Bash──▶ gxui <verb> [args] ──unix socket──▶ gxui daemon (Python, one per session)
                                                      ├─ NavigatesGalaxy + UsesUploadActivity
                                                      │    + RunsWorkflows + tool-form filler
                                                      ├─ Playwright Chromium, CDP port exposed
                                                      └─ runs/<session>/transcript.jsonl, png/, aria/
agent ──Bash──▶ playwright-cli -s=<session> attach --cdp=http://127.0.0.1:<port>   (escape hatch)
```

- **The daemon owns the browser.** It serves requests sequentially on the thread that started
  Playwright, because the sync API is thread-bound.
- **`gxui` is a thin client.** It sends `{verb, args}` and prints the reply.
- **The skill is a short `SKILL.md`.** It covers when to use which layer, the startup and status
  steps, and the gap-logging rule. Verb details come from `gxui help`.

## Three layers, in order of preference

**1. Verbs.** These are curated `NavigatesGalaxy` and mixin methods, exposed under kebab-case
names. A registry module maps each verb to its method. The CLI derives arguments from the
signature and help from the docstring, so nothing is written twice.

The initial set comes from what the tutorial and IWC candidates need. `S` marks a verb that is
**missing** today, and every one of those is also a gap in the test abstractions.

| Domain | Verb | Backing method |
|---|---|---|
| session | `login`, `register`, `logout`, `home` | `submit_login`, `register`, `logout`, `home` |
| history | `history-new NAME`, `history-rename`, `history-tag` | `history_panel_create_new_with_name`, `history_panel_rename`, `history_panel_add_tags` |
| history | `history-items` | S: list hid, name, state and extension. Read-only; it can use `api_get` because it observes rather than drives |
| history | `history-wait [HID]` | `history_panel_wait_for_hid_ok` / `wait_for_history` |
| history | `multiview` | `open_history_multi_view` |
| history | `history-share` | `click_history_option_sharing` + `make_accessible_and_publishable` (that helper also publishes; the tutorial wants link access only — S) |
| history | `dataset-copy HID --to HISTORY` | S: Multiview drag, the GTN route; phase0-run1 |
| upload | `upload-paste`, `upload-url`, `upload-file` | `upload_context(...)` fluent contexts (`upload_activity_helpers.py`) |
| collection | `build-list`, `build-list-paired` | `history_panel_build_list_auto` / `_of_pairs` (+ `collection_builder_*`) |
| dataset | `dataset-view HID`, `dataset-details HID`, `dataset-peek HID` | `display_dataset`, `show_dataset_details`, peek via `history_panel_click_item_title` |
| tool | `tool-open ID`, `tool-run` | `tool_open`, `tool_form_execute` |
| tool | `tool-describe` | S: the open form's fields (label, name, type, value, options). GTN names parameters by **label** while tests use **names**, so the agent needs this map |
| tool | `tool-fill JSON` | S: a public form filler. Today it is private to `RunsToolTests` (`framework.py:899-1099`) and keyed on tool-test dicts |
| workflow | `workflow-import-url URL` | `navigate_to_workflows_import` + `workflow_import_submit_url` |
| workflow | `workflow-run NAME --inputs JSON` | `workflow_run_with_name` + `workflow_run_specify_inputs` + `workflow_run_submit` (data inputs only — S for parameters) |
| workflow | `invocation-wait` | S: no UI-side helper; tests wait via the API |
| workflow | `workflow-extract NAME` | `navigate_to_workflow_extraction` + `extract_workflow_name_and_submit` (all steps; input renaming is S) |
| observe | `screenshot LABEL`, `snapshot [PATH]` | `screenshot`; Python `locator.aria_snapshot()` written to a file |
| narrate | `note MARKDOWN` | Transcript annotation for now. It becomes Test Stories `document()` once `selenium_stories_core` lands |

**2. Components.** These address the UI by smart-component path, using the same resolver as tours
(`components.py:247`):
- `gxui components [PREFIX]` browses the `navigation.yml` tree, showing keys and resolved
  selectors.
- `gxui component 'history_panel.item(hid=3).title' click|text|value|wait|visible|absent|send-keys V`
  acts on one element.

These calls go through `SmartTarget`, so they get Galaxy's waits and transition retries.

**3. Escape hatch.** This is `playwright-cli` attached to the same browser: `snapshot`, `find`, ref
clicks, `console`, `requests`, `eval`. Every use is logged; see logging below.

`gxui call METHOD JSON` reaches any public `NavigatesGalaxy` method that has no verb yet. It is
also logged. A method called through it often is the next verb to promote.

## Logging and transcript

The daemon appends one JSON line per call to `transcript.jsonl`. Each line records:
- `ts`, `layer` (`verb`, `component`, `call` or `external`), the verb or path, and the args;
- `ok`, a short `result`, and `duration_ms`;
- artifact paths.

`gxui gap "<reason>"` records a `layer: external` line *before* the agent uses playwright-cli or
the REST API. The skill makes this mandatory. The transcript is the input to:
- the loop's report ([GALAXY_UI_SKILL_LOOP.md](GALAXY_UI_SKILL_LOOP.md));
- `gxui transcript --as pytest`, which emits a test body in the style of `test_*.py`;
- later, `--as story`, through Test Stories D.

## Where things live

| Piece | Home | Why |
|---|---|---|
| Daemon, client, verb registry | Starts external in `galaxy_ui_loop/gxui/` (John, 2026-10-06); target is Galaxy's `lib/galaxy_test/selenium/` (package `galaxy-test-selenium`), entry point `gxui` (cf. `gxwf`) once verbs settle | It must import the mixins in `framework.py`, versions with the vocabulary, and can be upstreamed |
| Skill (`SKILL.md`) | `claude-jmchilton-plugins/plugins/jmchilton/skills/galaxy-ui/` | It needs a Galaxy worktree, like its sibling `galaxy-playwright`; move it to `galaxy-skills` once it is community-ready |
| Loop harness | Next to the skill, under `evals/` | It is part of how the skill is maintained |
| Run reports | `vault/projects/playwright/` (ledger); screenshots and JSONL stay outside the vault | Large binary artifacts don't belong in the vault |

## Prerequisite PRs (small, atomic, in this order)

1. **Fix the standalone context bootstrap.** Branch `selenium_context_timeout_handler`,
   approved at `46aebb27457`.
   - `GalaxySeleniumContextImpl.__init__` (`context.py:62`) calls
     `ConfiguredDriver(**from_dict.get("driver", {}))`, but `ConfiguredDriver` has required a
     positional `timeout_handler` since `086eac9dfe7`. So `context.init()` and both Jupyter
     `init()`s raise `TypeError` on dev today. This was confirmed by reading the code, not by
     running it.
   - `timeout_multiplier` (`context.py:65`) is stored but never read.
   - The fix is to build `galaxy_timeout_handler(timeout_multiplier)` and pass it.
   - This repairs the Jupyter path on its own merits, with no agent framing needed.
2. **Driver attachability.** Branch `playwright_remote_debugging_port` @ `da5054d39f3`: opt-in
   `remote_debugging_port` on `ConfiguredDriver` / `get_playwright_driver`, passed to
   `launch(args=...)`. S1 showed that is all that's needed; no persistent context.
3. **`headless=auto` under Playwright.** `framework.py:1450` goes through `get_local_browser`,
   which raises without chromedriver or geckodriver even when the backend is Playwright.
4. **A public tool-form filler and `tool-describe`.** Lift the filler out of `RunsToolTests` into
   a `NavigatesGalaxy` method keyed by parameter path. `RunsToolTests` then calls it, so the
   existing tool-test E2E suite becomes its regression test.
5. **The `gxui` daemon, client and the first ~15 verbs**, with a `test/unit/selenium` test that
   drives the toy `basic.html` fixture through the daemon.

## Spikes

- **S1 — two clients, one page: resolved 2026-10-06, works.** The spike scripts drove a
  local fixture page and the live test.galaxyproject.org from Galaxy's venv, with Python
  `playwright==1.63.0` and `@playwright/cli` 0.1.22.
  - **Launch modes.** All four modes pass: `browser.launch` + `new_page` (what `driver_factory`
    does today) and `launch_persistent_context`, each headless and headed.
  - **What was checked in each mode:**
    - `attach --cdp` lists and snapshots Python's page;
    - a CLI click by CSS and by snapshot ref is seen by Python;
    - a DOM change made by Python is seen in the CLI's next snapshot;
    - `detach` leaves Python working, with the viewport (1280) unchanged.
  - **The feared non-default-context problem did not occur**, so the
    `launch_persistent_context` fallback is unnecessary. `get_playwright_driver` only needs to
    pass `--remote-debugging-port` through to `launch(args=...)`.
  - **Live Galaxy.** `GalaxySeleniumContextImpl` (with the
    `selenium_context_timeout_handler` fix) ran `home()` and a smart-component wait while the CLI
    was attached. The CLI then `find`s the login button and clicks it, and Python's
    `components.login.form.wait_for_visible()` sees the CLI-driven navigation.
  - **`page.url` lags.** One second after the CLI click it still read `/`. Read the URL after a
    wait, not straight after an action by the other client.
  - **Dialogs need a deliberate policy.**
    - With no Python `dialog` listener, Playwright auto-dismisses a `confirm()` before the CLI ever
      sees it.
    - With a passive listener, the dialog stays open, the CLI reports `Modal state`, and
      `dialog-accept` resolves it (`confirm()` returned `true`).
    - Galaxy's `accept_alert` registers a `page.once` handler only inside its context manager.
    - **Design:** the daemon registers a passive listener. A verb that hits an unexpected dialog
      fails fast with the dialog's message. A `gxui dialog accept|dismiss` verb (or CLI
      `dialog-accept`) resolves it. Verbs that expect a dialog keep using `accept_alert`.
- **S2 — version skew: resolved.** S1 ran Python 1.63.0 against playwright-core
  1.64.0-alpha with no issues.
- **S3 — daemon lifecycle: resolved 2026-10-06.**
  - **The prototype.** It was throwaway: a detached daemon holding a real
    `GalaxySeleniumContextImpl` (Playwright, headless) against test.galaxyproject.org, with a JSON
    line protocol over a Unix socket, one request at a time. Eight tests, all passing:

    | Test | Behaviour |
    |---|---|
    | Detach | Spawned with `start_new_session=True`, the daemon is reparented to launchd and survives the agent shell that started it |
    | Fresh shell | A new shell reconnects by session name. Page state is intact |
    | Abandoned call | Client A times out (2 s) during a 6 s call. The daemon finishes the call, logs "client gone" and stays up. Client B, queued behind it, is served at 6 s. A's result is lost to the agent |
    | Browser killed | The pre-call liveness check (`is_connected` / `is_closed`) still reads alive, because the sync API only notices during a call. The first call fails with `TargetClosedError`; the next one triggers a relaunch |
    | Daemon `kill -9` | No orphans: Playwright's driver process notices and takes Chromium down. The next client removes the stale socket and metadata and reports "no gxui daemon" |
    | Idle timeout | After `accept()` times out, the daemon exits, quits the browser, and removes the socket and metadata |
    | Attached CLI across a relaunch or stop | The playwright-cli session dies. Its error suggests `open`, which would start a second browser (and SIGABRT in Codex's sandbox). Re-attaching to the same CDP port works |
    | Codex sandbox | A client in `codex exec` (`workspace-write`, network on) reaches a daemon socket in `~/.cache` |

  - **Decisions for the real daemon:**
    1. **Short socket path.** macOS caps `AF_UNIX` paths at ~104 bytes, and the first attempt
       failed under the session scratch dir. Use `~/.cache/gxui/<session>.sock`, or a hash as
       playwright-cli does. Never put the socket in the workspace.
    2. **`gxui start` is idempotent.** It returns the running daemon if there is one, and it
       prints the CDP URL.
       - Under Codex the harness runs it outside the sandbox, because Chrome cannot launch inside.
       - Under Claude Code the agent may run it.
    3. **`gxui` owns the playwright-cli attach.** It attaches on start and re-attaches after every
       browser relaunch. The skill forbids `open`, `close` and `attach`.
    4. **Browser death is detected by catching `TargetClosedError`**, not by a liveness check
       before the call. The daemon relaunches on the same CDP port, re-attaches the CLI, and fails
       the call with "browser relaunched; page state and login lost".
    5. **Long verbs are bounded below host tool timeouts.** Claude Code's Bash default is 2 min.
       A verb returns its state on a timeout rather than blocking. The daemon writes every result
       to the transcript, and `gxui last` returns the latest one, so an abandoned call loses
       nothing.
    6. **Idle timeout defaults to 1 h,** as playwright-cli's headless default does. `0` disables
       it for harness runs, where the harness stops the daemon.
    7. **One daemon per session, one request at a time**, with no lock beyond the listen backlog.
       Two agents use two sessions.

## Known gaps the first runs will hit

These are from the survey and are unverified until the loop confirms them:
- **Workflow run form:** `workflow_run_specify_inputs` handles data inputs only, and pops `"hid"`
  from the caller's dict.
- **Reading datasets back:** there is no UI reader beyond peek and `display_dataset`.
- **Tool Shed:** no install flow in the UI; the harness pre-installs tools.
- **`navigation.yml`** has no description fields, so an agent browsing components sees only key
  names. A candidate fix is optional `description:` keys, checked by the tours validator.
- **Tool-form filler:**
  - drilldown works only when an option's name equals its value (TODO at `framework.py:1076`);
  - conditionals are revealed by two passes rather than by an explicit step.
