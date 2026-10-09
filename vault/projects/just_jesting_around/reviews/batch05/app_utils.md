# App URL utility — iteration 05

Selected originator: `client/src/app/utils.test.ts`.

Both cases and both exact URL assertions remain. The first still invokes `getFullAppUrl()` with the argument omitted; the second still passes `"home"`. Their expected outputs remain `http://localhost/` and `http://localhost/home`.

Flattened two redundant “test app utils”/“test getFullAppUrl” describe layers into the function name. Replaced identical case names with the actual omitted-path and appended-relative-path behavior.

Reuse search inspected the implementation's `getAppRoot` dependency and existing URL utility cases. These two calls need no fixture or mount; sharing a test helper with unrelated URL validation/query functions would obscure the sole differing input. No supporting migration or new abstraction is justified.

Validation: both cases pass; scoped ESLint and Prettier pass. This is a straightforward application of existing naming guidance, with no new advice to retain.
