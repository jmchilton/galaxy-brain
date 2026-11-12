The only one-way-ish element is the new public surface (`--test_data_mirror`, `PLANEMO_TEST_DATA_MIRROR`, and the `<mirror>/<func>/<2 hex>/<hash>` layout it documents), which users and CI configs (e.g. IWC) will start depending on; the behavior itself is opt-in and easy to revert (a two-way door).

<details><summary>Risk Details</summary>

- Option name, env var (space-separated) and mirror URL layout become a contract once IWC/depot tooling uses them; renaming later breaks configs.
- Integrity relies on Galaxy verifying declared hashes on fetch; a Galaxy target that ignores `hashes` would ingest mirror content unverified.
- When enabled, staging switches from `job_path=` to `job=` + `job_dir=`; relative paths and other job-file semantics now depend on galaxy-tool-util treating these equivalently.
- Rewritten files get `name` set to the original URL basename; any divergence from galaxy-tool-util's own derivation changes dataset names (and possibly test assertions on them).
- Planemo now issues HEAD requests per hash/mirror; a mirror that times out is skipped for the process, but a mirror returning 200 for missing files (or reachable from planemo but not Galaxy) yields failing uploads rather than fallback.
- `hash_mirrors` is cached process-wide via `lru_cache`, so availability results persist across jobs in one run.

</details>

<details><summary>Risk Review Advice</summary>

Confirm the option/env-var naming and URL layout are what the depot and IWC intend to standardize on, since that is the part hard to change later. Check that the `job`/`job_dir` staging path in galaxy-tool-util is truly equivalent to `job_path` for relative paths, and that the minimum Galaxy planemo targets actually verifies `hashes` in the fetch API.

</details>
