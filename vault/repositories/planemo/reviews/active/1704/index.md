# Planemo #1704


## Marius companion #13 — 2026-10-11

[Independent fix review](marius_followup_13_2026-10-11.md). Companion #13 merged into pin-supported-galaxy-python-rebased as c38e6c179149baf424bd005f6fd400e96276c86d. Fifteen focused tests and seven cache/precedence probes passed; older-Galaxy default Python policy remains a decision. Upstream PR remains open. Decisions and follow-ups: [October ledger](../../../../../agents/planemo/PR_FOLLOW_UPS_EARLY_OCTOBER_2026.md).

## Finding 2 design follow-up — 2026-10-11

At John’s request, filed [#1738: Choose Galaxy-compatible Python defaults for older releases and local checkouts](https://github.com/galaxyproject/planemo/issues/1738). It links [Marius’s second review finding](https://github.com/galaxyproject/planemo/pull/1704#pullrequestreview-5478940924), explains why the merged missing-interpreter fallback fix does not address an available incompatible interpreter, and leaves checkout-aware defaults versus documented overrides open for design. [Tracked design context](../../../issues/needs_decision/1738/index.md).
