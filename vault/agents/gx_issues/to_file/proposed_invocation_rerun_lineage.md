# RFC: Record which invocation a workflow rerun came from

When a user clicks **Rerun** on a workflow invocation, Galaxy does not record which invocation the new one was rerun from.

Take three runs of a workflow, each made by clicking **Rerun** on the previous one and changing a parameter (I → J → K). The "With lineage" column is illustrative:

| Where | Today | With lineage |
| --- | --- | --- |
| Invocations list | Three unrelated rows with the columns Workflow, History, Invoked and State | The same rows; J and K can be shown as reruns and grouped with I |
| Invocation K | Shows nothing about J or I | "Rerun of invocation J", linking back; J links to I |
| Invocation I | Shows nothing about later runs | A "newer rerun exists" hint, computed from the lineage when the view is drawn and never stored on I |
| API (`GET /api/invocations/{id}`) | No field for a source invocation. A parameter sweep script has to track the links itself | The invoke request names the source invocation, and the invocation returns that link |

Since 🔀 #20032, users can iterate on an analysis by rerunning: they reopen the run form prefilled from an earlier invocation, change something, and submit, and the job cache can skip the steps that didn't change. After a few rounds, the only way to tell which run came from which is timestamps and memory. The link is known at the moment of the click, because the rerun page opens as `/workflows/rerun?invocation_id=I`. It is just never sent to the server.

<details><summary>Where the link is dropped (dev <a href="https://github.com/galaxyproject/galaxy/commit/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac"><code>36fe2ce8428</code></a>)</summary>

- Both rerun entry points route to `/workflows/rerun?invocation_id=…`: the **Rerun** button in [`WorkflowNavigationTitle.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/WorkflowNavigationTitle.vue) and the **Rerun** column of the invocations grid ([`invocations.ts`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Grid/configs/invocations.ts)).
- [`WorkflowRerun.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/Run/WorkflowRerun.vue) loads `GET /api/invocations/{id}/request`. It mounts `WorkflowRun` with the workflow id, the inputs and the job cache preference, but not the invocation id.
- `onExecute` in [`WorkflowRunFormSimple.vue`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/client/src/components/Workflow/Run/WorkflowRunFormSimple.vue) sends inputs, `use_cached_job`, `on_complete`, `landing_uuid` and the object store preferences. [`InvokeWorkflowPayload`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/schema/workflows.py) has no field for a source invocation.
- `WorkflowInvocation` has no reference to another top-level invocation. Its subworkflow association links a parent and child within one run. A job's `copied_from_job_id` records job cache reuse, and `rerun_remap_job_id` is the tool form's remap of failed outputs. Neither one records where an invocation came from.
- The closest precedent is 🔀 #20960. It records which workflow landing request an invocation came from: `landing_uuid` on the invoke payload is stored in an association table and returned as `landing_uuid` on the invocation.

</details>

## Context

A follow-up to 🔀 #20032 (fixing 🎯 #11340). That PR rebuilds a rerun's request from an earlier invocation but doesn't keep a link to it. Related to 🎯 #18696, which asks for a smoother "fix a step and rerun with cached jobs" flow, and 🎯 #10039, which asks to see a step's outputs across earlier invocations; both would show more useful history if related runs could be grouped. Editing one step's parameters from the read-only step form in the invocation graph (🔀 #22144) and rerunning would need the same link. This is an RFC because it touches the data model, and reviewers may prefer a different storage shape.

## Proposed Approach

Add an optional `rerun_of_invocation_id` to the invoke payload. The server checks that the caller can access that invocation and stores its id as another named meta parameter on `WorkflowRequestInputParameter`, alongside `use_cached_job`, `copy_inputs_to_history`, `effective_outputs` and the preferred object stores, so no migration is needed. The invocation view returns the link next to `landing_uuid`, and the client's rerun page sends the id it was opened with.

<details><summary>Approach details</summary>

- **Persist.** Carry the field through `WorkflowRunConfig` to `workflow_run_config_to_request` in [`run_request.py`](https://github.com/galaxyproject/galaxy/blob/36fe2ce8428611a56625aa9eb0a9de5a8c3ad9ac/lib/galaxy/workflow/run_request.py) and save it with `add_parameter(..., META_PARAMETERS)`. A batch request gives every invocation it creates the same source.
- **Validate.** Load the source with `WorkflowsManager.get_invocation` in `managers/workflows.py`, which raises `ObjectNotFound` for a missing id and applies the usual invocation access check. (The landing precedent, `_create_landing_request_association`, only checks that the landing request exists.) Unknown meta parameter names are already ignored when the scheduler rebuilds the run config, so the new row doesn't affect scheduling.
- **Expose on the invocation, not on the request export.** `GET /api/invocations/{id}/request` is the template for the next run: the rerun page prefills from it, and a script can post it back as an invoke payload. If J's export carried `rerun_of = I`, a script that posts J's export back to create K would wrongly label K as a rerun of I. The export serializer only copies meta parameters it names, so it already leaves the new one out. Add the encoded id to the invocation view next to `landing_uuid` instead, and return null when the viewer can't access the source.
- **Model store import.** Import copies `input_parameters` name, value and type verbatim (`model/store/__init__.py`), so a copied database id would point at whatever invocation has that id on the importing Galaxy. Import should drop the parameter, or remap it when the source invocation is in the same archive. Storing the invocation uuid instead doesn't help, for two reasons: import does not restore invocation uuids, and `workflow_invocation.uuid` is not indexed.
- **Client.** The rerun page passes its `invocation_id` through `WorkflowRun` into the submit payload. This has to cover both `WorkflowRunFormSimple` and the full `WorkflowRunForm`, which some workflows are forced onto; otherwise those reruns silently lose the link.
- **Tests.** API tests: invoke with the field and check that it appears on the invocation view and not in the request export; an inaccessible source is rejected; a batch invoke links every invocation; a model store round trip drops or remaps it.

</details>

<details><summary>Open questions</summary>

- **Edited-step marker.** For a per-step rerun, it would help to also store which step was edited (`rerun_step_index`), so the banner could read "Rerun of invocation I with step 5 edited". It is optional and the client asserts it, so it could be wrong. It can also be derived by diffing the two request exports. Its order index only means something for the new invocation's workflow version, which need not be the source's (🎯 #20223 was a bug where a rerun silently used a different version). Should it be stored, or derived?
- **Lineage across export and import.** Should lineage survive history or invocation export and import at all, or is dropping it acceptable?

</details>

## Alternative Approaches

The main alternative is a nullable, indexed foreign key from `workflow_invocation` to the invocation it was rerun from. It costs a migration, which 🔀 #20960 shows maintainers will accept for a similar "where did this invocation come from" link. In return it gives indexed lookups in both directions and handles deletes and imports in one place. The meta parameter avoids a migration, but finding the reruns of I means filtering an unindexed `TEXT` value, and showing the link in the invocations list means loading each row's request parameters. Do reviewers prefer the migration-free meta parameter, or the column? A client-only `?rerun_of=` query parameter costs nothing on the server, but it is lost on reload and invisible to the API.

<details><summary>Alternatives in detail</summary>

### Foreign key column on `workflow_invocation`

<details><summary>Description</summary>

Add a nullable `rerun_of_invocation_id` column with an index and `ondelete="SET NULL"`, plus a relationship. Model store import would leave it null, or remap it explicitly when the source is in the archive.

#### Why the proposed approach is preferred

It adds no schema change, and the field sits with the other per-request settings. If reviewers expect queries such as "all reruns of I" or "newest run in this lineage" to be common, this column is the better shape, and the API field can stay the same either way.

</details>

### Association table, like landing requests

<details><summary>Description</summary>

Follow 🔀 #20960 exactly: a `workflow_invocation_rerun_association` table linking an invocation to its source.

#### Why the proposed approach is preferred

An invocation has at most one source, so a nullable column is simpler than an association table. The association table pattern makes most sense when the far side is a different entity, such as a landing request.

</details>

### Client-only query parameter

<details><summary>Description</summary>

Keep `?rerun_of=I` in the URL of the new invocation's page and render the banner from it.

#### Why the proposed approach is preferred

The link is lost on reload, in the invocations list, and in the API, so scripted parameter sweeps get nothing.

</details>

</details>
