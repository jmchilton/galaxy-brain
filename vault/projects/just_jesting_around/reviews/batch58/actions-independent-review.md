# Independent review: useWorkflowCardActions

Approve. Compared final commit `502c1d73dfba34f73bf9c087382335bd6a9d72dc` with base `59f471a92924266a30e4aa849b7b15e9539c16e7`, read the composable, user-store ownership/anonymity logic, registered-user factory, and effect-scope helper, and applied current README/shared review priorities.

Both original cases and all fourteen assertions are unchanged. The late-owner case still constructs actions before setting the current user and checks each visibility flag both before and after that transition. The layout case still compares the complete ordered action ID arrays for both list and editor views, including the two identical external-link IDs.

Each case visibly creates its own real Pinia/user store, registers disposal, and passes that store when loading the owner. The existing registered-user factory preserves id, username, and email while completing the registered-user shape without a cast. Wrapping each composable call in `runInTestScope` owns its computed effects, including both calls within the layout case; it leaves reactive late-user behavior intact. The existing confirm-dialog mock and scenario inputs remain unchanged.

Independent shuffled seed 580201 passes two cases. No assertion weakening, production change, supporting edit, new shared abstraction, or evidence-backed README gap was identified.
