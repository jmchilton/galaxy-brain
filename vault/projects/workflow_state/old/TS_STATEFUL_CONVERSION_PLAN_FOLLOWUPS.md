# TS Stateful Conversion — Follow-ups

**Date:** 2026-04-04
**Repo:** `jmchilton/galaxy-tool-util-ts` (`galaxy-tool-util`)
**Parent plan:** [[TS_STATEFUL_CONVERSION_PLAN]]

Loose ends and polish items discovered after Steps 1–7 of the parent plan
shipped. Organized small-to-large so each item can land independently.

---

## Done (2026-04-04)

### 1. Wire precheck into stateful wrappers

Step 5 of the parent plan shipped `precheckNativeWorkflow` + 9 tests but
nothing called it — legacy-encoded and `${...}`-interpolated workflows went
straight into the walker and threw from `_assertNotStringContainer` as an
opaque per-step error. API was also out of step with the rest of the
stateful path: took `Map<toolId, inputs>` instead of the version-aware
`ToolInputsResolver`.

**Done:**
- Refactored `precheck.ts` to take `ToolInputsResolver | null`. Split into
  `precheckNativeStep(step, inputs)` for per-step use by the runner and
  `precheckNativeWorkflow(wf, resolver)` for standalone callers.
- Updated `packages/schema/test/precheck.test.ts` (9 tests) to use a
  `mapResolver` helper.

### 2. Validation wrapper (deferred from Step 2)

Step 2 deferred `convertStateToFormat2Validated` + `ConversionValidationFailure`
to Step 3 where `createFieldModel` validation was to integrate with
`toFormat2`/`toNative`. Step 3 didn't pick it up. The stateful wrappers
only caught whatever the walker happened to throw — no pre/post
Effect-schema validation existed.

**Done:**
- New `packages/schema/src/workflow/stateful-validate.ts` with
  `ConversionValidationFailure` (tagged, carries `phase: "pre" | "post"`
  and formatted issue list), `validateNativeStepState`,
  `validateFormat2StepState`. Uses `createFieldModel({parameters: inputs},
  "workflow_step_native" | "workflow_step")` + `S.decodeUnknownEither` +
  `ParseResult.ArrayFormatter`. Pre-validation injects `ConnectedValue`
  markers; post-validation strips them.
- `packages/schema/test/stateful-validate.test.ts` (7 unit tests).

### Bonus: classified fallback failures

Unblocked by (1)+(2), cleanly folded in during runner refactor.

- `stateful-runner.ts` gained optional `precheck`, `preValidate`,
  `postValidate` hooks. `StepConversionStatus` carries
  `failureClass: "unknown_tool" | "precheck" | "pre_validation" |
  "conversion" | "post_validation"`.
- `toFormat2Stateful` wires all 4 hooks; `toNativeStateful` wires pre/post
  validation (precheck is native-encoding-specific, doesn't apply format2→native).
- CLI `convert.ts` reporter prints `[failureClass]` per failed step plus
  `fallback breakdown: precheck=N, unknown_tool=M, ...`.
- `convert-tree.ts` aggregates the breakdown across all files.
- Added failure-class integration tests in
  `packages/schema/test/stateful-wrappers.test.ts` (4 new) and
  `packages/cli/test/convert-stateful.test.ts` (1 new).

**Gotcha worth remembering:** `createFieldModel` returns `undefined` if a
parameter type's generator isn't registered. Registration happens via
side-effect imports in `schema/parameters/index.ts`. Importing
`model-factory` directly (bypassing the schema barrel) gets silent-undefined
back with no test failures. Fix: top-of-file
`import "../schema/parameters/index.js";` in any module that calls
`createFieldModel` without going through the public barrel.

**Totals:** 4461 schema (+11), 104 CLI (+1), 97 core, 13 proxy. `make
check` + `make test` clean.

---

## Done (2026-04-04, session 2: polish PR)

### 3. Shared stale-keys module ✅

- New `packages/schema/src/workflow/stale-keys.ts` exporting the unified
  `STALE_KEYS` set (7 entries, union of the previous walker + roundtrip
  sets). Classification enum deferred until `--allow`/`--deny` policy
  lands.
- `walker.ts` imports `STALE_KEYS` for unknown-key detection (widens
  walker's allowlist from 4 → 7 — picks up `__input_ext`,
  `__job_resource`, `chromInfo` which are equally bookkeeping).
- `roundtrip.ts` imports as `SKIP_KEYS` alias (local name preserved to
  keep diff minimal).
- `_flattenInputConnections` inlined as a `Record<string, unknown>` cast
  at the single call site in `stateful-convert.ts`.

No behavior change in existing tests. Schema suite 4463 passed | 88
skipped.

### 4. Version-aware roundtrip resolver test ✅

- `mapResolver` in `roundtrip.test.ts` now honors version — map keys are
  `toolId` (any version) or `toolId@version` (exact match, falls back to
  bare id).
- New test: two tool steps, same `tool_id: multi_tool`, `tool_version:
  1.0` and `2.0`, v2 has an extra `label` + multi-select `tags` field.
  Forward conversion succeeds on both with zero error diffs — verifies
  the resolver hands each step the right shape.
- New test: resolver only knows v1, workflow declares v2 → step falls
  back with `failureClass: "unknown_tool"` and `toolVersion: "2.0"`
  preserved in status. Catches silent mis-resolution if the resolver
  contract ever drifts.

### 5. Diff-output UX on `gxwf roundtrip` ✅

- `--errors-only`, `--benign-only`, `--brief` flags on `gxwf roundtrip`
  and `gxwf roundtrip-tree`, registered in `gxwf.ts`.
- Single-file `reportResult` gained a `ReportFilter` param. `--brief`
  short-circuits after the one-line summary. `--errors-only` hides
  clean + benign-only steps and filters the per-diff list to error
  rows. `--benign-only` inverse (hides clean + error steps, keeps only
  benign diffs).
- Tree reporter skips per-file lines under `--brief`; filters per-file
  lines under `--errors-only`/`--benign-only`. Aggregate summary line
  always printed.
- Filter flags do **not** affect exit code (still 0/1/2 by actual
  verdict).
- 3 new CLI tests: `--brief` keeps summary but drops diff rows (single
  file); `--errors-only` hides benign rows; tree `--brief` prints only
  the aggregate block.
- Docs updated: `docs/packages/cli.md` `roundtrip` + `roundtrip-tree`
  option tables list all three flags.

**Totals:** 4463 schema (+2), 107 CLI (+3), 97 core, 13 proxy. `make
check` + `make test` clean.

---

## Done (2026-04-05)

### 6. IWC sweep test (shape deviation: sweep, not committed goldens)

The plan called for a committed 10–20 workflow golden corpus. Chose the
lighter gated-sweep shape instead to match the existing
`iwc-sweep.test.ts` pattern — no committed fixtures, no tool bundles in
the repo, runs off the user's `~/.galaxy/tool_info_cache/` and a local
IWC checkout. Primary purpose (regression harness for real-world
workflows) is met; CI-reproducibility tradeoff accepted.

**Done:**
- New `packages/cli/test/stateful-iwc-sweep.test.ts`. Gated on
  `GALAXY_TEST_IWC_DIRECTORY`. Discovers every `.ga`, runs
  `roundtripValidate` per workflow, aggregates failureClass +
  benign-diff histograms, asserts no crashes and no error-severity
  diffs.
- Blocker resolved empirically: real IWC `.ga` files use **nested**
  `tool_state` (sections/conditionals as nested dicts). Matches what
  `toNative` emits. Walker is correct, no refactor needed. Parent
  plan's flat-vs-nested question is closed.

### 7. Subworkflow recursion in roundtrip

Landed as part of the 2026-04-04 polish diff but wasn't mentioned in
this doc until now.

**Done:**
- `collectSteps` walks inline subworkflows recursively, building
  `.`-separated prefixed ids (e.g. `3.1.0` = step 0 inside step 1
  inside top-level step 3). `depth` tracked on every
  `StepRoundtripResult`.
- `subworkflow_not_diffed` → `subworkflow_external_ref` (external URL/TRS
  refs only; inline subs now diffed properly).
- CLI reporter (`roundtrip.ts`, `roundtrip-tree.ts`) indents nested
  step rows by `depth`.
- New tests in `roundtrip.test.ts`: "recursively diffs tool steps
  inside inline subworkflows" + "external (URL/TRS) subworkflow refs
  surface as informational entries".

### Sweep findings + triage (2026-04-05)

First run against 120 IWC workflows / 2515 tool steps was committed
**red** (28 failing workflows, 314 error diffs). Triaged four patterns
in the same session:

1. **`__identifier__` / `__workflow_invocation_uuid__` runtime leaks**
   — classified via new `isRuntimeLeakKey` in `stale-keys.ts`, new
   `runtime_leak_stripped` benign kind in the differ. Mirrors Galaxy's
   `RUNTIME_LEAK` category in `stale_keys.py`. Kept as defense-in-depth
   for uncached-tool cases.
   *(Commit `f292736`, -43 error diffs)*
2. **Tool-definition-aware pre-clean** — `clean.ts` gained
   `stripStaleKeysToolAware` (thin wrapper around `walkNativeState`
   with identity leaf callback + SKIP_VALUE for missing leaves).
   `roundtripValidate` now pre-cleans each tool step's `tool_state`
   before diffing — mirrors Galaxy's
   `roundtrip_validate(clean_stale=True)` default + `_strip_recursive`
   semantics. Cascade-fixed "simple scalar drop" pattern (saveLog, i,
   mode, plasmids, al, e/f/g/m/q, SN, cut, block_size, dark_bg,
   add_cell_metadata, …) — those were all undeclared stale keys.
   *(Commit `5267257`, 24 → 7 failing workflows, 271 → 193 errors)*
3. **`null` ≡ `undefined` ≡ `"null"` scalar equivalence** — JSON has
   no `undefined`; a JS `undefined` reaching the differ means a key
   was absent or unset, semantically equivalent to explicit null.
   Matches Python's `orig_val in (None, "null")` treatment. Fixed the
   dominant conditional-branch pattern (hyphy, scanpy, influenza,
   VGP8, …).
   *(Commit `9310666`, 7 → 1 failing workflow, 193 → 9 errors)*

**Final baseline after triage:**

```
120 workflows, 2515 tool steps
verdicts: 1 clean, 76 benign-only, 1 with real errors, 0 crashed
forward fallbacks: post_validation=76
reverse fallbacks: pre_validation=76, post_validation=2244
benign diffs (4101): connection_only_section_omitted=4043,
                     all_null_section_omitted=37,
                     multi_select_normalized=21
error diffs: 9 (1 workflow)
```

**Remaining issues:**

- **clinicalmp anomaly** (1 workflow, 9 error diffs) —
  `proteomics/clinicalmp/clinicalmp-discovery/iwc-clinicalmp-discovery-workflow.ga`:
  - step 3 `source` key missing + `spectrum_matching_options`,
    `searchengines_options`, `advanced_options` appear after roundtrip
    (conditional when-reification — forward and reverse pick different
    default `when` branches)
  - step 4 `source.from: "cRAP" → "uniprot"` — only genuine
    data-corruption signal in the entire sweep. Worth isolating.
- **Reverse `post_validation=2244` unchanged** throughout the triage.
  Pre-clean affects the diff, not the conversion pipeline. Nearly
  every step fails format2→native post-validation even when the
  roundtrip diff is clean. Separate investigation: the reimported
  native state isn't validating against `workflow_step_native` schema.
  Likely one root cause (schema shape mismatch), not 2244 distinct
  bugs. Forward `post_validation=76` is the same class on the forward
  direction, much smaller scope.

Sweep test still **red** on clinicalmp. Each remaining issue is
standalone.

---

## Larger refactor (do last)

### 8. Walker unification with `state-merge.ts`

Parent plan Future Work item. `state-merge.ts` does parallel tree
traversal (mutating, different signature) to `walker.ts`. Maintenance
cost grows as strict-mode / connection-validation / stale-key classification
land.

**Plan:**
- Refactor `state-merge.ts` to use `walkNativeState` internally via a
  mutating leaf callback + output-dict reassignment.
- Verify `injectConnectionsIntoState` and `stripConnectedValues` behavior
  unchanged via existing `state-merge.test.ts`.
- Delete the duplicated traversal code in `state-merge.ts`.

**Blast radius:** large. Touches a load-bearing file with many downstream
callers (`validate-workflow.ts`, expansion, stateful conversion). Wait
until (3)–(7) have stabilized and (6) provides a strong regression harness.

---

## Not prioritized (parked)

These are genuine gaps but either too speculative or too big for the
current polish pass. Revisit after the items above land.

- **Native state shape decision (flat vs nested)** — parent plan's last
  unresolved question. Will be forced by (6) but worth a standalone
  research task if (6) gets deferred.
- **`--strict-structure`, `--strict-encoding`, `--strict-state`
  decomposition** — port from Python STRICT_STATE_PLAN. `--strict-encoding`
  is cheapest (walker already throws; just don't catch it).
- **Connection validation via walker infrastructure** — future use case
  for the walker unification in (8).
- **Should `--stateful` be the default?** — parent plan unresolved
  question. My read: not yet. The fallback path silently degrades to
  schema-free, which is a footgun if users assume stateful-by-default is
  in effect. Revisit after (6) gives confidence in real-world stability.

---

## Suggested ordering for next session

**Polish PR (one session):** (3) + (4) + (5). **Done 2026-04-04.**

**Fixture PR (one session):** (6). **Done 2026-04-05** as a gated
sweep (shape deviation from plan).

**Follow-on (one session):** (7). **Done 2026-04-04** bundled into the
polish diff.

**Later (separate session):** (8). Wait for sweep bug triage (see
findings above) to stabilize first.
