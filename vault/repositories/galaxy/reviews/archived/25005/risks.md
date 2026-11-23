Mostly a two-way door, but it sets a new contract for tool authors on a release branch: named and `from_work_dir` outputs that are (or sit under) symlinks resolving outside the job directory now fail the job instead of being collected.

<details><summary>Risk Details</summary>

- Tools or wrappers that intentionally symlink an output (or a `from_work_dir` source) to a file outside the job directory, e.g. reference data, `/tmp`, scratch or shared FS paths, will now error with an `output_collection_security` job message or silently skip the copy with a stderr note. Shipping this in a point release changes behavior for existing tools without a deprecation period.
- The `from_work_dir` copy in the job script now depends on `realpath` being on the compute node's `PATH`; minimal images or older systems without it would make the `case` fall through and skip collection.
- When `job_working_directory` comes from remote command params (Pulsar), the containment check uses the remote path; a mismatch with how the remote host resolves symlinks above the job directory could reject legitimate outputs.
- Symlinks above the job directory are trusted, links below it are not; deployments that place job directories behind symlinks rely on `realpath` of the job directory matching on both sides (Python and shell).
- In-directory symlinked outputs are now copied rather than moved, changing disk usage and timing for large outputs.
- The Python-side `from_work_dir` glob emulation must match shell glob semantics; divergence would check a different set of files than the job script copies.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether failing (rather than warning) on out-of-directory symlinked outputs is acceptable for 26.1 users and whether any known tools (data managers, tools linking reference data) rely on it. Also check the Pulsar/remote path and container cases, where the copy runs outside the tool container and the job directory may resolve differently.

Confirm `realpath` availability is an acceptable new runtime requirement for the generated job script, and that the extended-metadata path (`set_metadata.py` `filename_override` check) and the `finish()`/`fail()` paths reject consistently.

</details>
