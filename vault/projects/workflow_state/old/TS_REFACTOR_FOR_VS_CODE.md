  ---
  What Can Move Upstream

  The big finding: substantial duplication already exists

  @galaxy-tool-util/schema already exports selectWhichWhen — the exact conditional branch resolver Phase 5
   would build locally. And ToolStateValidator is already there. And ToolParameterModel types all exist in
   bundle-types.ts — they're just not exported from the index. Our toolStateTypes.ts is an incomplete
  duplicate of types that exist upstream.

  Here's a breakdown by layer:

  ---
  Priority 1 — Types and type guards (small upstream PR, eliminate toolStateTypes.ts)

  @galaxy-tool-util/schema/src/index.ts exports ToolParameterBundleModel but not the individual types. The
   whole toolStateTypes.ts we wrote for Phases 3/4 (SelectParam, BooleanParam, SectionParam, RepeatParam,
  ConditionalParam, type guards) are incomplete reimplementations of what's in bundle-types.ts.

  Upstream PR: Add to schema/src/index.ts:
  export type {
    ToolParameterModel,
    SelectParameterModel, BooleanParameterModel,
    SectionParameterModel, RepeatParameterModel,
    ConditionalParameterModel, ConditionalWhen,
  } from "./schema/bundle-types.js"

  And add type guards:
  export function isSelectParam(p: ToolParameterModel): p is SelectParameterModel { ... }
  export function isBooleanParam(p: ToolParameterModel): p is BooleanParameterModel { ... }
  // etc.

  Extension shim: toolStateTypes.ts becomes a one-line re-export file (or disappears). The
  completion/validation/hover services import from the upstream package. Critical fix: our
  ConditionalParam is missing discriminator and is_default_when on whens — the upstream ConditionalWhen
  has both, and discriminator is correctly typed as string | boolean (for boolean conditionals), not just
  string.

  ---
  Priority 1 — Phase 5 conditional filtering (use selectWhichWhen, don't write our own)

  selectWhichWhen(conditional, state) is already exported from @galaxy-tool-util/schema. It handles both
  select and boolean discriminators, exact match + default fallback. Phase 5 does not need to write this
  logic.

  The extension shim for conditional filtering becomes:
  import { selectWhichWhen } from "@galaxy-tool-util/schema";

  // Read the conditional's value object from the YAML AST
  const conditionalStateDict = readObjectFromAst(conditionalValueNode);
  const activeWhen = selectWhichWhen(match, conditionalStateDict);
  const branchParams = activeWhen ? activeWhen.parameters : match.whens.flatMap(w => w.parameters);

  The only extension-specific code is readObjectFromAst — extracting a Record<string, unknown> from a YAML
   ObjectASTNode so it can be passed to selectWhichWhen. That's a thin bridge.

  ---
  Priority 2 — Parameter tree navigation (propose upstream utility)

  navigateParams (completion) and findParamAtPath (hover) both walk the parameter tree by path segment.
  There's no upstream equivalent — walkNativeState/walkFormat2State are leaf visitors, not path
  navigators. But this function is generic enough to be useful to any consumer (gxwf-web, a future
  native-format completer, etc.).

  Proposed upstream function in @galaxy-tool-util/schema:
  /**
   * Find the ToolParameterModel at the given path segments within a param tree.
   * Handles sections, repeats (skips numeric segments), and conditionals.
   * Returns undefined if the path doesn't resolve.
   */
  export function findParamAtPath(
    params: ToolParameterModel[],
    path: (string | number)[]
  ): ToolParameterModel | undefined

  This replaces both navigateParams's tree-walking and findParamAtPath in the hover service. The extension
   keeps the LSP-specific parts (name vs. value mode detection, CompletionItem building, markdown
  rendering) but the core tree walk moves upstream.

  Estimated upstream work: ~40 lines. Extension shim: completion and hover services call findParamAtPath
  instead of their own recursion.

  ---
  Priority 2 — Validation: ToolStateValidator is close but not a drop-in

  ToolStateValidator.validateFormat2Step() exists and is exported. It uses Effect Schema via
  validateFormat2StepState with onExcessProperty: "ignore" — meaning it does not catch unknown parameter
  keys. Our local ToolStateValidationService does catch unknown keys (Phase 4's primary validation). The
  upstream also returns flat { path: string, message: string, severity } with dot-separated paths, not AST
   node ranges.

  So there are two gaps to close before using it:
  1. Unknown key validation — either add to ToolStateValidator with an option flag, or run
  createFieldModel with onExcessProperty: "error" for this check (the strict-checks.ts file shows this
  pattern)
  2. Path → AST range mapping — given path: "mode_cond.fast_param", navigate the YAML AST to find the node
   and return its range

  Proposed upstream addition:
  // In ToolStateValidator:
  async validateFormat2StepStrict(
    toolId: string, toolVersion: string | null,
    format2State: Record<string, unknown>
  ): Promise<ToolStateDiagnostic[]>
  // Uses onExcessProperty: "error" → catches unknown keys

  Extension shim for validation: A thin converter toolStateDiagnosticToLsp(diag, nodeManager, stateNode)
  that maps the dot-path back to a Range via YAML AST traversal (~30 lines). The bulk of
  ToolStateValidationService (all the recursive validateStateNode logic) would disappear.

  This is the most impactful migration but requires the two upstream additions above.

  ---
  Priority 3 — ParsedTool.inputs typing

  @galaxy-tool-util/core's ParsedTool.inputs is typed as S.Array$<typeof S.Unknown> — the extension gets
  unknown[] from getToolParameters() and casts it to ToolParam[]. Once the individual types are exported
  from @galaxy-tool-util/schema, this cast should be tightened: ToolRegistryService.getToolParameters()
  should return ToolParameterModel[] | null instead of unknown[] | null. Requires coordinating between
  core and schema packages since they're separate packages (core doesn't depend on schema currently).

  ---
  What stays in the extension (these are genuinely shim territory)

  - findStateInPath — YAML AST path detection for state: / tool_state: keys
  - findSourceInPath — ditto for source: in in: blocks
  - getStringPropertyFromStep — YAML AST property extraction
  - readObjectFromAst (new, for selectWhichWhen bridge)
  - pathToYamlRange (new, for validation diagnostic mapping)
  - nameCompletionItem, valueCompletionItem — LSP CompletionItem builders
  - buildParamHoverMarkdown — markdown rendering
  - workflowConnectionService — YAML step graph extraction

  ---
  Suggested order

  1. Upstream PR to @galaxy-tool-util/schema: Export individual ToolParameterModel types + type guards
  from index → unblocks everything else
  2. Refactor extension: Replace toolStateTypes.ts with upstream imports; fix ConditionalParam.whens to
  use correct upstream type (getting discriminator: string | boolean for free)
  3. Phase 5A: Use selectWhichWhen directly — conditional branch filtering becomes a ~10-line bridge
  4. Upstream PR: Add findParamAtPath utility → consolidate navigateParams / findParamAtPath in extension
  5. Upstream PR: Add strict mode to ToolStateValidator → simplify ToolStateValidationService to thin shim
   with path→range mapping