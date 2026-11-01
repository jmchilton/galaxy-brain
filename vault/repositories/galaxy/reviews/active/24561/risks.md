Main one-way risk: on a release branch, this changes what tool containers can see and makes deployments start failing jobs that ran before. Tools or admin setups that read files from the job directory root lose access, user-defined tool jobs now fail on destinations that have no container, and Pulsar destinations with `require_container` set now enforce it.

<details><summary>Risk Details</summary>

- `$defaults` for Docker/Singularity tool containers no longer mounts `$job_directory`, only `tool_script.sh` plus `inputs`, `configs`, `outputs` (and `unstructured` for Pulsar). Any tool, wrapper or container setup that reads other paths under the job directory (e.g. `../metadata`, other files at the job directory root) breaks silently inside the container with "file not found".
- New `require_container_for_user_defined_tools` defaults to `true`. Deployments that ran user-defined tools on uncontainerized destinations now get failed jobs after a minor-release upgrade, unless the admin opts out.
- The `require_container` check moved into `BaseJobRunner._find_container`. Pulsar destinations, and any other runner that calls `_find_container`, that set `require_container` but had no container used to run anyway. They now raise.
- Galaxy now always creates `inputs/` and `configs/` in every job directory. That is cheap, but job directory layout is something external tooling might inspect.
- For Pulsar, a `mkdir -p .../unstructured` now runs before the container command. This depends on the remote Pulsar side creating the job directory layout that the PR describes. Older Pulsar versions that lack the other subdirectories would fail at container start, because Singularity refuses missing bind sources and Docker creates them as root.
- Prolog/epilog containers (containerized metadata) keep the full job directory mount. Only the tool container is narrowed.
- Admins with explicit `docker_volumes`/`singularity_volumes` that include `$job_directory` keep the old exposure. Only the sample docs change, and nothing warns them.
- The integration test for the Pulsar + Docker variant could not run locally, because the image build failed (per the PR description). Docker-on-Pulsar coverage therefore depends on CI.

</details>

<details><summary>Risk Review Advice</summary>

Reviewers should decide whether the narrower default mounts and the new fail-closed default for user-defined tools belong on `release_26.2`, or should land on `dev` with release notes. Both change behavior for running deployments. The security motivation (exposure of Pulsar `launch_config` callback credentials and object store config) argues for backporting. If it is backported, it needs a clear admin-facing release note covering both the opt-out and `$job_directory` in custom volumes.

Look closely at `_job_directory_volumes`. Is the per-runner list of subdirectories complete for real tools, including legacy-profile tools that write into `configs`, tools using `$__tool_directory__` or `unstructured` data, and Kubernetes/TPV setups? Also check whether moving the `require_container` check into `_find_container` changes behavior for runners that call it without building a command line.

</details>
