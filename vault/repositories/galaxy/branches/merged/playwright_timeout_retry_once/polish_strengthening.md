# Strengthening review — 2026-10-13

One fresh strengthening round returned **nothing to add**. Callback-count evidence establishes the improvement without recovering the unavailable original flake or adding slow browser timing tests. More retry-policy changes would widen the scope of this partial revert.

The highlighted audience sentence identifies browser-test infrastructure and says production UI and workflow behavior are unchanged. The highlighted scope sentence covers all callers and Galaxy `wait_for_*` failures on Playwright. Details explain the per-invocation cap and the remaining multiplication possible with nested helpers.

The opener identifies the partial revert of `2825bb09e42`. The concrete 30-second timeout example explains the waiting cost, and the risk statement gives the tradeoff: failures that once recovered after more full timeouts now surface sooner.

No development tasks resulted, so no code edits or checklist rerun were needed.
