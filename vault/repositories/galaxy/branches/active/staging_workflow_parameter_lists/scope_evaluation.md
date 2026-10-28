Run via Claude Opus at high effort.

# Scope evaluation — staging_workflow_parameter_lists

**Recommendation: expand modestly by retargeting to `release_26.2`, and keep the code as implemented.** All three commits merge cleanly onto `origin/release_26.2`, and 26.2 is unreleased: there is no `v26.2.0` tag. Multiple-value integer parameters (`8ab23c05c36`) are new in 26.2, so 26.2 is where this staging bug widens, and planemo#1744's planned adoption could then ship with galaxy-tool-util 26.2 rather than wait for the release after it. None of the code expansions the reviewers raised is worth taking now:
- Changing the default would break Galaxy's CWL array representation.
- A type-aware or shared classifier would be a third classifier with no failing case to fix.
- Nested values are out of scope.

Contracting would leave the new API with no in-tree caller.

Reviewed at head `48aa65fb` (merge-base `fd43a3c6` on `dev`, 3 commits). The diff is 60 insertions and 17 deletions across 4 files, 77 changed lines including tests and none generated. That is under 100, so there is no Possible Decompositions section. The history already splits logically: base refactor `4d0140f9`, then feature `b6f94767`, then in-tree adoption `48aa65fb`.

## Scopes considered

### 1. As implemented (target `dev`)

This adds `parameter_input_keys: Set[str] | None` to `galactic_job_json`, `StagingInterface.stage` and `stage_inputs`, and the values at those top-level keys are left as given. `WorkflowPopulator.run_workflow`'s `cwl_style` path uses it in place of the `raw_params` pop/update. It also includes a base refactor that collapses the duplicate scalar and scalar-list branches into one.

| Pros | Cons |
|---|---|
| • Minimal 2-line behavior change at the single top-level dispatch; default `None` is a no-op<br>• Has an in-tree caller, and adopting it removes a mechanism rather than adding one<br>• Reviewed clean by review 1, Codex and the thermo-nuclear review | • On `dev`, planemo can't adopt it until the release after 26.2, since its pin is `<26.2` (implementation debrief)<br>• Planemo keeps its pop/update workaround for at least one more release cycle |

### 2. As implemented, retargeted to `release_26.2` (recommended)

The code is the same. The branch would be rebased onto `release_26.2` and the PR opened against it, so the change ships in galaxy-tool-util 26.2.0.

| Pros | Cons |
|---|---|
| • `git merge-tree` against `origin/release_26.2` is clean; `util.py` and `staging.py` are byte-identical there<br>• 26.2 is unreleased, and `8ab23c05c36` ("Allow multiple integer workflow parameters") is on `release_26.2`, so 26.2 is the release that widens the bug's surface<br>• Planemo could adopt it when it relaxes its pin to `<26.3`, without waiting for a later release<br>• A release branch is fine here per standing guidance: Galaxy is liberal, and this fixes a user-facing 400 | • It adds a public keyword on a release branch, which a reviewer could call a feature<br>• The branch has to be rebased, and the unit tests, framework tests `multiple_text` and `multiple_integer_into_data_column`, and the `type: raw` API test have to be re-run there<br>• Fork CI has to be checked again on the new base<br>• If 26.2.0 ships before this PR merges, the change lands in a 26.2.x point release, and planemo's version check or fallback has to key off that point release rather than a `<26.3` pin |

<details><summary>Details</summary>

These checks were run on 2026-10-28 after `git fetch`:
- `git merge-base --is-ancestor 8ab23c05c36 origin/release_26.2` passed.
- `git merge-tree --write-tree --merge-base fd43a3c6 origin/release_26.2 HEAD` is clean.
- `git diff origin/release_26.2 fd43a3c6` shows no difference in `lib/galaxy/tool_util/cwl/util.py`, `lib/galaxy/tool_util/client/staging.py` or `test/unit/tool_util/test_cwl_util.py`. `populators.py` differs, but not in the touched hunks.
- The `multiple_text` and `multiple_integer_into_data_column` framework fixtures exist on `release_26.2`.
- The latest tag is `v26.1.2`.

Once the PR is open, update the branch record's `upstream_base_branch`. The planemo branch record's dependency note ("first release after 26.2") would change to 26.2.

</details>

### 3. Contract: API only, drop the `populators.py` adoption

This ships only `b6f94767`, the keyword and its unit test, and leaves `run_workflow`'s `raw_params` pop/update as it is on dev.

| Pros | Cons |
|---|---|
| • Smallest diff, touching galaxy-tool-util only<br>• No test-infrastructure risk, and no framework or API test reruns needed | • A new public API with no in-tree caller, which is the accretion review 1 (P3 3) pushed against<br>• Keeps the duplicate "leave untouched" emulation in populators<br>• Framework workflow tests would no longer exercise the forwarding end to end; the dropped `test_staging.py` test relied on them to do that |

### 4. Fix the default: pass flat scalar lists through in tool mode

`replacement_item` would stop sending flat lists of scalars through `replacement_list` in tool mode, which matches how bare scalars already pass through. Planemo would then need no workflow parsing at all. This was raised implicitly when the test challenges dropped the default-pinning test because it "would get in the way of a future fix".

| Pros | Cons |
|---|---|
| • Removes the root inconsistency in tool mode, where scalars pass through but lists of scalars become HDCAs<br>• Planemo could drop `parameter_input_labels` and the gxformat2#202 exposure on this path | • **Would silently break Galaxy's CWL tool arrays.** `representation.py` maps every CWL `array` to a dataset list ("as a dataset list") and turns it back with `collection_wrapper_to_array`, and CWL tools, including planemo's, are staged in tool mode through this function<br>• No test on dev would catch the break: `lib/galaxy_test/api/cwl/` holds only `__init__.py`, so the `run_cwl_job` / `run_conformance_test` path is currently unexercised |

Not viable. The caller-supplied key set exists because only the caller knows which inputs are parameters.

### 5. Derive keys inside staging

`stage()` would take the workflow, or a workflow id, and work out the parameter inputs itself.

| Pros | Cons |
|---|---|
| • One call for consumers, with no key set to build | • Staging never sees the workflow, and `tool_util` has no typed-workflow-inputs helper (review 1)<br>• Doing it through gxformat2 normalization hits gxformat2#202 (`color` / `directory_uri`) in a layer that can't gate it<br>• Couples a pure job-adaptation function to Galaxy API calls |

The implementation debrief and review 1 both rejected this. I agree.

### 6. Type-aware keys via a shared native-workflow classifier

This would add a galaxy-tool-util helper that reads `parameter_input` step labels from a native `.ga` dict, with no gxformat2. `cwl_style` in populators would use it in place of `_is_scalar_or_scalar_list`, and planemo could use it to avoid gxformat2#202 for native workflows. This answers the thermo-nuclear review's open question.

| Pros | Cons |
|---|---|
| • Type-aware rather than shape-based, and native-dict parsing sidesteps gxformat2#202<br>• A reusable piece planemo and Galaxy tests could share | • A third classifier, next to planemo's `input_kind` and gxformat2 normalization<br>• Planemo has already decided to keep its `_has_parameter_list` gate until a gxformat2 release with #202 (gxformat2 PR #281), so this would route around a fix already in flight<br>• It would add a workflow download to each of the 53 `cwl_style` framework tests, with no failing case to fix; review 1 judged the shape heuristic enough<br>• Format2 workflows would still need gxformat2, or a Galaxy download, to reach native form |

<details><summary>Details</summary>

I found no existing native-workflow input classifier in `lib/galaxy/tool_util` or `galaxy_test/base`. The only `"parameter_input"` hits are CWL parser output and fixtures. `GET /api/workflows/{id}` keys `inputs` by step index (`label`) and `steps` by id (`type`), so a Galaxy-API-backed version would have to join the two. Revisit this only if gxformat2#202 stalls, or if a `cwl_style` fixture needs a scalar or scalar list staged as data.

</details>

### 7. Nested, record or subworkflow values

This would apply the key set recursively, to values inside records or to subworkflow inputs.

| Pros | Cons |
|---|---|
| • Would cover parameter values nested inside record dicts | • Workflow invocation inputs are keyed by top-level labels, and subworkflow inputs aren't supplied through the job (review 1)<br>• Tool mode already works with flat `cond\|param` keys<br>• No caller needs it |

Out of scope.

### 8. Adopt the keyword in other in-tree staging callers

The candidates are `stage_data_in_history` (`verify/interactor.py`), selenium `_stage_test_data`, `run_cwl_job`, `stage_rules_example` and `test_tools_upload.py`.

| Pros | Cons |
|---|---|
| • Would make adoption consistent across all callers | • Every one of them stages data only and holds back no parameter values (implementation debrief, review 1), so there is nothing to replace |

Nothing to do.

### 9. API or integration tests

| Pros | Cons |
|---|---|
| • Would prove the change end to end against a server | • It is client-side staging only. Framework tests `multiple_text` / `multiple_integer_into_data_column` already exercise it end to end, and the existing `test_run_subworkflow_with_boolean_parameter_in_when_condition` covers the `type: raw` unwrap |

Already covered.

### 10. `captured_targets` recording helper in `test_cwl_util.py`

This would replace the `captured_targets` closures repeated around `_mock_upload_func` in existing tests with one helper. It is the test challenges' follow-up suggestion, and the file is already touched.

| Pros | Cons |
|---|---|
| • Cheap, and limited to the touched test file | • Churn on tests unrelated to this change; the new test doesn't use the pattern<br>• Adds noise to a release-branch PR if scope 2 is taken |

Neutral. It suits a separate `dev` cleanup better.

## Not scope

- The name `parameter_input_keys` versus `passthrough_keys` is a review question. Review 1 kept the current name, and the planemo plan already uses it.
- `collections.abc.Set` as the "set-like, not str" type has no other use in `lib/` (thermo-nuclear review). That is a convention question for review.
- Unrelated to scope: the branch record's Status still says "Implemented at `05af7656`". The head is now `48aa65fb`.
