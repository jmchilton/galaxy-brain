# Galaxy UI Skill — CLI vs MCP research

Task 1 of [GALAXY_UI_SKILL.md](GALAXY_UI_SKILL.md). Researched 2026-10-06 against fresh clones of
`microsoft/playwright-cli` (b85c7a7, `@playwright/cli` 0.1.22) and `microsoft/playwright-mcp`
(f183dad, `@playwright/mcp` 0.0.83). Both tools were also run locally against a toy page; claims
marked *verified* were observed, not read.

## Decision

**Ship a CLI skill. Do not build an MCP now.** The skill has two command-line layers driving one
browser:

1. **`gx-ui`**, a Galaxy-specific Python CLI. It is backed by a daemon holding a
   `NavigatesGalaxy` context. Its verbs are existing Galaxy test abstractions.
2. **`playwright-cli`**, the generic escape hatch. It attaches over CDP to the same browser and
   covers snapshots, `find`, ref clicks, console and network.

An MCP adapter over the same verb table stays possible. The triggers for building one are listed
below.

## What the research showed

**Both tools are the same engine.**
- Both repos are thin wrappers over `playwright-core/lib/tools`. They pin the identical
  `playwright-core` 1.64 alpha.
- Both share one `BrowserBackend`, one set of 83 tool definitions and one response renderer.
- The CLI's 102 commands map onto MCP tool names. The CLI also adds a detached daemon per session,
  reached over a Unix socket.

**The README's token argument is mostly stale.**
- The README says the CLI avoids "verbose accessibility trees in context". But since the current
  release, both tools write post-action snapshots to `.playwright-*/page-<ts>.yml` and return only
  a link (*verified*). Only an explicit `snapshot` call returns YAML inline.
- The measurable difference is in what is always loaded versus loaded on demand:

  | | Cost | When paid |
  |---|---|---|
  | MCP default tool schemas | 25 tools, ~20k chars, **~5k tokens** | Every turn of every session |
  | MCP, all capabilities | 72 tools, **~10k tokens** | Every turn of every session |
  | CLI `SKILL.md` | 489 lines, **~3.9k tokens** | Only when the skill triggers |
  | CLI `references/` | 1,744 lines, ~53 KB | Only when a reference is read |

- Neither repo has any benchmark behind the efficiency claim.

**Neither tool can host Galaxy's vocabulary.** The vocabulary is Python:
- `NavigatesGalaxy` has 341 public methods.
- Task verbs live in the `UsesUploadActivity`, `RunsToolTests` and `RunsWorkflows` mixins.
- `navigation.yml` holds 1,143 smart-component selectors.

The Playwright tools' extension points are both JavaScript:
- `run-code` runs in a `vm` sandbox with only `page` in scope (*verified*: no `require` or
  `process`).
- `initPage` loads a Node module per tab. It can hang helpers on `page` (*verified*).

Putting Galaxy verbs in either would mean a second, JavaScript copy of the abstraction layer. That
is the drift this project exists to avoid.

**Interop is cheap.**
- `playwright-cli attach --cdp=<url>` drives an externally launched Chrome and `detach` leaves it
  running (*verified* with plain Chrome; not yet with a Python-Playwright-launched browser).
- `codegen: "python"` makes every CLI action echo a Python Playwright line (*verified*), so
  escape-hatch actions translate directly into code for `navigates_galaxy`.

**Several limitations matter for Galaxy:**
- **Waits.** The default action timeout is 5 s and settle is 500 ms. The CLI has **no wait
  command**; waiting needs a `run-code` call to `waitFor`. Galaxy jobs and history updates need
  verbs that wait internally, which is what the `WAIT_TYPES` machinery already does.
- **Uploads.** An upload needs the file-chooser modal open first (click, then `upload <abs path>`),
  or `drop --path` onto a zone. Both work (*verified* on the toy page).
- **Dialogs.** An open `confirm` blocks every other command until it is accepted or dismissed.
- **Iframes.** Visualization iframes appear in snapshots with `fN` refs, and clicks inside them
  work.
- **Sessions.** The CLI is headless and in-memory by default, with a 1 h idle timeout. MCP is
  headed and persistent by default, and concurrent MCP clients need `--isolated`.

**WebMCP is supported in both tools.** If `navigator.modelContext` exposes `getTools()` and
`executeTool()`, `webmcp-list` and `webmcp-call` work (*verified* with a JS shim), and MCP surfaces
them as dynamic tools.
- This would let Galaxy's client publish its own agent tools, picked up by either tool for free.
- It is parked, because it would be a third (TypeScript) copy of the vocabulary and the spec is
  experimental. Revisit if Galaxy grows in-app agents.

## Why CLI rather than MCP, for this skill

1. **The hosts are coding agents with a shell.** Claude Code and Codex run CLIs natively. A skill
   costs nothing until it triggers; an MCP costs ~5k tokens per turn whether Galaxy is in play or
   not.
2. **The transcript is a script.** Each `gx-ui` call is one `NavigatesGalaxy` method call. A run's
   command log therefore compiles into a pytest test or a Test Story
   ([TEST_STORIES_RESCUE.md](TEST_STORIES_RESCUE.md)), which feeds this project's own goal. MCP tool
   calls are just as loggable, but the shell transcript is already replayable as written.
3. **Composition.** Shell lets the agent loop over hids, pipe to `jq`, and keep artifacts on disk.
   The playwright-cli skill leans on exactly this (`--raw`, `snapshot > before.yml`, `diff`).
4. **MCP's stated advantage is already covered.** The README credits MCP with "persistent state …
   long-running autonomous workflows". The `gx-ui` daemon holds the browser either way.
5. **There is prior art to beat.** The local `drive-scenario` skill drives Galaxy through the
   Playwright MCP with raw ref clicks. Its UC5 run dropped to raw `/api/tools` calls for the
   collection map-over: with only generic clicks available, agents abandon the UI, so the run stops
   testing what it is meant to test. (Shells allow API fallbacks too; the remedy is to log them as
   gap events — see best practice 8.)

## When to add an MCP

Build a thin MCP adapter over the `gx-ui` verb table, never a second implementation, when any of
these holds:
- A host without a shell needs to drive Galaxy, e.g. claude.ai, or Galaxy's own agents.
- The verb set has stabilised into roughly 10–15 coarse verbs that are worth paying for every turn.
- An evaluation harness needs host-portable tool calls.

Arm C of the loop ([GALAXY_UI_SKILL_LOOP.md](GALAXY_UI_SKILL_LOOP.md)) measures Playwright MCP
against playwright-cli on the same task. It turns the token argument above from reasoning into
data.

## Best practices for the skill

1. **Verbs over clicks.** Expose task-level verbs that already exist in Python, such as
   `history_panel_create_new_with_name`, `upload_context(...)`, `tool_open` and
   `workflow_run_submit`. Never re-implement a verb in skill prose or in JavaScript.
2. **One vocabulary, two consumers.** Every verb is a `NavigatesGalaxy` or mixin method.
   - A missing verb is fixed in `navigates_galaxy.py` (a small gx_branches PR), not in the skill.
   - Generate the CLI dispatch and its help from method signatures and docstrings, so nothing is
     hand-copied.
3. **Progressive disclosure.** Keep `SKILL.md` under ~2k tokens (the vault's measured median;
   5k is the cap). Serve the verb catalog from `gx-ui help [domain]` rather than pasting it into
   the skill. playwright-cli's 3.9k plus 53 KB of references is the ceiling to stay under.
4. **Terse output.** A verb prints one line of outcome plus ids (hid, history id, invocation id).
   Snapshots and screenshots go to files and the command prints the path, the same file-not-inline
   design both Playwright tools converged on.
5. **Waits live inside verbs.**
   - A verb returns only when the UI is stable: form rendered, job `ok`, invocation scheduled.
   - The agent never sleeps or polls.
   - A timeout reports the observed state, as `history_panel_wait_for_hid_state` already does.
6. **Actionable errors.** A failure prints the error, the URL, a scoped snapshot path and a
   screenshot path, and names the escape-hatch command to try next.
7. **Semantic addressing.** Generic actions target smart-component paths, e.g.
   `history_panel.item(hid=3)`. Resolve them with the existing `resolve_component_locator`, the
   code tours already use. CSS and playwright-cli refs are the last resort.
8. **A logged escape hatch.**
   - Every playwright-cli action, raw `gx-ui call`, or REST call during a UI task is logged as a
     gap event with a one-line reason.
   - That log is the loop's primary output.
   - API use is allowed only for staging and verification, and is tagged as such.
9. **State hygiene.**
   - One named session per agent, and a fresh Galaxy user per run (shared users accumulate state;
     see the `galaxy-e2e-local-state-accumulates` memory).
   - Credentials are read from `~/galaxy_selenium_context.yml` and never echoed.
   - Output directories are gitignored.
10. **Status mode.** A bare invocation reports Galaxy, Vite and session status, then stops, per
    the convention of `galaxy-playwright` and `drive-scenario`.
11. **Host-neutral packaging.**
    - Write the description with explicit use/don't-use triggers. Use it to drive the live UI;
      don't use it to run the E2E pytest suite (that is `galaxy-playwright`).
    - Scope `allowed-tools` to `Bash(gx-ui:*)` and `Bash(playwright-cli:*)`.
    - Validate the skill for both Claude Code and Codex.
12. **Real tools, not test tools.** Never start Galaxy with `GALAXY_RUN_WITH_TEST_TOOLS` for this
    skill, because that mode hides installed shed tools (`drive-scenario`, `SETUP_DEBRIEF.md`).
