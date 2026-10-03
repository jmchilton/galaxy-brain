Toward 🎯 #21640 - environment variables set on a destination never reach a Docker or Singularity tool container unless they are repeated per container runtime.

Admins can now say which variables a tool container receives. Tools can also say which variables they need.

```yaml
execution:
  environments:
    local_docker:
      runner: local
      docker_enabled: true
      job_env:            # new name for env: job script only, stays out of the tool container
        - name: HOST_SETTING
          value: host_value
      tool_env:           # new: job script and the tool container, under any runtime
        - name: _JAVA_OPTIONS
          value: "-Xmx6G"
```

```xml
<requirements>
    <runtime_environment_variable name="EGGNOG_DBMEM" required="true" description="Load the eggNOG DB into memory" />
</requirements>
```

What the tool sees ("—" means not possible on `dev`). The new integration tests check every "this PR" cell and the Pulsar coexecution column:

| Variable set by                                    | No container              | Docker / Singularity, `dev` | Docker / Singularity, this PR | Pulsar coexecution (Kubernetes) |
| -------------------------------------------------- | ------------------------- | --------------------------- | ----------------------------- | ------------------------------- |
| destination `env` / `job_env`                      | set                       | unset                       | unset                         | set                             |
| destination `tool_env` (new)                       | set                       | —                           | set                           | set                             |
| `env` / `job_env`, name declared by the tool (new) | set                       | —                           | set                           | set                             |
| `docker_env_X` / `singularity_env_X`               | unset                     | set (that runtime only)     | set (that runtime only)       | n/a                             |
| declared `required`, set nowhere                   | unset, plus a job warning | —                           | unset, plus a job warning     | unset, plus a job warning       |

On `dev` the only way to get `_JAVA_OPTIONS` into a tool container is to set it once per runtime with `docker_env__JAVA_OPTIONS` or `singularity_env__JAVA_OPTIONS`. A shared config such as TPV's can't know which runtime a site uses (#21640).

***This matters to admins running Docker or Singularity through Galaxy's own runners. Pulsar coexecution and Kubernetes already pass every variable and behave as before.***

***Plain `env` keeps its meaning and stays out of wrapped tool containers. A tool reaches a job-scoped variable in its container only by declaring that exact name, which is what it already sees when run without a container. Secrets belong in `<credentials>`.*** ***Existing job configs, `docker_env_*` and `singularity_env_*` keep working. This doesn't deprecate them, and it doesn't add an admin allow-list.***

***This doesn't fix #21640 for TPV users on its own.*** TPV emits `env`, which stays job-scoped. The reported case is fixed once the eggnog tool declares `EGGNOG_DBMEM`, or once TPV emits `tool_env`. Both are follow-ups outside Galaxy.

This PR:

- **Splits destination environments into scopes.** `job_env` is the job-script-only scope, and `env` is now its legacy alias. `tool_env` is exported in the job script and forwarded into wrapped containers. It accepts only `name`/`value` (plus `raw`) entries, because Galaxy can't know which names a sourced `file` or `execute` sets. Both scopes work in YAML and XML job configs, and entries keep their configured order.
- **Lets admin-loaded tools declare `runtime_environment_variable`.** Declared names are forwarded from the job environment, however the value was set. A `required` name that is unset produces a warning job message with the variable names only (never values), ***and the job still succeeds***. User-defined tools can't declare them.
- **Forwards by name.** Docker gets `-e NAME`, and Singularity/Apptainer gets `SINGULARITYENV_NAME`. An unset name stays unset and an empty one stays empty. The container command names the variables but never embeds their values. With `docker_sudo`, set values are expanded on the host as `-e "NAME=value"`, as on `dev`, so sudoers needs no change.
- **Documents and lints it.** A new "Job and tool environment scopes" section in `jobs.md`, plus XSD docs for the element and its reserved names. The linter rejects reserved names and suggests `<credentials>` for secret-looking ones. Galaxy warns at config load when `job_env` is set on a container-native runner, where the scopes can't be separated.

<details><summary>Design decisions</summary>

- Container-native runners (Kubernetes, Pulsar coexecution) run the whole job script inside the tool container, so every scope reaches the tool there. The scoping only applies to runners that wrap the tool command in Docker or Singularity.
- The same name may appear in both scopes. Later definitions win, following the job script's existing statement order.
- An unset optional declared variable produces no message. Only a variable that isn't defined at all (`${VAR+x}`) counts as unset; an empty string counts as set.
- The unset check runs in every job script, including container-native and non-container jobs. It runs after environment setup and before the tool command, and writes only the names to a file in the job directory. Galaxy turns that file into a typed `runtime_environment_warning` job message on both the runner finish path and the extended-metadata path. Split (tasked) jobs merge their tasks' warnings into the parent job.
- Declared names must match `[A-Za-z_][A-Za-z0-9_]*` and must not be reserved. Reserved means `PATH`, `HOME`, `USER`, `LOGNAME`, `SHELL`, `PWD`, `OLDPWD`, `HOSTNAME`, `TMPDIR`, `TMP`, `TEMP`, `PYTHONPATH`, `PYTHONHOME`, `BASH_ENV`, `ENV`, `IFS` and `PS4`, plus anything with the prefix `LD_`, `GALAXY_`, `_GALAXY_`, `SINGULARITY_`, `SINGULARITYENV_`, `APPTAINER_` or `APPTAINERENV_`. The XSD pattern checks the shape, and the loader and linter check the reserved names.
- Admin-loaded tools (anything but user-defined tools) may declare any non-reserved name. There's no admin allow-list in this version.
- No tool profile gating: the element is purely additive, and older Galaxy releases simply don't forward the variable.
- `docker_env_*` and `singularity_env_*` are documented as superseded by `tool_env` but aren't deprecated. When both set a name, they override the forwarded value.

</details>

## Risks

One-way doors: the `job_env`/`tool_env` job config keys, the `<runtime_environment_variable>` tool element and the `runtime_environment_warning` job message type all become things admins, tool authors and API clients depend on.

<details><summary>Risk Details</summary>

- Tool authors will start declaring `runtime_environment_variable`. Its name, attributes and reserved list are hard to change once tools ship with it.
- `runtime_environment_warning` is a new member of the job messages union in the API schema.
- Without `docker_sudo`, Docker now copies forwarded values from the job script environment (`-e NAME`) instead of expanding them on the command line. Standard pass-through variables such as `GALAXY_SLOTS` and `HOME` take this path too.
- Singularity now always gets `--home "$HOME:$HOME"` quoted, because `HOME` is a default pass-through name. The value is the same as on `dev`.
- Pass-through names that are unset on the host are now unset in the container. On `dev` they arrived as empty strings.
- The container-native warning recognises runners by a hard-coded list of names. A new container-native runner wouldn't warn until it's added.

</details>

<details><summary>Risk Review Advice</summary>

Check the reserved-name list and the decision to trust installed tools with any other name. Those are the parts tool authors will build on. Also review the forwarding in `container_classes.py`: both the sudo and non-sudo Docker paths, and the Singularity `SINGULARITYENV_` export, which need to agree on unset versus empty.

</details>

## Context

Replaces the stalled 🔀 #16666, which would have injected every job environment variable into tool containers. Admins considered that a security regression, which is why `env` stays job-scoped here.

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A missing required variable is a warning on the job information page naming only the variables, and the job stays `ok`. Bad `tool_env` entries and reserved names fail config or tool load with an error naming the problem.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Mostly - the forwarding tests run the generated commands against fake `docker`, `singularity` and strict `sudo` binaries, and the integration tests run real containers. A few configuration tests do check the list order directly.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

Integration, real containers:

- `TestDockerizedJobsIntegration` and `TestSingularityJobsIntegration` `test_runtime_environment_scopes`: `env` and `job_env` stay out, `tool_env` and declared variables arrive, an empty variable stays empty, `docker_env_`/`singularity_env_` still apply, and the missing required variable is reported.
- `test_coexecution.py` `test_runtime_environment_scopes`: on Pulsar Kubernetes coexecution, every scope reaches the tool and the missing required variables are reported.
- `test_pulsar_embedded.py` and `test_pulsar_embedded_extended_metadata.py` `test_runtime_environment_warning`: the warning comes back from embedded Pulsar under both metadata strategies. It fails if Pulsar doesn't collect the warning file.
- `test_runtime_environment.py`: scopes and the warning on a non-container local runner, under both the directory and extended metadata strategies. It also checks that split-job task warnings reach the parent job.

Framework: `test_runtime_environment_warning` checks the job message on a plain tool run.

Unit:

- `test/unit/tool_util/test_runtime_environment.py`: forwarding through fake runtimes, with values containing quotes, `$`, backticks and newlines. It covers unset vs empty, legacy overrides, values staying out of the script, and Docker under a `sudo` that refuses to preserve the environment. Also the generated required-variable check, XML/YAML parsing, user-tool rejection and task-warning merging.
- `test/unit/tool_util/test_tool_linters.py`: reserved names are errors, and secret-looking names warn and suggest `<credentials>`.
- `test/unit/app/jobs/test_job_configuration.py` and `test_environment.py`: XML and YAML scope order, rejection of invalid entries, and the container-native warning.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
