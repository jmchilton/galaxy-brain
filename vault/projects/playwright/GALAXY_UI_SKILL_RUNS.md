# Galaxy UI Skill — run ledger

One section per loop run ([GALAXY_UI_SKILL_LOOP.md](GALAXY_UI_SKILL_LOOP.md)). Artifacts such as
events, the Codex session log and notes stay outside the vault.

| Run | Date | Arm | Target | Server | Agent | Verify | Wall | Tokens in (cached) / out | Commands (failed) |
|---|---|---|---|---|---|---|---|---|---|
| phase0-run1 | 2026-10-06 | B (playwright-cli 0.1.22, stock skill) | GTN `galaxy-intro-short` | test.galaxyproject.org (26.2.dev0) | Codex `gpt-6.1-sol`, high | **pass** | 17.5 min | 6.60M (6.47M) / 14.0k | 149 (11) |

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
