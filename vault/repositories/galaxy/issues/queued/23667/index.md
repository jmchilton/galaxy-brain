# galaxy#23667 — Extended Metadata Doesn't Collect Job Metrics?

[Issue](https://github.com/galaxyproject/galaxy/issues/23667)

Job metrics aren't carried by the model store (`Job._serialize` emits no metrics, `_set_job_attributes` has no metrics entry), so metrics are lost under extended metadata; mvdbeek notes this only bites Pulsar + extended metadata, not used in production; adjacent to [#23784](https://github.com/galaxyproject/galaxy/pull/23784); next: red test showing metrics lost under extended metadata.
