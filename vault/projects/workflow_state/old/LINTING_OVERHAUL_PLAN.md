 # Workflow Linting Overhaul Plan

Goal: give every workflow lint rule a stable identity and per-rule metadata, so that (a) declarative tests can assert against rule IDs instead of message substrings, (b) the cross-project rule inventory is no longer hand-maintained, and (c) VS Code can map messages to document ranges via a `json_pointer` carried on each message.

Pattern is forked from Galaxy's `galaxy.tool_util.lint` — we take the ideas, not the dependency. Per-rule-subclass dispatch is explicitly rejected (Galaxy runs ~100 independent tree walks; gxformat2 does one). We keep the single-traversal call structure and attach per-rule metadata classes as lookup-only records.

## Decisions already pinned

1. Fork the pattern — gxformat2 does not depend on `galaxy.tool_util.lint`.
2. Keep single-traversal linting. `Linter` subclasses are metadata holders only, not dispatch units. Future refactor to per-rule passes is allowed but not in scope here.
3. Galaxy-style naming — rule ID = class name. `NativeStepKeyNotInteger`, `WorkflowMissingLicense`, etc. No `A7_` numeric prefix.
4. Profiles live in an **external shared JSON mapping**, not on the class. Three profiles:
   - `structural` — correctness gates. Workflow is broken if these fire.
   - `best-practices` — style / discoverability. IWC publishes these.
   - `release` — stricter gates that only apply before tagging a release (today: `release:` field present). Exactly one rule at start; profile exists so we can grow into it.
   - IWC profile = `best-practices ∪ release`.
   - Stateful checks (Galaxy-side tool state validation) classify as `structural` by default — they're correctness gates against tool definitions, not style.

## Glossary

- **Rule** — a single lint check, e.g. "step key is not a numeric string".
- **`Linter`** — metadata class describing a rule (id, default severity, docstring, defaults for profile membership so discovery tooling can bootstrap the external JSON).
- **`LintMessage`** — one structured emission: `{level, message, linter, json_pointer}`. Replaces today's bare strings.
- **`json_pointer`** — RFC 6901 pointer into the raw workflow dict (`/steps/0/inputs/1`). Consumer (VS Code) maps pointer → document range.
- **Profile** — named set of rule IDs. External JSON. Applied as `skip_types` inverted: running a profile = "only run rules whose IDs are in this profile's set".

---

## Part 1 — gxformat2 (Python)

### 1.1 Shape of the new `linting.py`

Replace the string-bag `LintContext` with a structured-message version. Keep the old API surface (`ctx.error(msg)`, `ctx.warn(msg)`) working as legacy shims so the first patch is purely additive.

```python
# gxformat2/linting.py (new)

from __future__ import annotations
from enum import IntEnum
from typing import ClassVar, List, Optional


class LintLevel(IntEnum):
    SILENT = 5
    ERROR = 4
    WARN = 3
    INFO = 2
    VALID = 1
    ALL = 0


class Linter:
    """Metadata-only base class for lint rules.

    Subclasses never need to be instantiated. They exist so rule identity,
    default severity, and human docs live in one place next to the code
    that emits the message.
    """

    # class name is the id; override only if needed
    severity: ClassVar[str] = "error"             # "error" | "warning" | "info"
    applies_to: ClassVar[List[str]] = ["format2", "native"]
    default_profiles: ClassVar[List[str]] = ["structural"]
    description: ClassVar[str] = ""

    @classmethod
    def id(cls) -> str:
        return cls.__name__


class LintMessage:
    def __init__(
        self,
        level: str,
        message: str,
        linter: Optional[str] = None,
        json_pointer: Optional[str] = None,
    ):
        self.level = level
        self.message = message
        self.linter = linter
        self.json_pointer = json_pointer

    # Keep substring equality so legacy `"foo" in ctx.error_messages` tests work.
    def __eq__(self, other):
        if isinstance(other, str):
            return other in self.message
        if isinstance(other, LintMessage):
            return self.message == other.message and self.linter == other.linter
        return False


class LintContext:
    def __init__(self, level: str = "warn", training_topic: Optional[str] = None,
                 skip_rules: Optional[List[str]] = None, only_rules: Optional[List[str]] = None):
        self.level = level
        self.training_topic = training_topic
        self.messages: List[LintMessage] = []
        self.skip_rules = set(skip_rules or [])
        self.only_rules = set(only_rules) if only_rules is not None else None

    def _should_emit(self, linter_id: Optional[str]) -> bool:
        if linter_id is None:
            return True                            # legacy unlabeled messages always emit
        if self.only_rules is not None and linter_id not in self.only_rules:
            return False
        return linter_id not in self.skip_rules

    def _emit(self, level: str, message: str, linter: Optional[str], json_pointer: Optional[str]):
        if self._should_emit(linter):
            self.messages.append(LintMessage(level, message, linter=linter, json_pointer=json_pointer))

    def error(self, message: str, *args, linter: Optional[str] = None,
              json_pointer: Optional[str] = None, **kwds):
        if args or kwds:
            message = message.format(*args, **kwds)
        self._emit("error", message, linter, json_pointer)

    def warn(self, message: str, *args, linter: Optional[str] = None,
             json_pointer: Optional[str] = None, **kwds):
        if args or kwds:
            message = message.format(*args, **kwds)
        self._emit("warning", message, linter, json_pointer)

    # --- Backward-compat views used by tests/test_interop_tests.py ---
    @property
    def error_messages(self) -> List[str]:
        return [m.message for m in self.messages if m.level == "error"]

    @property
    def warn_messages(self) -> List[str]:
        return [m.message for m in self.messages if m.level == "warning"]

    @property
    def found_errors(self) -> bool:
        return any(m.level == "error" for m in self.messages)

    @property
    def found_warns(self) -> bool:
        return any(m.level == "warning" for m in self.messages)
```

Notes:
- `LintContext.child(prefix)` is removed — subworkflow prefixing moves into `json_pointer` instead of mangling the message string. Today's `[subworkflow-label] ` prefix disappears from the rendered text; tests that assert that prefix literally need updating or moved to `json_pointer` checks. Flag for the execution.
- `LintMessage.__eq__` preserves substring matching so the existing declarative `value_contains` assertions keep passing.

### 1.2 Rule registry

Each rule gets a small class next to its call site. The body stays inline in the single traversal — the class is just metadata.

```python
# gxformat2/lint.py (diff against today)

class NativeStepKeyNotInteger(Linter):
    severity = "error"
    applies_to = ["native"]
    default_profiles = ["structural"]
    description = "Native workflow step keys must be numeric strings ('0', '1', ...)."


# call site inside lint_ga():
for order_index_str, step in nnw.steps.items():
    if not order_index_str.isdigit():
        lint_context.error(
            "expected step_key to be integer not [{value}]",
            value=order_index_str,
            linter=NativeStepKeyNotInteger.id(),
            json_pointer=f"/steps/{order_index_str}",
        )
```

The initial rule classes map 1:1 to the inventory in `cross-project-linting.md`:

| Rule class | Profile default | Inventory ID |
|---|---|---|
| `NativeMissingMarker` | structural | A3 |
| `NativeMarkerNotTrue` | structural | A4 |
| `NativeMissingFormatVersion` | structural | A5 |
| `NativeFormatVersionNotSupported` | structural | A6 |
| `NativeMissingSteps` | structural | A2/A3 variant |
| `NativeStepKeyNotInteger` | structural | A7 |
| `SubworkflowMissingSteps` | structural | A8 |
| `StepExportError` | structural | A9 (`warning`) |
| `StepUsesTestToolshed` | structural | A10 (`warning`) |
| `WorkflowHasNoOutputs` | structural | A11 (`warning`) |
| `WorkflowOutputMissingLabel` | structural | A12 (`warning`) |
| `OutputSourceNotFound` | structural | A13 |
| `InputDefaultTypeInvalid` | structural | A14 |
| `ReportMarkdownNotString` | structural | A15 |
| `ReportMarkdownInvalid` | structural | A16 |
| `SchemaStrictExtraField` | structural (`warning`) | A17 |
| `SchemaStructuralError` | structural | A18 |
| `Format2MissingClass` | structural | A1 |
| `Format2MissingSteps` | structural | A2 |
| `WorkflowMissingAnnotation` | best-practices | B1 |
| `WorkflowMissingCreator` | best-practices | B2 |
| `WorkflowMissingLicense` | best-practices | B3 |
| `WorkflowMissingRelease` | release | B4 |
| `CreatorIdentifierNotURI` | best-practices | B5 |
| `StepMissingLabel` | best-practices | B6 |
| `StepMissingAnnotation` | best-practices | B7 |
| `StepInputDisconnected` | best-practices | B8 |
| `StepToolStateUntypedParameter` | best-practices | B9 |
| `StepPJAUntypedParameter` | best-practices | B10 |
| `TrainingWorkflowMissingTag` | best-practices | B11 |
| `TrainingWorkflowMissingDoc` | best-practices | B12 |

All classes live in a single `gxformat2/lint_rules.py` module so that `gxformat2/lint.py` imports them near the top of the file (no inline imports) and downstream (Galaxy, TS codegen tooling) can enumerate them via `Linter.__subclasses__()`.

### 1.3 External profile JSON

Shared, format-neutral, checked into gxformat2 so both Python and TS consume the same file.

```yaml
# gxformat2/schema/linting/profiles.yml
structural:
  - NativeMissingMarker
  - NativeMarkerNotTrue
  - NativeMissingFormatVersion
  - NativeFormatVersionNotSupported
  - NativeStepKeyNotInteger
  - NativeMissingSteps
  - SubworkflowMissingSteps
  - StepExportError
  - StepUsesTestToolshed
  - WorkflowHasNoOutputs
  - WorkflowOutputMissingLabel
  - OutputSourceNotFound
  - InputDefaultTypeInvalid
  - ReportMarkdownNotString
  - ReportMarkdownInvalid
  - SchemaStrictExtraField
  - SchemaStructuralError
  - Format2MissingClass
  - Format2MissingSteps
  # Stateful rules (owned by Galaxy, registered here so profile membership is canonical)
  - ToolStateUnknownParameter
  - ToolStateInvalidValue
  - ToolNotInCache
  - StaleToolStateKeys
  - StepConnectionsInconsistent

best-practices:
  - WorkflowMissingAnnotation
  - WorkflowMissingCreator
  - WorkflowMissingLicense
  - CreatorIdentifierNotURI
  - StepMissingLabel
  - StepMissingAnnotation
  - StepInputDisconnected
  - StepToolStateUntypedParameter
  - StepPJAUntypedParameter
  - TrainingWorkflowMissingTag
  - TrainingWorkflowMissingDoc

release:
  - WorkflowMissingRelease

# Convenience profile assembled from the above; IWC = best-practices + release
iwc:
  extends:
    - best-practices
    - release
```

Loader sits in `gxformat2/lint_profiles.py`:

```python
def load_profiles() -> dict[str, set[str]]:
    """Return profile-name -> set-of-rule-ids, with `extends` flattened."""
    ...

def rules_for_profiles(names: Iterable[str]) -> set[str]:
    ...
```

CLI: `gxwf lint --profile structural,best-practices path.yml`. Deprecate `--skip-best-practices` in favor of the profile flag but keep it as alias for one release.

### 1.4 `lint_stateful_lite` wrapper for declarative tests

`tests/test_interop_tests.py` today returns `{errors, warnings, error_count, warn_count}`. Extend to also return structured diagnostics without breaking old assertions:

```python
def _lint_native(wf_dict):
    ctx = LintContext()
    nnw = ensure_native(wf_dict)
    _lint_ga_impl(ctx, nnw, raw_dict=wf_dict)
    return {
        "errors": ctx.error_messages,          # legacy
        "warnings": ctx.warn_messages,         # legacy
        "error_count": len(ctx.error_messages),
        "warn_count": len(ctx.warn_messages),
        "messages": [                          # new structured view
            {"level": m.level, "message": m.message,
             "linter": m.linter, "json_pointer": m.json_pointer}
            for m in ctx.messages
        ],
    }
```

Declarative assertions then support rule-ID navigation via the existing `{field: value}` path syntax:

```yaml
test_lint_native_non_integer_step_key:
  fixture: synthetic-lint-non-integer-step.ga
  operation: lint_native
  assertions:
    - path: [messages, {linter: NativeStepKeyNotInteger}, level]
      value: error
    - path: [messages, {linter: NativeStepKeyNotInteger}, json_pointer]
      value: /steps/step_one
    - path: [messages, {linter: NativeStepKeyNotInteger}, message]
      value_contains: "integer"
```

### 1.5 Test plan (Python)

Red-to-green throughout. Each step should be one PR.

1. **PR 1 — scaffolding.** Add `linting.py` rewrite + `Linter` base + `LintMessage`. Keep `LintContext.error()`/`warn()` unchanged in signature so no call site moves. All existing tests pass (the compat shims keep the legacy `error_messages: List[str]` view working). Add unit tests for `LintMessage` equality, `LintContext.skip_rules`, `only_rules`, `messages` property.
2. **PR 2 — profile module.** Add `lint_profiles.py` + the YAML file. Unit tests: loader flattens `extends`, rejects unknown rules (cross-check against `Linter.__subclasses__()` after forcing subclass imports), `iwc` resolves to `best-practices ∪ release`.
3. **PR 3 — pilot rule (A7).** Add `NativeStepKeyNotInteger` class in `lint_rules.py`. Update the one call site in `lint_ga` to pass `linter=`/`json_pointer=`. Extend `_lint_native` operation result with `messages`. Update `lint_native.yml` declarative fixture for `test_lint_native_non_integer_step_key` to assert on `messages[{linter: ...}]`. This is the red-to-green: the assertion fails before the linter-id wiring, passes after.
4. **PR 4 — migrate remaining rules.** Mechanically add a `Linter` subclass per existing `ctx.error`/`ctx.warn` site. No behavior change. Add declarative `messages[{linter: ...}]` assertions to at least one expectation per rule (can reuse the existing fixture set). Remove the substring assertions once the ID-based one passes.
5. **PR 5 — profile enforcement.** Add `--profile` CLI flag; deprecate `--skip-best-practices` (keep as alias). Tests: run lint with `--profile structural` over a fixture that has best-practice violations, assert best-practice rules are absent from `messages`. Same with `--profile best-practices,release` on a fixture missing `release`.
6. **PR 6 — json_pointer coverage.** Audit every rule for a meaningful pointer. Anything without one gets a `# TODO json_pointer` comment and an explicit `json_pointer=None` pass. Declarative tests for at least 5 rules assert pointer shape.
7. **PR 7 — rule-metadata enumeration endpoint.** Add `gxwf lint --list-rules` that prints the rule table (id, severity, profiles, applies_to, description). Test: snapshot test against the generated table. This is the mechanism that replaces the hand-curated `cross-project-linting.md` rule table.

CLAUDE.md constraints honored: red-to-green throughout, no test removal, no data mutation, imports at top of file (no per-method imports), no hand-edits to generated schema.

---

## Part 2 — galaxy-tool-util TypeScript (`gxwf-web` tree)

Ground truth: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/gxwf-web`. Research survey integrated below; key citations use TS-side file:line.

### 2.1 Current TS state (from the survey)

- `packages/schema/src/workflow/lint.ts` (480 lines): exports `LintContext`, `LintResult`, `lintFormat2()`, `lintNative()`, best-practices functions. Messages are plain strings on `ctx.errors: string[]` / `ctx.warnings: string[]`. `LintResult = { errors, warnings, error_count, warn_count }`. No rule metadata, no pointer, no severity classes.
- `packages/schema/src/workflow/stateful-validate.ts` defines `ToolStateDiagnostic { path, message, severity }`. Already has `path` — closer to what we want than the lint side, but a separate pipeline.
- `packages/schema/src/workflow/report-models.ts` is pure CLI output shape. No rule metadata.
- Declarative test harness: `packages/schema/test/declarative-normalized.test.ts` loads YAML expectations; runner `declarative-test-utils.ts` supports `value`, `value_contains`, `value_any_contains`, `value_set`, `value_type`, `value_truthy`, `value_absent`. No rule-based assertion mode yet.
- Fixture sync: `Makefile` targets `sync-workflow-fixtures` and `sync-workflow-expectations`, driven by `scripts/sync-fixtures.mjs` with manifest in `scripts/sync-manifest.json`. Source paths relative to `${GXFORMAT2_ROOT}`. Flow fails if divergence or missing files detected.

### 2.2 TS-side rule emission sites (from survey; use for mapping)

| File:line | Message (abbrev.) | Rule ID |
|---|---|---|
| `lint.ts:74` | "tool step contains error indicated during Galaxy export" | `StepExportError` |
| `lint.ts:80` | "test tool shed" | `StepUsesTestToolshed` |
| `lint.ts:93` | "markdown to be of class string" | `ReportMarkdownNotString` |
| `lint.ts:110/112` | `a_galaxy_workflow` absent/not true | `NativeMissingMarker` / `NativeMarkerNotTrue` |
| `lint.ts:117/119` | `format-version` absent / != 0.1 | `NativeMissingFormatVersion` / `NativeFormatVersionNotSupported` |
| `lint.ts:124` | native steps absent | `NativeMissingSteps` |
| `lint.ts:134` | step_key integer | `NativeStepKeyNotInteger` |
| `lint.ts:147/251` | subworkflow empty steps | `SubworkflowMissingSteps` |
| `lint.ts:160/163` | no outputs / output without label | `WorkflowHasNoOutputs` / `WorkflowOutputMissingLabel` |
| `lint.ts:194` | outputSource not found | `OutputSourceNotFound` |
| `lint.ts:212/216/220` | invalid default type | `InputDefaultTypeInvalid` |
| `lint.ts:233` | format2 steps absent | `Format2MissingSteps` |
| `lint.ts:236` | format2 class absent | `Format2MissingClass` |
| `lint.ts:340/373` | input disconnected (both paths) | `StepInputDisconnected` |
| `lint.ts:346` | step missing annotation | `StepMissingAnnotation` |
| `lint.ts:351` | step missing label | `StepMissingLabel` |
| `lint.ts:357` | untyped tool_state param | `StepToolStateUntypedParameter` |
| `lint.ts:362/381` | untyped PJA param | `StepPJAUntypedParameter` |
| `lint.ts:395` | workflow not annotated | `WorkflowMissingAnnotation` |
| `lint.ts:402` | missing creator | `WorkflowMissingCreator` |
| `lint.ts:410` | creator identifier not URI | `CreatorIdentifierNotURI` |
| `lint.ts:422` | missing license | `WorkflowMissingLicense` |

Gap vs Python inventory: TS does not implement `ReportMarkdownInvalid` (A16), `TrainingWorkflowMissingTag/Doc` (B11/B12), schema strict/lax lint (A17/A18). Those stay unported — out of scope.

### 2.3 TS design (adopted verbatim into this plan)

Use object-literal + Record, not class-as-metadata. Rule IDs are branded strings.

```typescript
// packages/schema/src/workflow/lint-rules.ts (new)

export type LinterId = string & { readonly __brand: "LinterId" };

export interface LinterMetadata {
  id: LinterId;
  severity: "error" | "warning" | "info";
  appliesTo: readonly ("format2" | "native")[];
  defaultProfiles: readonly ("structural" | "best-practices" | "release")[];
  description: string;
}

export const RULES = {
  NativeStepKeyNotInteger: {
    id: "NativeStepKeyNotInteger" as LinterId,
    severity: "error",
    appliesTo: ["native"],
    defaultProfiles: ["structural"],
    description: "Native workflow step keys must be numeric strings.",
  },
  // ... full mirror of Python table
} as const satisfies Record<string, LinterMetadata>;

export type LintMessage = {
  level: "error" | "warning" | "info";
  message: string;
  linter: LinterId;
  json_pointer?: string;       // snake_case matches Python result shape
};
```

`LintContext` grows structured emission:

```typescript
// lint.ts — replace today's string-bag
export class LintContext {
  messages: LintMessage[] = [];
  errors: string[] = [];       // legacy mirror, populated via getter
  warnings: string[] = [];

  error(message: string, opts: { linter: LinterId; json_pointer?: string }): void {
    this.messages.push({ level: "error", message, ...opts });
    this.errors.push(message);
  }
  warn(message: string, opts: { linter: LinterId; json_pointer?: string }): void {
    this.messages.push({ level: "warning", message, ...opts });
    this.warnings.push(message);
  }
}

export interface LintResult {
  errors: string[];
  warnings: string[];
  error_count: number;
  warn_count: number;
  messages: LintMessage[];     // new
}
```

Breaking change: every existing call site of `ctx.error(str)` must pass `linter:`. Enforced by TypeScript — a caller forgetting it won't compile. This is the point.

### 2.4 Shared profile file

Write profiles once in gxformat2 (`gxformat2/schema/linting/profiles.yml`), sync to TS the same way fixtures are synced. New Makefile target `sync-lint-profiles`:

```make
sync-lint-profiles:
    node scripts/sync-fixtures.mjs --group lint-profiles
```

Manifest entry in `packages/schema/scripts/sync-manifest.json`:

```json
{
  "lint-profiles": {
    "source": "${GXFORMAT2_ROOT}/gxformat2/schema/linting/profiles.yml",
    "destination": "packages/schema/src/workflow/lint-profiles.yml"
  }
}
```

TS loader parses at build or test time; no runtime YAML parse on the hot path.

### 2.5 Declarative-test assertions for the TS harness

Extend `declarative-test-utils.ts` path navigation to match the Python `{field: value}` syntax so the same expectation YAML works on both sides:

```typescript
// In navigate(), when a path element is a plain object (not array / not string / not int)
if (typeof element === "object" && !Array.isArray(element) && element !== null) {
  const [key, value] = Object.entries(element)[0];
  const found = (current as any[]).find((item) => item?.[key] === value);
  if (!found) throw new Error(`No element matching ${key}=${value}`);
  current = found;
  continue;
}
```

After the change, the identical YAML assertion from §1.4 runs unmodified on both vitest and pytest.

### 2.6 VS Code integration

Per the survey: `server/packages/server-common/src/providers/validation/` has its own `ValidationRule` classes (`TestToolShedValidationRule`, `StepExportErrorValidationRule`, `RequiredPropertyValidationRule`). It does **not** call `lintFormat2`/`lintNative`. Adding `json_pointer` to TS lint messages creates the bridge:

- Write a thin adapter `WorkflowLintDiagnosticsRule` that calls `lintFormat2`/`lintNative` with the active profile and maps each `LintMessage.json_pointer` to an LSP `Range` via the existing AST range resolver already used by `mapToolStateDiagnosticsToLSP()`.
- Existing `ValidationRule` classes stay for now — they provide rules the lint engine doesn't yet have (`WorkflowOutputLabelValidationRule` with per-output range) — and are retired as equivalent lint rules are added + pointer-backed.
- Profile selection plumbs through: VS Code setting `galaxyWorkflows.validation.profile` → `profile: "basic" | "iwc"` → map to `["structural"]` or `["structural", "best-practices", "release"]`.

Out of scope for this plan: actually retiring the duplicate `ValidationRule` classes. That's a follow-up once `json_pointer` coverage is proven on the pilot.

### 2.7 TS test plan (pilot: `NativeStepKeyNotInteger`)

1. Add `lint-rules.ts` with the `RULES` record (initially just the pilot).
2. Update `lint.ts:134` to call `ctx.error(msg, { linter: RULES.NativeStepKeyNotInteger.id, json_pointer: \`/steps/${orderIndex}\` })`. Compile error on every other `ctx.error`/`ctx.warn` call — that's the todo list.
3. As a one-off, allow the other call sites to compile with a temporary `linter: "TODO" as LinterId`. Track with a commit message listing the rule-id to-assign. (Same back-compat dance as Python PR 1.)
4. Extend `navigate()` in `declarative-test-utils.ts` to handle `{field: value}` path elements.
5. Re-run `make sync-workflow-expectations` to pull in the updated `lint_native.yml` from gxformat2 (must land gxformat2 PR 3 first). Tests fail until step 2 is in place → go green after.
6. Add a `lint-profiles.yml` sync step; unit test that the loaded profile set matches the Python side (snapshot test from a checked-in golden fixture).

### 2.8 TS risks / opens (surfaced by the survey — decisions noted)

- **Byte-sync risk** on message text: lint rules in both languages currently share prose. Keep that. Prose drift would silently break `value_contains` assertions; linter-id assertions are immune. Post-migration, tests should prefer `{linter: X}, message, value_contains: Y` only where the message carries semantic information (e.g. actual step key), not for rule identification.
- **Rule ID casing**: PascalClass names — same in both languages. Python `NativeStepKeyNotInteger` class, TS `"NativeStepKeyNotInteger" as LinterId` string literal.
- **`json_pointer` standard**: RFC 6901. Galaxy dot paths (used in stateful diagnostics) remain their own convention; converter lives on the consumer side, not here.
- **Profile ownership**: gxformat2 is the owner. TS and Galaxy sync. Chosen over "monolithic config repo" fear because the file is ~50 lines of YAML and rule IDs are already concentrated in gxformat2's inventory.
- **Legacy `errors`/`warnings` bags**: kept on both sides for now. Deprecated when the last non-test consumer migrates.

---

## Part 3 — Galaxy `wf_tool_state` stateful linter

Ground truth: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/lint_stateful.py`. 483 lines, composes gxformat2's lint + state validation.

### 3.1 Current shape

- `run_structural_lint()` builds a `LintContext` and calls `lint_format2`/`lint_ga` + `lint_pydantic_validation` + `lint_best_practices_*`. Returns the context.
- `lint_single()` / `run_lint_stateful()` compose that with `validate_workflow_cli()` (stateful per-step checks).
- `SingleLintReport` exposes `lint_errors`, `lint_warnings`, `results` (per-step state results). Rule identities don't flow through.
- Stateful failures today are emitted as `ValidationStepResult` objects keyed by step id; category attribution goes through the `StaleKeyPolicy` (`stale_keys.py:44`).
- Policy flags `--allow` / `--deny` today select *which stale-key categories fail validation*, not which rules run. Different axis from our profile concept.

### 3.2 What changes

**A. Adopt the gxformat2 `Linter` pattern for stateful checks.** Add a `galaxy/tool_util/workflow_state/lint_rules.py` module mirroring gxformat2's style:

```python
from gxformat2.linting import Linter

class ToolStateUnknownParameter(Linter):
    severity = "warning"
    applies_to = ["format2", "native"]
    default_profiles = ["structural"]
    description = "tool_state contains a parameter not defined by the current tool XML."

class ToolStateInvalidValue(Linter):
    severity = "error"
    ...

class ToolNotInCache(Linter):
    severity = "info"
    default_profiles = ["structural"]

class StaleToolStateKeys(Linter):
    severity = "warning"
    default_profiles = ["structural"]

class StepConnectionsInconsistent(Linter):
    severity = "warning"
    default_profiles = ["structural"]
```

All five register in the shared `profiles.yml` under `structural` (matching the user's note that stateful checks are "in some ways structural").

**B. Route stateful emissions through `LintContext` with rule IDs.** Today stateful findings live in `ValidationStepResult`; they should *also* surface as `LintMessage` instances so a single result stream is what the CLI/VS Code consume. Concretely:

- `validate_workflow_cli()` gets an optional `lint_context: LintContext | None` parameter. When provided, each per-step finding emits `lint_context.warn(..., linter=ToolStateUnknownParameter.id(), json_pointer=f"/steps/{step_id}/tool_state/{param}")`.
- Keep `ValidationStepResult` for the structured report output. The `LintMessage` emission is additive, not replacing.
- `SingleLintReport` gains a `messages: list[LintMessage]` field alongside `lint_errors`/`lint_warnings`, mirroring the gxformat2 operation output.

**C. Profile-driven execution.** Add `--profile structural,best-practices,release` to `gxwf lint` CLI (uncovered by today's `--skip-best-practices`). `StaleKeyPolicy` remains orthogonal — it configures *severity* of stale-key hits within `StaleToolStateKeys`, not whether the rule runs.

**D. Stateful-to-lint mapping table.** Add a small module doc in `lint_stateful.py` mapping each stateful diagnostic class to a gxformat2 `Linter` ID. Used both at emission time and by tests asserting on `linter: ToolStateUnknownParameter`.

### 3.3 Galaxy test plan

1. **Unit test: `Linter.__subclasses__()` discovery.** Import both gxformat2 lint rules and Galaxy stateful lint rules; assert the five stateful IDs appear in the `structural` profile resolution.
2. **Declarative interop tests.** Galaxy's `test/unit/tool_util/workflow_state/` already has an expectations directory. Add `lint_stateful.yml` with cases like:
    ```yaml
    test_stale_cat1_keys:
      fixture: synthetic-cat1-stale.ga
      operation: lint_stateful
      assertions:
        - path: [messages, {linter: StaleToolStateKeys}, level]
          value: warning
        - path: [messages, {linter: StaleToolStateKeys}, json_pointer]
          value_contains: "/steps/"
    ```
3. **Red-to-green for the pilot.** Pick `ToolStateUnknownParameter`. Add the `Linter` subclass. Wire emission. Update declarative expectations. Verify previously green tests stay green (via legacy `errors`/`warnings` string views) while new `messages[{linter: ...}]` assertions start passing.
4. **CLI profile test.** Run `gxwf lint --profile structural` on a fixture with best-practice violations; assert only structural + stateful rules emit. Run with `--profile structural,best-practices`; assert both.
5. **Backwards-compat.** Ensure `SingleLintReport.lint_errors`/`lint_warnings` still count matches today for every existing fixture in `test/unit/tool_util/workflow_state/fixtures/`. Snapshot existing reports; regenerate; diff empty.

### 3.4 Galaxy risks / opens

- gxformat2 is already a dependency of `galaxy.tool_util.workflow_state` (see imports in `lint_stateful.py:16`). No new dep edge.
- `StaleKeyPolicy` vs. profiles: two different axes. Profiles select *which rules run*; policy selects *which stale-key categories count as failures*. Keep both; document the distinction.
- The `child()` prefix that gxformat2 removes from `LintContext` — Galaxy's stateful lint does not use `child()`, so no cascading impact. Verified.
- Sequencing: this plan lands **after** gxformat2 PRs 1–3 are merged and released (so the `LintContext`/`LintMessage`/`Linter` base class are available upstream). Pin a gxformat2 version bump in `galaxy`'s `pyproject.toml` before starting Galaxy work.

---

## Execution order

Strict sequencing (each phase is atomic on its own repo):

1. **gxformat2 PR 1–3** — linting.py rewrite, profile module, pilot rule A7. Release new gxformat2 version.
2. **galaxy-tool-util TS** — pilot rule + harness extension in parallel with gxformat2 PR 4. Sync once gxformat2 PRs 1–3 are released and `profiles.yml` lives in gxformat2.
3. **gxformat2 PR 4–7** — migrate remaining rules, add CLI profile flag, pointer coverage, `--list-rules`. TS PRs follow behind, one rule group at a time.
4. **Galaxy stateful** — bump gxformat2 dep, add `lint_rules.py`, pilot `ToolStateUnknownParameter`, then remaining four.
5. **VS Code** — introduce `WorkflowLintDiagnosticsRule` adapter using `json_pointer` for range resolution. Retire duplicate `ValidationRule` classes one-by-one.

## Success criteria

- `cross-project-linting.md` Rule Inventory tables replaced by the generated output of `gxwf lint --list-rules` (or an equivalent cross-language dump). Hand-curation of that table stops.
- Every declarative lint test asserts `linter: ...` instead of / in addition to `value_contains: "substring"`.
- VS Code receives workflow-lint diagnostics with line ranges, derived from `json_pointer` on every rule that has a meaningful location.
- Three profile names are the canonical selector across `gxwf lint`, the TS CLI, and VS Code.

## Unresolved questions

- Profile YAML location — `gxformat2/schema/linting/profiles.yml` chosen above; confirm or move to `gxformat2/lint_profiles.yml` (closer to code, no schema-build coupling)?
- Drop `child()` prefix rendering entirely vs. keep a `prefix` view on `LintMessage` rendering? Messages inside subworkflows currently read `[subwf-label] Input foo disconnected`.
- `SchemaStrictExtraField` / `SchemaStructuralError` — these are batch-emitted from `lint_pydantic_validation`; a single pydantic `ValidationError` can produce N messages. Each gets the same `linter` ID and a `json_pointer` derived from `error["loc"]` — confirm OK, or want per-pydantic-error-code rule IDs?
- `ToolNotInCache` severity — today an *info*, not emitted as warning. Plan keeps it as `severity = "info"`. Confirm gxformat2 `LintLevel.INFO` is worth plumbing (gxformat2 historically only uses error/warn)?
- Makefile target `sync-lint-profiles` — add now or fold into `sync-workflow-expectations`?
- `--list-rules` output format — plain text, JSON, or both?
- For releases — which rules beyond `WorkflowMissingRelease` graduate into the `release` profile over time (tests present, tags present, no testtoolshed, etc.)? Or stay minimal by policy?
- Stateful `StepConnectionsInconsistent` — currently `--connections` flag-gated. Keep flag-gated even inside `structural` profile, or promote once rule-ID plumbing lands?
