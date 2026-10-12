# Independent review: NewUserConfirmation

Approve. Compared final worker commit `923648386d4` with base `463e67451e71ef0e753cdd28a73c20279d294723`, and read NewUserConfirmation's terms gate, provider/token parsing, registration submission, warning, terms-frame, and login rendering.

The original one-case flow and all ten assertions remain unchanged: header text, single checkbox/input type, zero posts before acceptance, one post after acceptance, provider endpoint/token, registration warning text, terms-frame source, and login link text. Required nodes now use get; all actions, awaited request settling, prop updates, request capture, and URL values retain the original behavior.

Each mount now has an owned real Pinia and in-memory router supplied with native global plugins. The local catch-all route allows the same initial confirmation path and successful registration redirect without a shared router or swallowed navigation errors. The wrapper is typed from the actual component. Automatic unmount precedes restoration of the exact original location.search property descriptor, and store disposal follows; the previous value-only restoration could leave a different property shape behind.

Independent shuffled seed 630201 passes one case. No original check was weakened, no production or supporting file changed, and no new shared abstraction or evidence-backed README gap was found.
