# Refactors Identified During 6E Review

Two small deduplication refactors uncovered during the 6E conversion command implementation review. Both are safe, mechanical changes with no behavior impact.

---

## Refactor 1: Extract `detectLanguageId` to `ServiceBase`

### Problem

`CleanWorkflowService` and `ConvertWorkflowService` each contain an identical private method:

```typescript
// server/packages/server-common/src/services/cleanWorkflow.ts:78
// server/packages/server-common/src/services/convertWorkflow.ts:47
private detectLanguageId(contents: string): string {
  try {
    const parsed = JSON.parse(contents);
    if (parsed !== null && typeof parsed === "object") return "galaxyworkflow";
  } catch {
    // not JSON
  }
  return "gxformat2";
}
```

Any future service that needs to dispatch by workflow format (e.g. a lint or validate service) will duplicate this a third time.

### Solution

Move the method to `ServiceBase` as a `protected` method so all subclasses inherit it.

### Steps

**R1-1: Add `detectLanguageId` to `ServiceBase`**

File: `server/packages/server-common/src/services/index.ts`

```typescript
export abstract class ServiceBase {
  constructor(public server: GalaxyWorkflowLanguageServer) {
    this.listenToRequests();
  }

  protected abstract listenToRequests(): void;

  /**
   * Detects workflow language ID from raw text content.
   * JSON objects → "galaxyworkflow" (native .ga), everything else → "gxformat2".
   */
  protected detectLanguageId(contents: string): string {
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

**R1-2: Remove `detectLanguageId` from `CleanWorkflowService`**

File: `server/packages/server-common/src/services/cleanWorkflow.ts`

Delete lines 78–86 (the private `detectLanguageId` method). The call sites at lines 41 and 54 are unchanged — they now resolve to the inherited method.

**R1-3: Remove `detectLanguageId` from `ConvertWorkflowService`**

File: `server/packages/server-common/src/services/convertWorkflow.ts`

Delete lines 47–55 (the private `detectLanguageId` method). The call site at line 37 is unchanged.

**R1-4: Tests**

No new tests needed. The existing `ConvertWorkflowService` unit test (`packages/server-common/tests/unit/convertWorkflow.test.ts`) already exercises language detection via the service. Verify all 318 server tests still pass.

### Files changed

| File | Change |
|------|--------|
| `server/packages/server-common/src/services/index.ts` | Add `protected detectLanguageId()` |
| `server/packages/server-common/src/services/cleanWorkflow.ts` | Delete private `detectLanguageId()` |
| `server/packages/server-common/src/services/convertWorkflow.ts` | Delete private `detectLanguageId()` |

---

## Refactor 2: Use `replaceUriScheme()` in both document provider URI helpers

### Problem

`cleanWorkflowProvider.ts` already uses the shared utility `replaceUriScheme()` from `client/src/common/utils.ts`. But the two URI helper functions in the document providers duplicate the same one-liner inline:

```typescript
// client/src/providers/cleanWorkflowDocumentProvider.ts:10-12
export function toCleanWorkflowUri(uri: Uri): Uri {
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CLEAN_WORKFLOW_DOCUMENT_SCHEME));
}

// client/src/providers/convertedWorkflowDocumentProvider.ts:7-9
export function toConvertedWorkflowUri(uri: Uri): Uri {
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CONVERTED_WORKFLOW_DOCUMENT_SCHEME));
}
```

`replaceUriScheme` in `utils.ts` does exactly the same thing but is already the established abstraction.

### Note on type mismatch

`replaceUriScheme` uses `URI` (from `vscode-uri`, the Node.js-compatible type), while the provider functions use `Uri` (from `vscode`, the extension host type). The two types are structurally equivalent — `Uri.parse()` and `URI.parse()` accept the same string input — so the conversion is a no-op cast. The call sites pass `document.uri` (a `vscode.Uri`), which `toString()` handles identically.

The cleanest fix uses `replaceUriScheme` and casts: `replaceUriScheme(uri as unknown as URI, scheme) as unknown as Uri`. If that cast feels excessive, an acceptable alternative is a thin wrapper that keeps the inline logic but adds a comment referencing `replaceUriScheme`.

**Option A (use shared utility):**

```typescript
import { URI } from "vscode-uri";
import { replaceUriScheme } from "../common/utils";

export function toCleanWorkflowUri(uri: Uri): Uri {
  return replaceUriScheme(uri as unknown as URI, Constants.CLEAN_WORKFLOW_DOCUMENT_SCHEME) as unknown as Uri;
}
```

**Option B (inline with comment, no new import):**

```typescript
export function toCleanWorkflowUri(uri: Uri): Uri {
  // Same logic as replaceUriScheme() in ../common/utils — vscode.Uri vs vscode-uri.URI prevents direct reuse.
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CLEAN_WORKFLOW_DOCUMENT_SCHEME));
}
```

### Recommendation

**Option B** — the cast in Option A (`as unknown as`) is more noise than the duplication it removes. Add comments to both functions pointing at `replaceUriScheme` so the next developer understands the duplication is intentional and knows where the canonical version lives. If the codebase ever unifies `Uri` and `URI` (or the helpers move to a context that uses `vscode-uri` directly), migrate then.

### Steps

**R2-1: Add explanatory comment to `toCleanWorkflowUri`**

File: `client/src/providers/cleanWorkflowDocumentProvider.ts`

```typescript
/**
 * Converts a regular document URI to a 'clean' workflow document URI.
 * Uses the same scheme-replacement logic as replaceUriScheme() in ../common/utils,
 * but operates on vscode.Uri rather than vscode-uri.URI.
 */
export function toCleanWorkflowUri(uri: Uri): Uri {
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CLEAN_WORKFLOW_DOCUMENT_SCHEME));
}
```

**R2-2: Add explanatory comment to `toConvertedWorkflowUri`**

File: `client/src/providers/convertedWorkflowDocumentProvider.ts`

```typescript
/**
 * Converts a regular workflow document URI to a converted-workflow virtual URI.
 * Uses the same scheme-replacement logic as replaceUriScheme() in ../common/utils,
 * but operates on vscode.Uri rather than vscode-uri.URI.
 */
export function toConvertedWorkflowUri(uri: Uri): Uri {
  return Uri.parse(uri.toString().replace(uri.scheme, Constants.CONVERTED_WORKFLOW_DOCUMENT_SCHEME));
}
```

**R2-3: Tests**

No new tests needed. Existing client tests for both command files already exercise the URI conversion indirectly. Verify 43 client tests still pass.

### Files changed

| File | Change |
|------|--------|
| `client/src/providers/cleanWorkflowDocumentProvider.ts` | Add doc comment to `toCleanWorkflowUri` |
| `client/src/providers/convertedWorkflowDocumentProvider.ts` | Add doc comment to `toConvertedWorkflowUri` |

---

## Implementation Order

Both refactors are independent. Suggested order:

1. **R1** first (server-side, mechanical, fully covered by existing tests)
2. **R2** second (client-side, comment-only change)

Each is a single commit. Neither warrants its own PR — bundle together or include in the next Phase 6 PR.

---

## Unresolved Questions

1. **R2 Option A vs B**: Is the `as unknown as` double-cast acceptable here, or does the team prefer to keep the duplication explicit with comments? The recommendation above is B, but the team should decide.
2. **`detectLanguageId` test coverage**: The method will move from private to protected. Should a direct unit test be added to `ServiceBase` (or a concrete subclass) to pin the behavior, or is the indirect coverage via `ConvertWorkflowService` tests sufficient?
