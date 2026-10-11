The public browsing/import path looks good to me: both added integration tests pass, including a real import, along with 106 focused Galaxy tests and 35 adapter tests. I also checked template resolution, display-name search, pagination/cache reuse, nested recursive listing and exact download bytes through the real adapter.

Public-only access and slow catalogue listing seem reasonable scope choices for this version. The documented omission of inaccessible folders during recursive imports needs to remain an explicit acceptance tradeoff, since a successful import may be incomplete.

One CI note: the cached API report contains a real failure in `test_error_outputs_with_purged_inputs` (downstream `error` versus expected `paused`), despite the cache summary saying zero failures. I haven't found a connection to these changes, but the current run isn't all green.
