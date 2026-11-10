# Test challenges debrief: foundry#778

- Profile: generic_test_challenger
- Model: Claude Opus 5.5, effort medium
- Reviewed commit: `4e4df0290d0b6e4be25fbfc8df7d206bb2bf3f77` (base `origin/main`, merge-base `94ce4ea2`)

Review-only: nothing in the worktree was changed. Items below are recommendations.

## What counts as tests here

The PR has no code tests. Its "tests" are Mold oracles: `eval.md` properties (fixture-independent, mostly llm-judged) and `scenarios.md` cases (fixture + expect). It also edits the `galaxy-tool-discovery` schema's `status` description.

| File | Change | Challenge result |
|---|---|---|
| `discover-shed-tool/eval.md` | + property "a wrapper that runs the named executable is never a miss" | Keep. Behavioral, falsifiable (a `miss` listing the wrapper under `alternates` fails). |
| `discover-shed-tool/scenarios.md` | + case "STAR index need" | Keep. Live Tool Shed search, so stochastic, but its expect is outcome-shaped. Red on base cast is the cheapest red-to-green this PR could show (P3 2). |
| `advance-galaxy-draft-step/eval.md` | property rewritten to "only a miss falls through"; skip property extended | First sentence contradicts the Mold's rejected-`weak` rule (P2 2). Extended skip has no scenario (P2 1). |
| `implement-galaxy-tool-step/eval.md` | + property "a wrapper's limit becomes a blocking entry" | Keep. Overlaps the pre-existing "runtime failure ownership hint" (P3 3). |
| `implement-galaxy-tool-step/scenarios.md` | + case "wrapper runs the work but has no index output" | Keep, but prose fixture: no committed draft or summary (P2 1). |
| `repair-galaxy-draft-topology/index.md` | fold clause | No eval property; existing removal properties can be read against it (P2 3). |
| `repair-galaxy-draft-topology/scenarios.md` | + case "a consumer's wrapper builds the index", "No committed fixture yet" | Unrunnable as written; fixture is cheap (P2 1). Version drift vs. the example it cites (P3 4). |
| schema JSON + `.generated.ts` + changeset | description only, enum unchanged | No test needed. `galaxy-tool-discovery.test.ts` doesn't assert descriptions; nothing to drop or add. |

Nothing to drop: no new property only restates the Mold text, and none is silly. The unit-test questions about mocks, `SimpleNamespace`, and restructuring for testability don't apply: there's no code under test.

## Test plan

### 1. One shared STAR fixture for three scenarios (P2 1)

The three new STAR cases describe one chain: implement raises the entry, advance's Pick skips to repair on it, repair folds. Only one fixture set is needed, and most of it is already in the repo. `repair-galaxy-draft-topology/examples/star-sa-index-input/galaxy-workflow-draft.gxwf.yml` is essentially the post-fold oracle (two `rna_star` steps, `refGenomeSource|genomeFastaFiles` from `genome`, `geneSource: history`).

Add `repair-galaxy-draft-topology/examples/star-index-fold/`:

- `galaxy-workflow-draft.gxwf.yml`: `star-sa-index-input`'s draft plus a drafty `star_genome_index` step (`tool_id: TODO`, `_plan_*`, `TODO_index` out). Both `rna_star` steps read the index from it. Keep `genomeSAindexNbases` out so the fixture stays about one entry.
- `open-requirements.ledger.yml`: the blocking entry implement would raise. `step: star_genome_index`, `raised_by: implement-galaxy-tool-step`, and a `missing` naming `rna_star` with its version and quoting its outputs and the `geneSource` option.
- `galaxy-tool-summary.json` for `rna_star` at the scenario's version. Generate it with `galaxy-tool-cache summarize`; don't hand-write it.
- `folded.gxwf.yml` (optional): the expected result, so the repair case can carry a deterministic `command: gxwf draft-validate folded.gxwf.yml --concrete --strict-state`, like `fastqc-zip-no-port/repaired.gxwf.yml`.
- `README.md`: synthetic, from #678's account, and what was validated with which `gxwf` version.

Then point the three cases at it:

- implement case: the draft (without the entry) plus the summary. Its expected output is the committed ledger entry.
- repair case: the draft plus the ledger. Drop "No committed fixture yet."
- new advance case, beside "entry that records the wrapper as confirmed absent": "entry that records a found wrapper that can't serve the step". Same draft and ledger. Expect: the call that picks `star_genome_index` runs no `discover-shed-tool` and no `author-galaxy-tool-wrapper`, and goes straight to repair. This is the only check on the extended step-1 skip.

Verify: `gxwf draft-validate` exits 0 on the draft, and on `folded.gxwf.yml` with `--concrete --strict-state`. Use the same CLI pin as the other fixture READMEs.

The PR lists "No repair fixture" as a known limitation. This recommendation says it's cheap because the oracle already exists, and that one fixture covers three scenarios, not just repair.

### 2. Fix the advance routing property's first sentence (P2 2)

`advance-galaxy-draft-step/eval.md`, "only a miss falls through to authoring": "the skill invokes [[author-galaxy-tool-wrapper]] only when [[discover-shed-tool]] returns `miss`". `index.md` step 2 says a `weak` candidate that confirmation shows doesn't run the named work "counts as a `miss`". In that run discovery *returned* `weak`, so a judge applying the property literally fails a correct run. Suggested wording: "... only on a `miss`, or a `weak` candidate that confirmation shows doesn't run the named work. Authoring after a `weak` candidate is confirmed, or for a found wrapper that can't serve the step, is a failure; ...".

### 3. Give repair's fold its own eval property (P2 3)

The fold is the PR's main new behavior. Nothing in `repair-galaxy-draft-topology/eval.md` judges it, and two existing properties can be read against it:

- "a removal needs standing": "no step is removed when a consumer truly needs its output". The fold removes the index step its two consumers read from.
- "a narrowing is recorded": is a fold "cut source work" that needs a `kind: dropped` entry? The fold scenario's expect doesn't say.

Suggested property, "a fold moves the work, it doesn't add a producer": when the entry shows a consumer's wrapper does the step's work, the repair removes the step, rewires its inputs to every consumer, and sets the consumer parameter that selects that mode. Adding a producer step for the same work fails. Then say in one line whether a fold counts as a narrowing, and have "a removal needs standing" exempt it. Add the matching `kind: dropped` yes/no to the fold scenario's expect.

### 4. Red-to-green on the discover case (P3 2)

The PR says no run exercised the change. The discover STAR case is a single, cheap Mold call. Run `/test-mold discover-shed-tool` on it with the base cast (`git show origin/main:casts/claude/skills/discover-shed-tool/...`) and the branch cast, in fresh subagents. Report each run's status and candidate in the PR. The base cast should show the #678 `miss`; the branch should give `rna_star` as `hit`/`weak`. Note that these are single stochastic runs.

### 5. Untested new advance behavior (P3 1)

The wrapper-choice-mismatch bucket now says: when no wrapper that runs the work satisfies the contract and only a parameter is missing, drop the setting and append a *plain* entry. Neither the eval nor the scenarios cover it. This is the one new rule that *lowers* a blocker to a plain entry, so a misread could hide a real blocker. Add a property: a dropped setting gets a plain entry naming the setting, and a missing declared output never gets a plain entry.

### 6. Overlap with the old failure-ownership property (P3 3)

`implement-galaxy-tool-step/index.md` narrowed "Failure ownership" to wrappers that *carry* what the plan needs. The pre-existing eval property "runtime failure ownership hint" and its scenario still say "plausible mismatch ... inputs, outputs, datatype, or collection support". "Outputs" now overlaps the new blocking-entry property. And because eval properties apply to every run, the STAR run is also judged on writing an ownership hint. Narrow that property and its case to match the new prose: the wrapper carries the plan, and a datatype, parameter or collection shape could still fail at runtime.

### 7. Version consistency (P3 4)

The new implement and repair cases name `rna_star` `2.7.11b+galaxy1`. The repair case says "as in `examples/star-sa-index-input/`", and that example pins `2.7.11b+galaxy0` (`changeset_revision: de21b616f03a`), with its README saying it validated against galaxy0. Choose one version for the new fixture (P2 1), or say that the wiring, not the version, is what's shared.

## Not raised

- Schema: description-only change, regenerated TS, patch changeset. The enum is unchanged, so no schema fixture needs a new case.
- The discover case says `rna_starsolo` "outranks it in search". That's a time-dependent fact, but it's phrased as allowed (`may be an alternate`), not asserted, so it's fine.
- The data-manager drop rule is only covered by "isn't the candidate" in the discover case. Acceptable for one sentence of procedure.
