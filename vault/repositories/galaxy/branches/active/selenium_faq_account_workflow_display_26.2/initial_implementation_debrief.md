# Initial implementation

Extracted the next FAQ batch into an independent branch on `release_26.2` (`849c2573cb0`), as requested by `UPSTREAM_TESTS.md`. Password-reset bug #24457 is a separate `release_25.1` branch; gxui commands, GTN text/screenshot findings, earlier FAQ batches and standing-driver restacks are outside this extraction.

The first commit, `bcf36e0efac` (Baseline tests), adds passing browser coverage for Storage Dashboard Refresh, workflow-editor tags persisted to the workflow list, and dataset display application links. Refresh and tags passed together; display links passed after correcting the fixture expectation to compare every configured application against the dataset API while retaining the required UCSC/main assertion. The external local server includes IGV and IGB; the CI fixture may include only UCSC.

The implementation extracts helpers for Refresh, requesting a password reset, Manage Information navigation/save, workflow editor tagging/Best Practices and dataset display applications. Existing account and Best Practices tests consume them. Observable completion waits replace sleeps in the touched profile helper/tests; display applications gain stable data-description hooks and navigation targets. The newer reset-from-email helper has its real consumer in the separate password-reset branch, rather than being added unused here.

Baseline type checking of the six touched Python files reports 23 existing errors in 12 imported files and none in the touched files. `MYPYPATH=lib --explicit-package-bases` avoids duplicate module discovery. The first final type-check run has the same 23 errors; normal review and final browser validation are ongoing.
