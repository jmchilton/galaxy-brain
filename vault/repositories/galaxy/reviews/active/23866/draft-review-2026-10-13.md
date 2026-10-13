The revised approach addresses my earlier consistency concern: normalization now happens at job finish/failure, rather than only for regex-captured suffixes. The explicit sniff/infer discovery tokens and original-extension warning are useful additions. I recommend approval with two small completeness points:

- The finish-time helper skips empty extensions. A dotless `README` captured with `(?P<name>[^.]+)\.?(?P<ext>.*)` completes with `file_ext=""`, rather than `data`. Could that also be normalized and covered by a regression?
- The `auto` exemption applies to every output, although its comment describes deferred materialization. A normal `discover_datasets pattern="__name__" format="auto"` output completes in state `ok` with extension `auto`. Could the exemption check the deferred state, or could the broader exception be documented explicitly?

These are retained completeness gaps, not confirmed new blockers. A downstream collection consumer completed successfully in my probe. 166 focused unit tests and both submitted framework tests pass; the two new expected-data regressions fail on HEAD and pass with an isolated guard control. CI is green.

## Risks

This changes persistent output-extension behavior across all profiles and adds tool-author sniff/infer contracts. The original extension remains in the job warning, but installing a missing datatype later does not automatically restore it. That compatibility tradeoff matches the accepted direction; the remaining exemptions should be intentional.
