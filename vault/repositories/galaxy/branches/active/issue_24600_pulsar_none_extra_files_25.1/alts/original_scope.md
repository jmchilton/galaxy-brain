# Alt: original scope

Branch: [`issue_24600_pulsar_none_extra_files_25.1_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/issue_24600_pulsar_none_extra_files_25.1_alt_original_scope) at `4d18da26fee`.

It contains only the code fix for #24600: `PulsarComputeEnvironment`'s extra-files hooks return `dataset.extra_files_path` when Pulsar doesn't rewrite the path. It also has the unit tests and the `remote_metadata: false` `none` integration module.

The parent branch adds one commit on top: the sample job conf comment fix. In the YAML sample, `#default_file_action: none` is commented out again to match its "Uncomment ..." text and the XML sample. The per-path action lists in both samples are corrected (drop `http`, add the real actions), and the `galaxy_infrastructure_url` typo is fixed. The scope evaluation recommended this because the issue's Proposed Approach includes it.
