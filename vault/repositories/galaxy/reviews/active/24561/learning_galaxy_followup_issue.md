# galaxy-brain research follow-up from galaxyproject/galaxy#24561

Source: learning review of #24561 ("[26.2] Don't mount the job directory into tool containers by default") at `e43b2db63a4d96f238d577b0ca0c79c2ed043d3a`.

## Stale points in existing research (true before this PR)

`research/Component - User-Defined Tools.md`:

1. **Comparison table (`Container | Optional | **Required** (#21161 hardens this for 25.1)`).** 25.1 has shipped and #21161 is still an open draft against `release_25.1`. "Required" was only a model-level rule: `UserToolSource._require_container` (`lib/galaxy/tool_util_models/_models.py`) rejects a UDT without `container:`. At runtime, containerization depended on the destination's `require_container`.
2. **Security model, layer 2 "Mandatory containerization".** It reads as a runtime guarantee. Before #24561, `require_container` was only checked in `BaseJobRunner.build_command_line`. Pulsar and other runners that build their own command line bypassed it, including the recommended embedded-Pulsar UDT setup. A UDT could run on the host if no container resolved.
3. **§9 "Mandatory containerization landing in 25.1 (#21161 still draft)" and §10 step 1 "Land #21161".** These are stale on the release, and the description of what remains is incomplete. Container isolation also leaked the whole job directory (`$job_directory:ro`) into tool containers: the job script, `metadata/` inputs (including extended-metadata `object_store_conf.json`) and, on Pulsar, `launch_config` with callback credentials. The "Boundaries that matter / Filesystem outside the container" list does not mention this.

## Post-merge activities (if #24561 merges)

- **`Component - User-Defined Tools.md`:**
  - Record that `require_container_for_user_defined_tools` (default `true`) makes `MinimalJobWrapper.requires_containerization` true for `tool_type == "user_defined"` regardless of destination.
  - Record that the check now sits in `BaseJobRunner._find_container`, so every runner enforces it.
  - Replace the #21161 next step with whatever remains of it (interactive tools?), or drop it.
  - Add the job-dir root to the filesystem boundary list: UDT containers now see only `tool_script.sh`, `inputs/`, `configs/`, `outputs/`, `working/` (plus `unstructured/` on Pulsar).
- **`Component - Pulsar Input Staging.md`:**
  - The credential table (`job_key` row) lists who holds the key. Add that tool containers no longer get `launch_config` via `$defaults`. Admin `docker_volumes` / `singularity_volumes` that still list `$job_directory` re-expose it.
  - Note that `unstructured/` is created by the container command (`mkdir -p`) for Pulsar tool jobs, since Pulsar only creates it when it stages unstructured files.
- **`Component - Private Object Stores.md`:** in the job-directory serialisation paragraph, optionally note that the serialized object store config under `metadata/` is no longer mounted into tool containers by default. Epilog/metadata containers still see it.
- **New note:** see the queued request `vault/agents/gx_research/todo/tool_containers_volumes_and_enforcement.md` (container volume `$defaults`, `JobInfo.job_type` / `job_directory_type`, `require_container` enforcement).
