# Poster plan: issue_20900_invocation_validation

**Verdict: poster.** The branch has one clear, drawable idea: dev starts creating side effects and then checks the request. The branch checks the whole request and only then creates anything. The tests already pin a real before/after for each check: each one asserts the status, the message and that no history was created, and the record logs what dev did on the same requests. Eight smaller guards are already merged, so what's left is the restructure that ties them together. That gives the poster a clear story to sell.

Caveats the implementer must respect (details in the evidence table and `branch_recommendations.md`):

- The dev-side outcomes were measured at `4b4c7d39b9a` (test challenge), before 5 of the current tests existed. Rows built on those 5 tests have no measured dev result yet. Mark them, don't invent them.
- "200, then fails at scheduling" is the issue's claim (a private Sentry event). Nothing on the branch reproduces it. The tests only show that dev answers 200.
- The branch is parked on decisions 3–6 and conflicts with today's `origin/dev`, so the head SHA will change. Pin the poster to `bcbd2de187c` and say so in the footer.

Style: `styles/STYLE_GALAXY.md` (the branch name has 33 characters). The canvas is 44 in square, at the style's size floors. The format can be Typst or HTML+SVG. Typst is suggested, because the board is a dense table and the rails are simple geometry.

## Core ideas

1. **Order is the bug.** On dev, `build_workflow_run_configs` creates and commits a `History` for each batch entry *before* it checks that entry's inputs. Step state is only populated later, in `queue_invoke`, and the landing request is only looked up after every invocation is queued. Some bad requests get a 200 (nothing checks them). Others get a 400/404 after a history has already been committed.
2. **The fix moves the side effects to the end.** The branch splits `build_workflow_run_configs` in two. Phase 1 validates every batch entry: parameter values, data inputs, collection kind and type, deleted state, sample-sheet URIs, replacement and resource params, and step state (populated once per distinct `param_map`). The service also looks up the landing request before phase 1. Phase 2 creates histories and copies inputs. (`run_request.py`, `services/workflows.py` at `bcbd2de187c`.)
3. **New checks, reused machinery.** Value-type checks are a small table, `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS`. Collection matching reuses the run form's `HistoryQuery.direct_match` / `can_map_over`, so the API now agrees with the UI. Untyped `collection` inputs stop being silently saved as `list` (`2aab3a22916`).
4. **No false alarms.** Baseline tests (`fde4e03dd8d`) pin the requests that must keep working, and they pass on dev and on the branch: integer `"5"`, float `"0.5"`, boolean `"true"`, a value outside the suggestions, an empty optional value, `list:list` mapped over a `list` input, and any collection on an untyped input.
5. **The last stage of a program.** Eight guards were extracted and merged (#24169, #24171, #24197, #24202, #24203, #24209, #24265, #24671). This branch is the restructure that makes the whole request atomic. The individual guards couldn't do that on their own.

## Visual hook: the Go / No-Go poll

Galaxy users "launch" workflows, and Galaxy is a space brand. Mission control's **Go/No-Go poll** is exactly the branch's rule: every console reports before ignition, and one No-Go scrubs the launch with the rocket still on the pad.

- **Ignition** = the first side effect: `History(...)` + `sa_session.commit()`, then copying or dereferencing inputs.
- **Consoles** = the check classes. Each console is one row of the board, with a real request and the real message from a test.
- **Debris on the pad** = a history committed by a request that was then rejected.
- **Launch, then scrub** = dev's 200 for a request it never checked: the invocation is queued and fails later.
- **A clean scrub** = the branch's 400 with no history and no invocation (each `*_creates_no_history` test).

The metaphor has to carry the argument, not decorate it. The single most important visual is **the ignition marker sitting in a different place on two otherwise identical countdown rails**. A reader who sees only that has understood the PR.

Avoid rocket clip-art clutter. Use one Lucide `rocket` icon per rail, a flame or spark glyph for ignition, and status words everywhere. Status color means good or bad *for the user*, not go or no-go: a branch "NO GO · 400 · clean pad" is good (`gx-ok`), and a dev "200 · queued" is bad (`gx-danger`). Every mark carries its word, per the greyscale rules.

## Layout (44 in square)

Read order, top to bottom: masthead, then the two rails (10-second message), then the board (the evidence), then three small cards along the bottom (safety, mechanism, history), then the footer.

```text
┌──────────────────────────────────────────────────────────────┐
│ MASTHEAD  title + hero word, thesis, #20900, logo            │ ~13%
├──────────────────────────────────────────────────────────────┤
│ 1. TWO COUNTDOWNS (full width)                               │ ~27%
│   dev rail:    ... IGNITION ... checks ✗ ... → debris slip   │
│   branch rail: checks ... GO/NO-GO gate → IGNITION ...       │
├──────────────────────────────────────┬───────────────────────┤
│ 2. THE POLL (console board, featured)│ 3. STILL GO           │ ~32%
│   console | request | dev | branch   │   requests that pass  │
│   legend line                        │   on both             │
├──────────────────────┬───────────────┴───────────────────────┤
│ 4. INSIDE THE GATE   │ 5. EARLIER STAGES, ALREADY FLOWN       │ ~20%
│   diff pseudocode +  │   8 mission patches + cost chip        │
│   type table         │                                        │
├──────────────────────┴───────────────────────────────────────┤
│ FOOTER  refs, SHAs, test files, boundary note, QR            │ ~8%
└──────────────────────────────────────────────────────────────┘
```

### Masthead

- Title: **"Go / No-Go *before* liftoff"**, with "before" as the gold hero word. An alternative, if the rocket wording reads as too cute: "Check everything *before* the first history".
- Thesis (white Atkinson ≥ 40 pt): "Galaxy now checks a whole workflow run request, every batch entry and every input, before it creates a history. A No-Go is a 400 with nothing left on the pad."
- Sub-line: "Addresses galaxyproject/galaxy#20900 · branch `issue_20900_invocation_validation` @ `bcbd2de187c`". Say "addresses", not "fixes": the issue is open-ended ("catch things as early as possible").
- Optional Kalam quote in gold, from the #7781 comment that #20900 cross-references: "we should still validate as much as possible on the backend upon submission too". It's mvdbeek's words; cite the comment, not the person, and no @-mention.

### 1. Two countdowns (hero region)

Two horizontal rails with matching tick spacing, so the eye compares where ignition sits. Label the ticks with real code names, set small in mono, with plain-English labels above them.

**dev (`origin/dev` `7e16f446410`)** ticks, left to right:

1. tools and completion actions checked (`_check_workflow_tools`, `_check_on_complete`), shown as GO (already-merged guards)
2. **IGNITION**: `History(...)` + `commit()` for entry 1 (`_get_target_history`)
3. entry 1's inputs checked and copied into that history
4. entry 2 ✗: validator fails → 400, and entry 1's history stays
5. step state populated (`queue_invoke` → `populate_module_and_state`) ✗ → 400, history stays
6. invocations queued
7. landing request looked up (`_create_landing_request_association`) ✗ → 404, history stays

Below the rail, two outcomes:

- **Debris slip** (the paper-receipt motif, torn edge): a history card named after the test's `new_history_name` prefix, "invalid batch entry history …", marked "no invocation · LEFT BEHIND". Use the test's prefix only. The exact suffix dev appends is unverified, so don't invent it (see recommendations).
- **Launch, then scrub** callout: "`text` ← `5`: nothing checks the type → 200, invocation queued → fails during scheduling". Footnote it as "reported in #20900 (Sentry, via planemo run)". It is not reproduced here.

**branch (`bcbd2de187c`)** ticks:

1. tools and completion actions (unchanged)
2. landing request looked up and claim-checked (`get_claimed_workflow_landing_request_model`)
3. batch shape checked, target history looked up but **not created** (`_get_target_history` returns a `History` or a name)
4. replacement and resource params (`_validate_replacement_params`, `_validate_resource_params`)
5. every entry: parameter values (`validate_input_value`), data inputs (`_resolve_data_input` → `validate_input_content` / `validate_input_kind`)
6. step state, once per distinct `param_map` (`populate_module_and_state`)
7. **GO/NO-GO gate**: a key node filled `gx-dark` and ringed in gold
8. **IGNITION**: `History(...)` + `commit()`, then `_add_data_input_to_history`
9. invocations queued

A NO-GO arrow drops from the gate to a stamp: "400 · no history · no invocation". Kalam annotation: "the same checks, plus new ones, all before ignition".

### 2. The poll (console board, featured card with the gold bar)

One row per console, with columns **Console · Request · dev · branch**. Quote messages verbatim from the test assertions, which are substrings. If the implementer wants the full message, take it from the code (`modules.py`, `workflow_parameter_input_definitions.py`) and say so in `SOURCES.md`.

| Console | Request (from the test) | dev | branch | Test |
|---|---|---|---|---|
| Parameter type | `text` ← `5` (the #20900 case) | 200 · queued | 400 `parameter: a string is required` | `test_run_with_parameter_input_of_wrong_type[text-5]` (10 cases) |
| Restrictions | `"c"` for restrictions `["a","b"]` | 200 · queued | 400 `parameter: an invalid option ('c') was selected` | `test_run_with_parameter_input_not_in_restrictions` |
| Validators, every batch entry | batch `["UPPER","lower"]`, regex `^[A-Z]+$` | 400 · **history left** | 400 `parameter: Upper case letters only` · clean | `test_invalid_batch_entry_creates_no_history` |
| Dataset given to a collection | `{"src":"hda"}` to a `list` input | 200 · queued | 400 `input1: a dataset collection is required` | `test_run_with_dataset_for_collection_input` |
| … by URL | `{"src":"url"}` to a `list` input | **unmeasured** | 400 · clean | `test_run_with_dataset_url_for_collection_input_creates_no_history` |
| Collection type | `paired` to a `list` input, and the reverse | **unmeasured** | 400 `collection type 'paired' cannot be used…` | `test_run_with_incompatible_collection_type` |
| Deleted or purged input | deleted HDA, purged HDA, deleted HDCA | 200 · queued | 400 `the selected dataset has been deleted` | `test_run_with_deleted_inputs` |
| Sample-sheet URI | `rows` on a `list` Collection URI | 400 · history left (per Codex triage, not a recorded dev test run) | 400 · clean | `test_run_with_invalid_sample_sheet_uri_input_creates_no_history` |
| Step state | `validation_repeat` `r2_0\|text: ""` | 400 · **history left** | 400 `Error computing workflow step runtime state` · clean | `test_invalid_step_parameter_creates_no_history` |
| Landing request | unknown `landing_uuid` | 404 · **history left** | 404 · clean | `test_invoke_with_unusable_landing_uuid_creates_no_history[unknown]` |
| | unclaimed `landing_uuid` | 200 | 409 · clean | `…[unclaimed]` |

- Legend line under the table: "queued = invocation created and scheduled · history left = rejected after a history was committed · clean = no history, no invocation · unmeasured = dev not yet run on this request".
- **Landing row:** show only the unknown and unclaimed sub-cases.
- If the "unmeasured" cells are filled before implementation (recommendation 1), replace them. Otherwise keep the word: an honest gap reads better than a guess.
- Don't put a headline count of consoles on the poster ("11 failure classes"). The grouping is the planner's, not the record's. If a count is wanted, use the measured "15 request cases dev answered 200 that now get 400" (test challenge at `4b4c7d39b9a`), labelled with that SHA.

### 3. Still GO (no false alarms)

A short list of requests that pass on dev and on the branch, each with a green GO:

- integer `"5"`, float `"0.5"`, boolean `"true"` (`test_run_with_parameter_input_as_string`)
- text `"c"` with suggestions `["a","b"]`: suggestions aren't restrictions (`…_not_in_suggestions`)
- empty optional parameter (`test_run_with_optional_parameter_input_empty`)
- `list:list` given to a `list` input maps over (`test_run_with_mappable_collection_type`)
- `paired` given to an untyped `collection` input (`test_run_with_untyped_collection_input_accepts_any_collection_type`, branch-only; it pins the decision-2 fix)

Footnote: "Baseline tests in `fde4e03dd8d` pass on dev's sources". Add local head results: "full `test_workflows.py` 543 passed · framework workflows 91 · unit 297 (local, `bcbd2de187c`; fork CI not yet run)".

An honest one-liner here or in region 4: "Two dev tests declared a collection input but sent a dataset. Their declarations were fixed (`test_metadata_copied_to_copied_outputs`, `test_run_workflow_from_url_with_implicit_conversion_on_collection`)". Reviewers will see dev tests change, and saying it first reads as care.

### 4. Inside the gate (implementation, small)

A diff-shaped pseudocode block of `build_workflow_run_configs`, using only real names:

```diff
 for each batch entry:
-    history = History(...); commit()
-    check inputs, copy them into history
+    validate_input_value(...)            # parameter type, restrictions, validators
+    _resolve_data_input(...)             # lookup, access, deleted, kind, collection type
+    populate_module_and_state(...)       # once per distinct param_map
+# ── GO/NO-GO: every entry passed ──
+for each validated entry:
+    history = History(...); commit()
+    _add_data_input_to_history(...)
```

Beside it, a mini table of `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS`: text, color and directory_uri require a string; integer accepts `5` and `"5"` but rejects `True` and `5.5`; float; boolean accepts `true`/`"true"`. Add one Kalam annotation: "collection matching reuses the run form's `HistoryQuery`, so the API agrees with the UI".

An optional micro before/after for `2aab3a22916`: gxformat2 `input1: collection` → dev stores `collection_type: list` → branch stores no type. New editor nodes still start as `list`. Only include it if it fits. It explains why the collection-type check couldn't land before.

### 5. Earlier stages, already flown

Eight round "mission patches", one per merged PR, each with its number and a 2–4 word label from the standing record: #24169 unknown scheduler · #24171 missing input 404 · #24197 storage routing · #24202 completion actions · #24203 subworkflow connections · #24209 tool compatibility · #24265 subworkflow param errors · #24671 `no_add_to_history` / `ds_map`. Caption: "Merged Oct 17 – Nov 3, 2026. This branch is the stage that moves the whole poll before ignition."

**Cost chip** (small, honest, in this region or the footer): "Batch of 25: 26 step-state populates (dev 25). Same query count into an existing history (113 / 113). About +1 query per step when the request creates a history (121 → 171, 50-step workflow); open decision 4." Label it "measured at `456acb2f1d8`, sqlite, one run". Reviewers will ask about performance, and this answers before they do.

### Footer

- References: #20900 and its comment; #7781 comment `3284289606`; the branch compare link (as a QR code); commits `fde4e03dd8d` → `bcbd2de187c`; test files `lib/galaxy_test/api/test_workflows.py` and `lib/galaxy_test/api/test_landing.py`.
- **Boundary note** (required, one line): "The gate covers every check above. Failures after ignition, such as fetching a URL input or queueing the invocation, can still leave a history (open decision 4)." This keeps "nothing created" honest.
- Status line: "Parked on scope decisions; fork CI not yet run." Drop it if the poster is used after these are resolved.

## Evidence table (for `SOURCES.md`)

| Claim | Source | Status |
|---|---|---|
| dev creates and commits the history before checking inputs | `origin/dev:lib/galaxy/workflow/run_request.py` `_get_target_history` called at the top of the batch loop | code, verified |
| dev populates step state in `queue_invoke` and looks up the landing request after queueing | `origin/dev:lib/galaxy/workflow/run.py` `queue_invoke`; `services/workflows.py` `invoke_workflow` | code, verified |
| branch two-phase order | `bcbd2de187c` `run_request.py` `build_workflow_run_configs`; `services/workflows.py` landing lookup before `build_workflow_run_configs` | code, verified |
| dev 200 for wrong type ×10, restrictions ×2, dataset-for-collection, deleted inputs, invalid run request (15) | `test_challenges_debrief.md` "Red/green evidence", run at `4b4c7d39b9a` era with dev's 4 source files | measured, older SHA |
| dev 400 + history left: batch entry, step parameter; dev 404 + history left: unknown landing; unclaimed dev 200 | same | measured, older SHA |
| sample-sheet URI: dev leaves a history | `codex_review.md` ("Dev shows the same post-commit behavior"); the red check ran against the pre-fix branch, not dev | claimed for dev |
| URL-for-collection and collection-type rows: dev result | none; "red before" in the debrief means before the branch commit, not on dev | **unmeasured** |
| "200, then fails at scheduling" | #20900 comment (Sentry event); tests use step-less workflows | **claimed, not reproduced** |
| 7 baseline cases pass on dev | `test_challenges_debrief.md` ("5 tests / 7 cases"; "the 7 baseline cases" passed on dev). `rebase_reconciliation.md` says 9 because it predates dropping `test_run_with_library_dataset_input` [ld, ldda] | measured, older SHA; use 7, not 9 |
| 543 / 91 / 297 at head | `implementation_debrief.md` decision 2 | local, head SHA |
| 8 merged extractions, dates | `gh pr view` for each PR, 2026-11-08 | verified |
| populate and query counts | `performance_challenges_debrief.md` results table at `456acb2f1d8`; harness deleted | measured, older SHA, single run |
| diff size: prod +336 / −201, tests +390 / −4, 12 files, 7 commits | `git diff --numstat origin/dev...bcbd2de187c` (computed by planner; `scope_evaluation.md` still says 5 commits, ~330 / 190, ~313 test lines) | verified now, record drifts |

Don't put the diff size on the poster unless it earns its place. It isn't part of the pitch.

## What not to do

- Don't make region 4 bigger. It's an inset, not the organizing idea.
- Don't cite "the Codex review", "the thermo review" or any agent as evidence. Cite tests and code.
- Don't name reviewers, and don't @-mention anyone.
- Don't use gold for the GO marks or for any text on a light ground.
