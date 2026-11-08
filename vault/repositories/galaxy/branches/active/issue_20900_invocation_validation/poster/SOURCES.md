# Poster sources

Poster: `poster.html` → `poster.png` (4224 × 4224 px, 44 in square at 96 px/in). Branch head `bcbd2de187c` (jmchilton fork), merge base and "dev" = `7e16f446410` unless a row says otherwise. Code was read with `git show <sha>:<path>` in `~/projects/repositories/galaxy`; nothing was run against a Galaxy server.

Abbreviations: **RR** = `lib/galaxy/workflow/run_request.py`, **SVC** = `lib/galaxy/webapps/galaxy/services/workflows.py`, **MOD** = `lib/galaxy/workflow/modules.py`, **TW** = `lib/galaxy_test/api/test_workflows.py`, **TL** = `lib/galaxy_test/api/test_landing.py`, **TCD** = `test_challenges_debrief.md` (branch record), **ID** = `implementation_debrief.md`, **PCD** = `performance_challenges_debrief.md`.

Status words: **code** = read at the stated SHA; **measured** = a recorded test or harness run; **soft** = paraphrase, inference or older SHA, see note; **unsourced** = none on the poster.

## Masthead

| Claim on poster | Source | Status / what it does and doesn't show |
|---|---|---|
| Title "Go / No-Go before liftoff" | Metaphor from `PLAN.md` | Not a claim. |
| "Galaxy checks a whole workflow run request, every batch entry and every input, before it creates a history" | `bcbd2de187c` RR:547 comment "Validate the whole request before creating histories…"; validation loop RR:558–606; `History(…)` + `commit()` only in the second loop RR:610–616 | code. "With this branch" because it isn't merged. |
| "A No-Go is a 4xx with nothing left on the pad" | Branch tests below assert 4xx + no invocation (+ no history where a new history was requested) | code + measured. Review 1 changed "400" to "4xx": the landing cases are 404/409 and sit on the same board. "Nothing left" is bounded by the footer's boundary note, and for tests with an existing `history_id` by code reading (copying happens only in the second loop, RR:617–620), not a test assertion. |
| "Addresses galaxyproject/galaxy#20900" | `gh issue view 20900` (2026-11-08): "Add validation step in workflow submission / scheduling… catch things as early as possible", OPEN | "Addresses", not "fixes": the issue is open-ended. |
| Quote "we should still validate as much as possible on the backend upon submission too" | `gh api repos/galaxyproject/galaxy/issues/comments/3284289606` (on #7781), linked from the #20900 body | Verbatim excerpt; first sentence of the comment ("This is done in the UI,") omitted. Author not named on the poster. |
| Galaxy logo | `galaxyproject/galaxy-hub` `content/images/galaxy_logo_white.svg` via `gh api`, copied unmodified to `assets/` | Per STYLE_GALAXY. |

## Region 1: two countdowns

### dev rail (`7e16f446410`)

| Tick / mark | Source | Status |
|---|---|---|
| 1 Tools and completion actions, `_check_workflow_tools` `_check_on_complete` | SVC:369–370 at `7e16f446410`, before `build_workflow_run_configs` (SVC:371) | code |
| 2 IGNITION, history created, `History(…) commit()` | RR:323–325 inside `_get_target_history`, called at the top of the batch loop RR:436 | code |
| 3 Entry 1 inputs checked, copied in, `validate(), copy()` | `input_param.validate(...)` RR:475; `content.copy(...)` RR:537/539, all after RR:436 | code |
| 4 Entry 2 fails a validator, "400 · history left" | `test_invalid_batch_entry_creates_no_history` (TW:8295) run on dev's sources: TCD "Red/green evidence" — status, message and no-invocation passed on dev; failed at the history-exists assertion ("Dev created the entry-1 history") | measured (dev sources, tests at `4b4c7d39b9a`; that test is unchanged at head, see note A) |
| 5 Step state fails, `populate_module_and_state`, "400 · history left" | `queue_invoke` populates state at `7e16f446410` `lib/galaxy/workflow/run.py`:133/143–144, called from SVC:380 after RR committed the history; TCD: `invalid_step_parameter` failed on dev at the history-exists assertion | code + measured (note A) |
| 6 Invocations queued, `queue_invoke`, "200 · unchecked" | SVC:380; TCD: 15 cases "at status 200 != 400" on dev | measured. Means: requests nothing checks get a 200 and are queued. |
| 7 Landing request looked up, `_create_landing_request_association`, "404 · history left" | SVC:392 at `7e16f446410` (after queueing); raises ObjectNotFound SVC:695; TCD: landing `unknown` failed on dev at the history-exists assertion ("dev 404s after creating the history") | code + measured (note A) |
| Zone "side effects from here on: a committed history" | Spans ticks 2–9 because RR:436 commits before anything else in the loop | code |
| Debris slip "invalid batch entry history …", invocation none, response 400 | History-name prefix from TW:8310 (`f"invalid batch entry history {uuid4()}"`); dev outcome from TCD as tick 4 | measured. The suffix is elided on purpose: the uuid and dev's " on …" suffix (RR:315–322 at `7e16f446410`) weren't captured. The slip doesn't claim the history is empty. |
| "LAUNCH, THEN SCRUB: `text` ← `5`: dev answers 200 and queues it" | `test_run_with_parameter_input_of_wrong_type[text-5]` (TW:8009), TCD "wrong type ×10" at 200 | measured |
| "…the error surfaces later. #20900 links a Sentry error for this case (via planemo run); not reproduced here." | #20900 comment 2025-09-12: Sentry event "where workflow text parameter received an integer via planemo run"; issue title "Add validation step in workflow submission / scheduling" | **soft**: the comment names the input (text ← integer, planemo run) but not where it failed. Review 1 dropped the earlier "at scheduling", which the comment doesn't say. The tests use `steps: []`, so nothing on the branch reproduces the later error. Labelled on the poster. |

### branch rail (`bcbd2de187c`)

| Tick / mark | Source | Status |
|---|---|---|
| 1 Tools and completion actions, unchanged | SVC:370–371 at head (same calls) | code |
| 2 Landing request claimed?, `get_claimed_workflow_landing_request_model` | SVC:372–376 at head, before `build_workflow_run_configs` (SVC:377); method `lib/galaxy/managers/landing.py`:308 (renamed public in `cc2099794c5`) | code |
| 3 Target history looked up, not created, `_get_target_history: History \| name` | RR:284–305 (returns `History \| str`), called RR:548 | code |
| 4 Replacement and resource params, `_validate_*_params` | RR:549–551 calling `_validate_replacement_params` RR:446 and `_validate_resource_params` RR:415 | code. The `*` is a shorthand for both names. |
| 5 Every entry: values and data inputs, `validate_input_value`, `_resolve_data_input` | RR:595 (`module.validate_input_value`, MOD:1902) and RR:600 (`_resolve_data_input`, RR:366) inside the per-entry loop RR:558 | code |
| 6 Step state, once per distinct param_map, `populate_module_and_state` | RR:601–605 (`if param_map not in validated_param_maps`) | code |
| 7 GO / NO-GO gate | End of the validation loop RR:606; the second loop starts RR:610 | code (the gate is the poster's name for that boundary) |
| 8 IGNITION, `History(…) commit()` | RR:614–616 | code |
| 9 Invocations queued, `queue_invoke` | SVC:384 at head | code |
| Stamp "NO-GO · 4xx · no history · no invocation" | The branch-side tests in region 2 that request a new history assert no history and no invocation (TW:8140, 8159, 8280, 8295, 8323; TL:479) | measured at head per ID decision 2 ("full `test_workflows.py`: 543 passed"); see note B for TL. "4xx" covers the landing 404/409 (was "400" before review 1). |
| Annotation "the same checks, plus new ones, all before ignition" | Dev's existing checks (validator RR:475 at dev, step state, landing lookup) move before RR:614; new ones: `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS`, `validate_input_content`/`validate_input_kind` (MOD:1191–1405), landing claim check | code |

## Region 2: the poll

Dev column: dev's 4 source files (`landing.py`, `services/workflows.py`, `modules.py`, `run_request.py` from `7e16f446410`) run against the branch's tests at `4b4c7d39b9a` (TCD "Red/green evidence"). **Note A:** `diff` of TW and TL between `4b4c7d39b9a` (fetched with `gh api …/contents?ref=4b4c7d39b9a`) and `bcbd2de187c` shows only added tests plus the `input_fastq_gz: data` declaration change (TW:2918). Every test used for a measured dev cell is byte-identical at head. Dev 4xx messages aren't shown on the poster.

Branch column: status, message substrings and no-invocation / no-history are the test assertions at `bcbd2de187c`. They passed in the head run recorded in ID decision 2 (TW 543 passed). Messages are the asserted substrings, truncated with "…" where noted; full texts are in the code cited.

| Row | Request (test) | dev cell → source | branch cell → source |
|---|---|---|---|
| Parameter type | `text` ← `5`, 10 type cases; `test_run_with_parameter_input_of_wrong_type` TW:8009 | 200 · queued → TCD "wrong type ×10" at 200 | 400 · no invocation; `parameter: a string is required` (TW:8020–8021, message built from a dict at TW:8020); message from `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS` `workflow_parameter_input_definitions.py`:233 |
| Restrictions | `"c"` for `["a","b"]`; `test_run_with_parameter_input_not_in_restrictions` TW:8045 (2 cases: `text`, `[text]`) | 200 · queued → TCD "restrictions ×2" | 400; `parameter: an invalid option ('c')…` (asserted substring is `…was selected`; the full message adds the valid options, `lib/galaxy/tools/parameters/basic.py`:1306/1319). This test doesn't assert no-invocation, so the chip says only 400. |
| Batch validators | batch `["UPPER","lower"]`, regex `^[A-Z]+$`; `test_invalid_batch_entry_creates_no_history` TW:8295 | 400 · history left → TCD | 400 · no history · no invocation; `parameter: Upper case letters only` |
| Dataset for collection | `src: hda` to a `list` input; `test_run_with_dataset_for_collection_input` TW:8123 | 200 · queued → TCD "dataset-for-collection" | 400 · no invocation; `input1: a dataset collection is required` (full: "…but a dataset was supplied", MOD:1392) |
| … given by URL | `src: url` to a `list` input; `test_run_with_dataset_url_for_collection_input_creates_no_history` TW:8140 | **unmeasured**: test added after `4b4c7d39b9a` (note A); ID says "red before the fix", meaning before the branch commit, not on dev | 400 · no history · no invocation; `input1: a dataset collection is required` (asserted TW:8155; raised by `validate_input_kind`, MOD:1392, via `_resolve_data_input` RR:381) |
| Collection type | `paired` → `list` and `list` → `paired`; `test_run_with_incompatible_collection_type` TW:8200 | **unmeasured**: test added in `bcbd2de187c` | 400 · no invocation; `collection type 'paired' cannot be used…` (MOD:1402) |
| Deleted input | deleted HDA, purged HDA, deleted HDCA; `test_run_with_deleted_inputs` TW:8238 | 200 · queued, "first case; rest not reached" → TCD "deleted inputs" at 200. The test loops over 3 cases and fails on the first (deleted HDA), so dev's result for the purged HDA and the deleted HDCA is **not measured** | 400 · no invocation; `the selected dataset has been deleted` (MOD:1197; the HDCA case asserts "…collection has been deleted", MOD:1199) |
| Sample-sheet URI | `rows` on a `list` Collection URI; `test_run_with_invalid_sample_sheet_uri_input_creates_no_history` TW:8159 | 400 · history left **†** → **code only**: at `7e16f446410`, `dereference_input_to_hdca` (RR:514) runs after the history commit (RR:436), and `derefence_collection_to_model` validates sample-sheet metadata at its top (`lib/galaxy/model/dereference.py`:202, raising `RequestParameterInvalidException`, a 400). Not a dev test run | 400 · no history · no invocation; `Sample sheet metadata (…) can only be used…` (asserted substring "Sample sheet metadata (column_definitions, rows) can only be used", shortened on the poster; raised by `validate_sample_sheet_metadata`, called in `_resolve_data_input` RR:379, before the commit at RR:616) |
| Step state | tool `validation_repeat`, `r2_0\|text: ""`; `test_invalid_step_parameter_creates_no_history` TW:8323 | 400 · history left → TCD | 400 · no history · no invocation; `Error computing workflow step runtime state` (MOD:3831) |
| Landing request, unknown | random `landing_uuid`; `test_invoke_with_unusable_landing_uuid_creates_no_history[unknown]` TL:479 | 404 · history left → TCD | 404 · no history · no invocation |
| Landing request, unclaimed | `[unclaimed]` | 200 · queued → TCD "landing unclaimed: 200 != 409" | 409 · no history · no invocation |

- The test's third parameter isn't shown on the poster, per PLAN.md.
- "10 type cases" counts the parametrize list at TW:7994–8006.
- The board's grouping into "consoles" is the poster's, not the record's. No headline count is shown.
- Legend "red/green = bad/good for the user" is a reading convention, not a claim.
- Legend "queued = invocation created and queued": `queue_invoke` hands the invocation to `workflow_scheduling_manager.queue` in state NEW (`run.py` at `7e16f446410`). Review 1 changed "scheduled" to "queued"; the 200 shows creation, not that scheduling ran.

## Region 3: Still GO

| Item | Source | Status |
|---|---|---|
| integer `"5"`, float `"0.5"`, boolean `"true"` | `test_run_with_parameter_input_as_string` TW:8025 | dev GO, branch GO: TCD "Passed: the 7 baseline cases" on dev's sources; head run per ID |
| text `"c"` with suggestions `["a","b"]` | `test_run_with_parameter_input_not_in_suggestions` TW:8067 | same |
| empty optional integer | `test_run_with_optional_parameter_input_empty` TW:8082 | same |
| `list:list` given to a `list` input maps over | `test_run_with_mappable_collection_type` TW:8183 | same |
| `paired` given to an untyped `collection` input, "dev · not run" | `test_run_with_untyped_collection_input_accepts_any_collection_type` TW:8223, added in `bcbd2de187c` | branch GO only; dev never ran it (note A) |
| "The first four are baseline tests (`fde4e03dd8d`, 7 cases) that pass on dev's sources" | TCD "Commits: 1. `fde4e03dd8d` Baseline tests: 5 tests / 7 cases"; "Passed: the 7 baseline cases". The 7 also include `test_run_with_multiple_text_parameter_input_validated_per_value` (a 400 on both, not shown as GO) | measured at the dev-run SHA. `rebase_reconciliation.md` says 9; that predates dropping `test_run_with_library_dataset_input` [ld, ldda]. |
| "At head, locally: test_workflows.py 543 passed · framework workflows 91 · unit 297. Fork CI not yet run." | ID decision 2 "Checks on head `bcbd2de187c`"; `index.md` "Fork CI is not assessed" | measured locally at head; not re-run by the implementer |
| "Two dev tests declared a collection input but sent a dataset. Their declarations are now `data`" | `git diff 7e16f446410 bcbd2de187c`: TW:2918 `input_fastq_gz: collection` → `data` in `test_run_workflow_from_url_with_implicit_conversion_on_collection`; `test/integration/test_dataset_copy_metadata_files.py` `bam_file` `collection`/`list` → `data`; ID decision 1 | code |

## Region 4: Inside the gate

| Claim | Source | Status |
|---|---|---|
| Diff of `build_workflow_run_configs`: dev creates the history and checks/copies per entry; branch validates every entry, then creates and copies | dev RR:435–582 at `7e16f446410`; head RR:556–620 | code. Pseudocode: loop bodies are condensed; every function name is real. |
| `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS` table, "accepts" column | `workflow_parameter_input_definitions.py`:196–240 at head (`_is_string_value`, `_is_integer_value`, `_is_float_value` accepts int, `_is_boolean_value` accepts bool or `"true"/"false"`) and the baseline test values | code |
| "400" column values | Parametrize list of `test_run_with_parameter_input_of_wrong_type` TW:7994–8006 | code (test data) |
| "collection matching reuses the run form's HistoryQuery, so the API agrees with the UI" | MOD:1394–1405 `HistoryQuery.from_parameter(...)` then `direct_match` / `can_map_over`; the run form's collection options come from `DataCollectionToolParameter.to_dict` → `_classify_hdca`, which uses the same `direct_match` / `can_map_over` (`lib/galaxy/tools/parameters/basic.py`:3150, 3253–3274) | code. "Agrees" is about matching rules; no UI test compares the two. **soft** |

## Region 5: Earlier stages

| Claim | Source | Status |
|---|---|---|
| 8 patches: #24169 unknown scheduler (Oct 17) · #24171 missing input 404 (Oct 17) · #24197 storage routing (Oct 17) · #24202 completion actions (Oct 23) · #24203 subworkflow connections (Nov 2) · #24209 tool compatibility (Oct 22) · #24265 subworkflow param errors (Nov 3) · #24671 input copy defaults (Nov 3) | `gh pr view <n> --repo galaxyproject/galaxy --json state,mergedAt,title`, 2026-11-08: all MERGED; dates are `mergedAt` in UTC; labels condensed from the PR titles (#24671: "Honor invocation request defaults for input copying and ds_map") | verified |
| "8 guards merged, Oct 17 – Nov 3, 2026" | same | verified |
| "This branch moves the whole poll before ignition" | Region 1 code rows | code |
| Cost: "Batch of 25: 26 step-state populates (dev 25)" | PCD results table, "fixed `456acb2f1d8` / batch 25: 26" vs "dev / batch 25: 25" | measured, older SHA, one run, sqlite, harness deleted. Populate counts are exact per PCD. |
| "Existing history: same query count (113 / 113)" | PCD table, single invocation into an existing history: dev 113, fixed 113 | same. The batch-of-25 existing-history row is 1529 vs dev 1553, not shown. |
| "New history: about +1 query per step (121 → 171 for a 50-step tool chain; open decision 4)" | PCD table "new history, single": dev 121, fixed 171; PCD harness "a 50-step `cat1` chain with a data input and an int parameter" (52 steps counting inputs; PCD uses both counts); PCD "about +N_steps per request"; ID decision 4 | same. **soft** at head: `bcbd2de187c` adds a `HistoryQuery` per collection input, and the PCD workflow had no collection input, so the numbers likely still hold; not re-measured. |

## Footer

| Claim | Source | Status |
|---|---|---|
| "The gate covers every check above. Failures after ignition, such as fetching a URL input or queueing the invocation, can still leave a history (open decision 4)." | Head RR:397/400 (`dereference_input_to_hdca` / `_hda` inside `_add_data_input_to_history`, called RR:619 after the commit at RR:616); `queue_invoke` SVC:384 runs after `build_workflow_run_configs` returns; ID decision 4 (commit → flush would also roll back the history) | code. The record has no sentence stating this boundary (see recommendations). **soft** wording. |
| "7 commits `fde4e03dd8d` … `bcbd2de187c` on dev `7e16f446410`" | `git log --oneline origin/dev..jmchilton/issue_20900_invocation_validation` (7 commits); `git merge-base` = `7e16f446410` | verified |
| Test files | `git diff --stat` | verified |
| "Status: parked on scope decisions; fork CI not yet run" | `index.md` Status (`branches_need_decision`; "Fork CI is not assessed") | record |
| "the SHA changes on the next rebase" | `PLAN.md`; the branch conflicts with today's `origin/dev` (now `0924bf1231a`) per plan recommendation 9 | record, not re-checked |
| QR code | `assets/qr_compare.svg`, generated with `qrcode@1.5.4` from `https://github.com/galaxyproject/galaxy/compare/dev...jmchilton:galaxy:issue_20900_invocation_validation?expand=1` (the `index.md` Open PR link) | verified link text; black on white, 4-module quiet zone |

**Note B.** `test_landing.py` "23 passed" in ID was recorded on the rebased branch before decisions 1–2 (head then `9f2d892ad17`). The 2 later commits (`2aab3a22916`, `bcbd2de187c`) don't touch landing code, but TL wasn't re-run at `bcbd2de187c` per the record. The landing row's branch cells are therefore **soft** at head.

## Unsourced or soft items

- **Unsourced:** none.
- **Soft:** "the error surfaces later" (issue claim, labelled); dev sample-sheet cell (code reading, marked †); landing branch cells at head (note B); cost numbers at head (older SHA); "API agrees with the UI" (same matching code, no comparison test); the footer boundary wording (code-derived, not in the record).

## Review 1 verification (2026-11-08)

Every row above was re-checked against `bcbd2de187c`, `7e16f446410` and the record:

- Line numbers for RR, SVC, MOD, `dereference.py`, `landing.py`:308 and `run.py` `queue_invoke` match at the stated SHAs.
- The rail order matches the code. Dev: tools/on_complete (SVC:369–370), then build (SVC:371; per-entry `_get_target_history` commit RR:436 before `validate` RR:475 and copy), then the batch-flag check (SVC:373), `queue_invoke` with populate (SVC:380), and the landing lookup (SVC:392). Branch: tools/on_complete, landing claim (SVC:372–376), then build (batch flag RR:544, target history RR:548, replacement/resource RR:549–551, per-entry loop RR:558–606, history + commit RR:614–616, `_add_data_input_to_history` RR:619), `queue_invoke` (SVC:384), and the landing association (SVC:395). The branch rail leaves out the moved batch-flag check (implementation recommendation 2).
- All 12 board tests exist at head with the names shown. Their status codes, "no history" / "no invocation" assertions and message substrings match the chips. The URL and sample-sheet rows were missing their asserted messages; review 1 added them.
- The dev cells match TCD "Red/green evidence".
- The 8 PRs are MERGED with the stated `mergedAt` dates (`gh pr view`, 2026-11-08).
- Baseline commit `fde4e03dd8d` adds exactly the 5 tests / 7 cases cited.
- `WORKFLOW_PARAMETER_VALUE_TYPE_CHECKS` and the `_is_*_value` helpers match region 4's table.
