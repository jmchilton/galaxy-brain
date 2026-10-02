# Container Environment Design Decisions

Agreed decisions for passing job-configured environment variables into tool containers (follow-on to galaxy#16666).

## Big decisions

- Container-native runners (Kubernetes, Pulsar coexecution) run the whole job script inside the tool container, so every `env`, `job_env` and `tool_env` entry reaches the tool and the scoping below applies only to local and cluster runners that wrap the tool command in Docker or Singularity.
- Plain `env` keeps its current meaning and its entries are never injected into tool containers.
- `job_env` is a new job-scoped destination key, and `env` becomes its legacy alias with identical semantics.
- `tool_env` is a new destination key whose entries are always injected into tool containers.
- `tool_env` accepts only `name`/`value` entries (plus `raw`), and `file`/`execute` entries are rejected at config load. Wrapped containers receive variables by name (`-e NAME` / `SINGULARITYENV_NAME`), and Galaxy cannot know which names a sourced file or command will set.
- Tools can declare `runtime_environment_variable` names, which are passed into their containers from the job environment regardless of where the value was set.
- User-defined tools cannot declare `runtime_environment_variable`, unlike installed tools.
- An unset required `runtime_environment_variable` is reported as a job message but does not fail the job.
- Existing `docker_env_*` / `singularity_env_*` destination params keep working and are documented as superseded by `tool_env`, without deprecation for now.
- TPV support is out of scope; `tool_env` alone fixes galaxy#21640 on the Galaxy side and TPV emitting `job_env`/`tool_env` is a follow-up for TPV.
- The tool XML declaration is `<runtime_environment_variable name="X" required="false" />`, placed under `<requirements>` next to `<credentials>`.
- Installed tools are trusted to declare any non-reserved `runtime_environment_variable`, with no admin allow-list in the first version.

## Small decisions

- Galaxy logs a warning at config load when `job_env` is set on a container-native destination, since those entries will also reach the tool container.
- In XML job config, `<job_env>` and `<tool_env>` elements sit beside `<env>` inside a destination and take the same attributes.
- `tool_env` entries are also exported in the job script, so host-side steps see them as well as the tool.
- The same name may appear in both `job_env` and `tool_env`, and later definitions win, following the job script's existing statement order.
- `runtime_environment_variable` has a `required` attribute that defaults to false.
- `runtime_environment_variable` has an optional `description` attribute, shown to admins in docs and lint output.
- An unset optional `runtime_environment_variable` produces no message.
- A declared variable that is unset in the job script is not forwarded into the container, so tools can tell unset from empty.
- For Docker, each forwarded variable is passed as a bare `-e NAME` so Docker copies its value from the job script environment and omits it when unset.
- For Singularity/Apptainer, the job script exports `SINGULARITYENV_NAME="$NAME"` for each forwarded variable only when `NAME` is set.
- `runtime_environment_variable` names must match `[A-Za-z_][A-Za-z0-9_]*` (enforced by a `galaxy.xsd` pattern) and must not be a reserved name below (documented in the `galaxy.xsd` annotation and enforced by the tool loader and linter, since XSD patterns cannot express exclusions).
- Planemo lint warns on secret-looking `runtime_environment_variable` names (`*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `*API_KEY*`, `AWS_*`) and suggests declaring them with `<credentials>` instead.
- `runtime_environment_variable` needs no tool profile gating because it is purely additive, and older Galaxy releases simply do not forward the variable.
- Admin-installed YAML tools can declare runtime environment variables through `tool_util_models`, while the user-defined tool model rejects them.
- The generated job script checks each required declared variable after environment setup and before the tool command, and writes only the names (never values) of unset ones to a file in the job directory.
- Galaxy turns that file into a typed warning job message on job finish, appended after `check_output` on both the runner finish path and the extended-metadata path.
- A variable counts as unset only when it is not defined at all (`${VAR+x}`), so an empty string counts as set.
- The unset check runs in every job script, including container-native runners and non-containerized tools, even where no forwarding is needed.
- The unset-variable job message is shown on the job information page and also logged by Galaxy at info level for admins.
- The work targets `dev` with no backport.
- Docs add a `jobs.md` section covering `env`/`job_env`/`tool_env`, the container-native exception and `docker_env_*`/`singularity_env_*`, plus `galaxy.xsd` documentation for `runtime_environment_variable`.
- Tests are written red-to-green: `TestDockerizedJobsIntegration` and `TestSingularityJobsIntegration` check that a `job_env` variable stays out, a `tool_env` variable arrives and a declared variable arrives, the coexecution test checks that all three reach the tool, and a framework tool test checks the unset-variable job message.
- Everything in this document ships as one PR because the decisions are interleaved.

### Reserved `runtime_environment_variable` names

Exact names (container or shell plumbing, or set per job by Galaxy):
`PATH`, `HOME`, `USER`, `LOGNAME`, `SHELL`, `PWD`, `OLDPWD`, `HOSTNAME`, `TMPDIR`, `TMP`, `TEMP`, `PYTHONPATH`, `PYTHONHOME`, `BASH_ENV`, `ENV`, `IFS`, `PS4`.

Prefixes:
- `LD_` (dynamic linker: `LD_LIBRARY_PATH`, `LD_PRELOAD`, `LD_AUDIT`, ...).
- `GALAXY_` and `_GALAXY_` (Galaxy-managed: `GALAXY_SLOTS`, `GALAXY_MEMORY_MB`, ... are already passed through).
- `SINGULARITY_`, `SINGULARITYENV_`, `APPTAINER_`, `APPTAINERENV_` (configure the container runtime itself).
