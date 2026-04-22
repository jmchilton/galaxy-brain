# Workflow Linting & Validation in galaxy-workflows-vscode

## Short Answer

Yes — both language services perform validation, but in different ways. The `gxformat2` service is much richer. Neither one is called "linting" internally; it all flows through the LSP **diagnostics** system.

---

## Architecture Overview

```
document open/change
    ↓
GalaxyWorkflowLanguageServerImpl.onDidChangeContent()
    ↓
languageService.parseDocument()  →  DocumentContext (AST + raw text)
documentsCache.addOrReplaceDocument()
    ↓
languageService.validate(documentContext, validationProfile)
    │
    ├─ doValidation()          ← format-specific, always runs
    │   ├─ syntax check        (YAML/JSON parser errors)
    │   ├─ schema validation   (against Galaxy workflow schema)
    │   └─ tool state check    (gxformat2 only, against tool cache)
    │
    └─ profile.rules.forEach(rule.validate())   ← pluggable best-practice rules
    ↓
connection.sendDiagnostics({ uri, diagnostics })
```

The whole thing is driven by `server/packages/server-common/src/server.ts` around line 174–183.

---

## The Two Language Services

### `gx-workflow-ls-format2` (`.gxwf.yml` / `.gxwf.yaml`)

Three validation streams always run, results combined:

| Stream | Source tag | What it checks |
|--------|-----------|----------------|
| YAML syntax | `"YAML Syntax"` | Parser errors |
| Schema validation | `"Format2 Schema"` | Fields, types, enums against Galaxy workflow schema from `@galaxy-tool-util/schema` |
| Tool state validation | `"Tool State"` | The `state:`/`tool_state:` blocks inside steps against cached tool parameter definitions |

### `gx-workflow-ls-native` (`.ga` JSON)

One stream:

| Stream | Source tag | What it checks |
|--------|-----------|----------------|
| JSON schema | `"Native Workflow Schema"` | vscode-json-languageservice validates the document against the Galaxy native workflow JSONSchema |

No separate tool state validation — the JSON schema covers the structure adequately.

---

## Validation Profiles (Best-Practice Rules)

On top of the baseline validation, a **profile** selects a set of pluggable rules. The user picks `"basic"` or `"iwc"` via `galaxyWorkflows.validation.profile` in VS Code settings.

### Rule hierarchy

```
NoOpValidationProfile
  └─ BasicCommonValidationProfile  (shared by all formats)
       ├─ StepExportErrorValidationRule    — error if Galaxy embedded an error in export
       └─ TestToolshedValidationRule       — error if referencing test toolshed
            └─ IWCCommonValidationProfile
                 ├─ RequiredPropertyValidationRule("release", error)
                 ├─ RequiredPropertyValidationRule("creator", warning)
                 └─ RequiredPropertyValidationRule("license", warning)
```

Format-specific profiles extend this:

**GxFormat2IWCValidationProfile** adds:
- `RequiredPropertyValidationRule("doc", warning)` — top-level description
- `ChildrenRequiredPropertyValidationRule("steps", "doc", warning)` — every step needs a doc
- `InputTypeValidationRule(error)` — input `default:` value matches declared `type:`

**NativeIWCValidationProfile** adds:
- `RequiredPropertyValidationRule("annotation", warning)`
- `WorkflowOutputLabelValidationRule(error)` — every `workflow_output` must have a `label`

### The `ValidationRule` interface

Every rule is just:

```typescript
interface ValidationRule {
  validate(documentContext: DocumentContext): Promise<Diagnostic[]>;
}
```

Rules navigate the workflow via `ASTNodeManager` — a uniform API over both JSON and YAML ASTs — so format doesn't matter inside the rule body.

---

## Tool State Validation (the interesting one)

`ToolStateValidationService` (`gx-workflow-ls-format2/src/services/toolStateValidationService.ts`) is the most sophisticated checker. It:

1. Finds all steps with a `state:` or `tool_state:` block
2. Looks up the tool in the local cache (`~/.galaxy/tool_info_cache` by default)
3. Calls `validateFormat2StepStateStrict()` from `@galaxy-tool-util/schema` — the same upstream Python-based validator
4. Maps the raw results back to LSP `Diagnostic` objects with source ranges

If the tool isn't cached it emits an informational diagnostic asking the user to run "Populate Tool Cache". Auto-resolution can be enabled to fetch tools from the ToolShed in the background.

Diagnostic remapping:
- **Excess properties** → Warning: `"Unknown tool parameter 'foo'."`
- **Bad values** → Error: `"Invalid value 'bar' for 'baz'. Must be one of: …"`

---

## Where Things Live

| Path | Role |
|------|------|
| `server/packages/server-common/src/server.ts` | Triggers validation on document events |
| `server/packages/server-common/src/languageTypes.ts` | `LanguageService`, `ValidationRule`, `ValidationProfile` interfaces |
| `server/packages/server-common/src/providers/validation/profiles.ts` | Common (shared) profiles |
| `server/packages/server-common/src/providers/validation/rules/` | Common rules |
| `server/gx-workflow-ls-format2/src/profiles.ts` | gxformat2-specific profiles |
| `server/gx-workflow-ls-format2/src/services/schemaValidationService.ts` | Schema validation |
| `server/gx-workflow-ls-format2/src/services/toolStateValidationService.ts` | Tool state validation |
| `server/gx-workflow-ls-format2/src/validation/rules/` | Format2-specific rules |
| `server/gx-workflow-ls-native/src/profiles.ts` | Native-specific profiles |
| `server/gx-workflow-ls-native/src/validation/rules/` | Native-specific rules |

---

## Adding a New Check

1. Create a class implementing `ValidationRule` in the appropriate `validation/rules/` directory.
2. Add it to the desired profile (`basic` or `iwc`) in the format's `profiles.ts`.
3. Use `documentContext.nodeManager` to navigate the AST — no need to know the underlying format.

No changes to server infrastructure needed.

---

## What's Missing / Extension Opportunities

- **Connection validation** — are step inputs actually connected to valid sources? Are types compatible at connection points?
- **Unused inputs/outputs** — no check that workflow inputs are consumed or that outputs are wired
- **Circular dependency detection** — not checked
- **Step naming conventions** — no style rules (e.g. lowercase step IDs)
- **Quick fixes / code actions** — diagnostics exist but no remediation suggestions are offered
- **Native tool state validation** — `.ga` files get schema validation but no tool-parameter-level checking
