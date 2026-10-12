# Batch 60: object-store InstanceDropdown

Originator: `client/src/components/ObjectStore/Instances/InstanceDropdown.test.ts`.

Both original remove scenarios and five assertions remain: successful PUT body `{ hidden: true }`, successful removal emission, absence of error toast on success, exact failure toast message/title, and no removal emission on failure. The body check now matches the entire captured request array, preserving the original full-body comparison and additionally requiring exactly one request.

Native shallow mounting uses `global`/`props` and the actual component type, removing legacy options and the component object cast. Automatic unmount owns each wrapper, and `getComponent` identifies the required stub whose remove event is intentionally emitted directly. JSON bodies are captured as unknown values rather than asserted to an arbitrary record type. The existing template-store module mock and Toast mock remain; no real Pinia store is created by this component arrangement, so there is no additional store instance to dispose. Targeted Toast.error clearing remains, while the redundant explicit handler reset is removed because shared `useServerMock` already resets handlers after each case.

Pristine/final shuffled seed 600101: two cases pass, five assertions. V8 comparison: 25 files, 152 covered statement/function/branch-arm locations both versions; zero lost or added. Reports: `/private/tmp/readability60-dropdown-before` and `/private/tmp/readability60-dropdown-after`. This is a shallow component test; no actual shared UI child is mounted by the remove-event arrangement.

Existing README guidance covers native options, mounted instance teardown, typed setup, and stub interactions. No evidence-backed guidance gap, supporting consumer, or new shared abstraction was found. No production, supporting-test, dependency, or README edits.

Full client vue-tsc, ESLint/Prettier, and explicit pre-commit gates all passed.
