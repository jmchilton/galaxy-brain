# Galaxy UI Skill — feedback loop

Task 3 of [GALAXY_UI_SKILL.md](GALAXY_UI_SKILL.md). The loop feeds an agent one target (a GTN
tutorial or an IWC workflow), has it do the work through the UI, and gets back suggestions for the
skill, the abstractions and the training material. Skill design:
[GALAXY_UI_SKILL_DESIGN.md](GALAXY_UI_SKILL_DESIGN.md).

## One iteration

```
target ─▶ 1 setup (harness) ─▶ 2 drive (agent, one arm) ─▶ 3 verify (harness) ─▶ 4 report (agent)
                                          ▲                                            │
                                          └─ 6 re-run same target ◀─ 5 triage + apply ◀┘
```

### 1. Setup (scripted, not the agent)

- **Galaxy.** A worktree on dev started **without** `GALAXY_RUN_WITH_TEST_TOOLS`. Use the
  `drive-scenario` `galaxy.yml` block: Docker job conf, `conda_auto_install: false`, and job
  caching so re-runs are cheap.
- **Tools.**
  - GTN: `bin/install_tutorial_requirements.sh`, which runs ephemeris `workflow-to-tools` and
    `shed-tools install`, then imports the workflows and data library.
  - IWC: `workflow-to-tools` on the `.ga` file.
  - Install the exact pinned versions, because version drift is itself a finding.
- **User.** Register a fresh user per run (`loop-<run-id>@example.org`) and write it into a
  per-run copy of `galaxy_selenium_context.yml`.
- **Data.** The agent uploads the data. The harness only fetches it locally:
  - GTN: Zenodo links from `data-library.yaml` or the tutorial;
  - IWC: `-tests.yml` jobs plus `test-data/`.
- **Runs are sequential.** Run one arm at a time, never in parallel, to protect the dev machine.

### 2. Drive (agent)

The prompt is the same for every arm except its tooling paragraph.

**GTN tutorial.** Work through every hands-on box as a learner would, through the UI.
- Skip boxes that leave Galaxy, such as UCSC, and say so.
- Record per box: `done`, `partial` or `failed`, plus friction notes.
- Call `gx-ui note` with the box title before starting each box, so the transcript lines up with
  the tutorial.

**IWC workflow.**
1. Import the `.ga` through the UI.
2. Upload the `-tests.yml` inputs through the UI, building collections where the job needs them.
3. Fill the run form, including parameters, and submit.
4. Wait for the invocation.
5. Inspect each output the test asserts on, through the UI.

**Rule for every target.** Before any playwright-cli action or REST call, run
`gx-ui gap "<reason>"`. REST is allowed only for staging and verification, and is tagged as such.

**Arms:**

| Arm | Tooling | Question it answers |
|---|---|---|
| A | `galaxy-ui` skill (`gx-ui` + attached playwright-cli) | Does the vocabulary carry a real task? |
| B | playwright-cli + its stock skill, no Galaxy vocabulary | What does the vocabulary save, in tokens, turns, wall time and success? |
| C (optional) | Playwright MCP, as `drive-scenario` uses it | Does the CLI-vs-MCP token argument hold on Galaxy? |

The `galaxy-cli` API skill is not an arm because it skips the UI. At most it is a cost floor for
comparison.

### 3. Verify (harness, independent of the agent's own claims)

- **IWC.** Run `planemo workflow_test_on_invocation <name>-tests.yml <invocation_id>`. The command
  exists (`planemo/commands/cmd_workflow_test_on_invocation.py`). This gives a pass/fail that does
  not depend on what the agent reports.
- **GTN.** Check structure:
  - the expected history items exist and are all `ok`;
  - any workflow the tutorial asks for exists;
  - the per-box table matches the transcript.

  Asserting on outputs needs the tutorial workflow's `-test.yml`, which only works for tutorials
  whose boxes reproduce that workflow (true of the intro candidates).

### 4. Report (the same agent, last turn)

The agent writes `report.md` with four sections:
1. **Skill.** Missing or misleading `SKILL.md` guidance, confusing verb names or help text, and
   output that was too verbose or too terse.
2. **Abstractions.** Each gap event, de-duplicated, with a proposal: a new verb backed by method X,
   a fix to method Y, a component lacking a stable selector, or a `data-description` the client
   should add. Each item cites transcript lines.
3. **Training.**
   - Labels in the tutorial that don't match the current tool form (version drift).
   - Steps that are ambiguous or out of order.
   - UI the tutorial describes that has moved (for example upload into the activity bar).
   - Missing expected-output descriptions.

   Each item cites a box and a line in `tutorial.md`.
4. **Run facts.** Per-box or per-step status, the verification result, and where the artifacts
   are.

### 5. Triage and apply (separate agent, then a human)

A fresh agent merges reports across runs and arms. It routes each item to one of:

| Destination | Action |
|---|---|
| `SKILL.md` or verb help | Edit directly |
| `navigates_galaxy.py` / mixins / `navigation.yml` | A gx_branches branch, following the project's small-atomic-PR rule |
| Client attributes | A gx_branches branch |
| GTN | A drafted issue or PR text for John |

Nothing is posted or opened without asking.

### 6. Re-run

Re-run the same target on Arm A. An iteration is done when the target passes verification with
zero gap events. Gap count and tokens per box or step are the trend lines to track.

## Measurement

- Run each arm as `claude -p --output-format stream-json --verbose`, with the arm's plugins or
  skills only.
- Sum per-turn `usage` (input, output, cache read, cache creation) and also record
  `total_cost_usd`, turn count and wall time. Note that `gxy-sketches`' `claude_cli.py` already
  wraps `claude -p` but ignores usage.
- Count tool calls by layer from the shell commands (`gx-ui` verb, component, call; playwright-cli;
  curl; other) and from the `gx-ui` transcript.
- Report the always-loaded context cost separately: the skill description plus `SKILL.md` for A,
  the playwright-cli skill for B, and the MCP schemas for C. That is the number the research
  doc's claim depends on.
- Aggregate as skill-creator's `aggregate_benchmark.py` does: mean ± stddev, deltas. Use n ≥ 3 per
  arm before quoting a delta.
- Don't use Codex for metrics: `codex exec --json` reported all-zero usage
  (`codex-review/references/cli-notes.md`).

## Starting targets

| Order | Target | Why |
|---|---|---|
| 1 | GTN `introduction/galaxy-intro-short` | 13 boxes, mostly pure UI (upload, rename, view, re-run, extract workflow, multiview). 2 shed tools; 4-step workflow + test. Exercises `extract-workflow` |
| 2 | IWC `genome-assembly/assembly-with-flye` | Single dataset input, local 894 KB test data, 4 tools. Simplest invocation path |
| 3 | IWC `read-preprocessing/short-read-qc-trimming` | `list:paired` collection + 4 parameters. Exercises collection builder and the run-form parameter gap |
| 4 | GTN `introduction/galaxy-intro-101-everyone` | 15 boxes, mostly built-in tools, workflow editing and sharing |

## Phasing

- **Phase 0 — no code; run Arm B on target 1 now.**
  - It shakes out setup, the harness, verification and the report format before any skill code
    exists.
  - It produces the baseline numbers.
  - Its report is a first, data-driven verb wishlist. Check that wishlist against the verb table
    before building step 5 of the design.
- **Phase 1.** The prerequisite PRs and the `gx-ui` MVP, then Arm A on targets 1–2.
- **Phase 2.** Iterate per §5–6, add targets 3–4, then Arm C once.
- **Later.** With Test Stories D merged, `gx-ui transcript --as story` turns a passing GTN run into
  regenerated tutorial screenshots, which is the screenshot-refresh half of the training feedback.

## Where outputs go

- **Artifacts** (stream-json, transcripts, screenshots) go in a per-run directory outside the
  vault.
- **`report.md`, the triage output and a one-line-per-run ledger** go in
  `vault/projects/playwright/`. The ledger file is created by the first run.
