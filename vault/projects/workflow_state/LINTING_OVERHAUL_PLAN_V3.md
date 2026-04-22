# Workflow Linting Overhaul Plan — v3

## Status (2026-04-14)

**gxformat2 PR 2 landed** (commit `4b6ecd6` on branch `abstraction_applications`). Schema-rule catalog, loader, runner, fixtures. 7 of the planned 9 schema rules shipped. No `ctx.error` deletions yet — PR 4 still pending.

Dropped from the initial catalog (schema does not enforce today):
- `Format2MissingClass` — `class_` field has `default="GalaxyWorkflow"` in generated pydantic models; missing-class documents pass both lax and strict. Tracked as galaxyproject/gxformat2#186.
- `SubworkflowMissingSteps` — nested subworkflow with missing `steps` passes both validators. No issue filed yet.

Re-add both to `schema_rules.yml` once the schema is fixed.

Deviations from plan spec worth noting:
- No `pending: true` escape hatch — unnecessary since all seven enforceable rules found fixtures immediately.
- Negative fixtures may be `real-hacked-*` in addition to `synthetic-*` (e.g. `real-hacked-basic-missing-format-version.ga`). Fixture-naming convention relaxed from plan §9.
- Runner dispatches validators via new `gxformat2/validators.py` shared by `tests/test_interop_tests.py`. Plan didn't specify this module but it removed duplicated `_validate_*` helpers.
- Extra integrity tests beyond plan §1.4: `test_fixture_format_matches_applies_to`, `test_schema_rule_fixtures_exist_on_disk`, `test_no_orphan_runner_tags_in_catalog`.

---

Supersedes `LINTING_OVERHAUL_PLAN_V2.md`. v3 splits the rule inventory into two registries with a shared ID namespace:

- **Lint rules** — code-emitted checks in `lint.py`, each with metadata (`Linter` subclass), severity, profile membership, and per-call-site `linter=`/`json_pointer=` args. Same as v2.
- **Schema rules** — issues the schema decode layer already enforces. Pure interop catalog: IDs + positive/negative fixture pairs + `strict` vs `lax` scope. No mapping of pydantic/Effect error shapes to IDs; the catalog is tested end-to-end by running fixtures through validators and asserting pass/fail.

Both kinds share `--list-rules` output and declarative-test keying so downstream consumers (TS, Galaxy, VS Code) don't care which kind emitted a finding.

Everything from v2 that isn't about the Linter vs. Schema split carries forward unchanged. v3 rewrites the inventory, deletes the "schema-redundant" migration shims, and adds a first-class TS port of the schema-rules catalog.

## Decisions already pinned

Carried from v2 unless noted:

1. Fork Galaxy's `tool_util.lint` pattern — no dependency.
2. Single-traversal linting; `Linter` subclasses are metadata only.
3. Galaxy-style naming — rule ID = class name (lint) or YAML key (schema).
4. Profiles are an external shared YAML (`gxformat2/lint_profiles.yml`) with three names: `structural`, `best-practices`, `release`. `iwc = structural ∪ best-practices ∪ release`. Profiles apply to **lint rules only** — schema rules always run as part of `validate_*`.
5. **(Replaces v2 #5)** Schema-redundant lint rules are deleted, not migrated. Their IDs move into `gxformat2/schema_rules.yml` and lose all emission code. No transitional window.
6. Profile YAML path locked to `gxformat2/lint_profiles.yml`.
7. Profile and schema-rule loaders tolerate unknown IDs; audit-mode CI flags unimplemented entries as `INFO`.
8. **(New)** Schema rules are validated exclusively via red/green fixture tests. No introspection of pydantic / Effect `ValidationError` shapes. The contract: positive fixture passes strict validation, negative fixture fails. Byte-identical pass/fail across Python and TS is a CI gate — no per-impl escape hatches.
9. **(New)** Positive fixtures prefer real workflows (reuse existing `real-*` entries from `catalog.yml` where possible); negative fixtures are purpose-built `synthetic-*` variants named after the rule.

## Glossary

- **Rule** — a single check with stable ID, drawn from one registry.
- **Lint rule** — emitted by `gxformat2/lint.py` traversal; described by a `Linter` subclass in `gxformat2/lint_rules.py`.
- **Schema rule** — enforced by schema decode; described by a YAML entry in `gxformat2/schema_rules.yml`.
- **`LintMessage`** — one structured emission from a lint pass: `{level, message, linter, json_pointer}`.
- **`json_pointer`** — RFC 6901 pointer into the raw workflow dict. Only populated for lint rules (schema rules don't synthesize messages).
- **Profile** — named set of lint-rule IDs in `lint_profiles.yml`.
- **Scope (schema rule)** — `strict`, `lax`, or `both` — which validator flavors reject the negative fixture. Extra-field checks are `strict` only; missing-required-field checks are typically `both`.

---

## Part 1 — gxformat2 (Python)

### 1.1 `linting.py` (unchanged from v2 §1.1)

Same `LintLevel` / `Linter` / `LintMessage` / `LintContext` shape as v2. `child()` prefixes `json_pointer`, not message text.

### 1.2 Lint rule registry (shrunk from v2 §1.2)

Schema-redundant entries removed. `SubworkflowMissingSteps` moves to schema rules. `NativeMissingSteps` phantom stays deleted (v2 must-fix #4).

| Rule class | Severity | Applies to | Profile |
|---|---|---|---|
| `NativeStepKeyNotInteger` | error | native | structural |
| `StepExportError` | warning | both | structural |
| `StepUsesTestToolshed` | warning | both | structural |
| `WorkflowHasNoOutputs` | warning | native | structural |
| `WorkflowOutputMissingLabel` | warning | native | structural |
| `OutputSourceNotFound` | error | format2 | structural |
| `InputDefaultTypeInvalid` | error | format2 | structural |
| `ReportMarkdownInvalid` | error | both | structural |
| `WorkflowMissingAnnotation` | warning | both | best-practices |
| `WorkflowMissingCreator` | warning | both | best-practices |
| `WorkflowMissingLicense` | warning | both | best-practices |
| `WorkflowMissingRelease` | error | both | release |
| `CreatorIdentifierNotURI` | warning | both | best-practices |
| `StepMissingLabel` | warning | both | best-practices |
| `StepMissingAnnotation` | warning | both | best-practices |
| `StepInputDisconnected` | warning | both | best-practices |
| `StepToolStateUntypedParameter` | warning | both | best-practices |
| `StepPJAUntypedParameter` | warning | native | best-practices |
| `TrainingWorkflowMissingTag` | warning | both | best-practices |
| `TrainingWorkflowWrongTopic` | warning | both | best-practices |
| `TrainingWorkflowMissingDoc` | warning | both | best-practices |
| `TrainingWorkflowEmptyDoc` | warning | both | best-practices |

Stateful Galaxy-owned IDs (`ToolStateUnknownParameter`, `ToolStateInvalidValue`, `ToolNotInCache`, `StaleToolStateKeys`, `StepConnectionsInconsistent`) continue to register through gxformat2's `structural` profile for ownership canonicality.

### 1.3 Schema rule catalog — `gxformat2/schema_rules.yml`

New artifact. IDs move here from v2's lint table. Each entry keys positive/negative fixtures and the validator scope.

```yaml
Format2MissingClass:
  severity: error
  applies_to: [format2]
  scope: both                                     # lax and strict both reject
  description: "Workflow document missing required `class: GalaxyWorkflow`."
  tests:
    positive: [real-unicycler.gxwf.yml]           # real workflows preferred
    negative: [synthetic-format2-missing-class.gxwf.yml]

Format2MissingSteps:
  severity: error
  applies_to: [format2]
  scope: both
  tests:
    positive: [real-unicycler.gxwf.yml]
    negative: [synthetic-format2-missing-steps.gxwf.yml]

NativeMissingMarker:
  severity: error
  applies_to: [native]
  scope: both
  tests:
    positive: [real-unicycler.ga]
    negative: [synthetic-native-missing-marker.ga]

NativeMarkerNotTrue:
  severity: error
  applies_to: [native]
  scope: both
  description: "`a_galaxy_workflow` must be literal string \"true\"."
  tests:
    positive: [real-unicycler.ga]
    negative: [synthetic-native-marker-false.ga]

NativeMissingFormatVersion:
  severity: error
  applies_to: [native]
  scope: both
  tests:
    positive: [real-unicycler.ga]
    negative: [synthetic-native-missing-format-version.ga]

NativeFormatVersionNotSupported:
  severity: error
  applies_to: [native]
  scope: both
  tests:
    positive: [real-unicycler.ga]
    negative: [synthetic-native-format-version-wrong.ga]

SubworkflowMissingSteps:
  severity: error
  applies_to: [format2, native]
  scope: both
  description: "Subworkflow body missing `steps`."
  tests:
    positive: [real-nested-subworkflow.gxwf.yml]  # or closest real fixture
    negative: [synthetic-subworkflow-missing-steps.gxwf.yml]

ReportMarkdownNotString:
  severity: error
  applies_to: [format2, native]
  scope: both
  tests:
    positive: [real-workflow-with-report.gxwf.yml]
    negative: [synthetic-report-markdown-not-string.gxwf.yml]

SchemaStrictExtraField:
  severity: warning
  applies_to: [format2, native]
  scope: strict                                   # lax accepts; strict rejects
  description: "Unknown field present on a closed record under strict validation."
  tests:
    positive: [real-unicycler.gxwf.yml]
    negative: [synthetic-extra-field-top-level.gxwf.yml]
```

**Granularity policy:** enumerate specific failure modes as separate IDs when the natural fixture for each is distinct. The old `SchemaStructuralError` catch-all is replaced by specific entries; if a fixture fails validation without matching any catalog entry, the correct fix is to add the entry (with fixture), not route it to a generic ID.

Real-workflow reuse: the positive fixture list freely reuses entries already in `catalog.yml`. A single `real-unicycler.gxwf.yml` can anchor many schema rules; reuse is encouraged since it demonstrates the rule holds on production workflows.

### 1.4 Schema rule test runner — `tests/test_schema_rules_catalog.py`

Parametrizes over the YAML. Runs positive fixtures through the relevant validator(s); asserts success. Runs negatives; asserts failure in the declared scope, success outside it.

```python
@pytest.mark.parametrize("rule_id, fixture", _positive_cases())
def test_positive_passes(rule_id, fixture):
    wf = load(fixture)
    # Run both lax and strict — positives must pass regardless of scope
    _validator_for(fixture, strict=False)(wf)
    _validator_for(fixture, strict=True)(wf)

@pytest.mark.parametrize("rule_id, fixture, scope", _negative_cases())
def test_negative_fails(rule_id, fixture, scope):
    wf = load(fixture)
    if scope in ("strict", "both"):
        with pytest.raises(SchemaValidationError):
            _validator_for(fixture, strict=True)(wf)
    if scope == "strict":
        # lax must still accept — documents that this IS a strict-only rule
        _validator_for(fixture, strict=False)(wf)
    if scope in ("lax", "both"):
        with pytest.raises(SchemaValidationError):
            _validator_for(fixture, strict=False)(wf)
```

Catalog-integrity tests (extend `tests/test_examples_catalog.py` or add a sibling):
- Every fixture in `schema_rules.yml` exists in `gxformat2/examples/` and appears in `catalog.yml`.
- Every catalog entry's `tests:` list includes `tests/test_schema_rules_catalog.py` when referenced by `schema_rules.yml`.
- No orphan schema-rule IDs (IDs in YAML with empty `positive` or `negative` lists fail catalog load).

### 1.5 Lint rule declarative tests (unchanged from v2 §1.4)

`{linter: X}` path navigation into `messages`. No change.

### 1.6 `json_pointer` construction (unchanged from v2 §1.6)

List-vs-dict raw-shape inspection. Only applies to lint rules; schema rules don't synthesize pointers.

### 1.7 Test plan — red-to-green per rule

1. **PR 1 — scaffolding.** Add `linting.py` rewrite, `Linter` base, `LintMessage`. Compat shims. Unit tests as v2 §1.5 PR 1.
2. **PR 2 — profile module + schema-rule catalog.** Add `lint_profiles.py` + `lint_profiles.yml` AND `schema_rules.yml` + `schema_rules.py` loader + `tests/test_schema_rules_catalog.py`. Land enough fixtures to populate catalog with empty negative lists where fixture authoring is deferred; catalog-integrity test allows a `pending: true` flag per entry that skips execution but not registration. **(Schema-rule half landed 2026-04-14 as commit `4b6ecd6`; profile module still pending. `pending: true` flag dropped as unused.)**
3. **PR 3 — pilot lint rule (`NativeStepKeyNotInteger`).** As v2. Unchanged.
4. **PR 4 — schema-rule fixture authoring.** Per rule in `schema_rules.yml`: (a) add/identify positive fixture (prefer reuse), (b) author negative fixture, (c) flip `pending: true` off. CI becomes green when every schema rule has concrete positive + negative coverage. Delete the corresponding `ctx.error` call sites in `lint.py` in the same commit that flips the schema rule live.
5. **PR 5 — migrate remaining lint rules.** Per-rule red-to-green as v2 §1.5 PR 4. Smaller scope now since schema-redundant rules are already gone.
6. **PR 6 — profile enforcement CLI.** `--profile` and `--no-structural` flags. As v2.
7. **PR 7 — full json_pointer coverage.** As v2 §1.5 PR 6. Schema rules skip this (no pointer).
8. **PR 8 — `gxwf lint --list-rules`.** Merged output: each entry tagged `kind: lint` or `kind: schema`. JSON schema locked for TS CI consumption. Snapshot-tested.

### 1.8 `--list-rules` output shape

```json
{
  "lint": [
    {"id": "NativeStepKeyNotInteger", "kind": "lint",
     "severity": "error", "applies_to": ["native"],
     "profiles": ["structural"],
     "message_template": "expected step_key to be integer not [{value}]"}
  ],
  "schema": [
    {"id": "Format2MissingClass", "kind": "schema",
     "severity": "error", "applies_to": ["format2"],
     "scope": "both",
     "tests": {"positive": ["..."], "negative": ["..."]}}
  ]
}
```

TS CI byte-sync check runs on the `lint` block only (schema rules have no prose).

---

## Part 2 — galaxy-tool-util TypeScript (`gxwf-web` tree)

Ground truth: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/gxwf-web`.

### 2.1 Unchanged from v2

Lint-side TS work (§2.1–§2.3, §2.5, §2.7 of v2) carries forward verbatim: `LintContext.child()` rewrite to json-pointer mode, `RULES` constant, declarative harness `{field: value}` extension, TODO sentinel discipline, `--profile` support.

### 2.2 Schema-rules sync (new, first-class)

Add `sync-schema-rules` Makefile target and `scripts/sync-manifest.json` entry:

```json
{
  "schema-rules": {
    "source": "${GXFORMAT2_ROOT}/gxformat2/schema_rules.yml",
    "destination": "packages/schema/src/workflow/schema-rules.yml"
  },
  "lint-profiles": {
    "source": "${GXFORMAT2_ROOT}/gxformat2/lint_profiles.yml",
    "destination": "packages/schema/src/workflow/lint-profiles.yml"
  }
}
```

Fixtures referenced by `schema_rules.yml` sync via the existing `sync-workflow-fixtures` flow. Sync-manifest validation check: every `schema_rules.yml` fixture name appears in the fixture sync manifest too.

### 2.3 TS schema-rule runner

`packages/schema/test/schema-rules-catalog.test.ts` mirrors Python's `test_schema_rules_catalog.py` structure using vitest:

```typescript
import { describe, it, expect } from "vitest";
import { loadSchemaRules } from "../src/workflow/schema-rules";
import { validateFormat2Strict, validateFormat2Lax,
         validateNativeStrict, validateNativeLax } from "../src/workflow/validate";

const catalog = loadSchemaRules();

for (const rule of catalog) {
  describe(`schema rule: ${rule.id}`, () => {
    for (const fixture of rule.tests.positive) {
      it(`positive ${fixture} passes both lax and strict`, () => {
        const wf = loadFixture(fixture);
        expect(() => validatorFor(fixture, "lax")(wf)).not.toThrow();
        expect(() => validatorFor(fixture, "strict")(wf)).not.toThrow();
      });
    }
    for (const fixture of rule.tests.negative) {
      const scope = rule.scope;
      it(`negative ${fixture} matches scope=${scope}`, () => {
        const wf = loadFixture(fixture);
        if (scope === "both" || scope === "strict") {
          expect(() => validatorFor(fixture, "strict")(wf)).toThrow();
        }
        if (scope === "strict") {
          expect(() => validatorFor(fixture, "lax")(wf)).not.toThrow();
        }
        if (scope === "both" || scope === "lax") {
          expect(() => validatorFor(fixture, "lax")(wf)).toThrow();
        }
      });
    }
  });
}
```

### 2.4 Byte-identical pass/fail gate

The goal is zero per-impl escape hatches. CI check: TS schema-rule runner and Python `test_schema_rules_catalog.py` produce the same `{rule_id, fixture, scope}` pass/fail matrix. Implemented as a cross-repo snapshot:

- gxformat2 CI emits `schema_rules_matrix.json` listing pass/fail for every `(rule_id, fixture, validator)` combination, committed as a golden.
- TS CI regenerates the same JSON from its runner and diffs byte-for-byte against the Python golden fetched from gxformat2 release.
- Any mismatch is a hard CI failure in the TS repo. Fix path: align the Effect schema or the Python schema so they agree; do not add an exclusion.

This replaces v2's "allow `only: [python]` escape hatch per rule" approach. Confidence that the schema layers can always be made to agree comes from the existing port history.

### 2.5 Effect-schema resync prerequisite (carried from v2 polish #14)

TS schema-rule tests will fail until `make sync-schema-sources && make generate-schemas` runs on the gxwf-web tree so `Literal['true']` / `Literal['0.1']` land on the Effect side. Sequenced as the first step of TS work.

### 2.6 VS Code integration (unchanged from v2 §2.6)

Schema rules don't affect VS Code — decode errors already surface through the existing validator path. Only lint rules get the `json_pointer` → LSP Range bridge.

### 2.7 TS test plan

1. Effect-schema resync.
2. Land `lint-rules.ts` + pilot (v2 §2.7 steps 1–5).
3. Add `schema-rules.ts` loader + `schema-rules-catalog.test.ts`. Run `make sync-schema-rules` + `make sync-workflow-fixtures`. Expect failures for any fixture where Effect diverges from pydantic — fix upstream, don't exclude.
4. Land byte-identical matrix gate after PR 4 (Python) ships real fixtures.
5. PR 4 (TS) per-rule lint-message migration with TODO sentinel discipline.

---

## Part 3 — Galaxy `wf_tool_state` stateful linter (unchanged from v2 Part 3)

Galaxy stateful linter adopts the `Linter` pattern and registers IDs into gxformat2's `structural` profile. Schema-rules catalog is irrelevant to Galaxy stateful work — stateful findings are lint-kind, not schema-kind. Dep bump unchanged: Galaxy requires gxformat2 ≥ PR 5 release (bumped from v2's PR 4 because schema-rule catalog lands in PR 2 alongside lint scaffolding; PR 5 is the first release with the full reduced lint-rule set).

---

## Execution order (v3)

1. **gxformat2 PR 1** — linting.py rewrite.
2. **gxformat2 PR 2** — profile module + schema-rule catalog + loader + runner. Rules land with `pending: true` placeholders.
3. **gxformat2 PR 3** — pilot lint rule (`NativeStepKeyNotInteger`).
4. **gxformat2 PR 4** — schema-rule fixture authoring + delete corresponding `ctx.error` sites. Release.
5. **TS work begins** (parallel from here):
   - Effect-schema resync prerequisite.
   - Sync `schema_rules.yml` + `lint_profiles.yml` into TS repo.
   - Land TS schema-rule runner; fix any divergences in Effect schema.
   - TS lint-side pilot + per-rule migration (v2 §2.7 / PR 4).
   - Byte-identical matrix CI gate.
6. **gxformat2 PRs 5–8** — remaining lint rule migration, profile CLI, json_pointer coverage, `--list-rules`. Release.
7. **Galaxy stateful** — dep bump to gxformat2 ≥ PR 5. `Linter` adoption + stateful rule pilot + remaining four.
8. **VS Code** — `WorkflowLintDiagnosticsRule` adapter; retirement criterion (byte-equal LSP range on ≥ 3 fixtures per rule).

## Success criteria

- `cross-project-linting.md` Rule Inventory replaced by `gxwf lint --list-rules --json` output (both `lint` and `schema` kinds).
- Every declarative lint test asserts `linter:`; every schema rule has at least one positive + one negative fixture.
- Python and TS produce byte-identical pass/fail matrices over the schema-rules catalog — no per-impl exclusions.
- VS Code receives workflow-lint diagnostics with line ranges derived from `json_pointer` (lint rules only).
- Three profile names canonical across `gxwf lint`, TS CLI, VS Code. Profiles apply to lint rules only.
- Cross-language CI byte-sync passes on lint message prose.
- All `ValidationRule` classes in VS Code have a documented retirement decision.

## Unresolved questions (v3)

- ~~**Positive-fixture reuse audit:**~~ Resolved at PR 2 landing: `real-unicycler-assembly.ga` anchors five native rules, `synthetic-basic.gxwf.yml` anchors all format2 rules. No format2 `real-*` fixtures exist yet.
- ~~**`pending: true` escape hatch:**~~ Resolved: not needed, dropped from loader + runner.
- ~~**Fixture naming convention:**~~ Resolved: negatives may be `real-hacked-*` in addition to `synthetic-*`. Use whichever produces a smaller/cleaner diff against a pristine source.
- **Schema gaps surfaced by PR 2:**
  - `Format2MissingClass` (galaxyproject/gxformat2#186) — generated `class_` field has a default, must be fixed before rule can be catalogued.
  - `SubworkflowMissingSteps` — nested subworkflows accept missing `steps`. Open an issue alongside any fix PR.
- **`--list-rules` JSON schema versioning:** since TS CI consumes it, lock a schema version field now to avoid breaking TS CI on harmless additions.
- **Which lint rules graduate into `release` over time** (tests present, tags present, no testtoolshed)? Or stay minimal by policy?
- **TS `LintMessage.json_pointer` casing:** snake_case for sync-clean diff, or camelCase for TS idiom? v2 picked snake_case; confirm.
- **Catch-all schema rule:** is there a last-resort ID for "validation failed but no catalog entry claims it" to keep CI green while authors add catalog entries, or does every new failure mode hard-fail CI until catalogued? Leaning hard-fail.

---

## Changes from v2

| Concern | Change in v3 |
|---|---|
| Inventory split | New `schema_rules.yml` catalog. Schema-redundant lint rules deleted, not kept as shims. `SubworkflowMissingSteps` moved to schema rules. |
| v2 pinned-decision #5 | Replaced by v3 #5 — immediate deletion, no migration window. |
| v2 unresolved-Q "Schema-redundant pruning timing" | Resolved: PR 4 ships deletion + fixture authoring together. |
| v2 unresolved-Q "`SchemaStrict*` sub-IDs" | Resolved: specific IDs per failure mode, anchored by fixtures. No pydantic-code introspection. |
| Scope field | New per-schema-rule `scope: strict | lax | both` field drives runner and documents extra-field vs required-field semantics. |
| Positive fixtures | Policy: prefer real workflows. |
| Byte-identical TS ↔ Python | New explicit CI gate over pass/fail matrix. Replaces v2's proposed per-impl escape hatches. |
| TS port scope | Schema-rules catalog sync + runner is a first-class TS deliverable in the plan, not a footnote. |
| `--list-rules` | Output gains `kind: lint | schema` discriminator. Byte-sync check narrows to lint entries (schema entries have no prose). |
| Galaxy dep bump | ≥ PR 5 (shifted one PR later to align with the reduced lint-rule release). |
