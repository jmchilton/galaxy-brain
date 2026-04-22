---
type: research
subtype: component
tags:
  - galaxy/client
status: draft
created: 2026-03-04
revised: 2026-04-22
revision: 2
ai_generated: true
summary: "Backend MessageException serialization to JSON and frontend parsing via simple-error.ts"
related_notes:
  - "[[Component - Agents UX]]"
---

# Galaxy Frontend Error Handling Reference

How the Galaxy frontend codebase handles, transforms, and displays errors. All paths relative to the repo root.

---

## 1. Backend Error Structure

**File:** `lib/galaxy/exceptions/__init__.py`

All API errors extend `MessageException`, which carries:
- `status_code` (HTTP status)
- `err_code` (an `ErrorCode` object from `error_codes.json`, has `.code` int and `.default_error_message`)
- `err_msg` (string, defaults to the error code's default message)
- `extra_error_info` (dict of additional context)

Concrete exceptions are organized by HTTP status: `ActionInputError` (400), `AuthenticationFailed` (401), `ItemAccessibilityException` (403), `ObjectNotFound` (404), `Conflict` (409), `InternalServerError` (500), etc.

**Serialization** (`lib/galaxy/exceptions/utils.py` -- `api_error_to_dict`):

The API serializes errors into JSON with this shape:
```python
{"err_msg": "...", "err_code": 400001, **extra_error_info}
```

The OpenAPI schema (`client/src/api/schema/schema.ts`) types this as `MessageExceptionModel`:
```ts
MessageExceptionModel: {
    err_code: number;
    err_msg: string;
};
```

---

## 2. Frontend Error Parsing

**File:** `client/src/utils/simple-error.ts`

### `errorMessageAsString(e, defaultMessage?)`

The central function for extracting a user-visible string from any error shape. Checks in order:
1. `e.response.data.err_msg` (axios-style)
2. `e.data.err_msg` (openapi-fetch error object)
3. `e.err_msg` (raw error body)
4. `e.response.statusText (status)` (fallback for HTTP errors without err_msg)
5. `e.message` (JS Error)
6. `e` itself if string

Returns a default message (`"Request failed."`) if nothing matches.

### `rethrowSimple(e)`

Extracts the message via `errorMessageAsString`, logs to console in non-test env, then `throw Error(message)`. Used in API layer functions to convert openapi-fetch error objects into plain JS Errors that callers can catch normally.

### `rethrowSimpleWithStatus(e, response?)`

Same as `rethrowSimple` but throws an `ApiError` (extends `Error`) that preserves the HTTP status code. Used when callers need to differentiate by status (e.g., 404 vs 500).

```ts
export class ApiError extends Error {
    status?: number;
}
```

### `isRetryableApiError(error)` / `MAX_RETRIES`

Checks if an `ApiError` has a retryable status (429, 500, 502, 503, 504). Used by `useKeyedCache` and `collectionElementsStore` for automatic retry logic.

---

## 3. API Client Error Handling

**File:** `client/src/api/client/index.ts`

Galaxy uses `openapi-fetch` (`createClient<GalaxyApiPaths>`). Every call returns `{ data, error, response }`. The `error` is the parsed JSON body (a `MessageExceptionModel` with `err_msg`/`err_code`).

### Standard API function pattern

The dominant pattern in `client/src/api/*.ts` files:

```ts
// client/src/api/histories.ts
export async function getMyHistories(options?) {
    const { response, data, error } = await GalaxyApi().GET("/api/histories", {
        params: { query: { ... } },
    });
    if (error) {
        rethrowSimple(error);   // or rethrowSimpleWithStatus(error, response)
    }
    return data;
}
```

Key points:
- API functions are thin wrappers that call `GalaxyApi().GET/POST/PUT/DELETE`
- On error, they call `rethrowSimple(error)` or `rethrowSimpleWithStatus(error, response)`
- This converts the openapi-fetch error object into a thrown JS `Error`/`ApiError`
- Callers (stores, components, composables) then catch with try/catch

### Rate limiter middleware

**File:** `client/src/api/client/rateLimiter.ts`

An openapi-fetch middleware that:
- Limits client-side request rate (100 requests per 3s window)
- Auto-retries GET requests that receive 429 (up to 3 times with backoff)

---

## 4. Store-Level Error Handling

### Pattern A: Single `error` ref (pageEditorStore style)

**File:** `client/src/stores/pageEditorStore.ts`

The store exposes a single `error` ref. Each async action clears it, catches errors, and sets it:

```ts
const error = ref<string | null>(null);

async function loadPages(newHistoryId: string) {
    error.value = null;
    try {
        pages.value = await fetchHistoryPages(newHistoryId);
    } catch (e: unknown) {
        error.value = errorMessageAsString(e) || ERROR_MESSAGES.loadList;
    } finally {
        isLoadingList.value = false;
    }
}
```

The component reads `store.error` and displays it as an inline alert (see section 5).

### Pattern B: Error embedded in state object

**File:** `client/src/stores/workflowLandingStore.ts`

Error is a field inside a state object rather than a top-level ref:

```ts
const claimState = ref<ClaimState>({
    workflowId: null,
    errorMessage: null,
    // ...
});

// In action:
claimState.value = {
    errorMessage: errorMessageAsString(claimError),
    // ...
};
```

### Pattern C: Options API store with `handleError` action

**File:** `client/src/stores/objectStoreInstancesStore.ts`

```ts
state: () => ({
    error: null as string | null,
}),
actions: {
    async handleError(err: unknown) {
        this.error = errorMessageAsString(err);
    },
    async fetchInstances() {
        const { data, error } = await GalaxyApi().GET("/api/object_store_instances");
        if (error) {
            this.handleError(error);
            return;   // note: does not rethrow
        }
        this.handleInit(data);
    },
}
```

### Pattern D: `rethrowSimple` in store actions (pass error to caller)

**File:** `client/src/stores/invocationStore.ts`

Some stores call `rethrowSimpleWithStatus` directly, meaning the error propagates to the calling component:

```ts
async function fetchInvocationDetails(params) {
    const { data, error, response } = await GalaxyApi().GET("...");
    if (error) {
        rethrowSimpleWithStatus(error, response);
    }
    return data;
}
```

---

## 5. Inline Error Banners (BAlert)

The primary UI pattern for displaying errors inline. Uses Bootstrap-Vue's `BAlert` with `variant="danger"`.

### Typical pattern (store-driven)

**File:** `client/src/components/PageEditor/PageEditorView.vue`

```vue
<BAlert v-else-if="store.error" variant="danger" show dismissible @dismissed="store.error = null">
    {{ store.error }}
</BAlert>
```

Key conventions:
- `variant="danger"` for errors
- `show` prop (or `:show="hasErrorMessage"`) to control visibility
- Often `dismissible` with `@dismissed` clearing the error state
- Usually placed after loading spinners in the template (`v-else-if`)

### Typical pattern (local ref)

**File:** `client/src/components/Workflow/Run/WorkflowRun.vue`

```vue
<BAlert v-if="workflowError" variant="danger" show>
    {{ workflowError }}
</BAlert>
```

### Typical pattern (computed boolean)

**File:** `client/src/components/Workflow/Import/FromFile.vue`

```vue
<BAlert :show="hasErrorMessage" variant="danger">
    {{ errorMessage }}
</BAlert>
```

### With dismissible + fade

**File:** `client/src/components/Workflow/Invocation/Export/InvocationExportWizard.vue`

```vue
<BAlert v-if="errorMessage" show dismissible fade variant="danger"
        @dismissed="errorMessage = undefined">
    {{ errorMessage }}
</BAlert>
```

### GAlert

There is a `GAlert` component used in `DiskUsageSummary.vue` but it is not widely adopted. The standard is `BAlert`.

---

## 6. Toast Notifications

### Architecture

**File:** `client/src/composables/toast.ts`

A singleton Toast component ref is set at app boot in `App.vue`:

```ts
// client/src/entry/analysis/App.vue
import { setToastComponentRef } from "@/composables/toast";
const toastRef = ref(null);
setToastComponentRef(toastRef);
```

The actual component (`client/src/components/Toast.js`) delegates to Bootstrap-Vue's `$bvToast`:

```js
showToast(message, title, variant, href) {
    this.$bvToast.toast(message, {
        variant,
        title,
        toaster: "b-toaster-bottom-right",
        appendToast: true,
        solid: true,
    });
}
```

### Usage

Two import styles:

**Composition API** -- `useToast()`:
```ts
import { useToast } from "@/composables/toast";
const toast = useToast();
toast.error(errorMessageAsString(e));
toast.success("Operation completed");
```

**Direct import** -- `Toast`:
```ts
import { Toast } from "@/composables/toast";
Toast.error(`Failed to add '${toolId}' to favorites.`);
Toast.success("Credentials group created successfully");
```

### Available methods

```ts
Toast.success(message, title?, href?)
Toast.info(message, title?, href?)
Toast.warning(message, title?, href?)
Toast.error(message, title?, href?)
```

### When to use toasts vs inline alerts

- **Toasts**: Fire-and-forget user actions (save success, copy to clipboard, delete confirmation). Also for errors in actions that don't have a natural place for inline display (e.g., drag-and-drop failures, favorite toggling).
- **Inline BAlert**: Errors that block the current view or need to persist until dismissed (form validation, page load failures, API errors that prevent rendering content).

---

## 7. Composable-Level Error Handling

### `useKeyedCache` (automatic retry)

**File:** `client/src/composables/keyedCache.ts`

A generic cache composable that stores per-key errors and automatically retries retryable API errors:

```ts
const loadingErrors = ref<{ [key: string]: Error }>({});
const retryCounts: { [key: string]: number } = {};

// In getItemById:
const canRetry = existingError
    && isRetryableApiError(existingError)
    && (retryCounts[id] ?? 0) <= MAX_RETRIES;
```

Exposes `getItemLoadError` computed for per-item error access.

### `useGenericMonitor` (polling with failure detection)

**File:** `client/src/composables/genericTaskMonitor.ts`

For background task polling. Has `requestHasFailed` ref and `failureReason` ref. Callers provide `failedCondition` and `fetchFailureReason` callbacks.

### `useJobWatcher` / `useFetchJobMonitor`

**File:** `client/src/composables/fetch.ts`

Job-specific error handling with multiple error channels:
```ts
const jobRequestError = ref<string | undefined>(undefined);
const fetchRequestError = ref<string | undefined>(undefined);
const jobFailedError = ref<string | undefined>(undefined);

// Composed into single computed:
const fetchError = computed(() =>
    fetchRequestError.value || jobRequestError.value || jobFailedError.value
);
```

### `useCallbacks` (toast on error)

**File:** `client/src/composables/datasetPermissions.ts`

A pattern combining toast with error callbacks:
```ts
export function useCallbacks(init: () => void) {
    const toast = useToast();
    async function onError(e: unknown) {
        toast.error(errorMessageAsString(e));
    }
    async function onSuccess(data: AxiosResponse) {
        toast.success(data.data.message);
        init();
    }
    return { onSuccess, onError };
}
```

---

## 8. Global Error Handling

There is **no Vue-level global error handler** (`app.config.errorHandler`, `onErrorCaptured`) in the codebase. There is also no `window.onerror` or `unhandledrejection` listener.

The closest thing to global error handling is:
- The **rate limiter middleware** on the API client (auto-retries 429s)
- The **`useKeyedCache`** composable (auto-retries retryable status codes)
- Console logging in `rethrowSimple`/`rethrowSimpleWithStatus` (logs original error in non-test env)

Unhandled promise rejections from API calls will appear as uncaught errors in the browser console.

---

## Summary: Error Flow

```
Backend MessageException
  -> serialized as { err_msg, err_code }
  -> openapi-fetch returns { data: undefined, error: { err_msg, err_code } }
  -> API layer: rethrowSimple(error) converts to Error(err_msg)
  -> Store/composable: catch(e) { error.value = errorMessageAsString(e) }
  -> Component: <BAlert variant="danger">{{ store.error }}</BAlert>
```

Or for transient actions:
```
catch(e) { Toast.error(errorMessageAsString(e)) }
```
