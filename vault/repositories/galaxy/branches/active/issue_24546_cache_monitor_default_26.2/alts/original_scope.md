# original_scope

Branch `issue_24546_cache_monitor_default_26.2_alt_original_scope` at `827116eff06` on the `jmchilton` remote.

The branch before the re-scope: baseline tests, hardening of the monitor thread, and the driver-decides fix for the S3, boto3, Azure, cloud, onedata and rucio stores. The parent (head `6fe63109810`) has the same three commits, with the fix re-landed as `e84f5111dad`. It adds two more:

- `32b5a9841c7`: iRODS XML goes through the shared caching parser. This is prep and sits before the fix.
- `6fe63109810`: iRODS and pithos resolve `enable_cache_monitor()` and start and stop the in-process monitor, including on iRODS `soft_shutdown`. Use this alt if the iRODS and pithos change should ship as a separate PR.
