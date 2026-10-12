# Invocations provider independent review — batch68

Approve `6e85b456307ec65b234f5b373f51864e27dce1e7` against pinned `a716c7d6a82a497f52a1831309c67531451c35fa`. Reviewed current client guidance/REVIEW_FOCUS, full original/final assertion diff, actual provider, store hydration and background refresh paths. No blocking finding or edit.

All13 original cases/35 checks remain with exact invocation fields, ordering, query strings, limit, lookup IDs and missing-name behavior. Checked optional provider capability bindings make required contracts explicit while retaining cache/search observations. Narrow actual types describe recent items and deliberately partial invocation rows; the documented response-boundary assertion does not fabricate the originally absent model_class. Names remain mocked at the original workflow/history cache boundary, while the real invocation store exercises hydration, empty listing reuse, refresh and failed-fetch retry.

Each case captures its owned Pinia. Completion flushes immediate/background work before disposal and refresh bookkeeping reset. Canonical deferred and finally resolve/await the intentionally blocked workflow lookup even on assertion failure; resetting its implementation prevents a failed scenario leaving a one-off pending implementation for another case. No production/support/shared change or rendered UI claim.

Independent Node22.20 shuffled680201 passes13cases (/private/tmp/readability68-invocations-independent.log). Independently reran source-location comparison:51files/385 covered statement/function/branch-arm locations exactly, zero loss/addition. Author file gates pass; integrated types remain driver-owned. No new evidence-backed guidance gap beyond existing capability, deferred and owned-resource guidance.
