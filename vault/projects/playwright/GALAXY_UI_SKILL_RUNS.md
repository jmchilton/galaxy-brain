# Galaxy UI Skill — run ledger

One section per loop run ([GALAXY_UI_SKILL_LOOP.md](GALAXY_UI_SKILL_LOOP.md)). Artifacts such as
events, the Codex session log and notes stay outside the vault.

| Run | Date | Arm | Target | Server | Agent | Verify | Wall | Tokens in (cached) / out | Commands (failed) |
|---|---|---|---|---|---|---|---|---|---|
| phase0-run1 | 2026-10-06 | B (playwright-cli 0.1.22, stock skill) | GTN `galaxy-intro-short` | test.galaxyproject.org (26.2.dev0) | Codex `gpt-6.1-sol`, high | **pass** | 17.5 min | 6.60M (6.47M) / 14.0k | 149 (11) |
| phase1-runA1 | 2026-10-06 | A (gxui MVP `c63c0d8` + galaxy-ui-driver) | GTN `galaxy-intro-short` | test.galaxyproject.org (`67c3f964d355`) | Codex `gpt-6.1-sol`, high | **fail** (gxui crash, box 5) | 7.6 min | 2.09M (2.03M) / 9.6k | 65 (8); transcript: 17 verb, 11 component, 1 gap |
| phase1-runA2 | 2026-10-06 | A (gxui `9655aa8` + galaxy-ui-driver) | GTN `galaxy-intro-short` | test.galaxyproject.org (`67c3f964d355`) | Codex `gpt-6.1-sol`, high | **pass** | 25.3 min | 8.03M (7.90M) / 29.4k | 178 (13); transcript: 51 verb, 19 component, 7 call, 14 gap |
| phase1-runA3 | 2026-10-06 | A (gxui `97f4d7e` + galaxy-ui-driver) | GTN `galaxy-intro-short` | test.galaxyproject.org (`67c3f964d355`) | Codex `gpt-6.1-sol`, high | **pass** | 18.8 min | 8.10M (7.97M) / 22.7k | 166 (8); transcript: 49 verb, 37 component, 5 call, 3 gap |
| phase2-runB1 | 2026-10-07 | B (playwright-cli 0.1.22, stock skill) | GTN `galaxy-intro-short`, snippets expanded (`e2d1765`) | test.galaxyproject.org | Codex `gpt-6.1-sol`, high | **pass** | 24.0 min | 9.51M (9.32M) / 18.5k | 182 (16) |
| phase2-runB2 | 2026-10-07 | B (playwright-cli 0.1.22, stock skill) | GTN `galaxy-intro-short`, snippets expanded (`e2d1765`) | test.galaxyproject.org | Codex `gpt-6.1-sol`, high | **pass** | 20.1 min | 8.18M (7.94M) / 18.2k | 193 (18) |
| phase2-runB3 | 2026-10-07 | B (playwright-cli 0.1.22, stock skill) | GTN `galaxy-intro-short`, snippets expanded (`e2d1765`) | test.galaxyproject.org | Codex `gpt-6.1-sol`, high | **pass** | 29.1 min | 9.59M (9.42M) / 19.7k | 205 (21) |
| phase2-runA1 | 2026-10-07 | A (gxui `14c3d7e` + galaxy-ui-driver `b7595fb`) | GTN `galaxy-intro-short`, snippets expanded (`e2d1765`) | test.galaxyproject.org | Codex `gpt-6.1-sol`, high | **pass** | 90.9 min (~43 min DNS outage; not comparable) | 6.41M (6.29M) / 25.9k | 193 (15); 95 requests; transcript: 90 verb, 29 component, 4 call, 4 gap |
| phase2-runA2 | 2026-10-07 | A (gxui `92494b47a8f` + galaxy-ui-driver `4aa3eae`) | GTN `galaxy-intro-short`, snippets expanded (`e2d1765`) | test.galaxyproject.org | Codex `gpt-6.1-sol`, high | **pass** | 13.6 min | 4.81M (4.71M) / 16.4k | 143 (7); 82 requests; transcript: 64 verb, 29 component, 6 gap |

## phase0-run1

**Setup.**
- Codex ran with an isolated `CODEX_HOME`: no global `AGENTS.md`, memories or skills. Its sandbox
  was `workspace-write` with network on.
- Chrome aborts (`SIGABRT`) inside Codex's macOS sandbox. So the harness opens the playwright-cli
  session outside the sandbox and `state-load`s John's saved login. The agent only drives that
  open session.
- Fresh users per run are out: test.galaxyproject.org's registration banner forbids multiple
  accounts. Runs use John's account, and the verifier only looks at objects created after the run
  started.
- Tokens come from the Codex session log's `token_count` events. `exec --json` usage was not used.

**Result.**
- The agent marked all 13 hands-on boxes done, plus the unnumbered sharing section.
- The independent API check passed:
  - histories "My Analysis" (5 items) and "Next Analysis" (4 items), all `ok`;
  - workflow "QC and filtering";
  - invocation `completed`.
- Fresh (uncached) input was about 135k tokens. 98% of input was cache reads.

**Commands by kind:**
- 43 clicks, 38 `find`, 12 snapshots, 10 fills;
- 11 `run-code` (mostly hand-rolled waits) and 7 `eval`;
- 23 non-browser commands (file writes, polling).

### What it means for `gxui`

1. **Waits are the biggest missing primitive.**
   - playwright-cli has no wait command. The agent wrote bounded `run-code` locator waits: four for
     FastQC, two for the filter, three for the workflow run.
   - This confirms best practice 5: verbs wait internally.
2. **Output size is the second biggest cost.**
   - The first whole-page snapshot was 803 lines, about 14k tokens.
   - A `find` that matched the FASTQ preview iframe returned one node of about 25k tokens.
   - This confirms best practice 4. `dataset-view` must bound its preview.
3. **Galaxy's custom checkboxes defeat generic `check`/`uncheck`.** Overlaid labels intercept
   pointer events, both in sharing and in workflow extraction. The agent recovered by clicking
   label text or the enclosing control. This is a client accessibility finding as well as a verb
   argument.
4. **The wishlist matches the design's verb table**, at roughly 6–19 raw commands per operation:
   - history-new + rename, upload-url + wait, dataset-view;
   - tool open/run/wait, and re-run with one parameter changed;
   - extract-workflow with input naming, workflow-run + wait.

   It adds two verbs the design lacked:
   - **history-share** (make the history accessible by link);
   - **copy a dataset between histories**, done in Multiview by drag.

   The design table now lists both.
5. **Refs go stale after scoped snapshots.** A dataset-scoped snapshot invalidated an earlier
   History Options ref. This is an argument for addressing elements by smart-component path over
   playwright-cli refs.

### Training findings (GTN `galaxy-intro-short` vs Galaxy 26.2.dev0)

- **Box 3 — the upload flow has changed.**
  - Upload is now an Import Data activity panel. "Paste/Fetch data" has become **Paste Links/URLs**
    (`/upload/paste-links`).
  - After pasting, you must click **Add URLs** before **Start** is enabled.
  - There is no **Close** button; Start navigates to `/upload/progress`.
- **Boxes 6–7 — output names changed.** "FastQC on data 1" is now "FastQC on **dataset** 1". The
  same applies to RawData and to "Filter by quality on data 1".
- **Box 10 — workflow extraction looks different.**
  - Extraction uses input and tool cards, not a two-column table.
  - Renaming the input goes through the card's pencil icon, an "Enter new name" dialog, and a
    second Rename button.
  - The workflow name field starts empty (it has a placeholder), so there is nothing to "replace".
  - After extraction the app redirects to the workflow page. The learner must go Home before box 11,
    and the tutorial doesn't say so.
- **Box 13 — no tool parameter forms.** The tutorial says "we could change any parameter for the
  tools", but the run form shows only the input and workflow controls.
- **Harness issue, not GTN's:** `{% snippet faqs/... %}` includes (history sharing, create and
  rename history) were not expanded in the raw `tutorial.md`. The next run should inline them from
  `training-material/faqs/`.

**Side effects on test.galaxyproject.org.**
- History "My Analysis" was made accessible by link
  (`https://test.galaxyproject.org/u/jmchilton/h/my-analysis`), because the tutorial says to.
- Histories "My Analysis" and "Next Analysis" and workflow "QC and filtering" remain on John's
  account.

## phase1-runA1

**Setup.** As phase0-run1, but arm A: `run.sh` started a gxui daemon outside the sandbox with the
saved login, had it attach playwright-cli, and gave the agent `./gxui` plus both skills. Tutorial
input unchanged (snippets still unexpanded) for comparability.

**Result: stopped in box 5 by a gxui bug.** Boxes 1–4 done through verbs (`history-new`,
`upload-url`, `dataset-view`); FastQC submitted. Then `history-wait` (Galaxy's
`history_panel_wait_for_hid_ok`) returned a `SmartTarget`, the transcript's `json.dumps` raised,
and the exception escaped the serve loop: the daemon and its browser died. Verification failed
(no workflow, no invocation). Not comparable to phase0-run1 on cost; ~4 boxes in 7.6 min.

**Fixed for runA2** (`9655aa8`):
- The daemon summarises non-text results, serialises the transcript defensively, and turns any
  verb exception into an error reply instead of dying.
- `history-wait` is an adapter: it repeats Galaxy's 45 s job wait (sized for test servers) up to
  `--timeout` (default 240 s), fails at once on error states, and reports the state on timeout.
- `tool-run` prints the new output hids; new `tool-panel` and `tool-search NAME` verbs.
- A component path with no element of its own (`snapshot tool_panel`) explains itself instead of
  `KeyError: '_'`.
- The skill says `history-items` is an observation verb, allowed under UI-only rules (the agent
  avoided it because its help said "API").

**Other findings.**
- **Unscoped selector:** `tool_panel.search` in `navigation.yml` is a bare `.search-query`. After an
  upload it matched the Import Data panel's search, so `component tool_panel.search
  clear-send-keys FastQC` typed into the wrong box and reported success. `tools.search` is the
  scoped one. Candidate `navigation.yml` fix; the verbs now use `tools.search`.
- **Agent tooling behaviour:** Codex wrote `run_cli.py` to give every gxui call a 10-minute
  timeout and to log a gap before each playwright-cli call. Shell-command metrics therefore miss
  gxui calls; for arm A, count from the gxui transcript.
- **One gap logged:** no activity-bar component to open Tools (now the `tool-panel` verb).
- **Training:** the same upload-flow and "data 1" → "dataset 1" drift as phase0-run1, plus box 4:
  the preview says "only the first 100 KB is shown", not "the first megabyte".

**Side effects on test.galaxyproject.org.** History "My Analysis (phase1-runA1)" (3 items).

## phase1-runA2

**Result: pass, but dearer than the arm B baseline** (n=1 each, so no delta is quotable yet).
- All 13 boxes plus sharing done. The independent check passed: "My Analysis (phase1-runA2)" (5
  items) and "Next Analysis (phase1-runA2)" (4 items), all `ok`; workflow "QC and filtering
  (phase1-runA2)"; invocation `completed`.
- Against phase0-run1: 25.3 vs 17.5 min, 8.03M vs 6.60M input, 29.4k vs 14.0k output, 178 vs 149
  commands. 14 gaps logged (13 playwright-cli commands), against 11 `run-code` + 7 `eval` in run1.

**Where the time went** (per-box from the transcript's `note` marks):

| Box | Time | Calls | Cost driver |
|---|---|---|---|
| 10 extract workflow | 489 s | 18 + 10 gaps | No verbs for input rename or step exclusion; a `component` click on an `opacity: 0` custom checkbox stalled **361 s** (past the 290 s client cutoff) and the next queued call waited behind it |
| 5 FastQC | 217 s | 9 | Server job time: `history-wait 2` took 162 s and succeeded (the runA1 fix worked) |
| 13 run workflow | 124 s | 15 | `workflow-run --inputs` timed out: `workflow_run_specify_inputs` targets an obsolete `step-label` selector |
| 7, 9 filter / re-run | 110 s each | 12, 8 | No tool parameter map: one DOM inspection to find parameter ids (`tool-describe`, prereq PR 4) |
| 12 Multiview copy | 96 s | 10 + 3 gaps | No drag verb; `navigation.yml`'s `history-column-*` ids no longer exist |

**gxui fixes this calls for** (not yet applied):
1. `workflow-extract NAME --input-name LABEL --exclude-hid HID`, so box 10 is one verb.
2. Bound `component` waits well under the client timeout, and refuse clicks on invisible inputs
   with a message pointing at the label (memory: `opacity: 0` is invisible to Selenium-style waits).
3. `last` should return the latest *verb* result, or say what is still running; today it returned
   a later `gap` line while a verb was still waiting. A cancel path for a stuck wait is worth
   considering.
4. `upload-url` needs `history-wait`'s deadline loop (it timed out at 48 s, upload then went green).
5. Strip quotes in component arguments (`input(label='FASTQ reads')` produced literal quotes in
   CSS), and print tool ids in `tool-search`.
6. Skill: qualify "a verb that returns has finished" (`tool-run` returns on submission).

**Galaxy-side findings** (upstream candidates):
- `workflow_run_specify_inputs` / `workflow_run.input_data_div` uses an obsolete `step-label`
  selector; the current simplified run form uses `data-label`.
- Multiview `history-column-*` ids in `navigation.yml` are stale.
- The extraction form's step checkboxes are `opacity: 0` inputs with empty labels: an accessibility
  issue as well as a test-abstraction one (run1 hit the same thing via playwright-cli).
- No helpers for extraction input rename / step exclusion by hid, or Multiview dataset copy.

**Training findings new since run1:** box 13 hides tool parameters behind "Workflow Run Settings",
which the box doesn't mention; box 3's numbered steps jump from 1 to 3; box 10's "workflow created"
message is now a navigation to Workflow Preview.

**Side effects on test.galaxyproject.org.** Histories "My Analysis (phase1-runA2)" (link-accessible
at `/u/jmchilton/h/my-analysis-phase1-runa2`) and "Next Analysis (phase1-runA2)"; workflow "QC and
filtering (phase1-runA2)" and its invocation.

## phase1-runA3

**Result: pass; gaps 14 → 3, box 10 489 s → 199 s, wall 25.3 → 18.8 min** (baseline run1: 17.5).
Same verification as runA2: both "(phase1-runA3)" histories all `ok`, workflow "QC and filtering
(phase1-runA3)", invocation `completed`.

**Token picture across the three passing runs** (one run each, so no delta is quotable):

| Run | Fresh input | Cached input | Output (reasoning) | Commands | Wall |
|---|---|---|---|---|---|
| run1 (B) | 135k | 6.47M | 14.0k (1.0k) | 149 | 17.5 min |
| runA2 | 133k | 7.90M | 29.4k (6.2k) | 178 | 25.3 min |
| runA3 | 130k | 7.97M | 22.7k (4.5k) | 166 | 18.8 min |

Fresh input is flat. Arm A's extra cost is turns (more cache reads) and output. The agent still
verifies most verbs with a `snapshot` (18) and explores with `components` (11) and `help` (7), so
the vocabulary has not yet cut the turn count. Verbs that report richer state, and fewer
exploratory calls, are the levers.

**Remaining time sinks:**
- **Box 13 (298 s):** mostly real job time (`history-wait 4` 93 s); plus `workflow-run --inputs`
  still fails on Galaxy's obsolete `step-label` selector (the agent recovered with the existing
  `workflow_run.input_select_field(label=…)` component), and a 30 s observation timeout.
- **Box 5 (204 s):** FastQC job time (155 s).
- **Sharing:** `call click_history_option_sharing` on the Workflow Preview page (no history panel)
  waited 121 s and failed; `home` first fixed it. A `history-share` verb should go home itself.
- **Box 7:** still one gap for a tool parameter map (`tool-describe`, prereq PR 4).
- **Box 12:** two gaps for the Multiview dataset drag (`dataset-copy` verb).

**Next gxui changes:** `workflow-run` input setting via `input_select_field`; `history-share`;
`call --list` (the agent read framework source to find method names); `dataset-copy`; and
`tool-describe` once PR 4 exists. The skill should say that component clicks return before async
work (rename, creation) finishes.

**Side effects on test.galaxyproject.org.** Histories "My Analysis (phase1-runA3)" (link-accessible)
and "Next Analysis (phase1-runA3)"; workflow "QC and filtering (phase1-runA3)" and its invocation.

## phase2 (snippets expanded, n=3 per arm)

Fresh runs on the tutorial with its FAQ snippets inlined (`expand_snippets.py`, GTN `e2d1765`);
not pooled with phase0/phase1. Arm B: B1 24.0, B2 20.1, B3 29.1 min; 8.2-9.6M input.

**phase2-runA1:** pass. Wall time is not comparable: test.galaxyproject.org stopped resolving
(DNS) at 12:33 and the next gxui call came 43 min later; after it the history panel showed "Live
updates disconnected". Requests 95 (runA3 119), input 6.41M (lowest so far), tool output 55k.
The wait/chain skill note (`b7595fb`) helped: 123 of 162 commands used a 10 s yield (runA3: 178 of
184 at 1 s), but polling calls held at 40 and `&&` chains fell to 6.
Gaps and friction:
- `dataset-copy` failed: test.galaxyproject.org predates the Multiview rewrite, so the dev
  selectors don't match (the agent called them "obsolete"; it's the reverse). Real server/client
  version skew - see the design doc's packaging question.
- `history-new` failed on the workflow landing page (no history panel); like `history-share`,
  it should go home first.
- FastQC report is an iframe; `snapshot` doesn't see into it (G1).
- Box 9 (rerun with changed parameters) ~25 commands; box 13 workflow-run then waiting on every
  output ~12 commands. Candidate verbs: `dataset-rerun`, `workflow-run --wait`.

**phase2-runA2:** pass, and the best run yet on every measure: 13.6 min (arm B 20-29), 4.81M input
(B 8.2-9.6M), 82 requests (B 94-105), 17 polling calls (A1 40). First run from the new homes
(gxui `92494b47a8f` on the standing branch, skill `4aa3eae` in galaxy-skills); `history-new` now
goes home first. All 6 gaps are box 12: `dataset-copy` against a Multiview without per-history
hooks, made worse by gxui's error telling the agent to pin histories that were already shown (it
did, then retried by name and by id). Fixed before A3 (`b70f93d5410`): with no hooks on the page
the error says this Galaxy predates them and to drag by hand. Also: `workflow-run --no-submit`
timed out waiting for `#run-workflow` (the agent recovered); `components upload` isn't a path.
