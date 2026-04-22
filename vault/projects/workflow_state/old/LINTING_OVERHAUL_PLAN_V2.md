# Workflow Linting Overhaul Plan — v2

Supersedes `LINTING_OVERHAUL_PLAN.md` (v1). v2 folds in subagent review findings — must-fix items resolved inline, polish items called out where they affect plan structure. Track diff at the bottom (§ Changes from v1).

Goal: give every workflow lint rule a stable identity and per-rule metadata, so that (a) declarative tests assert against rule IDs instead of message substrings, (b) the cross-project rule inventory is no longer hand-maintained, and (c) VS Code can map messages to document ranges via a `json_pointer` carried on each message.

Pattern is forked from Galaxy's `galaxy.tool_util.lint` — we take the ideas, not the dependency. Per-rule-subclass dispatch is explicitly rejected (Galaxy runs ~100 independent tree walks; gxformat2 does one). We keep the single-traversal call structure and attach per-rule metadata classes as lookup-only records.

## Decisions already pinned

1. Fork the pattern — gxformat2 does not depend on `galaxy.tool_util.lint`.
2. Keep single-traversal linting. `Linter` subclasses are metadata holders only, not dispatch units. Future refactor to per-rule passes is allowed but not in scope.
3. Galaxy-style naming — rule ID = class name. `NativeStepKeyNotInteger`, `WorkflowMissingLicense`, etc. No `A7_` numeric prefix.
4. **Profiles live in an external shared YAML mapping**, with `structural` always implicit (see §1.3 for execution semantics). Three named profiles:
   - `structural` — correctness gates. Always on unless `--no-structural` is explicitly set.
   - `best-practices` — style / discoverability. IWC publishes these.
   - `release` — stricter gates that only apply before tagging a release. Exactly one rule today (`WorkflowMissingRelease`); profile exists so we can grow into it.
   - **IWC profile = `structural ∪ best-practices ∪ release`** — `structural` enumerated explicitly so the YAML and execution semantics agree (was implicit-only in v1; see review §5).
   - Stateful checks classify as `structural` by default.
5. **Schema-redundant rules keep their `Linter` IDs** for the migration window. The "Pruning Candidates" section of `cross-project-linting.md` is **paused, not superseded**: rule IDs land first; a follow-up PR (post-PR 7) revisits whether to delete `Format2MissingClass`, `NativeMissingMarker`, `ReportMarkdownNotString`, `SchemaStrictExtraField`, `SchemaStructuralError` once schema decode emits structured errors with the same `linter:`/`json_pointer:` shape. This makes profile YAML stable now and lets pruning be a behavior change tracked separately. (Resolves review §10 / must-fix #7.)
6. **`profiles.yml` path is locked to `gxformat2/lint_profiles.yml`** (sibling of `lint.py`, not under `schema/`). Reasoning: not schema-build coupled, doesn't trigger the build_schema regeneration flow, simpler import path. (Resolves must-fix #6 + answers v1 unresolved-Q1.)
7. **Profile loaders tolerate unknown rule IDs.** gxformat2 owns the YAML; consumers (TS, Galaxy) load only the IDs they implement and silently drop the rest. A separate audit-mode CI check (one in each repo) flags unimplemented IDs as `INFO`, not failure. (Resolves must-fix #2.)

## Glossary

- **Rule** — a single lint check, e.g. "step key is not a numeric string".
- **`Linter`** — metadata class describing a rule (id, default severity, docstring, default profile membership for bootstrapping).
- **`LintMessage`** — one structured emission: `{level, message, linter, json_pointer}`. Replaces today's bare strings.
- **`json_pointer`** — RFC 6901 pointer into the **raw workflow dict** (`/steps/0/inputs/1`). For format2 list-shape inputs, index by position; for dict-shape inputs, index by key. Pointer construction must inspect the raw shape (see §1.6).
- **Profile** — named set of rule IDs in `lint_profiles.yml`. Applied as `only_rules` filter at emission time.

---

## Part 1 — gxformat2 (Python)

### 1.1 Shape of the new `linting.py`

Replace the string-bag `LintContext` with a structured-message version. Keep the old API surface (`ctx.error(msg)`, `ctx.warn(msg)`) working as legacy shims so PR 1 is purely additive.

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
    severity: ClassVar[str] = "error"             # "error" | "warning" | "info"
    applies_to: ClassVar[List[str]] = ["format2", "native"]
    default_profiles: ClassVar[List[str]] = ["structural"]
    description: ClassVar[str] = ""

    @classmethod
    def id(cls) -> str:
        return cls.__name__


class LintMessage:
    def __init__(self, level: str, message: str,
                 linter: Optional[str] = None, json_pointer: Optional[str] = None):
        self.level = level
        self.message = message
        self.linter = linter
        self.json_pointer = json_pointer

    # Substring equality so legacy `"foo" in ctx.error_messages` tests work.
    def __eq__(self, other):
        if isinstance(other, str):
            return other in self.message
        if isinstance(other, LintMessage):
            return self.message == other.message and self.linter == other.linter
        return False


class LintContext:
    def __init__(self, level: str = "warn", training_topic: Optional[str] = None,
                 skip_rules: Optional[List[str]] = None,
                 only_rules: Optional[List[str]] = None,
                 json_pointer_prefix: str = ""):
        self.level = level
        self.training_topic = training_topic
        self.messages: List[LintMessage] = []
        self.skip_rules = set(skip_rules or [])
        self.only_rules = set(only_rules) if only_rules is not None else None
        self._pointer_prefix = json_pointer_prefix

    def child(self, json_pointer_segment: str) -> "LintContext":
        """Subworkflow context: prefixes json_pointer instead of message text.

        Replaces the v1 `[label] message` prefix on the rendered string.
        Messages emitted inside a child context get the parent's pointer
        prefix prepended to their own pointer. Message text itself is
        unchanged. Existing tests asserting on the bracketed prefix in
        message text need migration to json_pointer assertions (PR 4 task).
        """
        prefix = self._pointer_prefix + json_pointer_segment
        ctx = LintContext(level=self.level, training_topic=self.training_topic,
                          skip_rules=self.skip_rules, only_rules=self.only_rules,
                          json_pointer_prefix=prefix)
        # Share the messages list with parent so subworkflow emissions surface.
        ctx.messages = self.messages
        return ctx

    def _should_emit(self, linter_id: Optional[str]) -> bool:
        if linter_id is None:
            return True                            # legacy unlabeled messages always emit
        if self.only_rules is not None and linter_id not in self.only_rules:
            return False
        return linter_id not in self.skip_rules

    def _emit(self, level: str, message: str,
              linter: Optional[str], json_pointer: Optional[str]):
        if not self._should_emit(linter):
            return
        full_pointer = (self._pointer_prefix + json_pointer) if json_pointer else (self._pointer_prefix or None)
        self.messages.append(LintMessage(level, message, linter=linter, json_pointer=full_pointer))

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

**v1 → v2 changes here:** `child()` is **kept** (review §2 noted no Python callers, but the API stays for parity with TS and for future use). The behavior changes: no message-text prefix mutation, only `json_pointer` prefixing. Subworkflow emissions still surface in the parent's `messages` list via shared reference.

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

Rule classes live in `gxformat2/lint_rules.py`. Imports at module top per CLAUDE.md.

**Inventory (v2, corrected — see review §1, §4):**

| Rule class | Severity | Applies to | Profile | Inventory ID | Notes |
|---|---|---|---|---|---|
| `Format2MissingClass` | error | format2 | structural | A1 | schema-redundant; pruned in follow-up |
| `Format2MissingSteps` | error | format2 | structural | A2 | schema-redundant |
| `NativeMissingMarker` | error | native | structural | A3 | schema-redundant |
| `NativeMarkerNotTrue` | error | native | structural | A4 | schema-redundant |
| `NativeMissingFormatVersion` | error | native | structural | A5 | schema-redundant |
| `NativeFormatVersionNotSupported` | error | native | structural | A6 | schema-redundant |
| `NativeStepKeyNotInteger` | error | native | structural | A7 | pilot rule |
| `SubworkflowMissingSteps` | error | both | structural | A8 | |
| `StepExportError` | warning | both | structural | A9 | |
| `StepUsesTestToolshed` | warning | both | structural | A10 | |
| `WorkflowHasNoOutputs` | warning | native | structural | A11 | |
| `WorkflowOutputMissingLabel` | warning | native | structural | A12 | |
| `OutputSourceNotFound` | error | format2 | structural | A13 | |
| `InputDefaultTypeInvalid` | error | format2 | structural | A14 | |
| `ReportMarkdownNotString` | error | both | structural | A15 | schema-redundant |
| `ReportMarkdownInvalid` | error | both | structural | A16 | Python-only — no TS |
| `SchemaStrictExtraField` | warning | both | structural | A17 | schema-redundant |
| `SchemaStructuralError` | error | both | structural | A18 | schema-redundant |
| `WorkflowMissingAnnotation` | warning | both | best-practices | B1 | |
| `WorkflowMissingCreator` | warning | both | best-practices | B2 | |
| `WorkflowMissingLicense` | warning | both | best-practices | B3 | |
| `WorkflowMissingRelease` | error | both | release | B4 | |
| `CreatorIdentifierNotURI` | warning | both | best-practices | B5 | |
| `StepMissingLabel` | warning | both | best-practices | B6 | |
| `StepMissingAnnotation` | warning | both | best-practices | B7 | |
| `StepInputDisconnected` | warning | both | best-practices | B8 | |
| `StepToolStateUntypedParameter` | warning | both | best-practices | B9 | |
| `StepPJAUntypedParameter` | warning | native | best-practices | B10 | |
| `TrainingWorkflowMissingTag` | warning | both | best-practices | B11.a | Python-only — no TS |
| `TrainingWorkflowWrongTopic` | warning | both | best-practices | B11.b | **new in v2** (review §4) |
| `TrainingWorkflowMissingDoc` | warning | both | best-practices | B12.a | Python-only — no TS |
| `TrainingWorkflowEmptyDoc` | warning | both | best-practices | B12.b | **new in v2** (review §4) |

**Phantom rule removed:** v1's `NativeMissingSteps` is dropped — no `ctx.error` site in `lint_ga` matches; native-side `steps` absence is caught by `SchemaStructuralError` via `lint_pydantic_validation`. (Resolves must-fix #4.)

**`_lint_training` split:** v1 collapsed 4 emission sites into 2 IDs. v2 splits to 4 IDs (`TrainingWorkflowMissingTag`, `TrainingWorkflowWrongTopic`, `TrainingWorkflowMissingDoc`, `TrainingWorkflowEmptyDoc`) — one per call site. (Resolves must-fix #5.)

### 1.3 External profile YAML

Path locked: **`gxformat2/lint_profiles.yml`**. Loaded by `gxformat2/lint_profiles.py`. Synced verbatim into TS and Galaxy.

```yaml
# gxformat2/lint_profiles.yml
structural:
  - Format2MissingClass
  - Format2MissingSteps
  - NativeMissingMarker
  - NativeMarkerNotTrue
  - NativeMissingFormatVersion
  - NativeFormatVersionNotSupported
  - NativeStepKeyNotInteger
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
  - TrainingWorkflowWrongTopic
  - TrainingWorkflowMissingDoc
  - TrainingWorkflowEmptyDoc

release:
  - WorkflowMissingRelease

# Convenience profile assembled from the above
iwc:
  extends:
    - structural
    - best-practices
    - release
```

**v2 changes:** `iwc.extends` includes `structural` explicitly (resolves must-fix #3). `NativeMissingSteps` removed (must-fix #4). `TrainingWorkflow*` split to 4 entries (must-fix #5).

**Loader contract** (`gxformat2/lint_profiles.py`):

```python
def load_profiles() -> dict[str, set[str]]:
    """Return profile-name -> set-of-rule-ids, with `extends` flattened."""

def rules_for_profiles(names: Iterable[str], implemented: Optional[set[str]] = None) -> set[str]:
    """If `implemented` is provided, silently drop unknown rule IDs.
    Used by TS/Galaxy consumers that don't implement every Python rule."""
```

The loader **does not** raise on unknown IDs in `implemented` mode — that's the cross-language tolerance from pinned-decision #7. A separate `audit_unimplemented(implemented)` returns the dropped set for an info-level CI check.

**Execution semantics:** `structural` is **implicit** in CLI invocations. `gxwf lint path` runs `structural`. `gxwf lint --profile best-practices path` runs `structural ∪ best-practices`. `gxwf lint --profile iwc path` resolves `iwc.extends` (which already includes `structural`). `gxwf lint --no-structural --profile X path` is the only way to skip structural rules — used for tests, not normal operation.

### 1.4 Operation result shape (declarative tests)

`tests/test_interop_tests.py` operation wrappers gain `messages` alongside legacy `errors`/`warnings`:

```python
def _lint_native(wf_dict):
    ctx = LintContext()
    nnw = ensure_native(wf_dict)
    _lint_ga_impl(ctx, nnw, raw_dict=wf_dict)
    return {
        "errors": ctx.error_messages,                              # legacy
        "warnings": ctx.warn_messages,                             # legacy
        "error_count": len(ctx.error_messages),
        "warn_count": len(ctx.warn_messages),
        "messages": [                                              # new structured view
            {"level": m.level, "message": m.message,
             "linter": m.linter, "json_pointer": m.json_pointer}
            for m in ctx.messages
        ],
    }
```

Declarative assertions use the existing `{field: value}` path syntax:

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

### 1.5 Test plan (Python) — red-to-green per rule

v2 tightens PR 4 and PR 6 (review §6). All PRs are red-then-green.

1. **PR 1 — scaffolding.** Add `linting.py` rewrite, `Linter` base, `LintMessage`. Compat shims keep existing tests passing. Unit tests: `LintMessage.__eq__`, `skip_rules`/`only_rules` filters, `child()` json-pointer prefix composition, `messages` property contents.
2. **PR 2 — profile module.** Add `lint_profiles.py` + `lint_profiles.yml`. Unit tests: loader flattens `extends`, `rules_for_profiles` with `implemented={...}` drops unknowns silently, `audit_unimplemented` returns the dropped set, `iwc` resolves to `structural ∪ best-practices ∪ release`.
3. **PR 3 — pilot rule (A7).** Add `NativeStepKeyNotInteger` class. Update one call site in `lint_ga` with `linter=`/`json_pointer=`. Extend `_lint_native` operation result with `messages`. **Step 3a (red):** add the assertion in `lint_native.yml` first; test fails. **Step 3b (green):** wire the linter id and pointer; test passes.
4. **PR 4 — migrate remaining rules. Per-rule red-to-green discipline (review §6).** For each rule in §1.2: (a) add the assertion(s) referencing `{linter: X}` to a fixture's expectation YAML — commit; CI fails. (b) Add the `Linter` subclass + wire `linter=`/`json_pointer=` at the call site — commit; CI passes. Batch into PRs of ~5 rules to keep diffs reviewable. Acceptance: every existing `ctx.error`/`ctx.warn` site has a `linter=` kwarg; CI lint check rejects bare `ctx.error("msg")` calls outside legacy compat tests.
5. **PR 5 — profile enforcement.** Add `--profile` and `--no-structural` CLI flags. Deprecate `--skip-best-practices` (alias for one release). Tests: with `--profile structural` over a fixture with best-practice violations, those rules absent from `messages`; with `--profile iwc` on a fixture missing `release` field, `WorkflowMissingRelease` appears.
6. **PR 6 — json_pointer coverage with shape variants (review §6, §8).** Audit every rule for a meaningful pointer. **Required test fixtures** to cover both raw-shape variants:
    - format2 with `inputs:` as a list → pointer like `/inputs/0`
    - format2 with `inputs:` as a dict → pointer like `/inputs/the_input_label`
    - native steps with dict-keyed `tool_state` and PJA mappings
   
   Each rule gets at least one pointer assertion; rules with shape variants get one per shape. Pointer construction inspects the raw dict at emission time (`isinstance(raw_inputs, list)`).
7. **PR 7 — `gxwf lint --list-rules`.** Output: plain text by default, `--json` flag for machine-readable. Snapshot test against checked-in golden file. This replaces the hand-curated rule table in `cross-project-linting.md` (resolves v1 unresolved-Q "who maintains the table").

CLAUDE.md constraints: red-to-green throughout; no test removal; no fixture mutation; imports at top of file; generated schema files untouched.

### 1.6 `json_pointer` construction — explicit rule

Pointers are built against the **raw workflow dict** (the `raw_dict` parameter already threaded through `lint_format2`/`lint_ga`). Two rules:

- **Native side:** keys in `steps` are strings ("0", "1", …) — pointer is `/steps/{key}` literal. RFC 6901 dict lookup by key. Verified in review §8.
- **Format2 side:** the raw dict's `steps`/`inputs`/`outputs` may be a list OR a dict (Format2 supports both shapes). At emission time:
    ```python
    def _pointer_step(raw_dict, step_index, step_label):
        steps = raw_dict.get("steps")
        if isinstance(steps, dict):
            return f"/steps/{step_label}"
        return f"/steps/{step_index}"
    ```
   Same pattern for `inputs`/`outputs`. Helper lives in `gxformat2/lint_rules.py`. PR 6 fixtures cover both shapes per rule.

---

## Part 2 — galaxy-tool-util TypeScript (`gxwf-web` tree)

Ground truth: `/Users/jxc755/projects/worktrees/galaxy-tool-util/branch/gxwf-web`.

### 2.1 Current TS state

- `packages/schema/src/workflow/lint.ts` (480 lines): `LintContext`, `LintResult`, `lintFormat2()`, `lintNative()`, best-practices functions. Messages are plain strings. **Uses `child(prefix)`** at `lint.ts:23-40` (`_prefix`, `child()` with bracketed-prefix message mutation — same pattern v1 plan removed Python-side).
- `packages/schema/src/workflow/stateful-validate.ts`: `ToolStateDiagnostic { path, message, severity }` — already has `path`, separate pipeline.
- `packages/schema/test/declarative-normalized.test.ts` + `declarative-test-utils.ts`: harness with `value`, `value_contains`, `value_any_contains`, `value_set`, `value_type`, `value_truthy`, `value_absent`. No rule-based assertions yet.
- Fixture sync: `Makefile` targets `sync-workflow-fixtures` / `sync-workflow-expectations` via `scripts/sync-fixtures.mjs`; manifest in `scripts/sync-manifest.json`.

### 2.2 TS-side rule emission sites (full mapping retained from v1, §1.2 corrections applied)

(Full table preserved from v1 §2.2 — line citations into `packages/schema/src/workflow/lint.ts`. Rule IDs match the corrected v2 inventory.)

**Out-of-scope for TS port** (Python-only, profile YAML must tolerate): `ReportMarkdownInvalid`, `TrainingWorkflowMissingTag`, `TrainingWorkflowWrongTopic`, `TrainingWorkflowMissingDoc`, `TrainingWorkflowEmptyDoc`, `SchemaStrictExtraField`, `SchemaStructuralError`. The TS profile loader (§2.4) drops these silently; TS audit-mode CI check reports them as known-gaps.

### 2.3 TS design

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
  // ... mirror of Python table, minus out-of-scope rules
} as const satisfies Record<string, LinterMetadata>;

export type LintMessage = {
  level: "error" | "warning" | "info";
  message: string;
  linter: LinterId;
  json_pointer?: string;
};
```

**`LintContext` rewrite (v2 — addresses must-fix #1, review §2):**

The TS `LintContext.child()` bracketed-prefix pattern at `lint.ts:23-40` mirrors what Python is removing. Apply the same fix: `child()` accepts a `jsonPointerSegment` and prefixes pointers, not message text.

```typescript
// lint.ts
export class LintContext {
  messages: LintMessage[] = [];
  errors: string[] = [];                          // legacy mirror
  warnings: string[] = [];
  private _pointerPrefix: string;

  constructor(opts?: { jsonPointerPrefix?: string }) {
    this._pointerPrefix = opts?.jsonPointerPrefix ?? "";
  }

  error(message: string, opts: { linter: LinterId; json_pointer?: string }): void {
    const pointer = opts.json_pointer ? this._pointerPrefix + opts.json_pointer : (this._pointerPrefix || undefined);
    this.messages.push({ level: "error", message, linter: opts.linter, json_pointer: pointer });
    this.errors.push(message);
  }

  warn(message: string, opts: { linter: LinterId; json_pointer?: string }): void {
    const pointer = opts.json_pointer ? this._pointerPrefix + opts.json_pointer : (this._pointerPrefix || undefined);
    this.messages.push({ level: "warning", message, linter: opts.linter, json_pointer: pointer });
    this.warnings.push(message);
  }

  child(jsonPointerSegment: string): LintContext {
    const prefix = this._pointerPrefix + jsonPointerSegment;
    const ctx = new LintContext({ jsonPointerPrefix: prefix });
    // Share messages/errors/warnings arrays so subworkflow output surfaces.
    ctx.messages = this.messages;
    ctx.errors = this.errors;
    ctx.warnings = this.warnings;
    return ctx;
  }
}

export interface LintResult {
  errors: string[];
  warnings: string[];
  error_count: number;
  warn_count: number;
  messages: LintMessage[];                        // new
}
```

Breaking change: every `ctx.error(str)` / `ctx.warn(str)` call site must add `{ linter, json_pointer? }`. TypeScript enforces this at compile time. Subworkflow recursion (TS pattern is `lintNative(child, ctx.child(...))`) gets a JSON-pointer-aware child instead of a bracket-prefix child.

**Test-side change** for v1's bracketed-prefix message assertions: any TS expectation YAML asserting on `[label]` in error text needs migration to `json_pointer` assertions. PR 4 (TS) sweeps these.

### 2.4 Shared profile sync

New Makefile target `sync-lint-profiles`. Add to `scripts/sync-manifest.json`:

```json
{
  "lint-profiles": {
    "source": "${GXFORMAT2_ROOT}/gxformat2/lint_profiles.yml",
    "destination": "packages/schema/src/workflow/lint-profiles.yml"
  }
}
```

TS loader (`packages/schema/src/workflow/lint-profiles.ts`):

```typescript
const IMPLEMENTED = new Set(Object.keys(RULES));

export function rulesForProfiles(profileNames: string[]): Set<LinterId> {
  // Load YAML, flatten extends, intersect with IMPLEMENTED, return.
}

export function auditUnimplemented(): string[] {
  // Returns rule IDs in the YAML but missing from RULES — used by CI info check.
}
```

Folded into existing sync flow rather than a separate phase (resolves v1 unresolved-Q5).

### 2.5 Declarative test harness extension

Extend `declarative-test-utils.ts` `navigate()` to handle `{field: value}` path elements (matches Python's path syntax):

```typescript
if (typeof element === "object" && !Array.isArray(element) && element !== null) {
  const [key, value] = Object.entries(element)[0];
  const found = (current as any[]).find((item) => item?.[key] === value);
  if (!found) throw new Error(`No element matching ${key}=${value}`);
  current = found;
  continue;
}
```

After this change, the same expectation YAML (synced from gxformat2) runs unmodified on both vitest and pytest.

### 2.6 VS Code integration (sequencing)

Per the survey (v1 §2.6): VS Code's `server/packages/server-common/src/providers/validation/` has its own `ValidationRule` classes and does **not** call `lintFormat2`/`lintNative`. Adding `json_pointer` to TS lint messages enables a bridge:

- New adapter `WorkflowLintDiagnosticsRule` calls `lintFormat2`/`lintNative` with the active profile, maps each `LintMessage.json_pointer` → LSP `Range` via the existing AST resolver from `mapToolStateDiagnosticsToLSP()`.
- Existing `ValidationRule` classes stay during transition.
- Profile selection: VS Code setting `galaxyWorkflows.validation.profile` → maps to `["structural"]` (basic) or `["iwc"]` (which already includes structural).

**Retirement criterion (review §9):** A `ValidationRule` is fully retired when:
- (a) `WorkflowLintDiagnosticsRule` produces a diagnostic with `linter === <ID>` and matching message,
- (b) the diagnostic's LSP `Range` matches the old rule's range **byte-equal** on at least 3 representative fixtures (snapshot test),
- (c) profile membership matches (rule fires for the same profile selection).

Encoded as a snapshot test over a per-rule fixture corpus checked into the VS Code repo. Without these criteria, retirement drifts open-ended.

### 2.7 TS test plan (pilot: `NativeStepKeyNotInteger`)

1. Add `lint-rules.ts` with `RULES` containing the pilot rule.
2. Update `lint.ts:134`: `ctx.error(\`expected step_key to be integer not [${orderIndex}]\`, { linter: RULES.NativeStepKeyNotInteger.id, json_pointer: \`/steps/${orderIndex}\` })`. Compile errors at every other emission site become the explicit todo list.
3. **TODO sentinel discipline (review polish #13):** allow temporary `linter: "TODO" as LinterId` to keep the build green during PR 4. Add a CI check `npm run lint:rules` that fails if any production message has `linter === "TODO"`. Sentinel is rejected by end of PR 4.
4. Extend `navigate()` in `declarative-test-utils.ts` for `{field: value}` syntax.
5. Run `make sync-workflow-expectations` to pull in the gxformat2 PR 3 update; tests fail until step 2 lands → green after.
6. Add `make sync-lint-profiles`; snapshot test asserts `IMPLEMENTED ∩ load_profiles().structural` matches a checked-in golden (not strict YAML equality — known gaps allowed).

### 2.8 TS risks / opens

- **Byte-sync risk on message text:** prose lives in two languages. CI byte-sync check (review polish #11): a small script reads both Python and TS sources, extracts the raw template string for each `linter:`, asserts equality. Runs in either repo's CI as a cross-repo check (gxformat2 publishes a JSON dump of `{rule_id: message_template}` from `gxwf lint --list-rules --json`; TS CI fetches and diffs). Land in PR 4 (last stage).
- **`child()` migration in TS** (must-fix #1): bracket-prefix call sites must move to `json_pointer` segments. Sweep is part of TS PR 4.
- **TODO sentinel cleanup**: enforced by CI per #13.
- **Effect-schema resync (review polish #14):** TS prerequisite. `cross-project-linting.md:238` notes A4/A6 pydantic schemas got `Literal['true']`/`Literal['0.1']`; the TS Effect equivalents need `make sync-schema-sources && make generate-schemas` before TS structural rules `NativeMarkerNotTrue`/`NativeFormatVersionNotSupported` agree with Python. List in §execution-order.

---

## Part 3 — Galaxy `wf_tool_state` stateful linter

Ground truth: `/Users/jxc755/projects/worktrees/galaxy/branch/wf_tool_state/lib/galaxy/tool_util/workflow_state/lint_stateful.py` (483 lines).

### 3.1 Current shape

(Unchanged from v1 — `run_structural_lint()` builds a `LintContext`, composes with `validate_workflow_cli()`. `SingleLintReport` exposes counts and per-step results; rule identity doesn't flow through.)

### 3.2 Changes

**A. Adopt the gxformat2 `Linter` pattern.** Add `galaxy/tool_util/workflow_state/lint_rules.py`:

```python
from gxformat2.linting import Linter

class ToolStateUnknownParameter(Linter):
    severity = "warning"
    applies_to = ["format2", "native"]
    default_profiles = ["structural"]

class ToolStateInvalidValue(Linter):
    severity = "error"
    default_profiles = ["structural"]

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

All five appear in `gxformat2/lint_profiles.yml` `structural` (gxformat2 owns the canonical YAML even for Galaxy-emitted rules).

**B. Route stateful emissions through `LintContext` with rule IDs.** `validate_workflow_cli()` gains an optional `lint_context` param; per-step findings emit `lint_context.warn(..., linter=ToolStateUnknownParameter.id(), json_pointer=f"/steps/{step_id}/tool_state/{param}")`. `ValidationStepResult` stays for structured report output. `SingleLintReport` adds `messages: list[LintMessage]`.

**C. Profile-driven execution.** Add `--profile structural,best-practices,release` to `gxwf lint`. `StaleKeyPolicy` remains orthogonal — it tunes severity classification *within* `StaleToolStateKeys`, not which rules run.

**D. `ToolNotInCache` severity.** Plan keeps `severity = "info"` (review v1 unresolved-Q4 — confirmed in v2 by adopting `LintLevel.INFO` as a first-class level in §1.1).

### 3.3 Galaxy test plan

1. **Discovery test:** force-import gxformat2 and Galaxy stateful rule modules; assert all five Galaxy IDs in `Linter.__subclasses__()` map onto entries in `gxformat2/lint_profiles.yml` under `structural`.
2. **Declarative interop tests:** add `lint_stateful.yml` expectations alongside Galaxy's existing `test/unit/tool_util/workflow_state/fixtures/`. Pilot case mirrors §1.4 shape with `linter: ToolStateUnknownParameter`.
3. **Red-to-green pilot:** `ToolStateUnknownParameter`. Add the `Linter` subclass; wire emission; add the declarative assertion first (red), then wire (green).
4. **CLI profile test:** `--profile structural` excludes best-practice violations; `--profile structural,best-practices` includes both.
5. **Backward-compat snapshot:** `SingleLintReport.lint_errors`/`lint_warnings` counts unchanged for every existing Galaxy fixture.

### 3.4 Galaxy risks / opens

- gxformat2 already a dep of `galaxy.tool_util.workflow_state` (`lint_stateful.py:16`).
- **Galaxy depends on gxformat2 ≥ PR 4 release** (review polish #12 — corrected from v1's "PR 7"). Galaxy needs `Linter` base + `LintContext.messages` + `lint_profiles.yml`; doesn't need `--list-rules`.
- `StaleKeyPolicy` vs profiles: orthogonal axes documented in code header.
- `child()` semantics: gxformat2's v2 `child()` is JSON-pointer-only; Galaxy stateful doesn't currently call `child()`, so no impact.

---

## Execution order (v2)

1. **gxformat2 PRs 1–3** — linting.py rewrite (`child()` json-pointer mode), profile module + `lint_profiles.yml`, pilot rule A7. Release new gxformat2 version. Path locked at `gxformat2/lint_profiles.yml`.
2. **gxformat2 PR 4** — migrate remaining rules with per-rule red-to-green discipline. Release.
3. **TS work begins** (in parallel from this point):
   - **Prerequisite:** TS Effect-schema resync (`make sync-schema-sources && make generate-schemas` on the gxwf-web tree) so A4/A6 baseline matches Python. (review polish #14)
   - TS pilot + harness extension; sync `lint_profiles.yml` via new manifest entry.
   - TS PR 4 (per-rule migration); CI gates: no `linter: "TODO"` in production code, byte-sync check on shared message templates.
4. **gxformat2 PRs 5–7** — profile CLI flag, full json_pointer coverage with shape-variant fixtures, `--list-rules`. Generates the JSON consumed by TS CI byte-sync.
5. **Galaxy stateful** — bump gxformat2 dep to ≥ PR 4 release. Add `lint_rules.py`, pilot `ToolStateUnknownParameter`, then remaining four. Snapshot tests guard `SingleLintReport` counts.
6. **VS Code** — `WorkflowLintDiagnosticsRule` adapter consumes TS lint with `json_pointer`. Retire duplicate `ValidationRule` classes one at a time using the byte-equal range snapshot criterion (§2.6).

## Success criteria

- `cross-project-linting.md` Rule Inventory replaced by the generated output of `gxwf lint --list-rules --json`. Hand-curation stops.
- Every declarative lint test asserts `linter:` (in addition to or instead of `value_contains:`).
- VS Code receives workflow-lint diagnostics with line ranges derived from `json_pointer`.
- Three profile names canonical across `gxwf lint`, the TS CLI, and VS Code.
- Cross-language CI byte-sync check passes (no Python ↔ TS message prose drift on shared rules).
- All `ValidationRule` classes in VS Code have a documented retirement decision (kept indefinitely, scheduled, or already retired with byte-equal proof).

## Unresolved questions (v2)

- **Schema-redundant pruning timing:** §pinned-decision-5 defers pruning. When? After PR 7? Tied to a gxformat2 minor-version bump? Confirm a target.
- **`SchemaStrictExtraField` / `SchemaStructuralError` sub-IDs:** pydantic batch-emits N errors per `ValidationError`. Currently each gets the same `linter:` + a `json_pointer` from `error["loc"]`. OK, or want per-pydantic-error-code rule IDs (e.g. `SchemaExtraField_StepInputs`)?
- **`StepConnectionsInconsistent` flag-gating:** keep `--connections` even within `structural` profile, or auto-on once rule-ID plumbing lands?
- **`--list-rules` JSON schema stability:** TS CI consumes the JSON dump. Lock the field shape or version it?
- **Which rules graduate into `release` over time** (tests present, tags present, no testtoolshed)? Or stay minimal by policy?
- **TS `LintMessage.json_pointer` casing:** snake_case (matches Python, matches sync) or camelCase (TS idiomatic)? Plan picks snake_case for sync-clean diff; revisit if it offends TS reviewers.

---

## Changes from v1

| Concern (review §) | Resolution in v2 |
|---|---|
| Must-fix #1 — TS `child()` migration | §2.3 rewrites TS `LintContext.child()` to JSON-pointer prefixing; PR 4 (TS) sweeps call sites. |
| Must-fix #2 — Profile YAML unknown-rule tolerance | §pinned-decision-7 + §1.3 `rules_for_profiles(implemented=...)` silently drops unknowns; audit-mode CI flags as INFO. |
| Must-fix #3 — `iwc` missing `structural` | §1.3 `iwc.extends` lists `structural` explicitly. |
| Must-fix #4 — `NativeMissingSteps` phantom | Removed from §1.2 inventory and §1.3 YAML. |
| Must-fix #5 — `_lint_training` 4 sites → 4 IDs | §1.2 splits to `TrainingWorkflowMissingTag` / `WrongTopic` / `MissingDoc` / `EmptyDoc`. |
| Must-fix #6 — Profile YAML path | §pinned-decision-6 locks `gxformat2/lint_profiles.yml`. |
| Must-fix #7 — Schema-redundant rule pruning conflict | §pinned-decision-5 defers pruning to a follow-up; v2 keeps IDs registered. |
| Polish #8 — PR 4 red-to-green | §1.5 PR 4 spells out per-rule red-then-green commit discipline. |
| Polish #9 — PR 6 pointer test scope | §1.5 PR 6 + §1.6 require list-shape AND dict-shape fixtures per rule with shape variants. |
| Polish #10 — VS Code retirement criterion | §2.6 byte-equal range on ≥ 3 fixtures per rule. |
| Polish #11 — CI byte-sync check | §2.8 + §execution-order PR 4 (TS) gate. |
| Polish #12 — Galaxy gxformat2 dep version | §3.4 corrected to "≥ PR 4 release". |
| Polish #13 — TS TODO sentinel | §2.7 step 3 + §2.8 — CI `npm run lint:rules` rejects `"TODO"` after PR 4. |
| Polish #14 — Effect-schema resync prereq | §execution-order step 3 lists as TS prerequisite. |
| Polish #15 — "who maintains the table" | §1.5 PR 7 + §success-criteria — `--list-rules` is the answer. |
| Polish #16 — Severity column uniformity | §1.2 table has dedicated severity column for every rule. |
