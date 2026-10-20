# galaxy#24305 — The workflow API saves workflows whose outputs share a label

[Issue](https://github.com/galaxyproject/galaxy/issues/24305)

Filed 2026-10-20 from [proposal](proposal.md) ([debrief](debrief.md)); no source draft — came out of the compare-runs research ([`compare_outputs.md`](../../../../../agents/gx_issues/internally_managed/compare_outputs.md)). Assigned to jmchilton.

Server duplicate output-label check in `__walk_step_dicts` only runs for the dict form nobody sends, and checks the step label. Reproduced on dev @ `2cca856`: upload and PUT return 200, and an invocation shows 1 of 2 outputs. Server-side half of #20230, which #20335 handled in the client only.

Open: reject vs warn for old `.ga` files that already have duplicates.

Next: red API tests (upload + PUT with duplicate output labels → 400), then check the list form and drop the dict branch.
