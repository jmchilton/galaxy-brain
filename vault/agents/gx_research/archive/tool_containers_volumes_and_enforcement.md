# Component - Tool Containers

Document how Galaxy decides a job's container and what that container can see.

Cover:

- **Classes.** `ContainerFinder` and the `ToolInfo` / `JobInfo` inputs (`job_directory_type` galaxy vs pulsar, `job_type` tool vs epilog), and `DockerContainer` / `SingularityContainer` in `lib/galaxy/tool_util/deps/container_classes.py`.
- **Volumes.** `$defaults` expansion in `HasDockerLikeVolumes`, broken down for local vs Pulsar job directories and tool vs metadata (epilog) containers. Include `docker_volumes` / `singularity_volumes` substitution variables, the profile <= 19.09 `configs:rw` carve-out, and which job-directory files are deliberately not mounted.
- **Enforcement.** `require_container` / `requires_containerization` enforcement in `BaseJobRunner._find_container`, including the user-defined-tool override (`require_container_for_user_defined_tools`).
- **Runners.** How runners (local/DRMAA via `build_command_line`, Pulsar incl. remote container handling, kubernetes, condor, ...) call into it.
- **Metadata.** Metadata containers (`_get_metadata_container`).

Leave out container resolvers' image lookup details (mulled/biocontainers), interactive tool proxying, and Pulsar staging (covered by [[Component - Pulsar Input Staging]]).

## Why

#24561 reshapes the default container volume contract and moves `require_container` enforcement to a shared seam. No research note covers container classes or volume defaults. [[Component - User-Defined Tools]] assumes containerization as a security layer without describing what it mounts or where it's enforced.

## Requested by

- vault/repositories/galaxy/reviews/active/24561: learning review needed a baseline of container volume defaults and `require_container` enforcement.
