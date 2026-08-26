# Native tool_state walker convergence plan

Scope: the *definition-driven* native tool_state traversals in
`galaxy.tool_util.{parameters,workflow_state}`. Goal: kill the copy-paste /
silent-drift risk between them without forcing a bad mega-abstraction.

Out of scope: `strip_bookkeeping_from_workflow` / `_strip_bookkeeping_recursive`
(clean.py). That one is *definition-free* (blind fixed-keyset sweep incl. inside
JSON blobs) and legitimately stands apart — see the sibling note at the bottom.

## TL;DR

- Target 1 (byte-identical `select_which_when_native` +
  `_test_value_matches_discriminator`) is **DONE** — promoted to the public
  `parameters` API; all four consumers repointed. Not re-litigated here.
- Four native walkers share one skeleton but differ in output shape, path
  separator, repeat sizing, and undeclared-key policy. Fully merging them is
  possible but the differences are structural, not cosmetic — a single walker
  would be flag-heavy and touch a live Galaxy runtime consumer.
- **Recommendation: `SHARED_PRIMITIVES` + `AGREEMENT_TEST`.** Extract the branch
  sub-decisions every walker duplicates into tested helpers, then add a
  cross-walker test that feeds shared fixtures through strip + classify and
  asserts they agree on the undeclared-key set. Captures most of the drift-risk
  reduction at a fraction of the refactor risk.
- Heavier alternatives (`UNIFIED_CALLBACK_CORE`, `STRIP_ON_CLASSIFY`) written up
  as rejected — revisit only if the primitives approach proves insufficient.

## The walkers

| # | Function (file) | Role | Output | Undeclared-key policy | Path sep | Repeat sizing |
|---|---|---|---|---|---|---|
| 1 | `walk_native_state` (`_walker.py`) | visit | new dict of leaf-callback results | optionally *raise* (`check_unknown_keys`) else ignore | `|` (`flat_state_path`) | connection-driven (`repeat_inputs_to_array`, pads `{}`) |
| 2 | `strip_undeclared_keys` (`parameters/visitor.py`) | strip | mutate in place; return removed paths | *delete* (unless in `preserve_keys`) | `|` | state-driven (existing instances) |
| 3 | `classify_stale_keys` / `_classify_recursive` (`stale_keys.py`) | classify | `list[StaleKey]` w/ 5 categories; no mutation | *categorize + keep* | `.` (dotted) | state-driven |
| 4 | `_strip_format2_recursive` (`clean.py`) | strip (format2) | mutate in place; return removed paths | *delete* | `.` | state-driven |

Shared skeleton (all four):
1. `declared = {inp.name for inp in tool_inputs}`
2. partition keys → declared vs undeclared
3. recurse declared containers:
   - conditional → `select_which_when_native`, recurse `[test_param] + when.parameters`
   - repeat → per instance dict, recurse `repeat.parameters` with `_{i}`
   - section → recurse `section.parameters`

### The differences that resist merging

These are structural, not callback-shaped:

- **Output shape.** #1 builds a fresh dict from leaf callbacks; #2/#4 mutate and
  delete; #3 emits typed objects and mutates nothing. One return contract can't
  cover all three without a mode flag that rewrites the tail of every branch.
- **Path separator.** `|` (visitor/walker) vs `.` (classify/format2). Consumers
  depend on the exact string (`StaleKey.key_path`, removed-key reports, the
  Galaxy runtime strip). Not freely interchangeable.
- **Repeat sizing.** #1 expands instances from `input_connections`
  (`repeat_inputs_to_array`) and pads with `{}` — it must materialize
  connection-mapped repeats. #2/#3/#4 only walk instances already present in
  state. Different inputs, different loop.
- **Undeclared-key semantics.** #3 is far richer: RUNTIME_LEAK / BOOKKEEPING /
  STALE_ROOT (root duplicate of a conditional param, with value-divergence
  detail) / STALE_BRANCH (leaked from an inactive `when`) / UNKNOWN. #2 collapses
  all of that to "delete unless preserved." #1 collapses to "raise or ignore."
- **Live runtime consumer.** #2 is called from `lib/galaxy/workflow/modules.py`
  (not just the CLI). Any behavior shift there is a production change — argues
  for byte-identical behavior, i.e. against a risky rewrite.

## Recommendation — SHARED_PRIMITIVES + AGREEMENT_TEST

### SHARED_PRIMITIVES

Keep the four walkers as separate functions (distinct output contracts stay
explicit) but build them from shared, unit-tested helpers so the drift-prone
sub-decisions exist once. Candidates, in order of drift risk:

1. `active_branch_params(conditional, cond_state) -> list[ToolParameterT]` — the
   `[test_param] + when.parameters` assembly with the `when is None` fallback.
   Currently open-coded 4× (walker L124-127, strip L279-282, classify L174-175,
   format2 L451-453). Highest-value extraction: it pairs with
   `select_which_when_native` and is exactly where an inactive/active-branch bug
   would silently diverge between strip and classify.
2. `iter_repeat_instances(...)` — encapsulate the two sizing modes behind one
   helper with a `connection_sized: bool` (or two named entry points) so the
   loop body is shared even though sizing differs.
3. `declared_names(tool_inputs)` — trivial, but makes the partition uniform.

Each walker keeps its own tail (build dict / delete / classify), only the
*navigation* is shared.

### AGREEMENT_TEST

Add a cross-walker contract test: feed a fixture corpus (the existing
`fixtures/` stale/clean .ga set + a few hand-built conditional/repeat/section
cases) through both `classify_stale_keys` and `strip_undeclared_keys`, and assert
the set of keys classify labels non-bookkeeping equals the set strip removes
(modulo the `.`↔`|` separator normalization). This directly guards the original
"two traversals that must agree" concern and turns any future drift into a red
test instead of a silent bug. Red-to-green: write it against today's code; if it
does *not* pass immediately, that itself is a finding worth surfacing before
touching anything.

### Why this ordering

`active_branch_params` is the single point where strip and classify could
disagree about which keys are "in the active branch." Extracting it + pinning the
agreement makes the two walkers provably consistent on the decision that matters,
without disturbing their output contracts or the runtime strip path.

## Rejected / heavier alternatives

### UNIFIED_CALLBACK_CORE (rejected for now)

One generic `walk_native(tool_inputs, state, *, on_undeclared, on_leaf,
path_sep, repeat_mode)` that all four adapt to. Purest DRY, but:
- `on_undeclared` must express raise / delete / 5-way-classify — a union return
  that pushes real logic back into callbacks, so the "shared" core is thin and
  the interesting behavior still lives in four places.
- `path_sep` and `repeat_mode` become permanent config flags.
- Rewrites the tail of the live `modules.py` strip path — highest blast radius.
Revisit only if SHARED_PRIMITIVES leaves too much skeleton duplicated to trust.

### STRIP_ON_CLASSIFY (rejected for now)

Re-express `strip_undeclared_keys` as "classify, then delete non-preserved
classified keys." Attractive — collapses #2 onto #3 and kills the exact
divergence the agreement test guards. But:
- `StaleKey` carries `key_path`, not a parent-dict ref, so deletion needs a
  second locate pass or a threaded parent ref through classify.
- Separator mismatch (`.` vs `|`) must be reconciled where `modules.py` and the
  removed-key reports read the paths.
- Turns the production strip path into a consumer of the (heavier) classifier —
  perf + behavior coupling on a runtime hot path.
The agreement test gets ~all the safety benefit without this coupling; prefer it.

### DO_NOTHING (rejected)

Leave all four. The copy-paste of branch assembly across 4 sites is exactly the
kind of thing that drifts. At minimum AGREEMENT_TEST is cheap insurance.

## Test plan

- Unit-test each extracted primitive directly (conditional None-branch fallback,
  bool/str discriminator coercion via the already-shared
  `select_which_when_native`, repeat sizing both modes).
- AGREEMENT_TEST as above (red-to-green; investigate if not green on day one).
- Regression: full `test/unit/tool_util/workflow_state/` +
  `test/unit/tool_util/test_parameter_specification.py` +
  `test/unit/workflow/test_workflow_state_tree.py` (the `modules.py` strip
  consumer path) after each primitive extraction.

## Sibling note — strip_bookkeeping_from_workflow

Not part of this convergence. It is definition-free: strips only the fixed
`NATIVE_BOOKKEEPING_KEYS` set, everywhere in the tree including inside
JSON-string blobs, without tool models. Two callers need exactly that property —
roundtrip's standalone `strip_bookkeeping` mode ("remove framework noise, keep
tool params") which `strip_undeclared_keys` structurally cannot provide, and the
`GALAXY_TEST_STRIP_BOOKKEEPING_FROM_WORKFLOWS` populator (no tool models). It
already shares the one thing it should — the `NATIVE_BOOKKEEPING_KEYS` constant.
Leave it; if anything, relocate it beside the walkers and document it as the
definition-free counterpart.

## Unresolved questions

1. Extract `iter_repeat_instances` now, or defer (only #1 uses connection
   sizing — is one shared helper worth the `connection_sized` flag)?
2. AGREEMENT_TEST separator handling — normalize `.`↔`|` in the test, or make it
   a nudge toward unifying the separator across walkers?
3. Does classify's STALE_ROOT/STALE_BRANCH richness need a strip-side equivalent,
   or is "strip removes it, classify explains it" the intended division?
4. Include `_strip_format2_recursive` (#4) in the primitives, or leave format2
   separate since it has no bookkeeping / no double-encoding / no connections?
