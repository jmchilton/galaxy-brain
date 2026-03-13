# Plan: Support Absolute-Path entryname in InitialWorkDirRequirement (CWL v1.2)

## Problem

CWL conformance test `iwd-container-entryname1` (v1.2) fails with `command_line:
None` — Galaxy can't even construct the job command. The test uses
`InitialWorkDirRequirement` with an absolute-path `entryname`, which is a CWL v1.2
feature for specifying container mount points.

## CWL v1.2 semantics

When `entryname` is an absolute path (e.g. `/tmp2j3y7rpb/input/stuff.txt`):
- It is a **container mount point**, not a host path
- The file should be bind-mounted from the host staging location into the container
  at that absolute path
- Requires `DockerRequirement` in **requirements** (not hints) — cwltool validates
  this at `command_line_tool.py:752-758`

## Test CWL tool

```yaml
# iwd-container-entryname1.cwl
requirements:
  DockerRequirement:
    dockerPull: docker.io/debian:stable-slim
    dockerOutputDirectory: /output
  InitialWorkDirRequirement:
    listing:
      - entryname: /tmp2j3y7rpb/input/stuff.txt
        entry: $(inputs.filelist)
  ShellCommandRequirement: {}
arguments:
  - {shellQuote: false, valueFrom: "head -n10 /tmp2j3y7rpb/input/stuff.txt > /output/head.txt"}
```

## Current code path (and where it breaks)

```
JobProxy.stage_files()                      # parser.py:708
  → cwl_job.generatefiles["listing"]        # line 721-726
  → PathMapper(listing, outdir, outdir)     # line 724-726
    PathMapper maps entryname /tmp2j3y7rpb/input/stuff.txt
    entry.target = /tmp2j3y7rpb/input/stuff.txt  (absolute, NOT under outdir)
  → _stage_generate_files(generate_mapper)  # line 729

_stage_generate_files()                     # parser.py:738
  → os.makedirs(os.path.dirname(entry.target))  # line 752-753
    tries to mkdir /tmp2j3y7rpb/input on the HOST
    → either fails (permissions) or creates wrong dir
  → stage_func(entry.resolved, entry.target)    # line 756
    tries to symlink into /tmp2j3y7rpb/input/stuff.txt on HOST
    → fails or creates file in wrong location
  → job preparation fails → command_line never constructed → error state
```

Separately, even if staging succeeded, the Docker volume mounting
(`container_classes.py:460-515`) has no logic to bind-mount absolute-path entries
into the container.

## Changes

### 1. `lib/galaxy/tool_util/cwl/parser.py` — fix staging for absolute entries

In `_stage_generate_files()` (line 738), detect absolute-path targets and stage
them into the working directory instead, recording the mapping for later Docker
volume binding.

Two sub-approaches:

**Option A: Stage under working dir, record mount map**

```python
def _stage_generate_files(generate_mapper, stage_func, inplace_update, working_directory=None):
    absolute_mounts = {}  # host_path → container_path
    ignore_writable = inplace_update

    for _key, entry in generate_mapper.items():
        if not entry.staged:
            continue

        target = entry.target
        if os.path.isabs(target) and working_directory:
            # Absolute entryname = container mount point (CWL v1.2)
            # Stage into working dir; record for Docker -v binding
            host_target = os.path.join(working_directory, os.path.basename(target))
            absolute_mounts[host_target] = target
            target = host_target

        if not os.path.exists(os.path.dirname(target)):
            os.makedirs(os.path.dirname(target))

        if entry.type in ("File", "Directory"):
            if os.path.exists(entry.resolved):
                stage_func(entry.resolved, target)
        elif entry.type == "WritableFile" and not ignore_writable:
            shutil.copy(entry.resolved, target)
        elif entry.type == "WritableDirectory" and not ignore_writable:
            if entry.resolved.startswith("_:"):
                os.makedirs(target, exist_ok=True)
            else:
                shutil.copytree(entry.resolved, target, dirs_exist_ok=True)
        elif entry.type in ("CreateFile", "CreateWritableFile"):
            with open(target, "w") as new:
                new.write(entry.resolved)

    return absolute_mounts
```

Then in `stage_files()` (line 708), capture the return value and store it:

```python
def stage_files(self):
    ...
    if hasattr(cwl_job, "generatefiles"):
        outdir = os.path.join(self._job_directory, "working")
        generate_mapper = pathmapper.PathMapper(...)
        inplace_update = cwl_job.inplace_update
        self._absolute_container_mounts = _stage_generate_files(
            generate_mapper, stageFunc, inplace_update, working_directory=outdir
        )
        relink_initialworkdir(...)
```

**Option B: Let cwltool handle it via its own PathMapper**

cwltool's PathMapper already decomposes absolute entrynames correctly
(`command_line_tool.py:739-770`). The issue may be that Galaxy's PathMapper call
at line 724 doesn't match cwltool's processing. Investigate whether cwltool's
`generatemapper` (which Galaxy skips with the TODO comment at line 723) already
handles this correctly, and use it instead of re-creating a PathMapper.

Option A is more explicit and predictable. Option B is more correct long-term
but needs investigation into why `cwl_job.generatemapper` doesn't work.

### 2. Propagate mount info to Docker container setup

The `absolute_mounts` dict from step 1 needs to reach
`DockerContainer.containerize_command()` (container_classes.py:447).

**Path**: `JobProxy` → job metadata → `ToolInfo` or `ContainerDescription` →
`DockerContainer`.

Options:

**2a. Via ContainerDescription**

Add `extra_volumes: List[Tuple[str, str]]` to `ContainerDescription`:

```python
class ContainerDescription:
    def __init__(self, ..., extra_volumes=None):
        ...
        self.extra_volumes = extra_volumes or []
```

Set during CWL job preparation. Then in `containerize_command()`:

```python
if self.container_description and self.container_description.extra_volumes:
    for host_path, container_path in self.container_description.extra_volumes:
        volumes_raw += f",{host_path}:{container_path}:ro"
```

**2b. Via ToolInfo**

Add to `ToolInfo` which is already accessible in `DockerContainer`. This avoids
conflating per-job state with the container description (which is per-tool).

**2c. Via job working directory convention**

Instead of explicit volume mounts, stage the file into the working directory
(which is already mounted) and rewrite the command to reference it there. This
avoids needing to pass mount info through at all, but requires rewriting the
CWL tool's command line — fragile.

**Recommendation**: Option 2a is simplest. The `ContainerDescription` already
carries `docker_output_directory` which is per-tool CWL metadata, so
`extra_volumes` fits the same pattern. Per-job state concern is valid but
these volumes derive from the tool definition, not the job inputs.

### 3. `lib/galaxy/tool_util/deps/container_classes.py` — mount absolute entries

In `containerize_command()` (line 447), after the existing `docker_output_directory`
volume handling (lines 466-472):

```python
# CWL absolute-path InitialWorkDirRequirement entries
if self.container_description and getattr(self.container_description, 'extra_volumes', None):
    for host_path, container_path in self.container_description.extra_volumes:
        volumes_raw += f",{host_path}:{container_path}:ro"
```

### 4. Validation: require DockerRequirement for absolute entryname

CWL spec requires `DockerRequirement` in requirements (not hints) for absolute
entrynames. Galaxy should validate this. If no DockerRequirement, the tool
definition is invalid per spec — fail with a clear error.

This check could go in `_stage_generate_files()` or earlier during tool proxy
creation.

## Testing

Red-to-green: run `iwd-container-entryname1` from the integration test harness:

```bash
pytest -s -v test/integration/test_containerized_cwl_conformance.py \
  -k iwd_container_entryname1
```

Verify other IWD tests still pass — especially those with relative entrynames.
Run the full CWL conformance suite to check for regressions.

## Unresolved questions

- Why doesn't `cwl_job.generatemapper` work (TODO at parser.py:723)? If it does work for absolute paths, using it instead of re-creating PathMapper might be simpler.
- Should `extra_volumes` be on `ContainerDescription` (per-tool) or somewhere per-job? The entries derive from InitialWorkDirRequirement which is per-tool, but the resolved file paths are per-job.
- Are there other IWD tests with absolute entrynames that are currently in RED_TESTS? (`iwd-container-entryname2` through 4 are `should_fail` tests so they may already pass.)
- Does the `relink_initialworkdir()` call at line 730 also need to handle absolute targets?
