# Draft GitHub review — unposted

Suggested disposition: **APPROVE**. Reviewed commit: `f68adcf34074ebcd79f11287850a8b7d4f8555fa`.

No actionable findings. The merge keeps first-loaded values, field lookup applies the same rule to duplicate values arriving through other sources, and the writing data-manager process now reloads through the same table-manager path as its peers. The shared tabular-file selection also covers append, bundle, explicit-file, and removal paths without writing refgenie YAML.

I ran the focused table-data, dynamic-option, data-manager-reload, and refgenie tests: **26 passed**. Current GitHub checks are successful or skipped. I did not repeat the full integration suite locally.

## Risks

This establishes first-entry precedence for duplicate reference values and changes command-template field resolution, so existing tool artifacts that relied on joining matching rows may need adjustment.

<details><summary>Risk Details</summary>

- Merged references with the same value now follow config ordering, even when the paths differ.
- First-row field resolution also applies to duplicates in individual loc files and dataset-backed options. Distinct multi-select values still resolve separately.
- Data-manager completion now includes a local reload; failures are logged while peer notifications continue.

</details>

<details><summary>Risk Review Advice</summary>

Please confirm the broader field-resolution contract is intended, and verify local/IDC config ordering selects the references admins expect. The added regression coverage checks duplicate-value precedence, reload agreement, and refgenie persistence safety.

</details>
