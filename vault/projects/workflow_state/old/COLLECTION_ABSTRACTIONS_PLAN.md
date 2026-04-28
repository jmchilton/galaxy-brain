# Collection Type Abstractions Rewrite

## Goal

Replace the overloaded `can_match_type` / `canMatch` operation with two clearly-named lattice operations: an asymmetric subtype check and a symmetric "do these share an iterable shape" check. Eliminate order-dependence in sibling-matching paths by routing each call through the right operation, in both Python (`Tree.can_match`) and TypeScript (`mappingConstraints` checks at `terminals.ts:516`/`:673`).

Branch: `map_match_logic` (Galaxy worktree at `~/projects/worktrees/galaxy/branch/map_match_logic`).

## Framing (use this in the PR description)

A single operation, `can_match_type`, is doing double duty:

1. **Subtype check** at connection time: "can a value of type B be substituted where type A is expected?" Asymmetric — `paired <: paired_or_unpaired` is true, the reverse is not. This is what the workflow editor needs when validating a single edge.

2. **Sibling shape check**: "do these two collections share a common iterable shape?" Symmetric — order of arrival should not change the answer. This question shows up in two places: Python `Tree.can_match` (matching.py:65, execute.py:575) at runtime, and TypeScript `mappingConstraints` checks (`terminals.ts:516`, `:673`) at connection time when validating that a new connection is consistent with existing sibling map-over states.

Routing both questions through the asymmetric operation produced order-dependent behavior in both languages. The recent sample_sheet asymmetry guard added to `can_match_type` / `canMatch` made connection-time edge validation correct but propagated the asymmetry into sibling-matching paths where it does not belong.

The right fix is to name the two operations honestly and use each at its proper site.

### The type lattice

The relevant base types and their subtype relations:

```
list                paired_or_unpaired
 |                    |
sample_sheet         paired
```

Plus: at the leaf position of a list-rank type, `paired_or_unpaired` also accepts the "single-dataset wrapped as unpaired" interpretation. So nested types like `list:paired_or_unpaired` have *two* incomparable subtypes — `list:paired` and `list` — both substitutable. The lattice is not a forest of chains; it has joins (e.g. `list:paired_or_unpaired` is a common supertype of `list:paired` and `list`).

`sample_sheet` carries column metadata that `list` does not; substituting `list` where `sample_sheet` is required loses data. `paired_or_unpaired` admits 1- or 2-element collections; substituting one where `paired` is required risks shape errors. Both asymmetries are real lattice properties.

Nesting composes: the rank type sits above its parent type plus the suffix's lattice position. The regex (`type_description.py:16`) constrains where each base type can appear (`sample_sheet` only at the top rank).

### The two operations

| Operation | Symmetry | Question | Used at |
|---|---|---|---|
| `accepts(candidate)` | Asymmetric | Can a value of `candidate` be substituted where `self` is expected? | Connection-time edge validation: input slot accepts output edge |
| `compatible(other)` | Symmetric | Is there some type T such that both `self` and `other` admit T-valued instances? | Sibling-matching: `Tree.can_match` (Python runtime), `mappingConstraints` checks (TS connection time) |

In Galaxy's lattice, `compatible(a, b)` is implemented as `a.accepts(b) or b.accepts(a)`. This holds because the only joins in the lattice (e.g. `list:paired_or_unpaired` covering `list` and `list:paired`) involve at least one side that *is* a subtype of the other in the pairs we ever feed to `compatible` — either both are concrete sibling shapes that one side dominates, or they're already equal under normalization. Diamonds with no chain relation between the inputs do not arise in the call sites that use `compatible` (sibling map-over states are always concrete observed shapes, not abstract requirements). The implementation is a one-liner; the *name* is what makes the call sites legible.

### Naming convention

Today: `A.can_match_type(B)` returns True iff B is substitutable for A. Receiver is the requirement, argument is the candidate. The proposed name `accepts` preserves this direction — `requirement.accepts(candidate)` reads naturally and avoids a parameter-flip on every callsite.

Rejected alternative: `is_subtype_of`. Reads more "type-theoretic" but requires flipping receiver/argument at every callsite *and* in the asymmetry guard. Mechanical rename without flipping silently inverts the predicate. Higher risk, no real readability win at the call sites.

## Decisions (locked)

1. **Names**: `accepts` (Python) and `accepts` (TS) for the asymmetric subtype check. `compatible` (Python and TS) for the symmetric sibling-matching check. Implemented as `self.accepts(other) or other.accepts(self)` in both languages.
2. **Convention**: `requirement.accepts(candidate)`. Receiver is `self` (the type being matched against); argument is `other` (the candidate). Direction matches today's `can_match_type`, so the rename is mechanical and does not require argument flips at callsites.
3. **Scope of rename**: rename `can_match_type` → `accepts` (Python) and `canMatch` → `accepts` (TS) at every callsite. No backwards-compat shim — all callers are in-tree.
4. **Map-over nesting check**: rename Python `has_subcollections_of_type` → `can_map_over` (matches TS `canMapOver` — same operational question across languages). Drop `is_subcollection_of_type` (the directional inverse helper, only one caller — inline at `query.py`). Sample_sheet asymmetry guard *stays* in `can_map_over` — see WI-1, item 4 below for why removing it is unsafe.
5. **`Tree.can_match`**: rename to `Tree.compatible_shape` or doc-comment heavily that it now uses symmetric semantics. Internally calls `compatible`. This avoids a silent semantic change to a method whose existing name suggested asymmetry.
6. **TypeScript scope**: add `compatible` (TS *does* have a sibling-matching site at `terminals.ts:516`/`:673` — same bug class as Python). Rename `canMatch` → `accepts` everywhere. The two `mappingConstraints` callsites switch to `compatible`. The remaining 4 `canMatch` callsites are genuine `requirement.accepts(candidate)` and just take the rename.
7. **Sample_sheet asymmetry in TS**: keep as the asymmetry of `accepts` (correct). The post-filter that previously lived in `InputCollectionTerminal.attachable` stays removed.
8. **Old test names**: rename to reflect what they actually test under the new vocabulary. No back-compat aliases.
9. **Commit shape**: ALL CHANGES IN ONE COMMIT. Cross-language atomic rename + the new `compatible` operation in both languages + tests. Splitting risks half-renamed state in CI; one commit keeps the predicate inversion analysis bounded.
10. **Coordination with parallel `wf_tool_state` algebra branch**: this PR will collide hard with that work. Acknowledged. The current shape was buggy and we are fixing in isolation; conflict resolution falls to whichever branch lands second.

## Work Items

### WI-1: Python — split the operation

**File**: `lib/galaxy/model/dataset_collections/type_description.py`

1. Rename `can_match_type` → `accepts`. Direction unchanged (`requirement.accepts(candidate)`). Sample_sheet asymmetry guard stays in place, just renamed.
2. Add `compatible(other)` returning `self.accepts(other) or other.accepts(self)`. Doc-comment that it is the right operation for sibling matching and explains why symmetry matters at runtime / sibling sites.
3. Remove `can_structurally_match` (added during in-progress edits) — superseded by `compatible`.
4. **Keep the sample_sheet asymmetry guard in `can_map_over` (formerly `has_subcollections_of_type`).** Load-bearing for `multiply` / `effective_collection_type` map-over arithmetic — those paths gate on `can_map_over` and would silently allow `list:list` to be sliced under a `sample_sheet` requirement otherwise. The guard duplicates a fact already encoded in `accepts`, but the duplication is the safest path until a deeper refactor unifies the two; revisit in a follow-up PR if there's appetite. Add a comment cross-referencing `accepts` so future readers understand the duplication.

### WI-2: Python — update callers

Search `can_match_type` and update each callsite:

- **Subtype check** (connection-time / requirement-vs-candidate): rename only, no argument flip. `query.py:66` (HDCA candidate vs param requirement).
- **Sibling match** (runtime): `Tree.can_match` → `Tree.compatible_shape`, calls `compatible` internally. Callers: `structure.py:142-160`, `matching.py:65`, `execute.py:575`.

`is_subcollection_of_type` (the directional inverse helper) is removed. The single caller in `query.py` inlines `hdca_type.can_map_over(input_desc)` — operational reading: "can the HDCA be mapped over to feed this input parameter?".

### WI-3: Python — test rename and resite

- `test/unit/data/dataset_collections/test_type_descriptions.py`:
  - Rename `test_sample_sheet_matching_is_asymmetric` → `test_sample_sheet_accepts_relation`. Update assertions to use `accepts` directly (direction unchanged from `can_match_type`).
  - Add `test_paired_accepts_relation`: `paired_or_unpaired.accepts(paired)` True; `paired.accepts(paired_or_unpaired)` False.
  - Add `test_compatible`: same type → True; subtype pair (either order) → True; sample_sheet vs list (either order) → True; paired vs paired_or_unpaired (either order) → True; paired vs list (either order) → False.

- `test/unit/data/dataset_collections/test_matching.py`:
  - **Rewrite** `test_paired_or_unpaired_cannot_act_as_paired`. The substitution-rejection sentiment moves to `test_type_descriptions.py` as `not paired.accepts(paired_or_unpaired)`. The runtime test becomes `test_paired_and_paired_or_unpaired_match_when_shapes_align` — `assert_can_match` in both orders.
  - Add `test_paired_or_unpaired_with_one_element_rejected_against_paired`: 1-element `paired_or_unpaired` vs 2-element `paired` — children-count check still catches genuine cardinality mismatch even though `compatible` accepts at the type level. Asserts safety isn't lost.
  - Add `test_paired_or_unpaired_with_two_elements_matches_paired`: 2-element `paired_or_unpaired` vs 2-element `paired` — `compatible` accepts at type level, children counts align, runtime matches. Locks in the answer to "is symmetric runtime match safe here?" — yes, because a 2-element paired_or_unpaired *can* be zipped with a paired.
  - Keep `test_paired_can_act_as_paired_or_unpaired` semantically (now both orders pass) — rename to `test_paired_and_paired_or_unpaired_match_symmetric` or fold into the test above.

- `test/unit/data/dataset_collections/test_structure.py`:
  - Keep already-drafted `test_tree_can_match_sample_sheet_list_symmetric` and `test_tree_can_match_sample_sheet_paired_list_paired_symmetric`. Update the method name to match the renamed `Tree.compatible_shape` per Decision 5.

### WI-4: TypeScript — rename + add `compatible`

**File**: `client/src/components/Workflow/Editor/modules/collectionTypeDescription.ts`

- Rename `canMatch` → `accepts` on the `CollectionTypeDescriptor` interface and all three implementations (`NULL_COLLECTION_TYPE_DESCRIPTION`, `ANY_COLLECTION_TYPE_DESCRIPTION`, `CollectionTypeDescription`). Direction unchanged from current `canMatch` — `requirement.accepts(candidate)`.
- Add `compatible(other: CollectionTypeDescriptor): boolean` to the interface and implementations. For `CollectionTypeDescription`, implement as `return this.accepts(other) || other.accepts(this);`. For `NULL_COLLECTION_TYPE_DESCRIPTION` return `false`; for `ANY_COLLECTION_TYPE_DESCRIPTION` return `other !== NULL_COLLECTION_TYPE_DESCRIPTION` (mirrors the existing `canMatch` semantics).
- Update doc comment on `accepts` to describe the asymmetry as a property of the subtype lattice, and on `compatible` to describe the sibling-matching use case.

**File**: `client/src/components/Workflow/Editor/modules/terminals.ts`

Audit of the 7 callsites:

- L504 `mapOver.canMatch(otherCollectionType)` — input's existing mapOver vs candidate output. Asymmetric (input-side). → `accepts`.
- L508 `new CollectionTypeDescription("list").append(this.mapOver).canMatch(otherCollectionType)` — constructed input requirement vs candidate. Asymmetric. → `accepts`.
- **L516 `mappingConstraints.every((constraint) => constraint.canMatch(otherCollectionType))`** — `mappingConstraints` are existing sibling map-over states (from `_mappingConstraints` / `_getOutputStepsMapOver`), NOT input requirements. Both sides are concrete sibling shapes. → `compatible`. This is the order-dependence fix.
- L622 `collectionType.canMatch(otherCollectionType)` — input declared type vs candidate. Asymmetric. → `accepts`.
- L646 `effectiveCollectionType.canMatch(otherCollectionType)` — input effective type vs candidate. Asymmetric. → `accepts`.
- **L673 `mappingConstraints.every((d) => d.canMatch(effectiveMapOver))`** — sibling map-over states vs derived effective map-over. Both concrete shapes. → `compatible`. Same fix as L516.
- L839 `collectionType.canMatch(otherCollectionType)` — input declared type vs output. Asymmetric. → `accepts`.

Net: 5 callsites become `accepts` (mechanical rename, no argument changes). 2 callsites become `compatible` (rename + semantic shift to symmetric).

**File**: `client/src/components/Workflow/Editor/modules/terminals.test.ts`

- Mechanical rename of `canMatch` references in test code/comments to `accepts`.
- **Add new tests** for the sibling-matching order-independence at L516/L673 paths:
  - `accepts list -> sample_sheet sibling map-over (regardless of order)`: build a step with two collection inputs, connect a `sample_sheet` output to one and then a `list` output to the other; assert acceptance. Repeat in reversed order. The pre-fix code accepts one order and rejects the other.
  - `accepts paired_or_unpaired -> paired sibling map-over (regardless of order)`: same shape with `paired_or_unpaired` and `paired`.
  - Verify existing single-edge sample_sheet asymmetry tests (`rejects list -> sample_sheet connection (asymmetry)` at terminals.test.ts:751, `rejects list:paired -> sample_sheet:paired connection (asymmetry)` at :756) still pass — they exercise `accepts` (single-edge), not `compatible` (sibling).
- If any existing scenario flips, that's evidence of a previously-latent bug — investigate before adjusting expectations.

### WI-5: Documentation — primary home is `collection_semantics.yml`

The canonical write-up lives in `lib/galaxy/model/dataset_collections/types/collection_semantics.yml`. Add a new section at the end (after `## sample_sheet Collections`) titled `## Type Compatibility Algebra` (or similar) containing:

- The lattice diagram (base types + nesting rule + asymmetries explained).
- The two-operations table from this plan's "Framing" section.
- Worked examples: when `accepts` applies (single-edge connection validation) vs when `compatible` applies (sibling map-over states). At least one of each annotated to a test label (`workflow_editor`-style cross-reference) so drift is checked by the test names.
- Note that the operation semantics are mirrored in Python (`type_description.py`) and TypeScript (`collectionTypeDescription.ts`) — keep them in sync.

Then add **short** header pointers in each code file:

- `type_description.py`: 3-5 line module docstring saying "see `types/collection_semantics.yml#type-compatibility-algebra` for the lattice and operation reference".
- `collectionTypeDescription.ts`: equivalent JSDoc header pointing at the same location.

Per-method docstrings on `accepts`, `compatible`, and `Tree.compatible_shape` stay (one paragraph each describing the local semantics). Keep them short — the framing lives in the YAML.

## PR Description Skeleton

### Summary
Splits the overloaded `can_match_type`/`canMatch` operation into two named lattice operations and eliminates order-dependent behavior in sibling-matching paths in both Python and TypeScript.

### Motivation
`can_match_type` / `canMatch` was answering two distinct questions with one operation: "is B substitutable for A?" (asymmetric, used at connection-time edge validation) and "do A and B share an iterable shape?" (symmetric, used by sibling matching — Python `Tree.can_match` at runtime, TS `mappingConstraints` checks at connection time). Routing both questions through the asymmetric operation made sibling matching order-dependent: which sibling input arrived first changed whether a workflow validated. Earlier patches added a `sample_sheet` asymmetry guard inside `can_match_type` itself; this fixed connection-time edge correctness but propagated the asymmetry into sibling matching where it does not belong.

### Approach
Introduces:
- `accepts(candidate)`: asymmetric. `requirement.accepts(candidate)` returns True iff a value of `candidate` can be substituted where `requirement` is expected. Encodes the type lattice (`sample_sheet <: list`, `paired <: paired_or_unpaired`).
- `compatible(other)`: symmetric. `compatible(a, b)` ≡ `a.accepts(b) or b.accepts(a)`. Used at sibling-matching sites only.

Renames `can_match_type` → `accepts` and `canMatch` → `accepts` everywhere; direction unchanged (no argument flips). Two TS callsites at `terminals.ts:516`/`:673` switch from the renamed `accepts` to `compatible` because their operands are sibling map-over states (not requirement-vs-candidate). Python `Tree.can_match` is renamed to `Tree.compatible_shape` and uses `compatible` internally.

### Behavior changes
- Connection-time edge validation: unchanged. List output → sample_sheet input still rejected; sample_sheet output → list input still accepted.
- Python runtime sibling matching: now order-independent. Sample_sheet HDCA + list HDCA on sibling inputs match in both orders.
- TS connection-time sibling map-over checks: now order-independent. Same fix class as Python.

### Test changes
Existing tests rewritten to use the new vocabulary at the right layer. New Python and TS tests document order-independence at sibling sites and the subtype lattice at edge sites.

## Unresolved Questions (with recommendations for AFK decision)

1. **Naming**: `accepts` vs `is_subtype_of` for the asymmetric operation.
   - **Recommendation**: `accepts`. Keeps existing direction (`requirement.accepts(candidate)`), so the rename is mechanical at every callsite. `is_subtype_of` would force a parameter flip everywhere and the asymmetry guard direction has to flip too — high risk of silent inversion.
   - **Override path**: if you really want `is_subtype_of`, say so and I'll do the careful flip.

2. **Symmetric op naming**: `compatible` vs `have_common_subtype` vs `matches_shape`.
   - **Recommendation**: `compatible`. Short, used at call sites that read well (`a.compatible(b)`). `have_common_subtype` is precise but verbose and academic. `matches_shape` is the actual semantics but loses the lattice framing.

3. **`Tree.can_match` rename** (Decision 5): rename to `Tree.compatible_shape` or keep the name with a doc comment.
   - **Recommendation**: rename to `compatible_shape`. The current name implies asymmetry; the new semantics are symmetric. A doc comment is easy to miss; the rename forces every reader to think about it once.

4. **TS sibling-matching test naming**: pure TS unit tests on `CollectionTypeDescription` (low-level, easy to write) vs higher-level scenario tests in `terminals.test.ts` that exercise the actual `_mappingConstraints` flow.
   - **Recommendation**: do *both*. Low-level `compatible` tests in a new `collectionTypeDescription.test.ts` (or extend an existing one) lock in the operation. Two scenario tests in `terminals.test.ts` lock in that the right operation is wired at L516/L673. The scenario tests are the ones that would have caught the original bug.

5. **`can_map_over` asymmetry guard duplication** (WI-1 item 4): keep the duplicated guard, or unify in a follow-up.
   - **Recommendation**: keep it duplicated in this PR with a comment cross-referencing `accepts`. Open a follow-up issue noting that `can_map_over` could be re-expressed in terms of `accepts` + structural nesting logic. Doing it in this PR risks silent map-over arithmetic regressions and bloats the diff.

6. **Doc placement** (WI-5): primary home in `collection_semantics.yml` as a new "Type Compatibility Algebra" section, with short pointer headers in both code files.
   - **Recommendation**: this approach. `collection_semantics.yml` is already the power-user-facing reference doc with sections on `paired_or_unpaired` and `sample_sheet`; the lattice + operations belong there. Drift risk is mitigated because this file's examples cross-reference test labels — a similar discipline applies to the new section.
