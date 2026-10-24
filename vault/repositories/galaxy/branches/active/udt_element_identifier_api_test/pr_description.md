Fix 🎯 #24410 - user-defined tools render `$(inputs.x.element_identifier)` as `null` when mapped over a list.

A user-defined tool with

```yaml
shell_command: echo '$(inputs.input.element_identifier)' > output.fastq
```

mapped over a list `[sample_a, sample_b]` from the tool form, the API or a workflow:

| | `sample_a` output | `sample_b` output | plain dataset `reads.txt` |
|---|---|---|---|
| Before | `null` | `null` | `null` |
| After | `sample_a` | `sample_b` | `reads.txt` |

The job's own output labels and XML tools' `$input.element_identifier` already used the identifier. Only the UDT command line lost it. ***This fixes user-defined tools only; XML tools gain nothing except a correct recorded identifier on implicitly converted inputs.*** It targets `release_26.1` because it is a wrong-output bug in the UDT runtime that ships there.

<details><summary>How it works</summary>

- Map-over hands each job a plain HDA; its element identifier survives only as the `<name>|__identifier__` job parameter, which Cheetah's `ElementIdentifierMapper` already reads. `UserToolEvaluator` now asks the mapper for `{dataset id: identifier}` (`identifiers_by_dataset_id`) and passes it to both UDT input builders: `setup_for_runtimeify` (`/api/jobs` tool requests) and the legacy `to_cwl` (`/api/tools`).
- `to_cwl` also sets `element_identifier` on Files built from collection elements, matching runtimeify; workflow `when`/`valueFrom` expressions see it too.
- An input that needs implicit conversion (e.g. `csv` → `tabular`) lost the transient identifier because the converted HDA replaced the original; `process_dataset` now copies it onto the converted HDA. The recorded `|__identifier__` param comes from the same attribute, so XML tools' converted inputs get it too (not separately tested).
- Outside a collection, `element_identifier` falls back to the dataset name, as Cheetah and job labels do. In `to_cwl` the name fallback applies only on the UDT path, not `when`/`valueFrom` expressions.

</details>

## Risks

Small one-way door: UDTs on plain datasets now see the dataset name instead of `null` for `element_identifier`, a behavior tool authors may start relying on.

<details><summary>Risk Details</summary>

- Plain-dataset `element_identifier` changes from `null` to the HDA name for UDTs (parity with Cheetah); a tool that tested for `null` behaves differently.
- ***Job cache is not fixed here.*** With `use_cached_job`, a plain UDT run can still reuse a mapped job on the same dataset (or the reverse) when the list element's identifier differs from the dataset's name, returning the other run's identifier. The name fallback removes the common case (identifier == name). The cache-side fix is tracked in #24411.
- `process_dataset` change touches implicit conversion for every tool type, but only copies the transient in-memory attribute already set on the original HDA; a reused converted HDA gets it overwritten per job.

</details>

<details><summary>Risk Review Advice</summary>

Check that the HDA-name fallback is the semantics we want UDT authors to rely on (CWL would leave it unset). Check the 3-line `process_dataset` carry in `lib/galaxy/tools/actions/__init__.py` against implicit conversion reuse.

</details>

## Comparison with #24422

🔀 #24422 fixes the same bug (filed there as #24421). ***We prefer the reuse here:*** this branch asks Cheetah's existing `ElementIdentifierMapper` for `{dataset id: identifier}` and hands it to both input builders, while #24422 adds a UDT-only helper that walks `|`-separated input names over the already-built CWL dict to patch Files afterwards. This branch also covers implicitly converted inputs and the plain-dataset name fallback, which #24422 leaves at `null`.

<details><summary>Test parity</summary>

Every #24422 test has an equivalent here, and all of them, ours and theirs, fail on `release_26.1` code with `null`:

| #24422 | This branch |
|---|---|
| `test_run_mapped_over_list_sees_element_identifier` (legacy request) | `test_run_mapped_over_writes_element_identifier` |
| `test_run_mapped_over_list_sees_element_identifier` (`/api/jobs` request) | `test_tool_request_mapped_over_writes_element_identifier` |
| `test_run_mapped_in_workflow_sees_element_identifier` | `test_workflows.py::test_user_defined_tool_step_mapped_over_writes_element_identifier` |
| - | `test_run_mapped_over_converted_input_writes_element_identifier` |
| - | `test_run_plain_dataset_element_identifier_falls_back_to_name` |

</details>

## Context

Related to 🎯 #24411 (job cache ignores `element_identifier` for plain inputs), fixed separately on 🌿[issue_24411_job_cache_identifier_25.1](https://github.com/jmchilton/galaxy/tree/issue_24411_job_cache_identifier_25.1). Alternative kept on 🌿[udt_element_identifier_api_test_alt_original_scope](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test_alt_original_scope) - fix only, without the converted-input carry. Alternative kept on 🌿[udt_element_identifier_api_test_alt_dev](https://github.com/jmchilton/galaxy/tree/udt_element_identifier_api_test_alt_dev) - targets `dev`, keeps `null` for plain datasets. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep the UDT fix and converted-input carry; job-cache guard split out (#24411).</summary>

Two passes. The first re-scoped to cover implicitly converted inputs. The second recommended a job-cache guard; that landed as its own branch for #24411 since the hole also affects XML tools on release branches. The plain-dataset name fallback was chosen as a separate product call.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve; the converted-input carry sits in the one place that sees both HDAs.</summary>

Declined: restructuring identifier flow away from the transient `hda.element_identifier` attribute (pre-existing pattern), routing `/api/tools` UDTs through runtimeify (behavior change for every legacy-path UDT), and a context object for `to_cwl` kwargs.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Helper reuse only; no tests dropped or weakened.</summary>

The workflow test reuses the existing UDT workflow builder (new `tool_representation`/`collection_type` kwargs). The `/api/tools` map-over tests share `_run_mapped_over_list`. Red runs confirmed each fix commit fails at the content assertion on its parent.

</details>

### ✅ Second Frontier Model Review

<details><summary>One finding (job cache crossing plain and mapped runs), reproduced and split into #24411.</summary>

A plain `use_cached_job` run on a dataset could reuse a mapped job's output. Mitigated here by the name fallback; fixed at the cache in #24411.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>No base refactor; every candidate either had no consumer before the fix or was itself the fix.</summary>

</details>

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Same as before: the command line gets the dataset name instead of the element identifier, with no error.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? N/A - API tests check per-element output contents.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? UDT steps mapped over a list now get each element identifier instead of `null`; UDT steps fed a plain dataset get its name; `when`/`valueFrom` expressions gain `element_identifier` on collection-element Files.
- [x] Who hits this in practice and what is the evidence? Anyone mapping a UDT over a list from the tool form or API (#24410); red-to-green tests on `/api/tools`, `/api/jobs` and the converted-input path.
- [x] Were simpler or existing approaches considered? Yes - changing job tool state to `{"src": "dce"}` was more invasive; this reuses the `|__identifier__` params Cheetah already reads.

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).
  - `test_unprivileged_tools.py`: `test_run_mapped_over_writes_element_identifier` (`/api/tools`), `test_tool_request_mapped_over_writes_element_identifier` (`/api/jobs`), `test_run_mapped_over_converted_input_writes_element_identifier` (`csv` → `tabular`) - red on `release_26.1` with `null` per element. `test_run_plain_dataset_element_identifier_falls_back_to_name` - baseline `null`, flipped by the last commit.
  - `test_workflows.py::test_user_defined_tool_step_mapped_over_writes_element_identifier`: workflow map-over - red on `release_26.1` with `null` per element.

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
