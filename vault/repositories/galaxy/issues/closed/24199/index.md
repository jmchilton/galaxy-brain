# galaxy#24199 — Workflow numeric input bounds are enforced but missing from the run form

[Issue](https://github.com/galaxyproject/galaxy/issues/24199)

Closed on GitHub as completed 2026-10-23 (sync 2026-10-26).

Filed 2026-10-16 from [proposal](proposal.md) ([source draft](raw.md), [debrief](debrief.md)). Assigned to jmchilton.

`get_runtime_inputs` forwards `in_range` validators but never sets the numeric param's `min`/`max`, so the run form's `FormNumber` gets null bounds: no slider or range warning. Same code area as #24200 (validators rewritten on import). Design the two fixes together; bounds should come from #24200's preserved validator list, with negated/repeated ranges handled conservatively.

Next: red serialization test from the proposal, then expose compatible bounds on the runtime field.
