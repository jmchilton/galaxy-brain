# adminUsers

Selected originator: `client/src/components/Grid/configs/adminUsers.test.js`. Baseline **1 test**, final **46 tests**.

The single "configuration" case packed every check into nested `for` loops over `a`/`b`/`c` booleans, indexed operations by position (`ops[7]`), and recomputed the expected value as `a && b && c`. It is now split by behaviour. One case pins the column keys. One `it.each` covers the email column's purged condition. One case pins the operation titles in menu order. Then each operation's visibility is a `describe.each` × `it.each` truth table, with the expected boolean written out in every row. An `operation(title)` lookup throws on a missing title, and `config(options)` builds the `{ value }` ref shape the conditions read. The file stays `.js`, and the stray `async` is gone.

Preserved:
- Every original combination survives as its own row. That's 2 rows for each of the five deletion-only operations (Information, Roles, Reset, Recalculate, Key), 4 for each config-gated one (Activate and Send on `user_activation_on`, Impersonate on `allow_user_impersonation`, Delete on `allow_user_deletion`), and 8 for each of Permanently Delete and Restore.
- Each condition gets the same inputs as before. Deletion-only operations get no config, and gated ones get a config holding only their flag.
- Field `type: "operations"` and the purged condition are unchanged.

Strengthened:
- `fields.length === 10` is now an exact `toEqual` over the ten keys in order.
- The eleven `toContain` substring title checks are now an exact `toEqual` over the full titles. That also pins the count and order, so the title lookups in later cases can't hide a reordering.

Reuse: no existing Grid-config test helpers or fixtures apply. `GridList.test.ts` mounts the grid with its own config, and no other config file has a test.

Validation: 46 tests pass shuffled (seed `400101`, `NODE_OPTIONS=--no-webstorage`). Scoped ESLint (`--max-warnings 0`) and Prettier pass, and so does full client `vue-tsc --noEmit`.

Guidance: none. The README's `it.each` advice for combinations already covers this.
