# InteractiveTools — batch68

Originator `68fe6c142ac26edc40e877fca8b69fd230f47aca`, pinned base `a716c7d6a82a497f52a1831309c67531451c35fa`.

All five original cases/14 checks remain: table and two inline/external links, first tool name/external target, reactive removal, actual DELETE URL containing its id, and network-error store/UI messages. Original JSON values, GET-before-mount and DELETE-after-mount handlers, real store actions, initial state and first-tool selection remain. structuredClone owns each JSON fixture copy without changing its contents; canonical nth guards cover fixture/request/message indexing. A nextTick explicitly expresses the original awaited-splice reactive flush.

The local mount helper returns each case's wrapper and owned testing Pinia. Native global plugins replace the legacy top-level Pinia option, and all directly selected stores use the returned instance. Automatic unmount precedes the original mock call-history cleanup; completion disposes Pinia on failed assertions. Request capture is local to its sole scenario. The existing simple-error boundary remains deliberately mocked so the expected failed request does not escape as an unhandled rethrow. No production/shared/support/later-lane changes.

Pristine/final Node22.20 shuffled680101 pass five cases. Native V8 covered statement/function/branch-arm locations retain37files/220→226, zero loss; actual canonical shared UI retains43files/518→521, zero loss. Gains reflect genuine owned teardown, including the rendered alert path. Imported UI totals do not imply all modules render. File ESLint/Prettier and explicit absolute sample hooks pass; driver owns integrated full types. Worker clean after commit.

Evidence: /private/tmp/readability68-interactive-{before,after}, corresponding -ui JSON/logs and -eslint/-prettier/-hooks logs. No new evidence-backed guidance gap; existing native plugins, indexed access and teardown guidance covers the observed improvements.
