# original_scope

Branch `issue_24546_cache_monitor_default_26.2_alt_original_scope` at `827116eff06` on the `jmchilton` remote.

The branch before the re-scope: baseline tests, hardening of the monitor thread, and the driver-decides fix for the S3, boto3, Azure, cloud, onedata and rucio stores. The parent adds `381fb819572` on top, which makes iRODS and pithos resolve `enable_cache_monitor()` and start and stop the in-process monitor. Use this alt if the iRODS and pithos change should ship as a separate PR.
