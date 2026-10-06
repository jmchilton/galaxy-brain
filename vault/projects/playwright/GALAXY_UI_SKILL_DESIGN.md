# Galaxy UI Skill — design

Task 2 of [GALAXY_UI_SKILL.md](GALAXY_UI_SKILL.md). Why this shape is argued in
[GALAXY_UI_SKILL_RESEARCH.md](GALAXY_UI_SKILL_RESEARCH.md). All Galaxy refs are against dev as of
2026-10-06.

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
| upload | `upload-paste`, `upload-url`, `upload-file` | `upload_context(...)` fluent contexts (`upload_activity_helpers.py`) |
| collection | `build-list`, `build-list-paired` | `history_panel_build_list_auto` / `_of_pairs` (+ `collection_builder_*`) |
| dataset | `dataset-view HID`, `dataset-details HID`, `dataset-peek HID` | `display_dataset`, `show_dataset_details`, peek via `history_panel_click_item_title` |
| tool | `tool-open ID`, `tool-run` | `tool_open`, `tool_form_execute` |
| tool | `tool-describe` | S: the open form's fields (label, name, type, value, options). GTN names parameters by **label** while tests use **names**, so the agent needs this map |
| tool | `tool-fill JSON` | S: a public form filler. Today it is private to `RunsToolTests` (`framework.py:899-1099`) and keyed on tool-test dicts |
| workflow | `workflow-import-url URL` | `navigate_to_workflows_import` + `workflow_import_submit_url` |
| workflow | `workflow-run NAME --inputs JSON` | `workflow_run_with_name` + `workflow_run_specify_inputs` + `workflow_run_submit` (data inputs only — S for parameters) |
| workflow | `invocation-wait` | S: no UI-side helper; tests wait via the API |
| workflow | `extract-workflow` | S: GTN intro tutorials use it; no helper exists |
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
| Daemon, client, verb registry | Galaxy, `lib/galaxy_test/selenium/` (package `galaxy-test-selenium`), entry point `gxui` (cf. `gxwf`) | It must import the mixins in `framework.py`, versions with the vocabulary, and can be upstreamed |
| Skill (`SKILL.md`) | `claude-jmchilton-plugins/plugins/jmchilton/skills/galaxy-ui/` | It needs a Galaxy worktree, like its sibling `galaxy-playwright`; move it to `galaxy-skills` once it is community-ready |
| Loop harness | Next to the skill, under `evals/` | It is part of how the skill is maintained |
| Run reports | `vault/projects/playwright/` (ledger); screenshots and JSONL stay outside the vault | Large binary artifacts don't belong in the vault |

## Prerequisite PRs (small, atomic, in this order)

1. **Fix the standalone context bootstrap.**
   - `GalaxySeleniumContextImpl.__init__` (`context.py:62`) calls
     `ConfiguredDriver(**from_dict.get("driver", {}))`, but `ConfiguredDriver` has required a
     positional `timeout_handler` since `086eac9dfe7`. So `context.init()` and both Jupyter
     `init()`s raise `TypeError` on dev today. This was confirmed by reading the code, not by
     running it.
   - `timeout_multiplier` (`context.py:65`) is stored but never read.
   - The fix is to build `galaxy_timeout_handler(timeout_multiplier)` and pass it.
   - This repairs the Jupyter path on its own merits, with no agent framing needed.
2. **Driver attachability.** `get_playwright_driver` (`driver_factory.py:262`) always does
   `launch()` + `new_page()`. Add an opt-in to launch with `--remote-debugging-port`, and use a
   persistent/default context so CDP attachers see the page (spike S1).
3. **`headless=auto` under Playwright.** `framework.py:1450` goes through `get_local_browser`,
   which raises without chromedriver or geckodriver even when the backend is Playwright.
4. **A public tool-form filler and `tool-describe`.** Lift the filler out of `RunsToolTests` into
   a `NavigatesGalaxy` method keyed by parameter path. `RunsToolTests` then calls it, so the
   existing tool-test E2E suite becomes its regression test.
5. **The `gxui` daemon, client and the first ~15 verbs**, with a `test/unit/selenium` test that
   drives the toy `basic.html` fixture through the daemon.

## Spikes before step 5

- **S1 — two clients, one page.** Do Python Playwright and playwright-cli `attach --cdp` see and
  drive the same page?
  - Risk: a CDP attacher may only see the default context, while `browser.new_page()` creates a
    separate one.
  - Fallback: drop playwright-cli, and add `gxui snapshot` / `gxui css CSS click` built on Python
    `aria_snapshot()`. That loses refs, `find`, console and network.
- **S2 — version skew.** Galaxy pins Python `playwright==1.63.0`; `@playwright/cli` pins
  playwright-core 1.64 alpha. CDP is browser-level, so this should not matter, but S1 should run
  on exactly these versions.
- **S3 — daemon lifecycle.** Decide the idle timeout, recovery from browser death, and whether
  `start` can re-attach to a living daemon after the agent's shell restarts.
  playwright-cli's model is a reference: socket per workspace hash plus session name, a 1 h
  headless idle timeout, and `list` / `close-all` / `kill-all`.

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
