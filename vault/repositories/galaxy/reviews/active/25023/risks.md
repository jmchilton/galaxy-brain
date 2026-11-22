Profile: gx_risk_assessment · Model: Claude Opus 5.5 · Effort: low · Reviewed commit: ff96b8bb47c49cd0886b04747bc1825bc8e25601

Mostly a two-way door inside an opt-in beta setting (`tool_evaluation_strategy: remote`), but it lands on a release branch and fixes a few contracts that are hard to walk back: the `ComputeEnvironment.input_metadata_rewrite` signature, the `compute_environment.json` / `remote_command_line.txt` job-directory file formats that a separately deployed Pulsar/Galaxy runtime must match, and dropping the `metadata_strategy: extended` requirement admins have been told about.

<details><summary>Risk Details</summary>

- `input_metadata_rewrite(dataset, metadata_name, metadata_file)` changes a compute-environment interface on a release branch; out-of-tree `ComputeEnvironment` subclasses using the old `(dataset, rval)` form break at runtime, not import time.
- `compute_environment.json` (keyed by `Dataset.id`, instance class/id/metadata name, raw paths) and `metadata/outputs_populated/remote_command_line.txt` become a de facto wire format between Galaxy and the remote Galaxy runtime on Pulsar; version skew between the two yields wrong paths or a missing command line, and changing the keying later needs compatibility handling.
- Relaxing the `extended` requirement widens the supported surface: remote evaluation now runs with `directory` metadata, and `remote_command_line` gates on tool type (interactive, `set_metadata`) and task splitting instead of on `extended`; any tool type missed here is evaluated remotely where it wasn't before.
- Without `<required_files>`, the whole tool directory is staged to Pulsar; for big tool repos this changes transfer cost and exposes more tool files remotely.
- `all_metadata_files` and collection `element_identifiers_extensions_paths_and_metadata_files` now resolve paths through the compute environment instead of the model; this alters `staging_path_and_source_path` JSON that tool templates consume (only rewritten under non-local compute environments, local falls back).
- Pulsar commands now wrap the tool command in `{ ...; }` after the eval command with `&&` instead of chaining to `../tool_script.sh`; changes how failures and streamed stdout setup behave for every Pulsar remote-eval job.
- Object store config is no longer shipped for remote evaluation (credential-exposure reduction), but `extended` still writes `object_store_conf.json`; admins relying on the old behavior see no change there, which is easy to misread from the docs.

</details>

<details><summary>Risk Review Advice</summary>

Focus on whether the `input_metadata_rewrite` signature change and the new job-directory files are acceptable on `release_26.2`, and whether Galaxy/Pulsar-runtime version skew is handled or at least documented (what happens when the remote runtime is older and doesn't write `remote_command_line.txt` or read `compute_environment.json`).

Also check `remote_command_line`'s exclusion list in `lib/galaxy/jobs/__init__.py` covers every tool type that previously only escaped remote eval because it wasn't `extended` (e.g. data source, upload, other Galaxy-internal tool types), and that the command-builder wrapping in `command_factory.py` still fails closed when evaluation fails.

</details>
