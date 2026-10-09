# README revision 01 review

Reviewed the uncommitted `client/README.md` diff against `da700135091` in Galaxy worktree `jest_readability_batch_01`, using the shared review-focus instructions and installed OpenAPI-MSW 0.7.0 documentation/types. No code was modified or committed.

No findings. The revision fulfills the requested wording changes:

- Removes the async-store-action example while retaining the general instruction to await an operation's returned promise.
- Removes the `useMarkdown()` example while retaining the distinction between directly invoked composables and composables requiring component context.
- Separates handler lifetime/registration guidance from the paragraph on inferred API types, followed by an explicit `response.untyped(...)` example.

The example includes `beforeEach`, imports the existing Galaxy mock helpers, initializes `server` and `http` through `useServerMock()`, and installs its handler before each test. This matches the surrounding lifetime guidance and avoids relying on an undefined handler registry or a one-time handler installation.

The untyped-response explanation correctly describes a known endpoint with a response shape missing from the generated schema. `/api/configuration` is present in the generated API paths. Installed OpenAPI-MSW documentation and types confirm that `response.untyped(response)` permits a non-schema response inside a typed handler; a path missing entirely from the schema instead requires `http.untyped`. The revision removes the old misleading absent-endpoint parenthetical without implying that `response.untyped` bypasses path typing.

This change affects documentation only. No test, typecheck, or browser rerun was necessary; earlier test-refactor validation remains applicable. Independently checked `git diff --check`. Existing unrelated typed example payloads were outside this revision's scope.
