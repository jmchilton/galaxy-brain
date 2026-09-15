# Persisted mapping lineage for workflow recovery

**Status:** design exploration; not yet implemented  
**Scope:** recovery of mapped tool and subworkflow steps across workflow scheduling iterations  
**Related work:** `projects/cwl/SUBWORKFLOW_MAPPING_EXTRACTION_PLAN.md`, Galaxy issue #23426

## Decision summary

The mapped-subworkflow implementation should not rediscover the mapping semantics of every already-scheduled step on every scheduler pass. Use demand-driven recovery to avoid computing mapping state that cannot be consumed, and persist the small semantic result that nested recovery cannot cheaply reproduce—ordered output-to-axis lineage—when a step is scheduled. Recover that lineage alongside the step's persisted outputs.

This is deliberately not a proposal to serialize `MatchingCollections`, collection trees, input bindings, or executable scheduler state. Those objects are transient and contain more information than downstream steps need. The durable record should say only which logical mapping axes an output carries and how those axes are embedded in the output's collection path.

The initial implementation should also include two cheap guards:

1. top-level recovered steps return after loading outputs when there is no inherited subworkflow mapping context;
2. recovered subworkflow steps use their persisted boundary-output lineage instead of recursively running the child workflow's `remaining_steps()`.

For invocations created before the metadata exists, retain the current reconstruction path as a compatibility fallback. New invocations should never need that fallback.

Axis identity and its checkpoint are intentionally database-local. Use the owning `WorkflowInvocation.id` plus the canonically ordered source `WorkflowStep.id`/output-name pairs. Do not export this checkpoint and do not add import-time ID remapping. It exists to resume scheduling of an invocation against the exact workflow revision and database rows that created it.

## Why this is needed

Galaxy rebuilds a `WorkflowProgress` object each time a delayed invocation is scheduled. In `WorkflowProgress.remaining_steps()` it:

1. restores persisted outputs for every scheduled step;
2. walks scheduled steps in dependency order; and
3. calls each module's `recover_mapping()` to reconstruct transient mapping state.

On `origin/dev`, the base `recover_mapping()` only reloads the output dataset and collection associations. The `subworkflow_mapping` branch adds semantic state that later steps need—`WorkflowProgress.output_mapping_axes`—but currently reconstructs it by replaying collection matching:

- base `WorkflowModule.recover_mapping()` calls `compute_collection_info()`;
- `compute_collection_info()` finds connected collections and calls `match_collections()`;
- collection matching constructs `Tree` structures by walking collection elements;
- `SubWorkflowModule.recover_mapping()` additionally constructs a child invoker and calls the child's `progress.remaining_steps()` to rediscover the axes of child outputs.

This changes recovery from loading already-persisted results into repeated semantic execution. If there are `S` scheduled steps and their relevant collections contain `E` elements, a scheduling pass can add work proportional to `S × E`. Nested subworkflows multiply the traversal because the parent recursively recovers the child tree. A low `maximum_workflow_jobs_per_scheduling_iteration` makes this particularly visible: many scheduler passes are expected, and each pass repeats the work for the growing scheduled prefix.

Some reconstruction already exists in Galaxy—module injection, runtime-state decoding, and output-association loading—but the full collection matching and nested `remaining_steps()` calls are new costs introduced by output-axis propagation.

## Separate lineage from executable mapping state

The current implementation uses `MatchingCollectionAxis` for two different purposes:

- **execution:** it owns a collection `Tree`, enumerates coordinates, participates in bindings, and carries conditions;
- **lineage:** its stable identity and component spans tell downstream steps which prefixes their inputs already inherit.

Only the second role must cross a scheduling boundary.

Persisting the entire execution object would be fragile and expensive. Its collection objects, tree nodes, bindings, and condition values are either already persisted elsewhere or can only be valid in the current execution context. Persisting just lineage makes the database record small and gives it a narrow correctness contract.

Conceptually, introduce immutable values such as:

```python
@dataclass(frozen=True)
class MappingAxisReference:
    axis_id: MappingAxisId
    rank: int
    collection_type: str | None
    components: tuple[MappingAxisComponent, ...]


@dataclass(frozen=True)
class MappingAxisComponent:
    axis_id: MappingAxisId
    path_start: int
    path_stop: int
```

Fresh execution can continue to use `MatchingCollectionAxis`. Recovery should initially produce axis references. When a downstream step actually needs an executable axis, recovery can reuse the matching inherited-context axis or hydrate the relevant leading prefix of the recovered output collection. This avoids constructing trees merely to repopulate lineage for outputs that may never be consumed by a remaining step.

### Hydration feasibility result

Lightweight lineage is sufficient to recreate the transient `MatchingCollectionAxis` values used by current recovery consumers. A disposable prototype exercised five representative cases, and inspection found only two semantic consumers of recovered axes: `_source_mapping_axes()` and `_extract_inherited_axis_bindings()`. Other uses store or forward the values.

The result depends on one invariant:

> Every recovered output that carries mapping axes is a collection whose leading collection-path ranks materialize those axes, in outer-to-inner order.

Current producers uphold this invariant:

- mapped tool outputs prepend the mapping structure to the declared tool-output structure;
- mapped `pickValue` outputs are built from `collection_info.structure`;
- subworkflow pass-through outputs are shaped from the subworkflow boundary's `collection_info.structure`.

Recovery can therefore keep decoded lineage lightweight until `_source_mapping_axes()` asks for an executable axis. At that point it should:

1. Reuse an actual inherited-context axis when its identity, type, and rank match the reference.
2. Otherwise load the recovered output HDCA and inspect only its leading mapping prefix.
3. Partition that prefix at the cumulative ranks recorded by the ordered axis descriptors.
4. Validate repeated suffix shapes and collection identifiers with the same rules used by current structure refinement.
5. Recreate transient `MatchingCollectionAxis` objects with the persisted identities and component spans, caching them per output for the current recovery pass.

The prototype covered rectangular independent axes with a non-mapping output suffix, ragged/refined structure, outputs carrying different axis subsets, empty outer axes with typed unknown inner structure, and inherited-axis reuse. Empty outer axes do not require invented coordinates: later axes can use a typed `UninitializedTree`, and `slice_collections()` already short-circuits the empty traversal. Refinement remains one axis with component spans, so the whole refined prefix is hydrated together. Conditions remain part of the current `subworkflow_collection_info`; they are not output-lineage metadata.

Axis IDs must have an explicit, versioned JSON representation. Do not rely on arbitrary Python tuples or `repr()`. The branch currently combines an invocation UUID with source workflow database step IDs/output names. For persisted recovery state, use the database-enforced invocation primary key instead: the owning `WorkflowInvocation.id` scopes the axis to one workflow-call occurrence, and the canonical set of source `WorkflowStep.id`/output-name pairs identifies the linked source group. Prefix identities should wrap the parent identity and prefix rank explicitly; refinements preserve the primary identity and record component spans separately.

This deliberately does not use `WorkflowStep.uuid`. Galaxy accepts step UUIDs as public workflow-input and parameter addressing keys and validates uniqueness during normal workflow import/update, but the model column is nullable and has no database uniqueness constraint. Direct model construction and legacy rows are not covered by the API validator. Making scheduler correctness depend on that field would silently strengthen its architectural contract. `WorkflowInvocation.id` and `WorkflowStep.id` already have the database invariants this internal checkpoint needs.

## Proposed persisted payload

Add a nullable JSON field to `WorkflowInvocationStep`, provisionally named `mapping_metadata`. It belongs to the invocation step because:

- the metadata describes the result of scheduling that particular step;
- the existing output associations are also owned by the invocation step;
- a subworkflow step needs one record covering all of its boundary outputs;
- it must not be attached to an HDCA, which may be shared or copied independently of this invocation's mapping semantics.

Example:

```json
{
  "version": 1,
  "outputs": {
    "aligned_reads": {
      "axes": [
        {
          "id": {
            "kind": "workflow_map",
            "invocation_id": 83,
            "sources": [
              {"workflow_step_id": 107, "output_name": "output"}
            ]
          },
          "rank": 1,
          "collection_type": "list",
          "components": [
            {
              "id": {
                "kind": "workflow_map",
                "invocation_id": 83,
                "sources": [
                  {"workflow_step_id": 107, "output_name": "output"}
                ]
              },
              "path_start": 0,
              "path_stop": 1
            }
          ]
        }
      ]
    },
    "summary": {"axes": []}
  }
}
```

The source list must have a canonical order so the same linked group produces byte-for-byte equivalent identity data on every scheduling pass. The referenced invocation and workflow-step rows already exist before scheduling begins and remain fixed for the invocation's lifetime; no identity row is created during recovery.

An output with no axes should be recorded explicitly. That distinguishes "known to be unmapped" from "metadata absent because this is a legacy invocation."

Do not store:

- element coordinate lists or serialized `Tree` objects;
- HDCA/HDA objects or database-session state;
- input bindings, which are local to a future consumer;
- `when` values already embodied in the scheduled outputs and child invocation;
- a copy of output collection contents.

No current execution path examined by the feasibility work required condition state, coordinates, bindings, or serialized trees in the checkpoint. Production hydration must still validate the leading-prefix invariant. Absent, malformed, unsupported, or invariant-violating metadata should take the explicit compatibility fallback rather than silently manufacturing different mapping semantics.

## Write path

`WorkflowProgress.set_step_outputs()` is the common point where outputs and `output_mapping_axes` are known. The persistence boundary should be explicit rather than hidden in generic object serialization:

1. Normalize each output's axes to `MappingAxisReference` values.
2. Serialize all output entries into the versioned payload.
3. Assign the payload before the invocation step becomes `scheduled` and in the same SQLAlchemy transaction as its output associations/state transition.
4. Ensure subworkflow pass-through outputs are shaped only after all child outputs are available; persist their lineage only after that successful, one-time materialization.

The same helper must handle tools, collection operations, `pickValue`, and subworkflow outputs so recovery is module-independent wherever possible.

## Recovery path

Recovery becomes:

```text
load persisted output associations
             |
             v
mapping_metadata present? -- yes --> decode and register output lineage
             |
             no
             v
legacy invocation needs lineage? -- no --> stop
             |
             yes
             v
current graph-based reconstruction fallback
```

More concretely:

1. `recover_outputs()` continues to populate `WorkflowProgress.outputs` from invocation-step output associations.
2. A generic metadata decoder registers output axis references without calling `compute_collection_info()`.
3. `_source_mapping_axes()` hydrates an output's references only when a remaining consumer requests them, using the output collection's leading mapping prefix and caching the result for that recovery pass.
4. When `progress.subworkflow_collection_info is None`, base recovery can return after restoring outputs. The inherited-binding path is inactive in that context, so rebuilding output-axis lineage cannot affect downstream matching. Keep this guard explicit and cover it with tests rather than growing a broad heuristic.
5. For a legacy mapped step, use the current graph-based `recover_mapping()` behavior.
6. For a new subworkflow invocation, recover the boundary output lineage directly. Do not create a child invoker or call child `remaining_steps()`.

Mapping metadata does not need to encode association-less output values. `WorkflowProgress._record_workflow_output()` already persists scalar values and the serialized `NoReplacement` sentinel as child `WorkflowInvocationOutputValue` rows. Subworkflow recovery should read the child invocation's `output_values` alongside its dataset and collection outputs. This both avoids recursive child recovery and preserves skipped or scalar boundary outputs that have no parent invocation-step output association.

The fallback should be observable with a debug log or metric. If it is safe to update the invocation step during scheduler recovery, opportunistically checkpoint the reconstructed lineage so a legacy row pays the cost once instead of once per later pass. That lets us confirm fallback use disappears for newly created invocations and eventually decide whether old-invocation support can be removed.

## Compatibility and failure policy

Rolling upgrades mean an invocation can start on old code and resume on new code. Therefore:

- `NULL` metadata means legacy, not unmapped;
- unknown schema versions must not be silently interpreted;
- absent metadata may use reconstruction during the compatibility window;
- malformed metadata should fail clearly or deliberately fall back with a warning, according to Galaxy's existing policy for corrupt persisted invocation state;
- metadata written by new code must remain readable across routine worker restarts and scheduler-process changes.

The checkpoint is not part of Galaxy's invocation interchange format:

- model-store export must omit it;
- model-store import must not attempt to remap its database identifiers;
- an invocation imported into another database receives no usable checkpoint;
- current model-store behavior does not resume ordinary active `new`/`ready` invocations after import, so this does not remove an existing capability;
- if resumable cross-database invocation migration is designed later, it should define its own execution-identity contract rather than retroactively making this cache portable.

There is no useful backfill migration: reconstructing every historical invocation during schema migration would create exactly the load this proposal avoids. The database migration should only add the nullable JSON field.

## Why not reuse an existing field?

`WorkflowInvocationStep.action` is persisted JSON, but it represents user actions for interactive workflow modules. Overloading it would couple unrelated contracts and make export/import behavior ambiguous.

Workflow step runtime state describes the workflow definition's configured module inputs. It is computed before execution and is not the result metadata of one invocation step. Adding recovered output lineage there would mix definition/configuration state with invocation results.

Output association rows could each receive an axis JSON field, but Galaxy has separate dataset and dataset-collection association tables, and parameter or `NoReplacement` outputs do not necessarily have such a row. A step-level output-name map provides one consistent record and one read.

A dedicated `mapping_metadata` column is somewhat specialized. A more Galaxy-shaped generalization would be a nullable, versioned `execution_metadata` JSON object on `WorkflowInvocationStep`, with a `mapping` namespace. That should only be chosen if there is a credible second consumer; inventing a generic abstraction without one makes the contract less clear, not more reusable.

## Alternatives considered

### Early return and demand-driven graph recovery

Do not reconstruct axes for every scheduled step up front. The base recovery path can immediately return at the top level, where there is no inherited subworkflow mapping context. Within a mapped child, resolve the lineage of an upstream output only when `_source_mapping_axes()` asks for it.

This is the most Galaxy-like first optimization: it keeps persisted state unchanged and makes recovery pay only for facts a remaining step requests. It should be implemented even if lineage is persisted. It is not a complete permanent answer by itself. With throttled scheduling, a nested workflow can still request and reconstruct a growing dependency chain on every pass, and a subworkflow boundary still needs to rediscover which axes each child output actually carries.

### Per-pass collection-tree or mapping memoization

Cache structures by collection ID and effective subcollection type inside `WorkflowProgress`. This can reduce duplicate walks during one scheduler pass. It does nothing across the next pass, a scheduler-process change, or restart, and caching still-populating collections risks stale structures. It is a possible local companion optimization, not a recovery contract.

### Pure symbolic reconstruction from workflow topology

Compile axis lineage from connections, declared collection types, and step configuration without inspecting collection elements. This avoids a database migration, but it creates a second implementation of dynamic collection matching. It must reproduce `pickValue`, conditionals, linked and unlinked matching, `structured_like`, runtime refinements, empty axes, and subworkflow pass-through semantics. It would still traverse dependency graphs during each recovery. The correctness and maintenance risk outweigh the schema avoidance.

### Portable step paths or UUID identities

Semantic nesting paths could use order indices, labels, or workflow-step UUIDs instead of database IDs. Order indices are positional, labels are optional and editable, and step UUIDs are nullable and not database-unique even though normal workflow import validates them. A full occurrence path also duplicates the scoping already supplied by the child `WorkflowInvocation` row. Portability provides no recovery benefit while invocations remain pinned to one database and workflow revision.

### Remap database identities during invocation import

Import could walk every axis, component, and prefix descriptor and translate invocation and workflow-step IDs to newly created rows. This couples a private scheduler cache to model-store internals and requires a correctness contract for resumable imported invocations that Galaxy does not currently provide. Omitting the cache and retaining legacy reconstruction is simpler and safer.

### Reuse existing JSON storage

`WorkflowInvocationStep.action` and workflow request step state already store JSON, but neither has the right ownership. The first is a user action; the second is pre-execution module configuration. Hiding result lineage in either field would be less consistent with Galaxy's model boundaries than adding an explicit result checkpoint.

### Store lineage on collections or output associations

Axis identity is invocation- and edge-specific, not intrinsic HDCA metadata. Dataset and collection outputs also use different association tables, while parameter, skipped, or `NoReplacement` outputs may not have an association row. This scatters one step result across incompatible storage paths.

### Normalize axes into relational tables

An invocation-axis table plus an output-to-axis association table would look relational and deduplicate repeated axis descriptors. It also introduces multiple tables, ordering rows, cascade and import/export behavior, and awkward handling of refinements that preserve an identity while changing component spans. The expected payload is too small to justify that machinery initially.

### One child invocation per coordinate

Making each mapping coordinate a separate child invocation would externalize the coordinates in existing invocation relationships. It abandons the agreed one-child-invocation model, greatly increases database rows and scheduling overhead, and changes user-visible invocation semantics. It is not a performance solution for this design.

## Why the checkpoint fits Galaxy recovery

Galaxy already persists the facts required to resume an invocation: invocation-step state and job grouping, output associations, workflow inputs, and encoded runtime state. `WorkflowProgress` is disposable and is reconstructed from those durable records.

Mapped-subworkflow axis lineage is now another resume-critical result. Collection shape alone cannot distinguish two independent axes with equal structure or prove that an output retained only a subset of inherited axes. Re-executing nested scheduling logic to rediscover that result is less consistent with the existing boundary than checkpointing it on the invocation step that produced it.

The Galaxy-shaped constraint is therefore not "never persist derived state." It is: persist a small, versioned scheduling result with clear ownership; keep collections and output associations as the data source of truth; lazily rebuild transient execution objects; and retain a compatibility path for invocations that predate the result field.

## Correctness invariants

Persisted recovery must produce the same semantic lineage as uninterrupted execution:

- axis identity is stable across scheduler processes and restarts;
- outer-to-inner axis order is preserved;
- the ordered axis ranks exactly describe a recovered collection's leading mapping prefix;
- unrelated axes with the same type and cardinality remain distinct;
- linked inputs share an identity only when collection matching linked them;
- a matching inherited-context axis is reused rather than reconstructed as a distinct executable axis;
- refined axes preserve component path spans;
- each subworkflow boundary output records its actual axes, including outputs that carry only a subset;
- explicit empty axes are distinguishable from missing legacy metadata;
- invalid lineage metadata is rejected or sent through the compatibility fallback;
- pass-through outputs are not re-materialized during recovery;
- scalar and `NoReplacement` outputs are restored from child invocation output values without recursive child recovery.

## Tests and measurements

### Unit tests

- round-trip every supported axis ID and component descriptor through JSON;
- distinguish `NULL`, explicit empty output axes, and a missing output entry;
- reject or route an unknown payload version;
- hydrate rectangular axes while excluding the declared output-collection suffix;
- hydrate ragged/refined axes, empty outer axes, and outputs carrying different subsets;
- reuse a matching inherited-context axis and reject an inconsistent leading prefix;
- recover multiple outputs carrying different axis subsets;
- recover `NoReplacement` and scalar output values from the child invocation without assuming an output association row.

### Scheduler and integration tests

- force `maximum_workflow_jobs_per_scheduling_iteration=1` and assert mapped subworkflow results across many rounds;
- restart or reconstruct the scheduler between rounds and assert identical axis identity/order;
- cover nested mapped subworkflows without recursively invoking child `remaining_steps()` on the metadata path;
- cover legacy `NULL` metadata and prove the fallback still produces correct results;
- cover an ordinary top-level workflow and prove recovery does not call collection matching;
- preserve resume-from-failure behavior within the originating database;
- prove model-store invocation export omits the database-local checkpoint.

### Performance assertions

Avoid timing-only tests. Instrument or mock the structural boundaries and assert that, after the first scheduling round:

- `match_collections()` is not called for already-scheduled steps with metadata;
- `Tree.for_dataset_collection()` is not called merely to register every scheduled output's lineage;
- hydration walks only an output requested by a remaining consumer, only once per pass, and separates the leading mapping prefix from any declared output suffix;
- a recovered subworkflow step does not call its child `remaining_steps()`;
- work per pass is driven by remaining schedulable steps, not the entire recursively scheduled prefix.

A benchmark should vary collection cardinality, scheduled-prefix length, nesting depth, and scheduling job limit. Record database bytes/read time for the JSON payload as well as scheduler CPU time so an oversized persistence format cannot appear to be a win merely by moving cost into the database.

### Feasibility evidence

A disposable hydration prototype passed five structural cases: rectangular axes plus a tool-output suffix, ragged/refined axes, per-output axis subsets, empty outer axes, and inherited-axis reuse. The focused existing unit selection also passed 28 tests covering collection matching and workflow mapping behavior. This evidence is enough to proceed with the narrow schema, but the production helper and scheduler integration still require the invariant, fallback, and restart tests above.

## Incremental implementation plan

1. Add counters or test seams around recovery matching and nested recovery; establish the branch's current call counts.
2. Add the explicit top-level early return and demand-driven resolution, then measure the remaining nested cost.
3. Turn the proven hydration sketch into a production helper with leading-prefix validation, inherited-axis reuse, and per-pass caching.
4. Persist per-output lineage on newly scheduled steps.
5. Decode persisted lineage in generic recovery.
6. Switch subworkflow recovery to its boundary metadata and child invocation `output_values`, and remove recursive child recovery from the normal path.
7. Retain and test the legacy fallback; checkpoint fallback results if scheduler write semantics make that safe.
8. Benchmark before/after with throttled and nested workflows.
9. Reconsider the storage field name and fallback lifetime during review; do not generalize the schema speculatively.

## Open design questions

1. Should the column be narrowly named `mapping_metadata`, or is there a demonstrated need for a versioned `execution_metadata` container?
2. Is opportunistically writing reconstructed legacy metadata safe in every scheduler/recovery transaction?
3. How long must fallback recovery remain after release and rolling-upgrade windows?

## Recommendation

Implement the top-level fast path and demand-driven recovery first, because they are low-risk and remove unnecessary work whether or not a schema change follows. For the remaining nested case, proceed with the narrow persisted-lineage checkpoint if profiling confirms the expected repeated tree walks. It preserves Galaxy's existing durable sources of truth—invocation steps and output associations—while persisting only the new semantic fact that cannot reliably be inferred from an output collection's shape: axis provenance.

The feasibility question is resolved: lightweight references can replace recovered `MatchingCollectionAxis` objects at the persistence boundary, provided hydration validates that their ordered ranks match the output collection's leading mapping prefix. There is no need to persist trees, coordinates, conditions, or bindings. Restore scalar and `NoReplacement` boundary results from existing child invocation output values rather than adding them to mapping metadata.

Keep the identity database-local: use `WorkflowInvocation.id` and source `WorkflowStep.id`/output-name pairs, persist them only for same-database scheduler recovery, and omit them from model-store export. This matches the scope of the problem and avoids creating stronger UUID or portable-invocation contracts as a side effect of a performance fix.

No state-free alternative found here both avoids recursive child recovery and preserves dynamic mapping semantics across scheduler processes and restarts. A process-local cache can complement the design, but cannot be its correctness mechanism.
