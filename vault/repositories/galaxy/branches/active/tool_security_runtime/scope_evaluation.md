Run via Claude Opus 5.5 at high effort. **Recommendation: keep the scope as implemented.** This is the first scope evaluation. Branch 3 is exactly what John asked for: the static review plus the pin's runtime enforcement (`d5f7cb05e91`), adapted to the parent's `classify()` and `Rule` catalog. Refusal outcomes are identical to the source across all 94 jobs.

I looked for a modest expansion in touched code, as the process asks, and the one candidate did not hold up. It was to make every place that prepares a job treat a refusal the same way. There are three such paths:
- **`BaseJobRunner`:** handled. It catches `ToolInputRejected` with dev's other rejections.
- **Pulsar:** it sends `ToolInputRejected` through `fail_job` and its resubmission rules. Dev's `InsufficientPermissionsException` is failed directly. Both earlier reviews left this as a product choice.
- **Celery's `setup_fetch_data`:** it calls `prepare()` with no handler.

What I verified about the Celery path:
- At the default `enforce_code`, `__DATA_FETCH__` reviews clean.
- At `enforce_data` and `enforce_all`, its only enforced finding is a `configfile-injection` on `$request_json`, and the only character that breaks out is a raw newline. Galaxy serialises the request as one-line JSON, so it is practically unreachable.
- A clean fix is not small. On dev, the `PAUSED` early return still runs `fetch_data`, `set_job_metadata` and then `finish_job`, and `finish_job` would call `finish()` on a failed job. Every later task in the chain would need a guard.

I did not verify what state a refused Celery job ends in.

Everything open is therefore one of five things:
- Runner-path consistency: Pulsar direct-fail, a named rejection tuple, and Celery guards.
- A cross-branch call for John: converge `codes.py`, `ToolInputRejected` and `security_review.py` with branch 4.
- The parked defaults decision.
- Wording or log-only behaviour decisions.
- Restructures inside mvdbeek's design, which stay with him.

None of them earns a re-scope. **The scope verdict does not unblock the branch.** It stays BLOCKED on the parked defaults/`upload1` decision.

## Possible Decompositions

**Size.** The diff is `d4e4f68dd25..HEAD`: 7 commits (head `390b715f49a`, including one `fixup!` of `50ca585a37b` that is not yet squashed), 25 files, about +4,960/−100.

| Piece | Hand-written library | Data | Tests | Generated |
|---|---|---|---|---|
| Classify split (`09877fc98d1`) | +29/−12 `classify.py` | | | |
| Runtime (`50ca585a37b` plus `c846af20490`, `750590845cb`, the fixup) | about 1,050: `security_review.py` 863, `codes.py` 74, config schema 56, `evaluation.py` 22, `Tool.security_review()` 10, runners about 10, app/`structured_app`/`MockApp`/`get_tool_evaluator` wiring 12 | | about 1,370: `test_security_review.py` about 1,140, integration 187, API `test_tools.py` +21/−7 | about 120: config rst, sample, attributes |
| Spec jobs and docs (`3f0aef6a491` plus part of `9b8b1099b1f`) | about 530: `security_review_spec.py` 290, `spec/__init__.py` +208, `docs.py` +34 | `cases.yml` +614/−35 | about 175: `test_security_review_spec.py` 110, `test_spec.py` +51, one `ReviewConfig` test | about 1,060 of the doc page's +1,096. The rest (intro and "Checking jobs") is hand-written. |

**Seams.**
- `50ca585a37b` stands alone. It imports nothing that `3f0aef6a491` adds.
- `9b8b1099b1f` is split across the seam:
  - Its `_PLAIN` test goes with the runtime.
  - Its `test_review_config_offers_the_reviewer_settings` needs the spec's `ReviewConfig`, so it goes with the spec piece.
- The doc page's generated block (lines 110–2312) has a freshness test against `cases.yml`, so it cannot be split from the spec jobs. The hand-written "Checking jobs" section can move to either side.

**Constraints that apply to every option.**
- The parent `tool_security_static_findings` (READY, squashed) lands first.
- Branch 4 (`tool_patches_static_findings`) also adds `lib/galaxy/tool_util/security/codes.py` and `lib/galaxy/tools/security_review.py` as new files. It also edits `jobs/__init__.py`, the runner catches and `config_schema.yml`. Whichever of branches 3 and 4 lands second has add/add conflicts and has to reconcile two `RefusalCode`s:
  - this branch's is built from `Rule`/`Uncheckable`, with 17 values;
  - branch 4's is the pin's verbatim, plus `static-findings`.
- Authorship: the runtime commit is mvdbeek's, co-authored by John. The classify split, the spec jobs, the docs and the hardening are John's.

**Option A: one PR on the parent.** Every commit, with the fixup squashed. It is one review: about 1.6k hand-written library lines, about 1.5k test lines, about 650 lines of spec data and about 1.2k generated lines.

**Option B: fold the classify split into the parent, then one PR.**
1. Squash `09877fc98d1` into the parent's `classify` commit. The CLI output is byte-identical (`baseline_refactor.md`).
2. Everything else, as in A.

This takes the only edit to parent code out of this PR. The cost is re-cutting a parent that is READY and squashed. The branch's only use of the new `uncheckable_reasons`/`why` API is here, so the parent would carry API surface with no caller of its own.

**Option C: runtime first, then spec jobs and docs.**
1. The classify split and the runtime commit (mvdbeek-led), with its unit, integration and API tests, config docs and the hardening commits. It is gated by the hand-written unit and integration tests.
2. The spec job models, `SpecJobRunner`, the `cases.yml` job blocks, the generated docs and the `ReviewConfig` test (John-led).

Authorship matches the PRs, and PR 1 is reviewable as "enforcement". But the 94-job equivalence gate and the user-facing docs arrive only with PR 2. PR 1 also ships the enforce_code default without its admin page, unless "Checking jobs" moves into it.

**Option D: shared refusal plumbing first, then C or A.**
1. A plumbing PR:
   - `ToolInputRejected`
   - `RefusalCode` (`codes.py`)
   - the runner and Pulsar catches
   - a named rejection tuple, if John takes the Pulsar decision

   With no reviewer behind it, nothing raises yet.
2. This branch's runtime and spec, as in A or C.
3. Branch 4's refusal round, stacked on the same plumbing PR.

This removes the add/add conflicts between branches 3 and 4, and gives both one refusal vocabulary. The cost is a PR with no behaviour of its own, plus a rebase of branch 4. It only makes sense if John converges the two branches (see "Converge the refusal primitives").

**Option E: land the code with enforcement off, then flip the default.** Not a scope change: the final default stays John's `enforce_code` + `strict`.
1. Everything in A, with `tool_security_review: off` in the schema. The API test change waits.
2. One commit: the `enforce_code`/`strict` default, the regenerated config docs and the `model_attributes` API test change.

This puts the CI fallout and the `upload1` question in a small PR of its own, whichever way the parked decision goes. The cost is that PR 1 ships a security feature that is off by default for a while.

## Relation to the siblings

- **`tool_security_static_findings`** (parent).
  - This branch adds one commit to it (the classify split) and otherwise only reads its modules.
  - mvdbeek's analyser stays untouched, so his work can still stack.
  - The parent pins the source at `d5f7cb05e91`. Newer source commits go to the parent first.
- **`tool_patches_static_findings`** (branch 4, sibling child of the same parent).
  - It refuses whole tools whose patched source keeps static findings. The tool is reviewed at load, and the job is refused in `JobWrapper.prepare`.
  - This branch refuses individual jobs whose values break out of the templates, in `ToolEvaluator.build`.
  - The two features are complementary, but they duplicate primitives: two new files, two `RefusalCode`s and the same runner catches.
  - Both review the same tool: branch 4 once at load, and this branch lazily per process, through a `WeakKeyDictionary` cache. With both on, the tool is analysed twice.
  - The message shape is the same by design: both use the pin's `ToolInputRejected` format.
- **`tool_patches`** relates only through branch 4. Once patches apply at load, `tool.tool_source` is already the patched tree, so this branch's review would see patched templates without any change here.

## Scopes considered

### As implemented (recommended)

The branch holds:
- the parent's static review;
- the pin's runtime: job-prep value checks at `enforce_code`/`enforce_data`/`enforce_all`, `when_unsure` `strict`/`refuse`/`log`, `ToolEvaluator` and `PartialToolEvaluator` hooks, `RefusalCode`, config, app wiring and runner handling;
- the spec's red and green jobs and `SpecJobRunner`, plus a "Checking jobs" docs section with generated jobs and codes.

It is adapted to `classify()`, `Rule` and `Uncheckable`, and no removed parent code comes back.

| Pros | Cons |
|---|---|
| <ul><li>Exactly John's four-branch ask</li><li>All 94 source jobs and their codes, messages and warnings are identical. The thermo dump compared 768 outcomes.</li><li>The adaptation reuses the parent: `_no_plain_value` is one call into `uncheckable_reasons`, and `RefusalCode` values come from the `Rule`/`Uncheckable` catalogs</li><li>One evaluator hook. The runner change joins dev's existing rejection tuple</li><li>2422 unit tests and 7 integration tests pass</li></ul> | <ul><li>The default refuses Galaxy's own `upload1`, `model_attributes`, `config_vars` and `command_reads_configfile` jobs, and the API test is red (parked)</li><li>The Celery fetch path and Pulsar handle a refusal differently from `BaseJobRunner` (see the next scope)</li><li>It duplicates branch 4's refusal primitives</li><li>`Tool.security_review()` has no production caller</li></ul> |

### Expanded: one prepare-rejection path (considered, not recommended)

Name dev's `(ParameterValueError, ExpressionTemplateError, InsufficientPermissionsException, ToolInputRejected)` tuple once, and use it in three places:
- `BaseJobRunner.prepare_job`, as now;
- Pulsar, where `ToolInputRejected` moves into the direct `job_wrapper.fail` branch beside `InsufficientPermissionsException`;
- Celery's `setup_fetch_data`, which would fail the job and stop the chain.

| Pros | Cons |
|---|---|
| <ul><li>A reusable abstraction in place of hand-kept lists. Dev's two runners already disagree on which exceptions count as a rejection</li><li>A refusal is deterministic: every destination runs the same reviewer on the same values. Resubmitting through `fail_job` only repeats the refusal</li></ul> | <ul><li>Celery is practically unreachable. Its only data-level breakout is a raw newline in one-line JSON</li><li>A clean Celery stop needs guards in `fetch_data`, `set_job_metadata` and `finish_job`, which are dev-wide chain semantics</li><li>The Pulsar change departs from the pin, and both reviews left it as a product choice. The spec gate does not cover runner paths</li><li>Branch 4 touches the same catches, so convergence would reshape them again</li></ul> |

The Pulsar part goes to John as a decision. The Celery part is a follow-up, and is worth doing only if the chain's handling of a failed `prepare()` is fixed for dev as a whole.

<details><summary>Details</summary>

- **Evidence.** I ran `review_tool_source(data_fetch.xml)` from this branch.
  - It finds no unchecked locations and no uncheckable reasons.
  - Its enforced findings are empty at `code`. At `data` and `all` there is one: `configfile-injection` on `$request_json` in `configfile:request_path`, with breakout `{'\n'}`.
  - The Celery worker's `GalaxyManagerApplication` registers the reviewer, so the check does run in the worker.
- **The chain.** In `tools/execute.py:420–436`, the chain is `setup_fetch_data | fetch_data | set_job_metadata.set(link_error=finish_job) | finish_job`.
  - When `setup_fetch_data` returns `None`, `fetch_data` returns `None`, but `set_job_metadata` and `finish_job` still run.
  - `finish_job` returns early only on `PAUSED`.
  - The same gap exists on dev for any `prepare()` exception in that task.
- **Pulsar.** `review_port.md` and `test_challenges_debrief.md` both left this line as a product choice. A concurrent fixup that landed during this evaluation, `390b715f49a`, restored dev's `ParameterValueError` log line. It is not a scope change.

</details>

### Converge the refusal primitives with branch 4 (decision for John)

Use one `RefusalCode`, one `ToolInputRejected` and one `galaxy.tools.security_review` module for both refusals. This branch's `Rule`-derived `RefusalCode` would gain `static-findings`, and branch 4 would build on it. The tool could also be reviewed once, by sharing branch 4's load-time review with this branch's per-process cache.

| Pros | Cons |
|---|---|
| <ul><li>Removes guaranteed add/add conflicts</li><li>One refusal vocabulary for admins and docs</li><li>Avoids two analyses per tool</li><li>Fits the reusable-abstraction preference</li></ul> | <ul><li>It reaches into a sibling that is BLOCKED on its own scope decision (capability findings)</li><li>It reorders landing (Option D) or forces whichever lands second to rework</li><li>Sharing load-time reviews couples this branch to branch 4's storage and freshness machinery, which is a re-design rather than a port</li></ul> |

Not recommended as a re-scope of this branch. The primitive-only part (one `codes.py`, one exception) is cheap at whichever rebase comes second. The shared review is a follow-up.

### `Tool.security_review()`: give it a consumer, or drop it

It is inherited from the pin, and only tests call it. Candidate consumers:
- an admin field on the tool show API, `GET /api/tools/{id}`, giving the level and unchecked locations;
- a tool-form notice that some values will be refused.

| Pros | Cons |
|---|---|
| <ul><li>A consumer gives admins visibility before a refusal happens</li><li>Dropping it removes 10 lines of unused API</li></ul> | <ul><li>A consumer is a new API or UI surface, with its own schema and tests</li><li>Dropping it diverges from the pin and from mvdbeek's design</li></ul> |

Keep as is, and list it for John. A consumer is a follow-up, best taken together with branch 4's admin visibility.

### Re-sync with the source past the pin (`45231d97bac`)

The four source commits past `d5f7cb05e91` are analyser and spec work:
- `getattr` of a value;
- loops over select values and over `#set global` lists;
- `#include` of template macros read in.

`45231d97bac` adds a `template-include` capability to `CODE_CAPABILITIES`, rewords the `uncheckable-template-code` description in `codes.py`, and adds two spec cases with red and green jobs. It adds no new `RefusalCode`, so `test_refusal_codes` would still pin 17.

| Pros | Cons |
|---|---|
| <ul><li>Refuses `#include` of values instead of letting the job run with only a high finding</li></ul> | <ul><li>About 1.35k lines, mostly in mvdbeek's analyser modules. Under the recorded pin decision they go to the parent first</li><li>It would grow the 94-job gate</li></ul> |

Follow-up, via the `index.md` re-sync recipe, parent first. It is not this branch's scope.

### Behaviour and wording decisions (not scope)

- **One reason, two wordings.** `classify.WHY` says "no input carries" and `_JOB_WHY` says "the job does not carry". Unifying them would delete the `why` parameter, but it changes either the CLI output or the refusal messages.
- **Two "unchecked locations" sets.** `_log_summary` logs the report's own set, but `check_job` uses `classify.unchecked_locations() ∪ unchecked_at(level)`. Changing this affects only the info log.
- **`uncheckable_evidence` is public.** It was kept public for a future CLI consumer.

| Pros | Cons |
|---|---|
| <ul><li>Each is a few lines</li></ul> | <ul><li>None adds capability. Each moves a message or log line that the tests or the spec pin</li></ul> |

Listed for John.

### Restructures inside mvdbeek's runtime design (thermo NEEDS-DECISION)

Five restructures:
- A per-level policy object, in place of the six places where the level decides behaviour.
- `ToolReview` as reviewed-or-failed, in place of `status` plus an optional `report`.
- A returned decision from `_cannot_check`.
- Splitting `security_review.py`: value extraction is the clean cut. Beware that `_FAULTS` patches the module's globals.
- The private copies of `_enforced_findings`, `_added_by_rewrites` and `_param_path` moving into `charsets` and `report`.

| Pros | Cons |
|---|---|
| <ul><li>Removes scattered conditionals and redundant state</li></ul> | <ul><li>Reshapes mvdbeek's core algorithm and the parent's static modules</li><li>Breaks easy re-syncs with the source</li><li>The behaviour dump would need re-proving</li></ul> |

Follow-up, with mvdbeek.

### Expanded: cover YAML `GalaxyTool` tools

`reviewed_tool_source` accepts `YamlToolSource`, but it needs `tool.command`. A YAML tool that uses `shell_command` (all 5 `class: GalaxyTool` files in `test/functional/tools`) therefore gets no review and no check, and its jobs run as they do on dev.

| Pros | Cons |
|---|---|
| <ul><li>Closes a coverage gap that the docs only state implicitly ("tools without a command template")</li></ul> | <ul><li>It needs analyser support for `shell_command`, which the parent's evaluation already deferred (the parent CLI gates XML only)</li><li>Few deployed tools are YAML</li></ul> |

Follow-up, with the parent's "review YAML tools" item. Possibly add a one-line docs mention now.

### Expanded: refuse at submission (tool form or API), not at job preparation

| Pros | Cons |
|---|---|
| <ul><li>Users get the error at once, not as a failed job</li></ul> | <ul><li>It needs the evaluated `param_dict` at request time, and dataset contents and metadata are not final then</li><li>It duplicates the check path</li><li>The pin checks at preparation deliberately, so the message is in `job.info`</li></ul> |

Follow-up.

### Contracted: runtime without the spec jobs

Drop `SpecJobRunner`, the job models, the `cases.yml` job blocks and the generated jobs and codes docs.

| Pros | Cons |
|---|---|
| <ul><li>About 1.4k fewer lines, most of them data and generated</li></ul> | <ul><li>It removes the refusal-equivalence gate (the 94 jobs, held fixed by the brief) and the admin-facing docs of what is refused</li></ul> |

Rejected. It remains available as Option C's landing order.

### Contracted: `enforce_code` only, no `when_unsure` strict check

| Pros | Cons |
|---|---|
| <ul><li>Smaller runtime. Most of the `upload1`-style fallout comes from strict</li></ul> | <ul><li>Overrides John's 2026-11-26 default choice. It is the parked defaults decision in another form</li></ul> |

Rejected as scope; it belongs to the decision below.

## Decisions for John (outside the scope verdict)

1. **Defaults fallout (parked; the branch is BLOCKED on it).** With `enforce_code` + `strict`, these are refused on every job:
   - `upload1`, through `$getVar('output%i')` reflection, giving `uncheckable-template-code`. This includes library uploads.
   - `model_attributes`, through untraced `$__user__.addresses[0].desc`.
   - `config_vars` and `command_reads_configfile`, both through template code.

   `lib/galaxy_test/api/test_tools.py::test_model_attributes_sanitization` is red. `review_port.md` gives the options (A–D). An exemption list or a changed default would override John's explicit choice, so none is recommended here.
2. **Stricter-level fallout.** At `enforce_data` and `enforce_all`:
   - `__SAMPLE_SHEET_TO_TABULAR__` gets the strict check;
   - the spec's `job_metadata` tool is refused on every job;
   - `__DATA_FETCH__` checks `$request_json` for a raw newline, which one-line JSON never has.

   These levels are not defaults; this is for awareness.
3. **Pulsar refusals.** Fail directly, like `InsufficientPermissionsException`, or keep `fail_job` as the pin does? A named rejection tuple could come with the first option.
4. **Convergence with branch 4.** Primitives only, or also a shared review? And which branch lands first?
5. **Decomposition.** Options A–E.
