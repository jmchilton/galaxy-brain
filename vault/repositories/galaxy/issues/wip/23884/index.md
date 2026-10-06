# galaxy#23884 — Tool upgrade advice for `structured_like` names profile 18.01, but bare references break only at 26.0

[Issue](https://github.com/galaxyproject/galaxy/issues/23884) · [issue draft](issue_draft.md) · [proposal](proposal.md) · [debrief](debrief.md)

Upgrade advice `18_01_consider_structured_like` claims bare `structured_like` references break at profile 18.01, but the runtime gate (since [#22432](https://github.com/galaxyproject/galaxy/pull/22432)) only breaks them at 26.0 when mapped over, and the advisor stops at 24.2; filed from the [#23877](https://github.com/galaxyproject/galaxy/pull/23877) docs work; next: add `ProfileMigration26_0` with a qualified-reference code and reword or drop the 18.01 code.
