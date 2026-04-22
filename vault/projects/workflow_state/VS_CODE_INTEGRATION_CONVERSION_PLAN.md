# 6E: Conversion Commands — Detailed Implementation Plan

**Goal:** "Convert to Format2" / "Convert to Native" commands that transform the active workflow document and display the result in a diff editor.

**Library:** `@galaxy-tool-util/schema` already exports `toFormat2Stateful()` and `toNativeStateful()`. No Python subprocess needed.

**Reference pattern:** Closely mirrors `cleanWorkflowText()` / `CleanWorkflowService` / `CleanWorkflowCommand` / `CleanWorkflowDocumentProvider`.

---

## Architecture Overview

```
Client command (ConvertToFormat2Command / ConvertToNativeCommand)
  → sends CONVERT_WORKFLOW_CONTENTS request (contents + targetFormat)
  → ConvertWorkflowService delegates to languageService.convertWorkflowText()
  → Format2 service: YAML.parse → buildToolInputsResolver → toNativeStateful → JSON.stringify
  → Native service:  JSON.parse → buildToolInputsResolver (new) → toFormat2Stateful → YAML.stringify
  → returns { contents: string }
Client receives converted text
  → ConvertedWorkflowDocumentProvider stores text under galaxy-converted-workflow: URI
  → opens document, sets language ID explicitly (VSCode can't auto-detect for custom schemes)
  → opens vscode.diff(originalUri, convertedUri)
```

---

## Step-by-Step Implementation

### Step 1: Request definitions (`shared/src/requestsDefinitions.ts`)

Add after the existing `CleanWorkflowContentsResult` block:

```typescript
export interface ConvertWorkflowContentsParams {
  contents: string;
  targetFormat: "format2" | "native";
}

export interface ConvertWorkflowContentsResult {
  contents: string;
  error?: string;
}
```

Add to `LSRequestIdentifiers` namespace:

```typescript
export const CONVERT_WORKFLOW_CONTENTS = "galaxy-workflows-ls.convertWorkflowContents";
```

---

### Step 2: `convertWorkflowText()` on the `LanguageService` interface

**File:** `server/packages/server-common/src/languageTypes.ts`

Add to the `LanguageService<T>` interface (after `cleanWorkflowText`):

```typescript
/**
 * Converts workflow text to the target format.
 * Format2 service converts to native; native service converts to format2.
 * Throws if the targetFormat is not supported by this language service.
 */
convertWorkflowText(text: string, targetFormat: "format2" | "native"): Promise<string>;
```

Add default in `LanguageServiceBase`:

```typescript
public async convertWorkflowText(_text: string, targetFormat: "format2" | "native"): Promise<string> {
  throw new Error(`Conversion to ${targetFormat} is not supported by this language service.`);
}
```

**Rationale:** Unlike `cleanWorkflowText` (safe no-op default), conversion is format-specific — throwing is the right default.

---

### Step 3: Format2 `convertWorkflowText()` (format2 → native only)

**File:** `server/gx-workflow-ls-format2/src/languageService.ts`

```typescript
public override async convertWorkflowText(text: string, targetFormat: "format2" | "native"): Promise<string> {
  if (targetFormat !== "native") {
    throw new Error(`Format2 service only supports conversion to native; got '${targetFormat}'.`);
  }
  const dict = YAML.parse(text) as Record<string, unknown>;
  const toolInputsResolver = await this.buildToolInputsResolver(dict);
  const noopResolver: ToolInputsResolver = (_toolId: string, _toolVersion: string | null) => undefined;
  const { workflow } = toNativeStateful(dict, toolInputsResolver ?? noopResolver);
  return JSON.stringify(workflow, null, 4) + "\n";
}
```

**Import to add:** `toNativeStateful` from `@galaxy-tool-util/schema`

**Notes:**
- `buildToolInputsResolver` is already present (private, used by `cleanWorkflowText`). Reuse as-is.
- `toNativeStateful` signature: `(raw: unknown, resolver: ToolInputsResolver) => StatefulNativeResult` — resolver is **required**, not optional.
- `ToolInputsResolver` is `(toolId: string, toolVersion: string | null) => ToolParameterModel[] | undefined`. The no-op must match this signature exactly — a bare `() => undefined` will not typecheck.
- The existing `buildToolInputsResolver` already uses `null` for missing toolVersion, consistent with the resolver contract.

---

### Step 4: Native `convertWorkflowText()` (native → format2)

**File:** `server/gx-workflow-ls-native/src/languageService.ts`

#### 4a: Inject `ToolRegistryService`

The native service currently only injects `SymbolsProvider`. Add injection:

```typescript
import { TYPES, ToolRegistryService } from "@gxwf/server-common/src/languageTypes";

@injectable()
export class NativeWorkflowLanguageServiceImpl extends LanguageServiceBase<NativeWorkflowDocument> {
  constructor(
    @inject(TYPES.SymbolsProvider) private symbolsProvider: SymbolsProvider,
    @inject(TYPES.ToolRegistryService) private toolRegistryService: ToolRegistryService
  ) {
    super(LANGUAGE_ID);
    // ...
  }
}
```

**No changes to `server/gx-workflow-ls-native/src/inversify.config.ts` needed.** Native's config imports the shared `container` instance from `@gxwf/server-common/src/inversify.config` and adds module bindings to it. `TYPES.ToolRegistryService` is already bound as a singleton in the shared container — the injection will resolve automatically.

#### 4b: Implement `buildToolInputsResolver()` for native

Native `.ga` workflows have steps as an **array** (not a dict like Format2):

```typescript
private async buildToolInputsResolver(
  workflowDict: Record<string, unknown>
): Promise<ToolInputsResolver | undefined> {
  const steps = workflowDict.steps;
  if (!Array.isArray(steps)) return undefined;

  const prefetched = new Map<string, unknown[]>();

  for (const step of steps) {
    if (!step || typeof step !== "object" || Array.isArray(step)) continue;
    const stepObj = step as Record<string, unknown>;
    const toolId = typeof stepObj.tool_id === "string" ? stepObj.tool_id : null;
    const toolVersion = typeof stepObj.tool_version === "string" ? stepObj.tool_version : null;
    if (!toolId) continue;
    const params = await this.toolRegistryService.getToolParameters(toolId, toolVersion ?? undefined);
    if (params) {
      prefetched.set(`${toolId}|${toolVersion ?? ""}`, params);
    }
  }

  if (prefetched.size === 0) return undefined;
  return (toolId, toolVersion) =>
    prefetched.get(`${toolId}|${toolVersion ?? ""}`) as ReturnType<ToolInputsResolver>;
}
```

**Key difference from format2:** `steps` is iterated as an array, not via `Object.values()`.

#### 4c: Implement `convertWorkflowText()`

```typescript
public override async convertWorkflowText(text: string, targetFormat: "format2" | "native"): Promise<string> {
  if (targetFormat !== "format2") {
    throw new Error(`Native service only supports conversion to format2; got '${targetFormat}'.`);
  }
  const dict = JSON.parse(text) as Record<string, unknown>;
  const toolInputsResolver = await this.buildToolInputsResolver(dict);
  const noopResolver: ToolInputsResolver = (_toolId: string, _toolVersion: string | null) => undefined;
  const { workflow } = toFormat2Stateful(dict, toolInputsResolver ?? noopResolver);
  return YAML.stringify(workflow, { lineWidth: 0 });
}
```

**Imports to add:**

```typescript
import { toFormat2Stateful, type ToolInputsResolver } from "@galaxy-tool-util/schema";
import YAML from "yaml";
```

---

### Step 5: `ConvertWorkflowService` (server-side request handler)

**File:** `server/packages/server-common/src/services/convertWorkflow.ts` (new file)

```typescript
import { ServiceBase } from "./serviceBase";
import { GalaxyWorkflowLanguageServer } from "../languageTypes";
import {
  ConvertWorkflowContentsParams,
  ConvertWorkflowContentsResult,
  LSRequestIdentifiers,
} from "@gxwf/shared/src/requestsDefinitions";

export class ConvertWorkflowService extends ServiceBase {
  public static register(server: GalaxyWorkflowLanguageServer): ConvertWorkflowService {
    return new ConvertWorkflowService(server);
  }

  constructor(server: GalaxyWorkflowLanguageServer) {
    super(server);
  }

  protected listenToRequests(): void {
    this.server.connection.onRequest(
      LSRequestIdentifiers.CONVERT_WORKFLOW_CONTENTS,
      (params: ConvertWorkflowContentsParams) => this.onConvertWorkflowContentsRequest(params)
    );
  }

  private async onConvertWorkflowContentsRequest(
    params: ConvertWorkflowContentsParams
  ): Promise<ConvertWorkflowContentsResult> {
    try {
      const languageId = this.detectLanguageId(params.contents);
      const languageService = this.server.getLanguageServiceById(languageId);
      const contents = await languageService.convertWorkflowText(params.contents, params.targetFormat);
      return { contents };
    } catch (error) {
      return { contents: "", error: String(error) };
    }
  }

  /** Same detection logic as CleanWorkflowService.detectLanguageId() — extract to shared util if duplicated. */
  private detectLanguageId(contents: string): string {
    try {
      const parsed = JSON.parse(contents);
      if (parsed !== null && typeof parsed === "object") return "galaxyworkflow";
    } catch {
      // not JSON
    }
    return "gxformat2";
  }
}
```

**Register in** `server/packages/server-common/src/server.ts`:

```typescript
private registerServices(): void {
  CleanWorkflowService.register(this);
  ConvertWorkflowService.register(this);   // add this line
  this.toolCacheService = ToolCacheService.register(this);
}
```

---

### Step 6: Client-side virtual document provider

**File:** `client/src/providers/convertedWorkflowDocumentProvider.ts` (new file)

```typescript
import { EventEmitter, ExtensionContext, TextDocumentContentProvider, Uri, workspace } from "vscode";
import { Constants } from "../common/constants";

export function toConvertedWorkflowUri(uri: Uri): Uri {
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CONVERTED_WORKFLOW_DOCUMENT_SCHEME));
}

export class ConvertedWorkflowDocumentProvider implements TextDocumentContentProvider {
  private _contents = new Map<string, string>();

  onDidChangeEmitter = new EventEmitter<Uri>();
  onDidChange = this.onDidChangeEmitter.event;

  public static register(context: ExtensionContext): ConvertedWorkflowDocumentProvider {
    const provider = new ConvertedWorkflowDocumentProvider();
    context.subscriptions.push(
      workspace.registerTextDocumentContentProvider(
        Constants.CONVERTED_WORKFLOW_DOCUMENT_SCHEME,
        provider
      )
    );
    return provider;
  }

  public setContents(uri: Uri, contents: string): void {
    this._contents.set(uri.toString(), contents);
    this.onDidChangeEmitter.fire(uri);
  }

  public provideTextDocumentContent(uri: Uri): string {
    return this._contents.get(uri.toString()) ?? "";
  }
}
```

**Add to** `client/src/common/constants.ts`:

```typescript
CONVERTED_WORKFLOW_DOCUMENT_SCHEME = "galaxy-converted-workflow"
```

`"galaxy-converted-workflow"` does not collide with the existing `CLEAN_WORKFLOW_DOCUMENT_SCHEME = "galaxy-clean-workflow"`.

---

### Step 7: Client commands

**File:** `client/src/commands/convertWorkflow.ts` (new file)

The established pattern for commands with extra dependencies is to add constructor args on the subclass and pass only `client` to `super()` — exactly as `CompareCleanWithWorkflowsCommand` does with `comparableWorkflowProvider` and `cleanWorkflowProvider`.

**Important:** VSCode cannot auto-detect language IDs for virtual documents with custom URI schemes — language associations in `package.json` only apply to `file://` URIs. The converted document must have its language set explicitly via `languages.setTextDocumentLanguage()` before the diff is opened, otherwise both sides of the diff display plain text.

```typescript
import { BaseLanguageClient } from "vscode-languageclient";
import { Uri, commands, languages, window, workspace } from "vscode";
import { CustomCommand, getCommandFullIdentifier } from ".";
import { Constants } from "../common/constants";
import {
  ConvertWorkflowContentsParams,
  ConvertWorkflowContentsResult,
  LSRequestIdentifiers,
} from "../languageTypes";
import {
  ConvertedWorkflowDocumentProvider,
  toConvertedWorkflowUri,
} from "../providers/convertedWorkflowDocumentProvider";

abstract class ConvertWorkflowCommandBase extends CustomCommand {
  constructor(
    client: BaseLanguageClient,
    private readonly convertedProvider: ConvertedWorkflowDocumentProvider
  ) {
    super(client);
  }

  protected abstract readonly targetFormat: "format2" | "native";
  protected abstract readonly convertedTitle: string;

  async execute(): Promise<void> {
    if (!window.activeTextEditor) return;
    const { document } = window.activeTextEditor;

    const params: ConvertWorkflowContentsParams = {
      contents: document.getText(),
      targetFormat: this.targetFormat,
    };

    let result: ConvertWorkflowContentsResult | undefined;
    try {
      result = await this.client.sendRequest<ConvertWorkflowContentsResult>(
        LSRequestIdentifiers.CONVERT_WORKFLOW_CONTENTS,
        params
      );
    } catch (err) {
      window.showErrorMessage(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    if (!result) {
      window.showErrorMessage("Conversion failed: server returned no result.");
      return;
    }
    if (result.error) {
      window.showErrorMessage(`Conversion failed: ${result.error}`);
      return;
    }

    const originalUri = document.uri;
    const convertedUri = toConvertedWorkflowUri(originalUri);

    this.convertedProvider.setContents(convertedUri, result.contents);

    // Must open + set language before vscode.diff — custom URI schemes bypass
    // VSCode's file-extension language detection.
    const convertedDoc = await workspace.openTextDocument(convertedUri);
    const targetLanguageId =
      this.targetFormat === "format2"
        ? Constants.GXFORMAT2_WORKFLOW_LANGUAGE_ID
        : Constants.NATIVE_WORKFLOW_LANGUAGE_ID;
    await languages.setTextDocumentLanguage(convertedDoc, targetLanguageId);

    await commands.executeCommand(
      "vscode.diff",
      originalUri,
      convertedUri,
      `${document.fileName} ↔ ${this.convertedTitle}`
    );
  }
}

export class ConvertToFormat2Command extends ConvertWorkflowCommandBase {
  public static id = getCommandFullIdentifier("convertToFormat2");
  readonly identifier = ConvertToFormat2Command.id;
  protected readonly targetFormat = "format2" as const;
  protected readonly convertedTitle = "Converted (Format2)";
}

export class ConvertToNativeCommand extends ConvertWorkflowCommandBase {
  public static id = getCommandFullIdentifier("convertToNative");
  readonly identifier = ConvertToNativeCommand.id;
  protected readonly targetFormat = "native" as const;
  protected readonly convertedTitle = "Converted (Native .ga)";
}
```

**Error UX note:** `CleanWorkflowCommand` throws on error (silent in production — only visible in developer console). `PopulateToolCacheCommand` uses `window.showErrorMessage()`. Convert commands follow the `PopulateToolCacheCommand` pattern since a silent failure on a destructive-ish command is bad UX.

---

### Step 8: Register provider and commands

**File:** `client/src/commands/setup.ts`

```typescript
import { ConvertToFormat2Command, ConvertToNativeCommand } from "./convertWorkflow";
import { ConvertedWorkflowDocumentProvider } from "../providers/convertedWorkflowDocumentProvider";

export function setupCommands(context: ExtensionContext, client: BaseLanguageClient, gitProvider: GitProvider): void {
  const convertedProvider = ConvertedWorkflowDocumentProvider.register(context);

  // ... existing registrations unchanged ...
  context.subscriptions.push(new ConvertToFormat2Command(client, convertedProvider).register());
  context.subscriptions.push(new ConvertToNativeCommand(client, convertedProvider).register());
}
```

---

### Step 9: `package.json` command registrations

Under `contributes.commands`:

```json
{
  "command": "galaxy-workflows.convertToFormat2",
  "title": "Convert to Format2",
  "category": "Galaxy Workflows",
  "enablement": "resourceLangId == galaxyworkflow"
},
{
  "command": "galaxy-workflows.convertToNative",
  "title": "Convert to Native (.ga)",
  "category": "Galaxy Workflows",
  "enablement": "resourceLangId == gxformat2"
}
```

Under `contributes.menus.commandPalette`:

```json
{
  "command": "galaxy-workflows.convertToFormat2",
  "when": "resourceLangId == galaxyworkflow"
},
{
  "command": "galaxy-workflows.convertToNative",
  "when": "resourceLangId == gxformat2"
}
```

---

### Step 10: Tests

#### 10a: Server-side unit tests — format2 `convertWorkflowText`

**File:** `server/gx-workflow-ls-format2/tests/unit/conversion.test.ts` (new)

- Test: minimal format2 YAML input → valid JSON output (spot-check top-level keys)
- Test: `targetFormat !== "native"` throws
- Test: with no ToolRegistryService cache, conversion succeeds (no-op resolver path)
- Test: with mocked `toolRegistryService.getToolParameters()` returning params, stateful conversion uses them

**Test setup:** Mock `toolRegistryService` using the existing mock pattern from `ToolStateValidationService` tests.

#### 10b: Server-side unit tests — native `convertWorkflowText`

**File:** `server/gx-workflow-ls-native/tests/unit/conversion.test.ts` (new)

- Test: minimal native JSON input → valid YAML output
- Test: `targetFormat !== "format2"` throws
- Test: steps as array iterated correctly (not as dict)
- Test: tool_id + tool_version looked up from injected ToolRegistryService

#### 10c: Server-side integration test — `ConvertWorkflowService`

**File:** `server/packages/server-common/tests/integration/convertWorkflow.test.ts` (new)

- Test: `CONVERT_WORKFLOW_CONTENTS` for native JSON → format2 YAML succeeds
- Test: `CONVERT_WORKFLOW_CONTENTS` for format2 YAML → native JSON succeeds
- Test: error propagated correctly when conversion throws

#### 10d: Client-side unit tests — commands

**File:** `client/src/tests/commands/convertWorkflow.test.ts` (new)

- Test: `ConvertToFormat2Command.execute()` sends `CONVERT_WORKFLOW_CONTENTS` with `targetFormat: "format2"`
- Test: `ConvertToNativeCommand.execute()` sends `CONVERT_WORKFLOW_CONTENTS` with `targetFormat: "native"`
- Test: on success, `languages.setTextDocumentLanguage()` called with correct language ID, then `vscode.diff` executed
- Test: on server error, `window.showErrorMessage()` called (not throw)
- Test: on LSP rejection, `window.showErrorMessage()` called
- Test: `ConvertedWorkflowDocumentProvider.setContents()` + `provideTextDocumentContent()` round-trip

---

## Files Changed Summary

| File | Change |
|------|--------|
| `shared/src/requestsDefinitions.ts` | Add `CONVERT_WORKFLOW_CONTENTS`, `ConvertWorkflowContentsParams`, `ConvertWorkflowContentsResult` |
| `server/packages/server-common/src/languageTypes.ts` | Add `convertWorkflowText()` to interface + throwing base default |
| `server/gx-workflow-ls-format2/src/languageService.ts` | Implement `convertWorkflowText()`, import `toNativeStateful` |
| `server/gx-workflow-ls-native/src/languageService.ts` | Inject `ToolRegistryService`, add `buildToolInputsResolver()`, implement `convertWorkflowText()`, import `toFormat2Stateful` + `yaml` |
| `server/packages/server-common/src/services/convertWorkflow.ts` | **New** — `ConvertWorkflowService` |
| `server/packages/server-common/src/server.ts` | Register `ConvertWorkflowService` |
| `client/src/common/constants.ts` | Add `CONVERTED_WORKFLOW_DOCUMENT_SCHEME = "galaxy-converted-workflow"` |
| `client/src/providers/convertedWorkflowDocumentProvider.ts` | **New** — virtual document provider |
| `client/src/commands/convertWorkflow.ts` | **New** — `ConvertToFormat2Command`, `ConvertToNativeCommand` |
| `client/src/commands/setup.ts` | Register provider + two commands |
| `package.json` | Add two command contributions + command palette `when` entries |

---

## Implementation Order (red-to-green)

1. **Shared types** (Step 1) — compiles, no behavior
2. **Interface + base** (Step 2) — all existing services compile with throwing default
3. **Format2 server impl** (Step 3) — write test first (10a), then implement
4. **Native server impl** (Step 4a–4c) — write test first (10b), then implement
5. **ConvertWorkflowService** (Step 5) — write integration test first (10c), then register
6. **Client provider** (Step 6) — implement + test provider round-trip
7. **Client commands** (Step 7–8) — complete client tests (10d), implement, wire into setup
8. **package.json** (Step 9) — register; smoke-test in extension host

---

## Research Notes (resolved questions)

**Q1 — `CustomCommand` constructor:** Base class takes only `client: BaseLanguageClient`. Extra dependencies go on the subclass constructor, passed to `super(client)`. Confirmed pattern: `CompareCleanWithWorkflowsCommand(client, comparableWorkflowProvider, cleanWorkflowProvider)`. Step 7 uses this pattern.

**Q2 — Scheme collision:** `Constants.CLEAN_WORKFLOW_DOCUMENT_SCHEME = "galaxy-clean-workflow"`. New scheme `"galaxy-converted-workflow"` is the only other scheme constant — no collision.

**Q3 — `ToolInputsResolver` type:** Exact type: `(toolId: string, toolVersion: string | null) => ToolParameterModel[] | undefined`. Both `toFormat2Stateful` and `toNativeStateful` take the resolver as a **required** (not optional) second argument. A bare `() => undefined` fails the type check — the no-op must be `(_toolId: string, _toolVersion: string | null) => undefined`. Steps 3 and 4c use the correct typed no-op.

**Q4 — Diff editor language mode:** VSCode does **not** auto-detect language for custom URI schemes — `package.json` language associations apply only to `file://` URIs. The converted virtual document must have its language set via `languages.setTextDocumentLanguage()` before calling `vscode.diff`. No `setTextDocumentLanguage` calls exist elsewhere in the extension (the clean-workflow preview relies on heuristics and gets away with it for single-pane display; diff is stricter). Step 7 opens the document and sets the language explicitly before diffing.

**Q5 — Native inversify container:** Native's inversify config imports the same shared `container` instance from `@gxwf/server-common/src/inversify.config`. `TYPES.ToolRegistryService` is already bound as a singleton there. Adding `@inject(TYPES.ToolRegistryService)` to the native constructor requires zero changes to `server/gx-workflow-ls-native/src/inversify.config.ts`.

**Q6 — Error UX:** `CustomCommand.register()` has no try/catch — unhandled rejections go to the developer console only, invisible to users. `CleanWorkflowCommand` silently throws (bad precedent for a conversion command). `PopulateToolCacheCommand` uses `window.showErrorMessage()`. Convert commands follow the `PopulateToolCacheCommand` pattern: catch LSP rejections and server-returned errors, surface both via `showErrorMessage()`.
