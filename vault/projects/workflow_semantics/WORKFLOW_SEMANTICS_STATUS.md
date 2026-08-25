# Workflow Semantics (#22200) — Status Capture & Next Steps

Written 2026-08-18. Branch `workflow_semantics` @ 249338d3a0, merge-base with `dev`
= e5e064f3ef (2026-03-20), **3917 commits behind dev**.

Updated 2026-08-21: §6's detector is built and run — `scripts/workflow_test_similarity.py`
on branch `workflow_test_similarity`. §3.6, §5 PR-D..n and §6 now carry measured
verdicts rather than argued ones.

## 1. What This Branch Is

Issue #22200 asks for an *actionable* workflow-semantics documentation artifact
modelled on `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`:
prose -> examples -> concrete test references, so the workflow editor, workflow
runtime, tool runtime, and CLI validation can all be checked against one source
of truth.

The branch contains an agent-driven research pass at that: 140 behavioral facts
harvested from existing tests + code analysis, 21 semantic questions (Q1-Q21)
researched, and ~20 new test cases written to close the gaps that no existing
test answered.

### Artifacts

Committed (5 commits, 19 files, +631 lines):

| File | What |
|---|---|
| `lib/galaxy/tool_util_models/__init__.py` | `visible` / `deleted` on `TestDataOutputAssertions` |
| `lib/galaxy_test/workflow/test_framework_workflows.py` | `_get_top_level_properties` + assertion loop |
| `lib/galaxy_test/api/test_workflows.py` | `test_nested_subworkflow_error_includes_two_level_step_path`, `test_cache_miss_on_parameter_change` |
| 8 x `*.gxwf.yml` + `*.gxwf-tests.yml` | format_source, 3 null-propagation, 2 skipped-step, subworkflow mapping, nested replacement params |

Untracked research docs (worktree root, never committed). `workflow_semantics_facts.yml`
is byte-identical to the **public gist** linked from #22200
(`gist.github.com/jmchilton/6f6dc82eacaececdc76367569ccb2a5b`) — 140 records:
**118** carrying a `test:` reference, **22** `evidence:`-only pure-code-analysis
records. Also `WF_SEMANTICS_FACT_QUESTIONS.md` (Q1-Q21),
`RESEARCH_GAPS_HIGH_PRIORITY.md`, `RESEARCH_GAPS_MEDIUM_PRIORITY.md`,
`COMPONENT_GALAXY_WORKFLOW_EXPRESSION_CONTEXT.md`,
`NULL_CHAIN_AND_MAPPING_COMBINATION_TESTS.md`, `MEDIUM_PRIORITY_TEST_PLAN.md`.

## 2. Why PR #22217 Stalled (closed 2026-03-23, ~1 day old)

mvdbeek, verbatim:

- "I haven't gone through all of these, most seem like (partial) duplicates of things we already test?"
- "I think all of this is potentially OK, including the duplication, but I'd like to only test things once?"
- "Even within the workflow tests there are duplicates like `test_subworkflow_validation_error_step_path` / `test_nested_subworkflow_error_includes_two_level_step_path`. I am not sure the agents fully understand what is a duplicate?"
- "Can you fine-tune this to flag overlap with existing workflow tests, and exclude things that should (or are already) tool tests?"
- on `format_source_inherits_input`: "that seems like a tool test?"
- on the job-cache test: "Should be a tool test? I think all the cache tests should test the most direct route (i.e. tools) unless it's something we can only do via workflows?"
- on `null_propagation_data_chain_pick_value`: "Covered by `test_run_workflow_subworkflow_conditional_step`?"
- on `skipped_mapped_output`: "`test_run_workflow_conditional_step_map_over_expression_tool`"

**Agreed compromise (mvdbeek 👍):** tests of things about jobs/conversion/tools
that *could* differ in workflows but which we believe don't, go in their own
clearly-labelled file so it is obvious they are not the primary tests of that
behavior.

**Root cause, honestly stated:** the PR shipped *only tests* and *no documentation
artifact*. The tests were the byproduct; the deliverable #22200 actually asks for
was never in the PR. Without the doc, each test has to justify itself in
isolation as a regression test — and several genuinely cannot.

## 3. Re-Review Findings (verified against current dev)

### 3.1 The branch does not run today — mandatory mechanical migration

`abd7a9a5b7` (2026-04-20, authored by jmchilton) migrated all gxwf fixtures to
CWL-style and made `test_framework_workflows.py` pass `test_data_format="cwl_style"`.
PR #22566 then wired `TestJob.job` from `Dict[str, Any]` to the strict `Job` root
model (`lib/galaxy/tool_util_models/test_job.py`), whose docstring says outright:
"Legacy `type: File | Directory | raw` / `value` forms are intentionally not modeled."

**Two independent enforcement points**, both of which the branch trips:

1. **Static** — `test/unit/tool_util/test_test_format_model.py:69`
   `test_validate_workflow_tests()` globs *every* `*.gxwf-tests.yml` in
   `lib/galaxy_test/workflow/` and runs `Tests.model_validate`. Only
   `replacement_parameters_legacy.gxwf-tests.yml` is allowlisted. This is a
   **unit test** — a cheap gate, no server required.
2. **Runtime** — `populators.py:2985-2997` raises
   `ValueError("Legacy 'type: raw' form ... is not allowed with test_data_format='cwl_style'")`
   *before the workflow is invoked*.

Validated against pristine dev models, all 8 fixtures fail (12-72 errors each,
every one under `N.job.*`). The four mechanical transforms:

| | from | to |
|---|---|---|
| R1 | `{type: File, value: X}` | `{class: File, path: X}` |
| R2 | `{type: File, value: X, file_type: T}` | `{class: File, path: X, filetype: T}` |
| R3 | `{type: raw, value: V}` | bare scalar `V` |
| R4 | `{type: collection, ..., elements: [{identifier: I, content: S}]}` | `{class: Collection, ..., elements: [{identifier: I, class: File, contents: S}]}` |

**21 edits across the 8 files**, fully enumerated with line numbers in the
staleness report. Two corrections to my first pass: there are **no inner `type:`
keys to drop** — collection elements need `class: File` *added* (they are a
discriminated union on `class_`; `neg_elements_without_class.yml` is a negative
fixture for exactly this). And `element_count:` is **not** required — it appears
in only 5 of ~25 dev fixtures. Worth adding to the two cardinality-focused tests
as a strengthening, not as a migration step.

Applying exactly these transforms and re-validating: 7/8 pass against pristine
dev models; `skipped_step_output` fails only on `outputs.out.File.visible ->
extra_forbidden`, i.e. precisely the §3.2 model change. Reusable script:
`<scratchpad>/migrate.py`.

Note: the **two API tests are unaffected** — `_run_workflow` is called without
`test_data_format`, so their inline `value:`/`type: File` data routes to the
legacy `load_data_dict` branch (`populators.py:2979`).

### 3.2 One rebase conflict, and it is the interesting one

`git merge-tree dev HEAD` and an actual throwaway `git rebase dev` agree: the
conflict is on commit 1/5 (`98563a916f`), in `lib/galaxy/tool_util_models/__init__.py`
only. Resolve that one ~4-line hunk and commits 2-5 replay cleanly.

Current dev `TestDataOutputAssertions` (`:644`) still has **no** `visible`/`deleted`
— `grep 'visible|deleted'` over the whole dev module returns nothing — and dev's
`test_framework_workflows.py` `verify_dataset` still only handles `metadata`. So
the capability is genuinely novel. A verified re-expression in dev style:

```python
class TestDataOutputAssertions(BaseTestOutputModel):
    model_config = ConfigDict(extra="forbid", title="TestDataOutputAssertions")
    class_: Literal["File"] | None = Field("File", alias="class", title="Class")
    visible: bool | None = Field(None, title="Visible")
    deleted: bool | None = Field(None, title="Deleted")
```

`test/unit/tool_util_models/test_output_assertions.py` -> 19 passed with this
applied. The `7b764303a2` union discrimination is not perturbed:
`_discriminate_output` (`:711-722`) keys only on `v.get("class") == "Collection"`.
Add `description=` strings to match house style.

**But the branch implements this in the wrong layer**, and this is the single
most important structural criticism of the PR. The shared verification path
already has the exact extension point:

- `get_metadata_to_test()` (`lib/galaxy/tool_util/verify/interactor.py:2308`) maps
  test-property keys onto API dataset keys. It already allowlists
  `name / info / tags / created_from_basename` as top-level API keys and already
  maps top-level `ftype` -> `file_ext`.
- `compare_expected_metadata_to_api_response()` (`:2283`) does the comparison.

Adding `visible`/`deleted` **there** lights up tool tests *and* framework-workflow
tests in one change. The branch instead adds a bespoke
`TOP_LEVEL_ASSERTION_PROPERTIES = {"visible", "deleted"}` plus a hand-rolled loop
in the workflow runner only — a parallel mechanism beside the shared one, with a
different failure message. Rework it into the shared helper.

Also: `deleted` is **dead** — zero branch fixtures use it. Drop it, or add a test
that exercises it.

### 3.3 pick_value went first-class — the branch's idiom is now legacy

PR #22222 landed `PickValueModule` (`lib/galaxy/workflow/modules.py:1997`) with
modes `first_non_null / first_or_skip / the_only_non_null / all_non_null`, PJA
support, and implicit collection mapping. dev spells it:

```yaml
  pick:
    type: pick_value
    in:
      input_0: {source: branch/out_file1}
    state:
      mode: first_or_skip
```

The branch uses `tool_id: pick_value` with hand-rolled
`style_cond|type_cond|pick_from_0|value` state. Still works (dev's
`optional_text_param_rescheduling` uses it) but it is the wrong idiom for a new
test.

dev also gained **8** `pick_value_*.gxwf.yml` framework tests that did not exist
in March. Any duplication claim must now be re-evaluated against those.

Worth documenting (and possibly worth raising separately): the module and the
tool now use **two different vocabularies** for the same concept.
`tools/expression_tools/pick_value.xml` offers `first / first_or_default /
first_or_error / only`; `PickValueModule.MODES` offers `first_non_null /
first_or_skip / the_only_non_null / all_non_null`. Nothing maps these names to
each other anywhere. That is exactly the kind of thing a semantics doc exists to
surface.

### 3.4 That same work found and fixed real bugs — proof the approach pays off

Merged on dev since March, all in this branch's exact territory:

- `b280e5bca8` "Fix PJAs corrupting skipped pick_value outputs" — `_apply_post_job_actions` ran unconditionally and changed skipped-HDA datatype away from `expression.json`, breaking downstream skip detection.
- `bce5b360c8` "Fix skipped HDA missing hid in `_create_skipped_output`"
- `77ebeeab26` "Fix pick_value all_non_null empty result + parameter default unwrap"

Consequence for the branch, with a subtlety worth getting right: `b280e5bca8`
fixed `PickValueModule._apply_post_job_actions` — a code path that **did not
exist at the merge-base** — and it fixed it by guarding at the *call site*. So
the Q5 fact ("Most PJAs operate harmlessly on the null placeholders; only
`ChangeDatatypeAction` has explicit skip-awareness") is still literally true of
the `ToolModule` path. Which is worse, not better: **the same bug is latent and
unfixed there.** See §3.7 #2. **Fixed since, in PR #23330** — the guard moved
into the actions, and the Q5 fact in the facts file has been rescoped to the job
path accordingly.

### 3.5 Facts file: references hold up better than expected; line citations do not

Mechanical resolution of the 118 `test:` refs against current dev:

- **77 resolve** to a real test on dev (API tests, gxwf pairs, and
  `test/integration/test_workflow_invocation.py` methods all check out)
- **17 "dead"** — all 17 are this branch's own unmerged tests; they resolve if the PR lands
- **24 are code citations**, of which 17 use `(lines N-M)`

Better still, the *names* are pristine: all 47 cited `test_workflows.py` test
bodies are **byte-identical** HEAD vs dev — zero renames, zero deletions anywhere
in the corpus.

The *addresses* are not. Of 72 line anchors (18 in `test:` records, 54 in
`evidence:` records), **5 are still exact.**

> **93% of line anchors rotted in five months. 0% of named-test references did.**

That one statistic is the entire argument for symbol anchors, and it belongs in
the issue. Worst offenders: `modules.py:2707` -> 3345 (+638), `modules.py:2599`
-> 3237 (+638), `test_workflows.py:3262` -> 3766 (+504), `model/__init__.py:9690`
-> 10040 (+350). The underlying mechanisms are all still present — only the
anchors died. This is exactly what `collection_semantics.yml` avoids by
referencing `framework_test:` **names**, and why it has not rotted.

**The file does not parse as YAML.** `yaml.safe_load` raises `ParserError` at
`workflow_semantics_facts.yml:532-533` — `fact: "Ready" for expression evaluation
is a two-tier check.` is a plain scalar that opens with a quote. This is
present-tense, not drift, and it is in the **public gist linked from #22200**.
Five months of it sitting there is the cleanest evidence that this corpus needs
re-authoring under a schema, not re-dating.

**`test:` is doing three incompatible jobs.** Of the 118 `test:` records, 15
values are source line ranges rather than tests (`test: lib/galaxy/workflow/run.py
(lines 502-591)`). Add the 22 `evidence:`-only records and roughly a third of the
corpus has no test linkage at all — precisely the tier the precedent has zero of.
Refs are also venue-ambiguous: `test: test_workflow_invocation.py::...` lives
under `test/integration/`, not `lib/galaxy_test/api/`, and nothing in the record
says so; `test: skipped_step_output.gxwf-tests.yml (test 1)` uses free-text where
the precedent uses a machine-parseable `_0`.

Several records also reference `Q3` / `Q20` / `Q21` — transient plan-doc
terminology that must not survive into a committed artifact.

At least one fact is **wrong as written, and was wrong when written** (not stale):

> "Cache entries are immutable DB job records. Deleting outputs, deleting jobs, or
> marking datasets as deleted won't prevent reuse."

`lib/galaxy/managers/jobs.py:611` calls `_exclude_jobs_with_deleted_outputs`
(defined at `:768`), which excludes jobs having any deleted output dataset or
collection. That code was present at the merge-base too. This is the single most
useful piece of evidence that the facts need re-verification, not re-dating.

### 3.6 Per-artifact verdicts

Revised after a dedicated duplication audit against current dev. My first pass
was **too generous in three places** — corrected below.

| Artifact | Verdict |
|---|---|
| `format_source_inherits_input` | **DROP.** `output_format.xml` asserts `format_source_1_output` -> `fastqsanger` and `format_source_2_output` -> `fastqsolexa` in one run; `inheritance_simple.xml` covers it including implicit `.gz` conversion. mvdbeek right. (Aside: `cat_data_and_sleep.xml` has an *empty* `<tests>` element — if a gap exists it is a tool test there.) |
| `replacement_parameters_nested_two_levels` | **DROP.** Same workflow as dev's `replacement_parameters_nested.gxwf.yml` at depth 1. dev already has the `_text` / `_nested` / `_legacy` family covering the distinct mechanisms. Depth+1 is one recursive descent; arguably not worth deepening the existing file either. |
| `test_nested_subworkflow_error_includes_two_level_step_path` | **DROP as a file; fix the existing test.** Identical to `test_subworkflow_validation_error_step_path` (`:5106`) except nesting depth, and *weaker*: `len(...) == 2` vs `== [1]`, and it drops the `workflow_step_id` assertion. Sharper reason: `run.py:290-297` appends `step.order_index` as the exception bubbles **outward**, so a depth-2 path is built deepest-first — `[inner, outer]`. `len() == 2` is structurally incapable of catching the one thing depth ≥ 2 makes observable. Deepen the existing fixture and assert the exact list. |
| `test_cache_miss_on_parameter_change` | **Reduce to ~6 lines, wrong venue.** Runs 1-2 already asserted by `test_run_workflow_with_valid_url_hashes_cached` (`:2237`). Run 3 is the real residual — and genuinely untested: every negative case in `test_jobs.py:831+` `_job_search` is *data*-input driven; a changed **scalar** parameter is not covered. Home: `test/integration/test_job_cache.py::TestJobCacheFiltering`, reusing its existing `_run_and_verify_cache_hit`. |
| `null_propagation_three_step_chain` | **Keep — the only real novelty in the null family.** No dev test has a non-conditional *tool* step consuming a skipped step's null. (Closest: `filter_null.gxwf.yml`, but `__FILTER_NULL__` is a collection operation, not a job.) Three steps prove nothing two don't — it is one recursive rule. Cheapest form: insert one non-conditional `cat` into the existing `filter_null.gxwf.yml`. |
| `null_propagation_data_chain_pick_value` | **DROP.** *(I had this as keep — I was wrong.)* mvdbeek cited the wrong test but reached the right verdict. Covered by tests that landed *after* this PR, via #22222: `test_pick_value_first_non_null_ordering_skipped_first` (`:3612`, `when: $(false)` / `when: $(true)`, asserts fallback content byte-exact), `test_pick_value_output_visible_with_hidden_inputs` (`:10402`), `pick_value_first_non_null_mapped` case 2, `test_conditional_flat_crossproduct_subworkflow` (`:7390`). This artifact = the three-step chain ∘ already-covered pick_value; the composition adds no code path. |
| `null_propagation_param_chain` | **DROP.** *(I had this as keep-or-merge — I was wrong.)* `expression_null_handling_text.xml` already ships `<param value_json="null"/>` -> `<output value_json="null"/>`. The workflow-level hop is `optional_text_param_rescheduling.gxwf.yml`. Chaining three expression tools composes two things each already tested — the same wrong-venue pattern mvdbeek flagged on `format_source`. |
| `skipped_step_output` | **Reduce to an assertion on an existing test.** The `expression.json` / `null` half is covered (`test_pick_value_first_or_skip_all_null` `:3388` asserts `extension == "expression.json"` and `misc_blurb == "skipped"`; also `:4065`, `:10572`). The real residual is `visible == False`, set unconditionally in `HistoryDatasetAssociation.set_skipped` (`model/__init__.py:5599`) and never directly asserted. Hang `visible: false` off dev's existing `pick_value_skip_pja.gxwf-tests.yml` output block instead of adding a new workflow. |
| `skipped_mapped_output` | **DROP as a file; fold ~4 lines.** dev `:4020` is near-verbatim — same `boolean_input_files` list, same `param_value_from_file` + `param_type: boolean`, same `cat1` `when: $(inputs.should_run)`, same `[true, false]` fixture — and asserts one skipped job plus `file_ext == "expression.json"`. Delta is walking the *raw output collection* (ordering + null placeholder at the skipped index) rather than the job list. Add it there. |
| `subworkflow_mapping_combination` | **KEEP — now the strongest artifact in the set.** I first flagged it as probably pinning a bug; a code-level trace (§3.6a) shows the flat list is what the implementation must produce. Needs three fixes before landing: register it in `collection_semantics.yml`, state the *mechanism* not just the outcome, and export the second output. |

#### 3.6 measured — the detector's verdicts

`scripts/workflow_test_similarity.py` fingerprinted 671 test units (48 framework
fixtures, 195 `GalaxyWorkflow` literals in `test_workflows.py`, 414 tool tests)
and classified the 10 units this branch adds against the 661 that exist across
`dev` plus the three open PJA PRs. It reaches the same disposition as the audit
above on **9 of 10**.

| Artifact | Verdict | Evidence |
|---|---|---|
| `subworkflow_mapping_combination` | `NOVEL_BEHAVIOR` | sole carrier of `mapped_over + multi_axis_mapping + subworkflow`; nearest test sharing those constructs is `test_conditional_flat_crossproduct_subworkflow` at setup sim 0.36 |
| `null_propagation_three_step_chain` | `NOVEL_BEHAVIOR` | nothing existing carries `skip_propagates` |
| `null_propagation_data_chain_pick_value` | dropped by the overlap rule | identical load-bearing construct set to the chain above; only one can claim the behavior |
| `skipped_step_output` | `NOVEL_ASSERTION_ONLY` | setup matches `test_run_workflow_subworkflow_conditional_step` (0.80); new: `ftype`, `visible` |
| `skipped_mapped_output` | `NOVEL_ASSERTION_ONLY` | setup matches `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` (0.83); new: `collection_type`, `ftype`, element list |
| `null_propagation_param_chain` | `NOVEL_ASSERTION_ONLY` | setup matches `optional_text_param_rescheduling` (0.71); new: `ftype` |
| `replacement_parameters_nested_two_levels` | `DUPLICATE` | 0.88 vs `replacement_parameters_nested` |
| `test_nested_subworkflow_error_includes_two_level_step_path` | `DUPLICATE` | 0.92 vs `test_subworkflow_validation_error_step_path` |
| `format_source_inherits_input` | `BELONGS_AS_TOOL_TEST` | no load-bearing workflow construct; and `cat_data_and_sleep` has no tool test at all, so the gap — if any — is there |
| `test_cache_miss_on_parameter_change` | `BELONGS_AS_TOOL_TEST` | the workflow contributes nothing. Read as *wrong venue*: the subject is the invocation, so the destination is `test_job_cache.py`, not a tool test |

**The one refinement.** §3.6 kept the null chain as the family's only real novelty
and proposed the cheaper form — one non-conditional `cat` inserted into
`filter_null.gxwf.yml`. The run confirms both halves: nothing existing carries
`skip_propagates`, *and* the proposed fold does raise it. So the fold is a measured
option, not a guess. Caveat: `filter_null` is mapped over a collection, so the fold
covers the mapped case; the standalone fixture covers the scalar one. If both are
wanted, that is the argument for the file.

Two constructs had to be modelled because the graph does not state them:

* `skip_propagates` — an ordinary tool step forced to skip because *every* one of
  its sources skips. A step that also reads a workflow input observes a null
  rather than propagating one, and a `pick_value` or collection operation
  consuming a null is doing its job. A first, looser definition flagged
  `test_expression_tool_output_in_format_source`, which has exactly that shape and
  is not a skip chain.
* `multi_axis_mapping` — two distinct collection inputs consumed in one scope.
  Five units in the corpus carry it; only `subworkflow_mapping_combination` and
  `test_conditional_flat_crossproduct_subworkflow` combine it with `subworkflow`.

#### 3.6a Why the flat list is correct — verified in code

I initially flagged this as "probably pins a bug," because dev's
`test_run_workflow_conditional_subworkflow_step_map_over_expression_tool_with_extra_nesting`
(`:4126`) asserts `collection_type == "list:list:list"` and appears to contradict
it. It does not. The two are different mechanisms, and the code gives an
unambiguous answer that matches the artifact.

**Mapping a subworkflow is not a fan-out of N subworkflow invocations.** There is
exactly one. `WorkflowProgress.subworkflow_progress` (`run.py:775-785`) hands the
**whole parent HDCA** to the subworkflow input step —
`subworkflow_inputs[subworkflow_step_id] = replacement`, no slicing. And
`SubWorkflowModule.execute` (`modules.py:947-964`) reads the parent step's outputs
straight out of the child's progress:
`outputs[label] = subworkflow_progress.get_replacement_workflow_output(...)`.
There is **no parent-level implicit collection wrapping the subworkflow output** —
the parent step's output object *is* the inner step's output object. So no
mechanism exists by which a parent axis could be prepended after the fact.

The "parent axis" therefore only materializes because each inner step re-derives
its own mapping from the raw outer HDCA, via
`WorkflowModule._find_collections_to_match` (`modules.py:638`), which builds
`collections_to_match` **from that step's own inputs only**.

In the artifact, `the_cat`'s sole input is `input1 <- collection_to_map <- list_b`,
a plain non-`multiple` `data` param. That hits the early return at
`modules.py:654-660`:

```python
if is_data_param:
    if multiple:
        effective_input_collection_type = ["list"]
    else:
        collections_to_match.add(name, data)
        continue
```

`progress.subworkflow_structure` is **never consulted on this path** — it appears
only in the `data_collection` branch (`:664-678`) and at `:683`. So
`match_collections` sees exactly one collection, `list_b`, and produces a flat
`list` over P, Q. **Flat is what the code must produce.**

`:4126` differs because its `consume_expression_parameter` has *two* collections
in one step's match set — `input1 <- create_more_inputs/list_output` (the inner
list:list) **and** `queries_0|input2 <- boolean_input_file` (the mapped-over
parent input) — plus the `subworkflow_structure` type-stripping block at
`:671-678`. The axis attaches because that step has a path to the mapped-over
subworkflow input. `the_cat` has no path to `single_from_parent`. **The rule is
per-step co-occurrence in `collections_to_match`, not per-invocation.**

Three things to fix before it lands:

1. **Register it in `collection_semantics.yml`.** The fixture's doc comment cites
   that file for support it does not contain — it has zero subworkflow examples;
   all 25+ are tool input-matching. This is a semantics claim and that file is the
   semantics registry. Add a labeled example with
   `tests: workflow_runtime: framework_test: "subworkflow_mapping_combination_0"`.
2. **State the mechanism, not just the outcome.** "Two independent mapping sources
   do not stack" reads as contradicting `:4126` to anyone who knows `:4126` — it
   misled two independent reviewers here. Say *why*: the axis attaches per-step
   through `collections_to_match`, and `the_cat` has no connection to the
   mapped-over input.
3. **Export the second output.** `consume_parent` currently sits in the workflow
   unobserved. Export it: it should be a flat list over X, Y while `combined_out`
   is a flat list over P, Q — two independent axes coexisting in one subworkflow
   invocation, neither stacking. *That* pins the mechanism; asserting only
   `combined_out` pins one arbitrary-looking outcome. ~10 lines in a file already
   being added.

### 3.7 Findings on dev — ranked

**#1 — NOT A BUG (investigated and closed). A FAILED invocation leaves every
sibling job running; a CANCELLED one kills them.** Verified accurately:
`WorkflowInvocation.fail()` (`model/__init__.py:10084-10085`) is literally
`self.state = FAILED`. All four failure pathways use it — the three at
`run.py:105/109/118` (`FailWorkflowEvaluation`, `MessageException`, bare
`Exception`) and the timeout early-return at `:203-215`. **None** calls
`cancel_invocation_steps()`. Only the `CANCELLING` branch does, at
`scheduling_manager.py:441-443`.

The asymmetry is a deliberate policy distinction, not an oversight. Cancelling is
an explicit user request to stop; failing is not. A 50-branch workflow that fails
on branch 1 may well have 49 branches whose outputs the user still wants, and
killing them discards compute already paid for. Changing this would be a behavior
change some deployments rely on not happening.

A working prototype — `fail()` stopping jobs the way cancellation does, plus a
sibling-branch API test and a timeout integration test, both verified red-to-green
— is parked at [`jmchilton:invocation_failure_cancels_jobs`](https://github.com/jmchilton/galaxy/tree/invocation_failure_cancels_jobs). Pick it up from
there if the policy is ever revisited. It was not proposed as a fix.

**One real defect did fall out of the prototype**, independent of the policy
question: `cancel_invocation_steps()` sets every unfinished job to `DELETING`
unconditionally, but a job that never reached a runner has nothing watching it and
never advances to `DELETED` — it strands in `DELETING` indefinitely. Reproduced
directly (a 60s hang in `test_workflow_failed_output_not_found`), though only
because the prototype made it deterministic; on dev it is a sub-second race,
requiring a cancel within one handler poll of job creation with that job's inputs
still valid. The branch splits the update on `job_runner_name` (NULL goes straight
to `DELETED`). Shippable alone, but with no honest regression test behind it —
which is why it is parked rather than filed.

**#2 — FIXED (PR #23330). The `pick_value` PJA fix did not land on the analogous `ToolModule` path.**
`b280e5bca8` guarded `PickValueModule._apply_post_job_actions` at the *call site*.
`ToolModule._handle_mapped_over_post_job_actions` (`modules.py:3297-3303`) has no
such guard and is called unconditionally at `:3234` whenever `collection_info` is
set — so mapped conditional steps run PJAs on skipped `expression.json`
placeholders today. It is non-destructive only because
`ActionBox.mapped_over_output_actions` (`post.py:562-567`) still lists just
Rename/Hide/Tag/RemoveTag. But dev **just added**
`ChangeDatatypeAction.execute_on_mapped_over` (`post.py:111-124`) and
`ColumnSetAction.execute_on_mapped_over` (`:348-366`), both unguarded — so the
method now exists and adding it to the allowlist is the obvious next step. The
moment that happens, a mapped conditional step with a ChangeDatatype PJA corrupts
its skipped elements' extension and breaks downstream skip detection (which keys
on `extension == "expression.json"`, `modules.py:2112`) — the exact bug
`b280e5bca8` just fixed on the other call site.

Cheapest correct fix: put the guard **in the actions**, not at each call site, so
it cannot be missed a third time. Strong candidate precisely because the team has
already accepted a fix for the same bug elsewhere.

Shipped exactly that way: `DefaultJobAction.mapped_over_dataset_instances` filters
on a new `DatasetInstance.is_skipped`, and both `ChangeDatatypeAction` and
`ColumnSetAction` route through it. `PickValueModule._is_null_or_skipped` widened
from `HistoryDatasetAssociation` to `DatasetInstance` so the same predicate covers
collection elements. Three framework workflows cover it —
`pick_value_mapped_skip_pja`, `pick_value_mapped_mixed_skip_pja`,
`pick_value_mapped_set_columns`.

**#3 — FIXED (PR #23334). `PickValueModule` silently no-ops every PJA it does not implement.**
`_apply_post_job_actions` (`modules.py:2330-2334`) dispatches *every* PJA via
`ActionBox.execute_on_mapped_over`, ignoring `ActionBox.mapped_over_output_actions`;
`DefaultJobAction.execute_on_mapped_over` is `pass` (`post.py:30-34`). So on a
`pick_value` step, `EmailAction` and `DeleteIntermediatesAction` are configurable
in the editor, saved to the DB, and never executed — no warning. Small,
self-contained, very reviewable.

Correction to the original wording above: `DeleteDatasetAction` **does** implement
`execute_on_mapped_over`, so it was never part of this bug. The full unsupported
set is `EmailAction`, `DeleteIntermediatesAction`, `ValidateOutputsAction` and
`SetMetadataAction`, and only the first two are in `public_actions` — which is why
the editor-visible symptom is exactly two toggles.

Shipped as a `supports_mapped_over` class flag with `ActionBox.execute_on_mapped_over`
warning instead of dispatching into a no-op, plus the editor half: `FormSection`
takes a `supportsJobBasedActions` prop and `FormPickValue` passes `false`. Note the
other call site, `ToolModule._handle_mapped_over_post_job_actions`, pre-filters on
`mapped_over_output_actions` (all supported), so the warning is reachable only from
`pick_value`.

**#4 — Optional multi-data input yields a 1-element list, not an empty one.**
`DatasetListWrapper.to_dataset_instances(None)` returns `[None]`
(`tools/wrappers.py:582-592`), so the tool receives a **one-element** wrapper
around `None`. `__bool__` returns `any(self)` (`:617-619`) with the literal
comment "Fail `#if $param` checks in cheetah if optional input is not provided" —
that override is the only reason `multi_data_optional.xml`'s `#if $input1` takes
the else branch. So `#if $input1` works but `len($input1) == 1`, and a bare
`#for` misbehaves. Probably intended; best filed as a documented sharp edge — and
it is exactly what a semantics doc is for.

**#5 — FIXED (PR #23328). `ChangeDatatypeAction.execute` has a `for`/`else` with no
`break`.** The `else` on the loop over a collection's `dataset_instances` runs on
every pass, not only when the collection is empty, so every job with an output
collection both had its element datatypes changed *and* got a redundant
`PostJobActionAssociation` persisted. Found while auditing `post.py` for #2/#3.

Not observable through any API, which is why it had no test and why the fix ships
as a characterization test rather than a red-to-green one: both job-finish paths
filter `immediate_actions` out, `ext_override` is keyed by output name so a
structured collection's entry never matches a discovered output, and no API exposes
a job's PJAs. The deferral itself is load-bearing —
`Job.get_change_datatype_actions` filters on `action_type` only, not on
`immediate_actions`, which is how a *dynamic* collection's elements get the new
extension at discovery. New test `test_change_datatype_static_collection_output`
covers the populated-collection branch, which nothing exercised before.

**Do not file:** `WorkflowStepInput.value_from` is dead schema, not a bug.
`modules.py:286-294` collects `value_from_expressions` then returns without
evaluating them, and nothing in `managers/workflows.py` or the gxformat2 import
path ever writes `value_from`. Document it as an unimplemented CWL-inheritance
stub.

### 3.8 Wrong answers in the research docs — re-verified against dev

The reference corpus held up on *names* and rotted on *addresses*: all 47 cited
`test_workflows.py` test bodies are **byte-identical** HEAD vs dev (zero renames,
zero deletions), while of 72 line anchors only **5 are still exact — 93% rot in
five months, versus 0% for named-test references.** That single statistic is the
whole argument for symbol anchors, and it belongs in the issue.

But several *answers* are wrong, and mostly were wrong when written:

**Q1 Path 2 is wrong — the highest-value correction.** The docs claim a data
connection to a failed upstream step fails the invocation via
`replacement_for_connection` finding the dataset in ERROR. It cannot:
`run.py:556-558` gates that entire block on **`not is_data`**, and
`replacement_for_input` sets `is_data = input_dict["input_type"] in ["dataset",
"dataset_collection"]` (`:468`). For a plain data connection the check never
runs. What actually happens: the downstream job is created and **PAUSED** by the
job layer (`jobs/__init__.py:1504-1508`, `jobs/handler.py:825,830`
`JOB_INPUT_ERROR`), and the invocation reaches **scheduled, not failed**. The
doc's own cited test proves it — `test_workflow_resume_from_failed_step` asserts
`paused_dataset["state"] == "paused"` and uses `wait_for_workflow(assert_ok=False)`;
it never asserts invocation failure. Sole exception: collection-operation tools,
where `check_inputs_ready` exists only on `model_operations.py:44` and
`execute.py:342` does `getattr(tool_action, "check_inputs_ready", None)`.

Corrected, there are **three** paths, not two: (1) parameter/non-data connection
-> job-state check -> `job_failed`; (2) non-data connection consuming a dataset ->
`dataset_failed`; (3) plain data connection -> **no invocation-level check at
all**, downstream job PAUSED, invocation SUCCEEDS — except for
collection-operation tools.

**The §1 "correction" is itself imprecise.** It implies skipped outputs stay
visible inside a subworkflow collection context. They don't.
`HistoryDatasetAssociation.set_skipped()` (`model/__init__.py:5585-5599`)
unconditionally sets `visible=False` and is called for every skipped output at
`tools/actions/__init__.py:766`, ungated by collection context. The
`modules.py:3237-3242` guard governs only the implicit output **collection** of a
mapped-over step. The branch's own `skipped_step_output` fixture proves it — it
has no collection mapping, so that block never executes, yet the output is hidden.

**Q18 "pick_value output is always visible" is now false for one mode.**
`PickValueModule._create_skipped_output` (`modules.py:2219-2232`) calls
`set_skipped()`, so in `first_or_skip` mode with all inputs null the output is
**hidden**. The cited test uses the *tool*, which is byte-identical to
merge-base, so the tool-level fact still holds — but the blanket claim doesn't.
This compounds the two-vocabulary problem: **every `pick_value` fact in the
corpus documents only one of the two implementations**, and dev ships 8 framework
tests for the other.

**Q19 has two more errors beyond the deleted-outputs one.** Dev also filters
`Job.copied_from_job_id.is_(None)` ("Always pick original job",
`managers/jobs.py:700`) and `if wildcard_param_dump.get("__when_value__") is
False: job_states = {Job.states.SKIPPED}` (`:721`). Neither is documented. The
ignored-parameter list *is* correct.

**Q9 is still true for execution but materially incomplete.** Dev added
`_capture_workflow_tool_request_state` (`modules.py:2365-2495`), called on every
tool step at `:3162`, which runs `fill_static_defaults` + `.validate(...)` and
persists a `ToolRequest` with `request_state` in `{validated, validation_failed}`.
It is deliberately execution-neutral — its docstring says "workflows legitimately
execute effective state a tool-request validator would reject" — but a semantics
doc asserting "there is no validation" is now misleading: a parallel validation
model exists and records its disagreement in the DB.

**Q6 was the one genuinely unanswered question** (Q15 was answered; only a stale
"*Likely answer in:*" line makes it look open — delete that line). The answer:
`DatasetListWrapper.to_dataset_instances(None)` returns `[None]`
(`tools/wrappers.py:582-592`), so an omitted optional multi-data input arrives as
a **one-element** wrapper around `None` — not an empty array, not a
`NO_REPLACEMENT` sentinel. See §3.7 #4.

**Grading of Q1-Q21:** 8 test-backed (6 of which lean on the branch's unmerged,
schema-invalid fixtures) / 9 code-reading-only, i.e. unverified assertions / 3
wrong (Q1, Q18, Q19) / 1 unanswered (Q6). Also: `WF_SEMANTICS_FACT_QUESTIONS.md`
§2's 15 `- test:` records are byte-identical duplicates of `workflow_semantics_facts.yml`
lines 412-500 — delete one copy.

**Vocabulary staleness.** #22565 renamed `can_match_type` -> `accepts`
(`type_description.py:177`), `can_match` -> `compatible_shape`
(`structure.py:141`), and added `compatible` (`:212`). More importantly
`collection_semantics.yml` — the document this issue is imitating — gained a
104-line "Type Compatibility Algebra" section, including the note that routing a
sibling-matching question through `accepts` instead of `compatible` "was a real
bug in earlier revisions of both the Python and TypeScript code." Q10's claim of
consistency with that file needs re-expressing in the new vocabulary.


## 4. The Precedent To Copy

`collection_semantics.yml` is a complete, CI-enforced system — not just a YAML:

| Piece | Path |
|---|---|
| Source of truth | `lib/galaxy/model/dataset_collections/types/collection_semantics.yml` (42 examples, 76 test refs) |
| Renderer + validator | `lib/galaxy/model/dataset_collections/types/semantics.py` |
| Generated doc (checked in) | `doc/source/dev/collection_semantics.md`, listed in `doc/source/dev/index.rst` |
| Unit test loading the YAML | `test/unit/data/model/test_collection_semantics.py` — incl. `test_check_returns_no_errors()`, which is what makes the linkage CI-enforced |
| Code back-references | `lib/galaxy/model/dataset_collections/type_description.py:21,185,223` |
| Client back-reference | `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts:15` |
| Framework tests named for it | `lib/galaxy_test/workflow/collection_semantics_*.gxwf.yml` |

Crucially `semantics.py` **validates every test reference**:
`_validate_api_test_ref` (`:388`) AST-parses the API test file to confirm the
function/method exists; `_validate_framework_test_ref` (`:420`) resolves
`workflow_name_index` to a real `.gxwf.yml` + `.gxwf-tests.yml` pair;
`validate_tool_refs` confirms the tool XML exists.

Record shape (labels are `UPPER_SNAKE`):

```yaml
- example:
    label: BASIC_MAPPING_PAIRED
    assumptions: [...]
    then: {...}
    tests:
        tool_runtime:
            api_test: "test_tool_execute.py::test_map_over_collection"
        workflow_runtime:
            framework_test: "collection_semantics_cat_0"
        workflow_editor: "accepts paired data -> data connection"
```

This machinery is exactly the answer to "the facts file has dead references" and
to "which suite does this belong in" — the `tests:` block *forces* you to name
the most direct route, and a `workflow_runtime` entry with no `tool_runtime`
entry is a visible, reviewable claim that the behavior is workflow-only.

## 5. Recommended Plan

**Do not reopen #22217 or re-push the branch as-is.** Four workstreams — note the
test-framework schema change goes **after** the doc, not before.

### PR-A — DROPPED. Failed invocations leaving jobs running (§3.7 #1).

Prototyped and abandoned. The fail/cancel asymmetry is intentional, so there is no
bug fix here to lead with — see §3.7 #1 for the reasoning, the parked branch, and
the one genuine `DELETING`-stranding defect that came out of the exercise.

### PR-B — `workflow_semantics.yml` + CI-validated linkage (the actual #22200 ask)

- `lib/galaxy/workflow/workflow_semantics.yml` + `lib/galaxy/workflow/semantics.py`
- **Extract, don't fork.** `_validate_api_test_ref`, `_validate_framework_test_ref`,
  `validate_tool_refs`, `validate_workflow_editor_refs` are ~90 genuinely generic
  lines that know nothing about collections — move them to a shared module and
  have both consumers import. The other ~450 lines of `semantics.py` (every
  `as_latex()`, `MapOverThen` / `ReductionThen`, `_latex_collection_type`) are
  irreducibly collection-specific. Keep the extraction a pure move with no
  behavior change and let the existing `test_collection_semantics.py` prove it.
- `test/unit/workflow/test_workflow_semantics.py` asserting `check() == []`;
  generated `doc/source/dev/workflow_semantics.md`; sibling entry at
  `doc/source/dev/index.rst:18`.
- **Seed only from facts whose refs resolve on dev today**, minus everything §3.8
  kills. Facts lacking a resolving ref are **dropped, not documented-as-untested**
  — say so in the body and list them as the roadmap.
- Replace all 72 line anchors with symbol anchors.

Zero new runtime tests, zero new CI minutes (unit job only), reviewable in one
sitting, and it is literally what #22200 asked for.

**Say in the PR body why the LaTeX algebra does not transfer** — it preempts "why
doesn't this look like the other one":

> Collection semantics is an **algebra** — inputs and outputs are values and
> `then` is an equation, so LaTeX earns its place. Workflow semantics is a
> **propagation / state-machine** domain: given a workflow shape and an
> invocation request, what happens to scheduling, nulls, visibility, and failure.

Keep `label` / `tests:` / the `doc:`-`example:` alternation / `extra="forbid"` /
`check()`. Replace `assumptions` / `then` / `as_latex()` with `given` / `then` /
`as_markdown()` over a discriminated union of outcome kinds — `step_state`,
`output_value`, `null_propagation`, `invocation_failure`, `request_rejected`,
`value_resolution`, `equivalence` — which between them cover all 140 branch
records. Add an `integration_test` venue (the branch's facts already cite
`test/integration/`).

**The killer feature the precedent has no equivalent of:** type
`invocation_failure.reason` against the real `FailureReason` enum
(`lib/galaxy/schema/invocation.py:81`). A fact documenting a failure mode that no
longer exists then **fails to load** — semantic validation, not just
link-checking. Worth leading the PR description with.

Extra validator rules worth having: `label` uniqueness; and **no two facts may
cite the same test ref** — either the facts are duplicates or the test is
overloaded. That makes duplicate detection permanent rather than a one-off.

### PR-C — `visible` / `deleted`, in the shared layer, with a consumer

**Landed on branch `pja_test_output_visible`** (2026-08-20, one commit off `dev`,
not opened as a PR). Shipped `visible` only, in `get_metadata_to_test`, on
`BaseTestOutputModel` so collection elements get it too; `schema.ts` and
`ToolSourceSchema.json` regenerated; consumers are a new `hide_output_pja`
fixture and `visible: false` on dev's `pick_value_skip_pja`. `deleted` dropped —
no consumer. XML tool tests still cannot use `visible`
(`ToolSourceTestOutputAttributes` drops unlisted keys); flagged, not fixed.

Deliberately **after** PR-B. As the branch has it, this is the piece with the most
design surface and *no consumer* — it would read as dead code, and nothing would
force the design question to resolve.

Two changes from the branch version:

1. **Implement in `get_metadata_to_test()`** (`interactor.py:2308`), not in a
   bespoke `TOP_LEVEL_ASSERTION_PROPERTIES` loop in the workflow runner. That
   helper already allowlists `name / info / tags / created_from_basename` and maps
   `ftype` -> `file_ext`; `compare_expected_metadata_to_api_response` (`:2283`)
   does the comparing. One shared change lights up tool tests *and*
   framework-workflow tests.
2. **This is also what makes the schema honest.** `TestDataOutputAssertions` is
   shared with tool tests, feeds the published `GalaxyWorkflowTests` JSON schema,
   and regenerates into `client/packages/api-client/src/schema/schema.ts:24325,24403`.
   Adding the fields *only* to the workflow runner would make `visible:` a valid
   tool-test key the tool-test interactor silently ignores — a guaranteed and fair
   reviewer objection. Regenerate `schema.ts` in the same PR.

Re-express in dev style (`X | None`, `Annotated[..., Field(title=, description=)]`).
Ship with a consumer: hang `visible: false` off dev's existing
`pick_value_skip_pja.gxwf-tests.yml`. Drop `deleted` — nothing uses it.

### PR-D..n — The surviving tests, one gap at a time

Rewritten 2026-08-21 from the detector's output. The survivor list is shorter than
the audit guessed: **one** new file, four assertion folds, two relocations.

**PR-D — the one new file.** `subworkflow_mapping_combination`, with the three
§3.6a fixes: register it in `collection_semantics.yml`, state the per-step
`collections_to_match` mechanism rather than the outcome, and export
`consume_parent` as a second output so two independent axes are both observed.

**PR-E — assertions folded into existing tests, no new files.**

| Residual | Target | Add |
|---|---|---|
| null reaches an ordinary tool step | `filter_null.gxwf.yml` + one non-conditional `cat` | `ftype: expression.json` on the intermediate |
| skipped step as a declared workflow output | `pick_value_skip_pja.gxwf-tests.yml` | `ftype: expression.json` (PR-C already landed `visible: false`) |
| mapped conditional raw output collection | `test_run_workflow_conditional_step_map_over_expression_tool_pick_value` | `collection_type`, per-element `ftype`, ordering with the null at the skipped index |
| null across expression-parameter hops | `optional_text_param_rescheduling.gxwf.yml` | `ftype: expression.json` |

**PR-F — two relocations.**

1. Deepen `test_subworkflow_validation_error_step_path` and assert the exact
   `[inner, outer]` list instead of `len(...) == 2`; drop the branch's near-twin.
2. Move the scalar-parameter cache miss into
   `test/integration/test_job_cache.py::TestJobCacheFiltering`, reusing its
   existing `_run_and_verify_cache_hit`.

Each lands with the `tests:` ref that turns PR-B's `check()` green, so every
test's reason to exist is documented rather than argued.

### Explicitly dropped — and say so in the PR description

`format_source_inherits_input` (no load-bearing workflow construct — and
`cat_data_and_sleep` has no tool test at all, so the gap is there if anywhere),
`null_propagation_data_chain_pick_value` (identical construct set to the null
chain), `replacement_parameters_nested_two_levels` (0.88 duplicate),
`test_nested_subworkflow_error_includes_two_level_step_path` (0.92 duplicate), and
`skipped_step_output` / `skipped_mapped_output` / `null_propagation_param_chain`
as standalone files — they become PR-E's assertions.

Publish the detector's table with those rows **shown, not hidden**, each noting
where it went instead. Visibly conceding the correct half of the review is what
stops the next round from relitigating the whole set.

### On mvdbeek's agreed compromise file

Build it only if the audit turns up **at least 3** survivors. It turns up 0-1, and
a new file convention for a population of one is worse than no convention.

Do the cheap thing instead: for any test that confirms tool-level behavior, add a
one-line docstring or `doc:` naming the primary test ("Secondary: primary coverage
is `test/functional/tools/output_format.xml`"). Zero new files, and it reaches the
person browsing `lib/galaxy_test/`, which a YAML under `lib/galaxy/workflow/`
never will. Say this in the PR description so the compromise reads as honored,
not dropped.

**Do not** make *absence* of a `tool_runtime:` ref mean "workflow-only". On the
precedent absence already means "not covered yet" — only 17 of 42 examples carry
`tool_runtime`. Overloading it recreates exactly the unarbitratable question that
killed #22217, and CI can never falsify an absence. Make the claim positive: a
required `venue_rationale: workflow_only | confirms_tool_behavior` field, with the
validator enforcing that `confirms_tool_behavior` **must** carry a resolving
`tool_runtime:` ref.

## 6. Duplicate Detection — built, and what it found

"I am not sure the agents fully understand what is a duplicate" is a process
complaint, so the answer is an artifact, not better intentions. Built as
`scripts/workflow_test_similarity.py` on branch `workflow_test_similarity`
(one commit off `dev`, 18 unit tests).

**Step 1 — fingerprint the corpus.** Per test unit: `{id, venue, tool_ids,
constructs, input_kinds, parameters, assertion_targets, step_count,
nesting_depth}`. Extraction is mechanical: `yaml.safe_load` the `.gxwf.yml` /
`.gxwf-tests.yml`; `ast.parse` `test_workflows.py` and `yaml.safe_load` the
embedded `class: GalaxyWorkflow` literals (resolving the shared ones in
`workflow_fixtures.py`); ElementTree over `test/functional/tools/*.xml`. 671
units: 48 framework fixtures, 195 API, 414 tool.

A fixture is one unit, not one per test job — jobs of a fixture share a workflow,
and a fixture is what a reviewer keeps or drops.

The workflow-only construct set — mvdbeek's "most direct route" rule made
mechanical: `when:`; subworkflow `run:`; PJAs; workflow-level `optional` inputs;
collection-operation modules as steps; `pause`; `${...}` substitution;
step-to-step data flow; map-over; plus `skip_propagates` and
`multi_axis_mapping` (§3.6 measured). Declared workflow outputs are tracked but
**not** load-bearing: every workflow declares them, so counting them would make
the wrong-venue trigger vacuous.

**Step 2 — rank.** Jaccard over the feature union; top 3 per candidate. "Same
setup" keys on constructs + input kinds only, excluding tool identity and
parameter values — two tests that build the same structure are the same setup
whether they drive `cat` or `cat1`, and differing only in a parameter value is
what `PARAMETER_VARIANT` means.

**Step 3 — forced classification, closed set, fixed disposition:**

| Verdict | Mechanical trigger | Disposition |
|---|---|---|
| `BELONGS_AS_TOOL_TEST` | no load-bearing workflow-only construct | move out of the workflow venue |
| `DUPLICATE` | sim >= 0.8 **and** new `assertion_targets` subset of existing | drop |
| `PARAMETER_VARIANT` | identical construct set and tools, differs only in depth or step count | drop unless a specific bug is cited |
| `NOVEL_ASSERTION_ONLY` | an existing test's constructs cover the candidate's and setup sim >= 0.6 | **strengthen the existing test** |
| `NOVEL_BEHAVIOR` | no existing test carries the construct set | ship |

Existing tests are checked before other candidates, and candidates sharing an
identical load-bearing set are reported as a pair — only one can claim novelty.

**Step 4 — publish.** Results in §3.6 measured; full table belongs in the PR body
with the drop rows shown, not hidden.

**The credibility add-on, run.** `--self-similarity 0.95` over the merged corpus
first reported the entire `pick_value` family as 1.00 duplicates — the fingerprint
was ignoring step state, so `first_or_skip` and `the_only_non_null` were the same
point. Fixed by adding state / `test_data` leaves to the feature set. What survives
at 1.00 is a real limitation, not a real duplicate: pairs like
`test_run_with_default_file_dataset_input` vs `..._and_explicit_input` differ only
in the Python run request, which the fingerprint does not read.

**Known limits, stated up front.** Fingerprints cover the workflow document and
assertions, not the driving Python. `BELONGS_AS_TOOL_TEST` means the workflow
contributes nothing — for invocation-level subjects (caching, scheduling) the
destination is an integration test. `mapped_over` is a graph heuristic; no tool
schema is consulted, so a `multiple="true"` param reading a collection is not
distinguished from map-over.

**Do not** make *absence* of a `tool_runtime:` ref mean "workflow-only". On the
precedent absence already means "not covered yet" — only 17 of 42 examples carry
`tool_runtime`. Overloading it recreates exactly the unarbitratable question that
killed #22217, and CI can never falsify an absence. Make the claim positive: a
required `venue_rationale: workflow_only | confirms_tool_behavior` field, with the
validator enforcing that `confirms_tool_behavior` **must** carry a resolving
`tool_runtime:` ref.

## 7. Unresolved Questions

1. Where should `workflow_semantics.yml` live — beside `collection_semantics.yml`
   under `lib/galaxy/model/dataset_collections/types/`, or under
   `lib/galaxy/workflow/`? And where does the extracted shared validator go?
2. Is the extraction of `semantics.py`'s validators into a shared module worth the
   churn to a file locked by a ~600-line unit test, or is a fork acceptable here?
3. ~~PR-A: cancel in-flight jobs, or only attach a failure message?~~ **Answered:
   neither — the distinction is intentional, PR-A dropped (§3.7 #1).** Open
   residual: file the `DELETING`-stranding fix alone despite having no
   non-racy regression test for it?
4. ~~§3.7 #2 (unguarded `ToolModule` PJA path) is latent — fix it now, or wait until
   `ChangeDatatypeAction` is added to the mapped-over allowlist and it becomes
   observable?~~ **Answered: fixed now, in the actions rather than at the call
   sites (PR #23330).**
5. Should the two `pick_value` vocabularies (tool: `first / first_or_default /
   first_or_error / only`; module: `first_non_null / first_or_skip /
   the_only_non_null / all_non_null`) be reconciled, or just documented?
6. Re-run the full Q1-Q21 research pass against current dev, or only re-verify the
   facts PR-B will actually ship?
7. Null chain: take the cheap fold into `filter_null.gxwf.yml` (covers the mapped
   case) and stop there, or also keep `null_propagation_three_step_chain` as a
   file for the scalar case?
8. Should `scripts/workflow_test_similarity.py` go up as its own PR ahead of
   PR-D — so the reviewer has the detector before the tests it justifies — or as
   the first commit of PR-D?
