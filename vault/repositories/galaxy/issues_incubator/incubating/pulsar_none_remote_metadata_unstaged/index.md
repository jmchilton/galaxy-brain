# Pulsar `default_file_action: none` with `remote_metadata: true` never sets metadata

Found while fixing #24600: under `none`, Pulsar skips uploading the job's `metadata/` directory (and tool files referenced via `$__tool_directory__`) but still points the job at its staging dir, so remote `set.py` never runs. See [raw](raw.md).
