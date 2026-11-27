# Review: output size limit allowance (`76a196cdabf`)

Approved, with no changes made. The reviewer (Sonnet) found no real problems and no way around the exact match. All 592 security unit tests pass.

Not acted on:

- **Pin `getVar('__app__.config.output_size_limit')` and the `$__app__['config']` subscript in the spec.** Both behave correctly today. Adding them would mean another rebase of branches 3 and 4 while gx_workhorse-3 is rebasing them. Fold them in at the next re-sync.
- **The comment "numbers the admin sets"** holds only while `output_size_limit` stays an int in the config schema. It is an int today.
- **Turn the `elif ... pass` into a one-line guard.** Style only.

<details>
<summary>Details</summary>

The reviewer probed 22 synthetic templates plus 3 shadowing cases.

**Still flagged high:**
- Any attribute or method past the limit: `.__class__`, `.real`, `.bit_length()`, `.__str__.__globals__`.
- Subscripts on `$__app__` or `$__app__.config`.
- `getVar(...)` of a longer chain.
- Bare `$__app__`.
- `#set $__app__` shadowing: the later read is allowed, but the tainted value is still caught by the shell-injection analysis.

**Allowed, all harmless:**
- `${...}` and `getVar` with the identical chain.
- Calling the int, which just raises.
- `#set` of the int.

The per-part reflection and model-attribute checks in `judge()` still run after the allowance.

No existing allowlist fits this case. `SAFE_SPECIALS` covers names Galaxy injects per job. A frozenset of tuples next to `_HARMLESS_MODULES` and `_OS_HARMLESS` matches their style. The match on `tuple(rest)` is exact, so it can't be widened by a prefix.

</details>
