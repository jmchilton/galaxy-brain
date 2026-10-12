# Independent review: StsDownloadButton

Approve. Compared final worker commit `d36d89c5213cf5e89cbc14810b33fe505232d0a8` with base `4451d737bde7225529f3c476ef48299c6e921b27`, read the download component, short-term-storage monitor/download composables, and canonical deferred helper, applying current README/shared review priorities.

All six original cases and thirteen original checks remain: fallback open, successful navigation, waiting spinner transition, ready and not-ready replies after unmount with no extra polling/navigation, and late preparation with zero polling. The original authentic network responses, request counts, spy checks, unmount-before-release order, 200 ms poll delay, ten-delay late-poll observation, and two-delay late-preparation observation remain. The last observation now advances fake time instead of waiting 400 ms of wall-clock time.

Owned real Pinia is passed with native global plugins; automatic unmount precedes clearing timers and restoring timers/spies. Canonical deferred promises replace manual resolvers, and finally blocks unmount any remaining wrapper and release/flush outstanding responses even on failure. This makes the existing cancellation cases failure-safe rather than allowing pending intercepted requests to escape.

The added seventh case intentionally exercises a pending poll followed by an HTTP 500 and verifies four public results: spinner shown, exact error toast, spinner cleared, and no download navigation. Author evidence isolates 63 accidental baseline error-flow locations to the original waiting wrapper's missing unmount; the explicit case retains that coverage through an intentional contract. Default V8 retains 30 files/353 original locations, and actual shared GButton retains 57 locations, with no losses.

Independent shuffled seed 620201 passes seven cases and seventeen checks. No original assertion was weakened, no production or supporting file changed, and no new shared abstraction or evidence-backed README gap was identified.
