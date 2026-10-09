# gxformat2 #254 — user-defined tool state conversion

PR: https://github.com/galaxyproject/gxformat2/pull/254  
Reviewed head: `4fa1a464c27c029fa755ee79d78470e049ab2a1b`

## Findings

No blocking findings. The new user-tool export path preserves `tool_state`, `when`, `uuid`, and `errors`; it removes the same native bookkeeping fields as the ordinary tool path. The user-tool branch correctly bypasses the state encoder, which expects a `tool_id`.

## Checks

- Reviewed the conversion path and its round-trip tests against the TypeScript counterpart in galaxy-tool-util-ts #185.
- Focused tests: 6 passed.
- Full Python suite: 772 passed, 8 skipped.

## Related TypeScript review

See [galaxy-tool-util-ts #185](../../../../galaxy-tool-util-ts/reviews/archived/185/review.md) for two follow-up findings in the broader TypeScript PR.
