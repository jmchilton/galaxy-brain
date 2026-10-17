# galaxy#24218 — Workflow editor maps collections over `:paired_or_unpaired` inputs that the server can't map over

[Issue](https://github.com/galaxyproject/galaxy/issues/24218)

Filed 2026-10-17 from [proposal](proposal.md) ([source draft](issue_draft.md), [debrief](debrief.md)). Assigned to jmchilton.

Client `canMapOver` diverges from server for 6 `paired_or_unpaired` pairs; 3 let the editor accept bad connections. Fixed on [`issue_20657_input_processing_mode`](https://github.com/jmchilton/galaxy/tree/issue_20657_input_processing_mode) (`00e2bf07047`). Backport target release_26.0 (25.1 server lacks compound support). Fix commit message repeats the wrong `paired_or_unpaired`-over-self claim; add a `terminals.test.ts` case for the 💥 rows.

Branch: [`issue_24218_can_map_over_parity_26.0`](../../../branches/active/issue_24218_can_map_over_parity_26.0/index.md) (implemented + hardened 2026-10-17; fresh commit message, terminals cases added). Land with or before #24220.
