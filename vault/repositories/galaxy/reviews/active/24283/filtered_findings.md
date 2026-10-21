# Filtered findings — #24283

- **gx_test_challenger P3 2: rewrite `test_searchers_are_reused_but_never_shared` as a threaded test of the public `search`.** Filtered as not actionable. A threaded public-API test can't reliably detect two threads sharing one searcher, so replacing the private-pool test would weaken coverage or add flakiness. The default reviewer judged the private test acceptable for a pool invariant.
