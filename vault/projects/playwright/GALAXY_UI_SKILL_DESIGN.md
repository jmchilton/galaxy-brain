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
- **Standing branch `galaxy_ui_driver`** (John, 2026-10-06): Galaxy-side changes that don't
  justify a PR alone are collected here, unmerged, until gxui is a complete motivating example. It
  holds PR 2 (`9ffb7bda18c`, CDP port, no longer queued alone) on top of PR 1. Galaxy-side work
  lands there one commit per fix/enhancement; see "Prerequisite PRs" below.
- **`gxui` lives in Galaxy now** (2026-10-07): the tip commit of `galaxy_ui_driver` (`5a5b1455281`,
  `lib/galaxy_test/selenium/gxui/`, 33 tests in `test/unit/selenium/test_gxui.py`). The skill is on
  galaxy-skills branch `gxui` (`galaxy-ui-driver/`). The vault's `galaxy_ui_loop/` keeps only the
  eval harness; how to run and recreate the worktrees is in its README. Findings below under "MVP
  findings".
- **Comparison: parked** (John, 2026-10-07). Phase 2 (n=3 per arm, fresh runs on the expanded
  tutorial, all 6 pass): arm A 13.6-15.7 min and 4.5-6.4M input against arm B 20-29 min and
  8.2-9.6M (`GALAXY_UI_SKILL_RUNS.md`, "Phase 2 summary"). The verdict to quote: **we've got some
  baseline numbers that are promising against an optimized skill on a frontier model. More
  comparisons, and comparisons on different models and such, are still to be done.** Paired runs
  are expensive and the approach doesn't depend on them, so the loop now refines the skill instead.

**Next, in order:**
1. **Phase 2 gaps:** done (2026-10-07). `dataset-rerun HID` opens a job's rerun form;
   `tool-describe`/`tool-fill` read `?job_id=` forms and show the job's settings (Galaxy:
   `tool_form_parameters(job_id=...)`, commit 6c); `snapshot` of a component group falls back to
   the center panel; the skill gives a concrete 300 s timeout for gxui calls; `history-new` goes
   home first; `dataset-copy` names server/client skew when Multiview lacks per-history hooks.
2. **Refine the skill on more tutorials, arm A only** (John, 2026-10-07: run each, fix its gaps,
   move on; record serious blockers and skip). Done: `workflow-editor`, `workflow-parameters`,
   `history-to-workflow`, `workflow-reports` (ledger "Refinement runs"). **Resume here:** work
   the ranked lists in "429s and hardening plan" below first; then (a) build the report-editor verbs `workflow-reports-1` asked for (check this server's report
   editor DOM first); (b) live-check the two untested fixes in gxui `5a5b1455281` (upload failure,
   inspector-aware panning); (c) run `collections` (`TUTORIAL=galaxy-interface/tutorials/collections`,
   then add its EXPECTED). `collection-build`, `history-switch` and collection-aware `history-wait`
   are already there; bwa_mem, lofreq and SnpSift were not checked on the server; the data is
   about 100 KB a file. Known blockers: test.galaxyproject.org's nginx answers 429 to request bursts
   (gxui backs off, but page loads still hit it); version skew (Multiview hooks, TRS import, the
   expanded run form link); playwright-cli's attached session vanishes mid-run for an unknown
   reason (`gxui gap` re-attaches it).
3. **Galaxy-side work, one commit each below the gxui tip** (queue under "Prerequisite PRs").
4. **Decide what to pull out** ahead of the standing branch as separate PRs once gxui is a
   complete motivating example.

**Open questions for John:**
- Should the skill live in `claude-jmchilton-plugins` or `galaxy-skills`?
- REST during UI runs: allowed for staging and verification only, or always counted as a gap?
- Should `drive-scenario` be retired into `galaxy-ui-driver`?
- Test-server leftovers on John's test.galaxyproject.org account: run1, runA2 and runA3 each left
  a link-accessible "My Analysis…" history, a "Next Analysis…" history, a "QC and filtering…"
  workflow and an invocation; runA1 left one history. Keep them or clean them up? Runs add more
  each time.

## 429s and hardening plan (2026-10-07)

**How test.galaxyproject.org rate-limits** (infrastructure-playbook
`templates/nginx/galaxy_test.j2` at `8e96583`):
- `/api/`: 4 r/s, burst 40, nodelay. Everything else: 8 r/s, burst 50. Resumable upload and job
  files are exempt.
- The bucket key is `X-API-Key` if sent, else the `galaxysession` cookie, else the IP. gxui's
  `api_get` sends the browser's cookies, so the page, gxui's polls, playwright-cli and any dev
  session started from the same auth state **share one bucket**.
- A crawler zone (1 r/s, one bucket for every match) keys on a user-agent list kept in an
  encrypted vault. Probed: 25 fast requests each as `python-requests` and `HeadlessChrome` all got
  200, so neither matches.

**Evidence.** UI-visible 429s per refinement run: workflow-editor 4 (run form; "Loading workflow
versions failed"), workflow-parameters 1 (plus 2 JSONDecodeErrors, since backed off),
history-to-workflow 0, workflow-reports 0 (one "Upload request failed", cause unknown). They
dropped after dev sessions stopped running alongside eval runs and `api_get` started backing off.
No longer the top blocker.

**429 plan: stop here** (John, 2026-10-08). Backoff plus no dev sessions during runs solved it
without more machinery. Keep the rule: no other gxui session on the account while a run is going.
If "(429)" comes back in run notes, the parked options were per-verb counts in the transcript, a
browser-level retry (`context.route`; needs an idle pump under sync Playwright), an own bucket
via `X-API-Key`, and a 429 backoff in Galaxy's client.

**Hardening from the last runs, ranked by what they cost:**
1. **Verb deadlines.** `--timeout` becomes a total deadline from verb start, capped under the
   290 s client: `upload-url` ran 315 s and `invocation-wait` 309 s with `--timeout 240`.
   `invocation-wait` lists outputs with one `invocations/{id}` call, not one call per job.
2. **`workflow-run` data inputs.** Refuse to submit while a data input wasn't named in `--inputs`:
   the form preselects the newest compatible dataset, so reports box 6 ran on `23: Unique…`
   instead of iris.csv, and the cancelled invocation fails verify. Also:
   - fill an already-open run form (reports box 6);
   - `--new-history NAME` (history-to-workflow box 7 took about 8 commands).
3. **Names containing ":".** The workflow list search parses `GTN Training:` as a filter, so
   `workflow-edit`/`workflow-run` by full name timed out twice. Search a colon-free part, then
   match the exact title.
4. **Report-editor verbs** (8 of the 18 gaps in workflow-reports): open the Report activity,
   print/replace the markdown, insert an item (Galaxy version, time, image or dataset by output
   label), return to the workflow. Check the server's DOM first.
5. **`invocation-cancel [ID]`** (reports box 6).
6. **`invocation-wait` with no ID** should refuse when the newest invocation predates the last
   submit: it read the stale `8585d05b239c1089` after a `call`-based submit.
7. **`workflow-output` timed out** on `form-element-__label__output1` with `a824ff098a0`, which
   already opens Configure Output only when absent. Check on the server (skew, or an inspector
   still loading).
8. **Step numbers:** gxui's are zero-based, the UI's "Step N" is one-based (reports box 5). Print
   the UI's numbers.
9. **Live-check the `5a5b1455281` fixes.** Upload failure detection: reports box 2 waited 240 s on
   "Upload request failed", and observation verbs queued behind it. Inspector-aware panning.
10. **playwright-cli's session vanished in 2 of 4 runs**, so layer 3 was gone for whole runs.
    Re-attaching on `gap` is a patch; the root cause is still open.
11. **Harness stall watchdog:** no Codex events for 15 min means record "stalled", stop, and still
    verify (reports stalled 30 min after its last box).
12. **Version skew** (TRS import wizard, expanded run form link, Multiview hooks): record it; fix
    in Galaxy only where dev has the same selectors.

**Collections is unblocked:** bwa_mem 0.7.19+galaxy1, lofreq_call 2.1.5 and the SnpSift tools
(5.4.0c) are on the server.

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
| Daemon, client, verb registry | The tip commit of the standing branch `galaxy_ui_driver`: `lib/galaxy_test/selenium/gxui/`, `gxui` script in `galaxy-test-selenium`, tests in `test/unit/selenium/test_gxui.py` (John, 2026-10-07). **Correct home is `lib/galaxy/selenium/gxui/` (`galaxy-selenium`)**; it can't go there until the mixins it imports from `galaxy_test` (`RunsWorkflows` in `framework.py`, `UsesUploadActivity`) move into `galaxy.selenium` - a refactor still to plan | It needs the test framework's mixins, versions with the vocabulary, and can be upstreamed |
| Skill (`SKILL.md`) | `galaxy-skills` worktree `~/projects/worktrees/galaxy-skills/branch/gxui`, branch `gxui`: `galaxy-ui-driver/` (John, 2026-10-07) | Community skills repo; marked experimental until `gxui` ships in Galaxy |
| Loop harness | `galaxy_ui_loop/` in the vault (`run.sh`, `verify.py`, `metrics.py`, prompts, `expand_snippets.py`) | Eval tooling; it takes gxui from the Galaxy worktree and the skill from the galaxy-skills worktree |
| Run reports | `vault/projects/playwright/` (ledger); screenshots and JSONL stay outside the vault | Large binary artifacts don't belong in the vault |

## Prerequisite PRs (small, atomic, in this order)

Process (John, 2026-10-06): Galaxy-side work goes on the standing branch `galaxy_ui_driver`,
**one fix or enhancement per commit**, stacked linearly (no merge commits). At the end, with gxui as
the motivating example, decide which commits get pulled out ahead as their own PRs and which go up
with gxui. PR 1 is already its own approved PR; the stack starts on its tip (`46aebb27457`, don't
rebase it while approved). When PR 1 merges, rebase the stack onto dev and drop its commits.

**gxui is one commit, always the tip** (John, 2026-10-07). Galaxy fixes and enhancements go below
it, one commit each: commit the fix, then move it under the gxui commit (cherry-pick both back on in
order; no interactive rebase). gxui changes amend the tip commit. Every fix can then be pulled out
without gxui. Restacking this way and force-pushing `galaxy_ui_driver` to `jmchilton` with
`--force-with-lease` is a standing OK; no need to ask each time.

Restacked 2026-10-06 (John's OK): tip `9ffb7bda18c`. Its base is PR 1's base `8f9ef7c7de2`,
9 dev commits older than the old merge's `253a4cb0b9c`; nothing gxui needs.

Commit queue (✅ = on the branch):

| # | Commit | Kind |
|---|---|---|
| 1 | Context bootstrap fix (PR 1, 3 commits) | fix ✅ |
| 2 | Opt-in CDP port on Playwright Chromium (`9ffb7bda18c`, was `da5054d39f3`) | enhancement ✅ |
| 3 | ~~`headless=auto` under Playwright~~ | dropped; queued for gx_issues |
| 4a | `tool_open` / `tool_panel.tool_link` work for Tool Shed GUIDs (`3f649833297`) | fix ✅ |
| 4b | `workflow_run_specify_inputs` fills the simplified run form too (`7f0c9112f89`) | fix ✅ |
| 4c | Multiview selectors point at real per-history hooks (`983d9a629f1`) | fix ✅ |
| 4d | ~~Extraction step checkboxes~~ | dropped: not a Galaxy bug (see below) |
| 5a | Extraction step helpers moved into `NavigatesGalaxy`; `extract_workflow_rename_input` (`cc9cefd0fb6`) | enhancement ✅ |
| 5b | Public `playwright_locator`, `start_for_uploaded_hids`, `Component.sub_components` (`98be43d5d94`) | enhancement ✅ |
| 5c | `resolve_component(path)` → Target / SmartTarget (`0f516b05703`, was `2d1e531ab57`; restack fixed its mypy no-any-return) | enhancement ✅ |
| 5d | Docstrings on the `NavigatesGalaxy` methods gxui exposes (`963e6c56db5`) | enhancement ✅ |
| 5e | `multi_history_copy_item` between Multiview columns (`00452f45288`) | enhancement ✅ |
| 6a | `tool_form_fill` / `tool_form_set_parameter` lifted out of `RunsToolTests` (`c21bfd3aae0`) | enhancement ✅ |
| 6a′ | Deferred conditional parameters were never retried (`c9fa7115138`) | fix ✅ |
| 6b | `tool_form_parameters` → `ToolFormParameter` from the build model (`d391a9225fd`) | enhancement ✅ |
| 6c | `tool_form_parameters(job_id=...)` describes a rerun form from `jobs/{id}/build_for_rerun` (`a6bff91124e`) | enhancement ✅ |
| 7a | `tool_form_fill` fills a workflow editor step's form: wait for the form header, not the execute button (`11b7c62b2f1`) | fix ✅ |
| 7b | `retry_call_during_transitions` retries a Playwright `TimeoutError` once, not ten times; a covered click took 6-13 min (`3d63af3127b`) | fix ✅ |
| 7c | `workflow_index_open_with_name` waits for the card titled exactly NAME before clicking its edit button (`d953e09bbf3`) | fix ✅ |
| 7d | `workflow_editor_search_for_workflow` opens the Workflows panel only when closed and clears the search; new `workflow_editor.workflow_activity_panel` (`a19c54679ce`) | fix ✅ |
| 7e | `_add_repeat_instances` adds only the instances a repeat is missing (`66ed25e106f`) | fix ✅ |
| 7f | `select_set_value` clicks the option equal to the value (`txt` became `metacyto_clr.txt`) (`5df018bfa67`) | fix ✅ |
| 7g | `workflow_run_with_name` opens the run form of the card titled exactly NAME (shares 7c's wait) (`987a30b356a`) | fix ✅ |
| 7h | `workflow_editor_click_run` clicks the editor's Run activity; new `workflow_editor.tool_bar.run` (`8e579923247`) | fix ✅ |
| gxui | `gxui` itself, **always the tip** (`5a5b1455281`, 2026-10-07): `lib/galaxy_test/selenium/gxui/`, `gxui` script, `test/unit/selenium/test_gxui.py` (33 pass); amended in place | enhancement ✅ |

Notes from doing 4a–5e (2026-10-06):
- **Corrected findings.** 4a's cause was client-side panel search (regex-escaped query matched
  against a regex-escaped id), not `createWhooshQuery`; plus `tool_link` matching the URL-encoded
  href. 4b: `step-label` isn't obsolete, it is the expanded run form's; the default simplified form
  only has `data-label`. 4c: the live test server predates Multiview's virtual-list rewrite, so
  Multiview is verified locally only.
- **4d dropped.** `GCard`'s select checkbox is a standard Bootstrap custom checkbox: the input is
  opacity 0 and the visible box is the empty label's `::before`, so the label is zero-size and no
  automation click lands. The input's `title` gives it an accessible name. Script click is the
  right workaround; it is now documented on `extract_workflow_toggle_job`.
- **How it was tested.** Each commit red-to-green: vitest, `test/unit/selenium`, live checks with
  gxui against test.galaxyproject.org (4b) and a private local Galaxy (`galaxy_ui_driver`
  worktree, port 8091, Vite 5174; `config/galaxy.yml` is local-only), and new or existing E2E
  tests run one at a time against it. `test_dataset.py::test_history_dataset_display_text` failed
  locally inside the dataset iframe, after the upload helper had succeeded; not investigated.
- gxui now calls only public Galaxy APIs for these (vault `5e8a09c`, `5bbc4a9`, `4dea0b0`).

Notes from 6a/6b (2026-10-06):
- **6a regression check.** 17 tool-form-harness tests covering every filler path (text, select,
  boolean, color, multi-select, checkbox, drill-down, conditional, section, repeat, multi-data,
  collections) ran before and after the lift with identical results. Locally all 17 stop at the
  harness's final "used /api/tool_requests" assertion: CI sets `enable_tool_requests` plus Celery;
  with tool requests on but no Celery, jobs hang in `running`, so local runs use the legacy path.
  Form filling, running and output checks pass before that assertion. CI covers tool requests.
- **6a′.** Moving the filler exposed that its deferred retry looked parameters up by
  `key.replace("|", "-")`, while form element ids keep `|`, so every deferred parameter was
  skipped. Fixed with stub-form unit tests (`test/unit/selenium/test_tool_form_fill.py`).
- **6b.** Flattens the build model (`api/tools/{id}/build`, the form's own source) rather than
  scraping the DOM: options and every conditional case come for free. An E2E test checks the paths
  against the open form. gxui verbs `tool-describe` and `tool-fill` sit on top (vault `983f90d`).
- **Disk.** The machine's data volume hit 100% during 6b (other sessions' scratch dirs dominate);
  each local harness failure writes ~13 MB to the worktree's `database/test_errors`. Clear it after
  runs.

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
2. **Driver attachability.** Commit `9ffb7bda18c` (was `da5054d39f3`) on the standing branch (its
   `playwright_remote_debugging_port` branch is retired; John judged it not mergeable alone): opt-in
   `remote_debugging_port` on `ConfiguredDriver` / `get_playwright_driver`, passed to
   `launch(args=...)`. S1 showed that is all that's needed; no persistent context.
3. **Dropped (2026-10-06).** `headless=auto` under Playwright: `framework.py:1450` goes through
   `get_local_browser`, which raises without chromedriver or geckodriver even for the Playwright
   backend. It only bites the test suite's `get_configured_driver()`; gxui builds its driver via
   `GalaxySeleniumContextImpl` with an explicit `headless`, so it never hits it. Handed to gx_issues
   (`vault/agents/gx_issues/to_file/playwright_headless_auto_needs_chromedriver.md`).
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
