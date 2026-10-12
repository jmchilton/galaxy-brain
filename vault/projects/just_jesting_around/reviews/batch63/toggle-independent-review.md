# Independent review: persistentToggle

Approve. Compared final worker commit `edba1c93e72` with base `463e67451e71ef0e753cdd28a73c20279d294723`, and read persistentToggle, userLocalStorage, hashed-user-id, user-store hash lookup, persistentRef, and runInTestScope.

Both original scenarios and three assertions are unchanged: default false, explicitly initialized true, and false after toggle. The fresh Pinia has no registered current user; hashedUserId stays null, so per-user toggle storage is not synchronized in these scenarios. Salt generation is the actual storage side effect, and the new setup removes only that key, then restores its original exact value or absence rather than clearing unrelated local storage.

The effect scope owns composable watchers/computeds, Pinia owns the store effects, and their on-test-finished hooks run in reverse registration order: scoped effects stop, Pinia disposes, then the captured salt is restored. This prevents restoration from interacting with still-active persistence watchers. No scenario-owned per-user toggle keys need cleanup in the anonymous fixture boundary.

Independent shuffled seed 630201 passes two cases. Driver coverage is unchanged at four files/eleven locations. No original check was weakened, no production or supporting change occurred, and no new shared helper or evidence-backed README gap is required.
