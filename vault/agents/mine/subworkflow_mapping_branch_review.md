# Branch review: `subworkflow_mapping`

Reviewed 2026-09-21 against `subworkflow_mapping` @ `ab56a164a5b`, worktree
`~/projects/worktrees/galaxy/branch/subworkflow_mapping`. Read-only; nothing modified or pushed.

Produced by a subagent review, then partially re-verified by hand. Provenance of each claim is
marked at the bottom — the branch facts and the `#23521` code paths were re-read directly; the
internal mechanism description is the subagent's reading and was not independently traced.

Not added to `MY_BRANCHES.md`: there is no stated intention to open a PR for this branch, and
`AGENTS.md` says not to infer that from a worktree. Its predecessor
[#23369](https://github.com/galaxyproject/galaxy/pull/23369) (branch `subworkflow_mapping_per_step`)
was closed by John with "Closing this out for a smaller more bug focused PR - I'll keep the doc
stuff as a followup." The smaller follow-up branch `subworkflow_mapping_when_alignment` exists on
the `jmchilton` fork but has **no PR**.

## What it is

Merge-base with `origin/dev` is `7a85f218faf`. 12 commits, 24 files, +4012/-74.

| Commit | Subject | Substance |
|---|---|---|
| `6c452b62d83` | Pin callable subworkflow mapping semantics | Tests only — `terminals.test.ts`, an API test, new framework fixture `subworkflow_mapping_per_step.gxwf.yml`. Red-to-green scaffold. |
| `b19d70786bd` | Model collection mapping as ordered axes | Core rewrite of `matching.py`: `MatchingCollectionAxis`, `MatchingCollectionBinding`, `MatchingCollectionCondition`; `MatchingCollections` gains `mapping_axes`/`bindings`/`conditions`. Adds `Tree.walk_coordinates()` in `structure.py`. |
| `a9e56e07015` | Propagate mapping axes through subworkflows | The big one (+707 in `modules.py`). Inherited-axis extraction and composition; `run.py` passes `inherited_input_axes` into the child `WorkflowProgress`. |
| `148c0bf5993` | Shape mapped subworkflow pass-through outputs | `SubWorkflowModule._shape_passthrough_output` — materializes a mapped-shaped collection for subworkflow outputs wired straight from a subworkflow input step. |
| `67d4d6c6a05` | Document callable subworkflow mapping semantics | `collection_semantics.md` + `.yml`: new "Callable workflow boundaries" section. Best single statement of intent. |
| `cc3610ec4b3` | Assert mapped pass-through source identity | Test-only. |
| `a1c1e7f24a8` | Avoid leaking delayed pass-through collections | Defers materialization until all subworkflow outputs resolve, so a `DelayedWorkflowEvaluation` on a later output does not orphan a history collection per retry. |
| `fef1a23788f` | Fix subworkflow mapping CI validation | Small fixups. |
| `570e185272b` | Allow slow workflow tests to set a timeout | Adds a `timeout` field to the gxwf test model. |
| `5f58c8b457b` | Update generated client API schema | Generated. |
| `855fffe9ea0` | Persist workflow output mapping lineage | New `workflow_invocation_step.output_mapping` JSON column + alembic `8d1f0c7a4b2e`; `MatchingCollectionAxisReference` as the serializable form of an axis. |
| `ab56a164a5b` | Recover workflow mapping from persisted lineage | Splits `recover_mapping` into `recover_outputs` + `recover_mapping` and re-orders scheduler recovery in `run.py`. |

## Mechanism

**On dev.** `MatchingCollections` has one `linked_structure` plus a list of `unlinked_structures`,
and `WorkflowModule.compute_collection_info` ends with `return collection_info or
progress.subworkflow_collection_info`. A step inside a mapped subworkflow therefore either matches
its own collections locally and gets a fresh one-dimensional mapping, or matches nothing and
inherits the **parent's** `MatchingCollections` wholesale. There is no representation for
"inherited axis x local axis" — a child step consuming both a mapped input and an independent
direct collection can only be mapped over one of them.

**On the branch.** Mapping becomes an ordered list of independent **axes**, each with an `axis_id`
that survives a callable boundary, plus per-input **bindings** recording which axes an input
consumes and at what path depth. `when_values` become axis-scoped. Slices are the Cartesian
product across axes in stable outer-to-inner order.

`compute_collection_info` now: runs `_find_collections_to_match` unchanged; extracts inherited
axis bindings by walking each locally-matched input's provenance and popping out any axis that
matches one of `progress.subworkflow_collection_info`'s; mints a stable
`("workflow-map", invocation_id, sorted source tokens)` axis id; matches what remains as the local
axis; composes local onto inherited, deduplicating by `axis_id`; re-attaches inherited bindings.

`run.py` passes `inherited_input_axes` into the child `WorkflowProgress`, records
`output_mapping_axes` per output, persists them as `{"version": 1, "outputs": {...}}`, and rehydrates
them so axis identity survives a scheduler restart. Recovery runs in two phases — all
`recover_outputs` first, then `recover_mapping` in topological order — because axis recovery for a
step depends on its upstream steps' outputs already being in `progress.outputs`.

## Relationship to [#23521](https://github.com/galaxyproject/galaxy/issues/23521)

**The subagent was given a false premise and its bottom line should not be quoted.** It was told the
#23521 subworkflow steps are not mapped over, and concluded on that basis that the branch is inert
for that workflow. Reading bernt-matthias' actual `.ga` afterwards disproved the premise:

- `dada2_filterAndTrim` expands `fastq_input` with `collection_type="paired"`
  (`tools-iuc/tools/dada2/dada2_filterAndTrim.xml:94`), and the workflow feeds it a `list:paired`,
  so the step **maps over the outer list** and its `<data name="outtab">` output becomes an implicit
  **`list` collection**.
- All three subworkflows declare that input as `"type": "data_input"` — a **single dataset**.
- A `list` into a non-multiple subworkflow data input means the subworkflow step **is mapped over**,
  so `progress.subworkflow_collection_info` is **not** `None` for steps inside it.

The other subworkflow inputs are direct matches and do not drive mapping: `Reads fwd`/`Reads rev` are
`data_collection_input` of type `list` receiving a `list`; `Error model fwd`/`rev` are `data_input`
receiving single datasets (`learnErrors` `fls` is `multiple="true"`, so it reduces).

So inside each subworkflow every step runs under an inherited N-axis while also consuming
`Reads fwd`, an **independent** N-element collection — the exact "inherited x local" case dev cannot
represent and this branch exists to model. These are conditional subworkflows (`when: $(inputs.when)`),
so #23369's `when_values` propagation applies too, in its silent variant: equal element counts mean
every element quietly gets the wrong condition rather than raising `IndexError`.

Likely benign here: `outtab` and `forward` are both implicit collections created from the same
upstream `list:paired`, so `is_aligned_with` should find shared provenance and carry the conditions
correctly rather than rejecting the step. Not traced through the code.

**Still does not explain the `[]`, and the gap got sharper on 2026-09-21.** Re-derived from the
code rather than from the earlier hypothesis:

1. `wrap_input` (`evaluation.py:487-503`) sends a `multiple="true"` data param to
   `DatasetListWrapper` and a non-multiple one straight to
   `ElementIdentifierMapper.identifier`, which raises on a list (`wrappers.py:841`). So the crash
   needs a **non-multiple `data` param holding a list**.
2. The only writer of a list into a non-multiple data param is
   `collect_input_dataset_collections` (`actions/__init__.py:424-426`):
   `target_dict[input.name] = []` then `.extend(dataset_instances)`. The message is `[]`, not
   `[<HDA>]`, so `dataset_instances` was **empty** — a **zero-element collection** reached a
   single-dataset parameter.
3. `_collect_input_datasets` then no-ops on it (`for i, v in enumerate(value)` over `[]`), so the
   `[]` survives untouched to `wrap_input`. Consistent.

But every route by which a zero-element collection could get there ends somewhere *other* than
`TypeError`:

- **Matched alone.** `MatchingCollections.for_collections` returns a truthy object for an empty
  collection, `Tree.children` is `[]`, `slice_collections()` yields nothing — **zero jobs**, no
  crash. The step just produces empty outputs that cascade downstream.
- **Matched alongside a non-empty collection.** `compatible_shape`
  (`structure.py:151-152`) compares `len(self.children)`, so 0 vs N raises
  `MessageException("Cannot match collection types.")` — in either sort order, since whichever
  arrives first becomes `linked_structure`.
- **Param absent from `all_inputs`.** `KeyError` at `modules.py:3131`, caught at `:3175` into
  "Error due to input mapping of '...'" — a different message. (This is what killed the earlier
  `__current_case__` theory.)
- **Never matched at all.** This is the inherited-context fall-through
  (`compute_collection_info` returning `progress.subworkflow_collection_info`, whose slice dict is
  keyed by the *parent's* input names, so the child's name misses at `modules.py:3134` and falls
  through to `replacement_for_input` at `:3151`). But it requires `_find_collections_to_match` to
  have found **nothing** locally — and a non-multiple data param holding a collection is added
  **unconditionally** (`modules.py:735-736`, `collections_to_match.add(name, data); continue`),
  before any `subworkflow_structure` logic. Both call sites invoke the *identical*
  `progress.replacement_for_input`, so a collection cannot be invisible at match time and visible
  at execute time.

Not a version artifact: `_find_collections_to_match` has the same unconditional
`add(name, data); continue` for non-multiple data params on `release_26.0`, `release_26.1` and
`dev` (26.0 spells the guard `hasattr(data, "collection")`, same effect).

**The static model is contradictory, and the wrong premise was found on 2026-09-21.** The
resolution is a conditional whose case cannot be resolved: `visit_input_values` stores
`__current_case__ = -1` and skips the subtree, making the param invisible to `get_all_inputs`,
`_find_collections_to_match` *and* the execute-time callback (hence no `KeyError`), while
`wrap_values` still walks it as `cases[-1]`. No collection is involved, so **this branch is not
related to #23521**. Full writeup and fix proposal: [[23521_current_case_theory]].

## Interaction with `issue_23521_empty_collection_single_data_param`

No textual overlap — different merge-bases, disjoint file sets. They rebase and merge in either
order. `subworkflow_mapping` never touches `lib/galaxy/tools/actions/__init__.py`; the guard branch
never touches `workflow/` or `matching.py`.

Two semantic notes:

- The branch's partial-depth slices can hand a `DatasetCollectionElement` **with** a `child_collection`
  to a data param, which is the shape `collect_input_dataset_collections` reduces to a list. If that
  ever lands on a non-multiple param the guard will start raising where dev produced a mangled job.
  Worth a combined framework-workflow run (`subworkflow_mapping_per_step.gxwf.yml`,
  `subworkflow_mapping_nested_passthrough.gxwf.yml`) with the guard applied before either merges.
- **Correction (2026-09-21).** An earlier revision of this note called the guard's loop a hole for
  #23521. It is not. The `raise` at `actions/__init__.py:412` precedes the
  `target_dict[input.name] = []` at `:425`, so the zero-element case **does** fire, with
  `"Dataset collection with 0 element(s) supplied to single dataset parameter '<name>'"`. Since
  that assignment is also the only producer of `[]` for a data param, the guard closes #23521's
  500 outright. The loop only skips a value that is *already* `[]` on entry, and no path was found
  that produces that for a non-multiple param — defensive, not the #23521 escape hatch.
- That makes the guard the cheapest diagnostic available: it names the offending parameter, which
  is exactly the fact missing from the report.

## Provenance

| Claim | Status |
|---|---|
| Merge-base, 12 commits, 24 files, +4012/-74, file list | **Verified** by hand |
| Commit subjects and ordering | **Verified** by hand |
| Per-commit substance, axis model, `run.py` recovery ordering | Subagent's reading, **not** re-verified |
| `filterAndTrim` `collection_type="paired"`; `outtab` is a `<data>` | **Verified** in `tools-iuc` |
| Subworkflow inputs' declared types in the `.ga` | **Verified** from the workflow export |
| Subworkflow steps are mapped over (contradicts the subagent's premise) | **Verified** by the two above |
| `wrap_input` multiple vs non-multiple branch at `evaluation.py:487-503` | **Verified** by hand |
| A param missing from `all_inputs` raises `KeyError` at `modules.py:3131`, caught at `:3175` into a different message | **Verified** by hand — this is what killed the earlier `__current_case__` theory |
| Inherited-context fall-through | **Weakened 2026-09-21** — contradicted by the unconditional `add()` at `modules.py:735-736`; no longer the leading candidate |
| `[]` implies a **zero**-element collection at a non-multiple data param | **Verified** by hand |
| Empty collection matched alone yields zero slices; matched with a non-empty one raises "Cannot match collection types" | **Verified** by hand (`matching.py`, `structure.py:151`) |
| `_find_collections_to_match` identical on 26.0/26.1/dev for this path | **Verified** by hand |
| The guard converts #23521's 500 into a named 400 | **Verified** by hand (raise precedes the `[]` assignment) |
| `is_aligned_with` would accept `outtab`/`forward` as aligned | **Inference** from the PR description |
| Origin of the specific empty collection | **Unresolved** — needs usegalaxy.eu invocation `679b8f790f03d7b8`: the failing step, its tool id and parameter name, and that job's input collections |
