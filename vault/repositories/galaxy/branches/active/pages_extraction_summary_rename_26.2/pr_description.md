Follow-up to 🔀 #22860 - align the notebook extraction API names that are new in 26.2 with existing Galaxy conventions before 26.2.0 freezes them.

***Every name changed here first appears in 26.2, so renaming now costs nothing; after 26.2.0 each one becomes a breaking API change.***

#22860 added notebook (page) driven workflow extraction. Three of its wire names are outliers next to the API around them:

| New in 26.2 | Existing convention | After this PR |
|---|---|---|
| `GET /api/pages/{id}/workflow_extraction_summary` | `GET /api/histories/{history_id}/extraction_summary` (26.1) | `GET /api/pages/{id}/extraction_summary` |
| `OutputLabelHint.kind` (`hda`/`hdca`), `StepLabelHint.kind` (`job`/`implicit_collection_jobs`) | `(src, id)` references: `EncodedDataItemSourceId`, `InvocationInput`, `ToolRequestJobReference` | `src` |
| `WorkflowExtractionByIdsPayload.report_title` | — | removed |

No `kind: Literal` field exists anywhere else in `lib/galaxy/schema`. `src` already names a job in `ToolRequestJobReference` (`src: "job"`); `implicit_collection_jobs` has no exact precedent but is a context-local value, like `"tool_request"` in `history_graph.NodeRef`.

***No compatibility aliases: no release has ever served the old names.***

`report_title` was read by the server (`payload.report_title or payload.workflow_name`) but the client never sends it, so the report title is always the workflow name. Dropping it removes an untested, unused knob before an API client can depend on it. ***This is a naming-only change: extraction behavior, the history extraction route and every value vocabulary stay the same.***

<details><summary>Changes</summary>

- `api/pages.py`: route and handler renamed to `extraction_summary`; `client/src/api/pages.ts` follows.
- `schema/workflows.py`: `kind` → `src` on both label hints (title `Source`, as in `EncodedDataItemSourceId` `schema/schema.py:2617` and `InvocationInput` `schema/invocation.py:521`); `report_title` removed.
- `services/workflows.py`, `workflow/extract.py`: read `src` (locals in `extract_steps_by_ids` renamed to match); `_build_report_config` takes `title: str`, since the title is always the workflow name now.
- `WorkflowExtractionForm.vue`: sends `src`.
- Regenerated `schema.ts`; API and client tests re-keyed.
- Internal names (`OutputLabelKind`, `kind` helper params in `extract.py`, `fetchWorkflowExtractionSummary`) are not wire names and are left alone.

</details>

## Risks

This is a one-way door, but only in the cheap direction: it changes API names that have not shipped in any release, and must merge before 26.2.0 to stay that way.

<details><summary>Risk Details</summary>

- Any external client written against 26.2 pre-release builds using `workflow_extraction_summary`, `kind` or `report_title` will break. None are known; the only consumer is Galaxy's own client, updated here.
- If this misses 26.2.0, the old names ship and renaming later needs deprecation aliases.
- No behavior change; no compatibility aliases are added.

</details>

<details><summary>Risk Review Advice</summary>

Check that the new names are the right ones to freeze: `src` for label hints (including the non-data value `implicit_collection_jobs`) and dropping `report_title` rather than wiring it into the client.

</details>

## Context

Split out of 🔀 #24225, which carries the same route rename, so this can land on `release_26.2` independently. Alternative kept on 🌿[`pages_extraction_summary_rename_26.2_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/pages_extraction_summary_rename_26.2_alt_original_scope) - just the route rename and `report_title` drop, without `kind` → `src`. Developed with [John's Galaxy Brain Branch Factory](https://galaxy-brain.jmchilton.net/factory/galaxy-branches/).

## Human Review

(PUBLISHING_AGENT: Please include the contents of BRANCH_DIRECTORY/human_review.md before publishing this. If that file doesn't exist please double check that this PR should be published - if user confirms yes publish without this section.)

## Agentic Checks

### ✅ [John's Checklist](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/gx_pr_checklists/GENERAL.md)

<details><summary>All 9 items pass; no existing workflow changes behavior.</summary>

- [x] What does the user see when it fails? Nothing new in the UI; error text only swaps `kind` for `src` (`services/workflows.py:504,510,533,540`, `workflow/extract.py:1032`). Pre-rename API callers get 404 on the old route and 422 for missing `src`; a stale `report_title` is silently ignored (base `Model` doesn't forbid extras). All names are new in 26.2, so no released client is affected.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. API tests exercise the renamed route and fields end to end (`test_pages_history_attached.py:423,708,720`; `test_workflow_extraction.py:1484-1936`); the client test checks the payload the form sends (`WorkflowExtractionForm.test.ts:385,635,648`).
- [x] Are baseline tests in their own leading commits (if applicable)? N/A, pure rename; existing tests were updated in the same commits.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
- [x] Which existing workflows change behavior (if any)? None. Extraction output is unchanged; the report title was already `report_title or workflow_name` and the client never sent `report_title` (`services/workflows.py:434`).
- [x] Who hits this in practice and what is the evidence? API clients of the new 26.2 extraction endpoints. Without this, 26.2.0 would freeze `/workflow_extraction_summary` beside histories' `/extraction_summary` (`api/histories.py:865`) and a `kind` field against the Galaxy `(src, id)` convention (`schema/workflows.py:364,377`).
- [x] Were simpler or existing approaches considered? If yes, describe which and why they weren't pursued. If no, why not? Yes (`scope_evaluation.md`). Shipping only the route rename would freeze `kind`. Renaming the internal `OutputLabelKind`/`kind` params isn't needed before the freeze and would add conflicts with `extract_next_followups`. Reusing an existing `src` value set has no precedent for `implicit_collection_jobs`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/pages_extraction_summary_rename_26.2/pr_checklist/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>Keep as implemented: after this branch every extraction wire name new in 26.2 follows house conventions.</summary>

- Audited every extraction-related path and schema component added between `release_26.1` and this branch; only the three names here were outliers.
- Others (`from_page_id`, `output_labels`, `step_labels`, `report_warnings`, `seeded`, `seed_warning`, `exposed`, `suggested_name`...) are additive and fine.
- Rejected: renaming internal `kind` helpers (no freeze deadline, more conflict with #24225) and reworking the `src` value vocabulary (no precedent to align `implicit_collection_jobs` to).

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/pages_extraction_summary_rename_26.2/scope_evaluation/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Approve; one fix: <code>_build_report_config</code> title narrowed to <code>str</code> now that <code>report_title</code> is gone.</summary>

- Pure rename plus one deleted field; no new branches, no files crossing 1k lines.
- No stale `workflow_extraction_summary` or `report_title` references in `lib/`, `client/src` or the api-client.
- Internal service/client names left as is.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/pages_extraction_summary_rename_26.2/thermo_nuclear_review/). Run via claude-opus-5-5 at medium effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings, including a search for missed consumers of the old names.</summary>

Reviewed the full diff plus `services/pages.py` and `client/src/api/histories.ts`.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/pages_extraction_summary_rename_26.2/codex_review/). Run via gpt-6-sol at medium effort.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>None: every commit is an API change, not a behavior-preserving refactor.</summary>

The route rename commit is kept identical to its twin on #24225 so that branch's rebase drops it.

[Full report](https://galaxy-brain.jmchilton.net/repositories/galaxy/branches/pages_extraction_summary_rename_26.2/baseline_refactor/). Run via claude-opus-5-5 at medium effort.

</details>

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details>

Existing pages extraction API tests, `test_workflow_extraction.py` label tests and `WorkflowExtractionForm.test.ts` are re-keyed to the new names.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
