# Galaxy #16666: tool-declared inbound env vars (the `ToolInfo` TODO)

Research note, read-only, against `origin/dev` @ `1eed562dfc2` (fetched 2026-09-29). All `file:line` refs are on that commit.

Context: in #16666 (bernt-matthias, "Docs and tests for environment variable setting in containerized execution", still open) mvdbeek (2024-05-08) proposed a middle ground: implement the `ToolInfo` TODO so tools declare the env vars they may consume, and pass only those into containers ("Those can be safely passed into the container"). Separately, mvdbeek and nuwang (2026-02-03 review thread on `test/integration/dockerized_job_conf.yml`) settled on destination-side `job_env` / `tool_env` keys.

## Short answer

The declaration is static. The value is not.

- **Static:** the tool XML/YAML lists the *names* it may read (`_JAVA_OPTIONS`, `EGGNOG_DBMEM`, `TRINITY_MAX_MEMORY`, a license key). Galaxy knows this list when it loads the tool, just as it knows `<credentials inject_as_env=...>` names today. That's all `ToolInfo.env_pass_through` needs: container builders only emit names, and the shell fills in values at runtime.
- **Dynamic:** whether the variable actually has a value on the compute host. It can come from destination `env` name/value (Galaxy knows these), from destination `env file=` / `execute=` (Galaxy can't know), from the cluster / login shell / Slurm export (Galaxy can't know), or from the Pulsar host env (Galaxy can't know).
- So the pass-through part needs no runtime knowledge. Your runtime-message idea is the right shape for the "is it set?" question, but only the **job script** can answer it reliably. Galaxy can't do it at job-prep time. Recommended: a small check in the job script (after env setup, before the container call) writes the *names* of unset declared vars to a file. Galaxy picks that file up when the job finishes and adds a typed `JobMessage` (warning for optional, fatal for `optional="false"`). A Galaxy-side check of the destination config is still worth doing as an admin-facing lint (the "GUI for admins" in #4953), but it can only say "possibly unset".

Correction to the premise: Galaxy does **not** emit bare `-e NAME` today. Docker gets `-e "NAME=$NAME"` (`container_classes.py:465-466`, `docker_util.py:126-128`) and Singularity gets `SINGULARITYENV_NAME="$NAME"` (`singularity_util.py:86-89`). The value is expanded in the outer job script, so an **unset host var becomes set-but-empty inside the container**. The requirement is still the same: the var must be set in the job script's env. But inside the container, a tool can't tell unset from empty (`${X+x}` is always true). That's another reason to check before the container call.

Name nit: the TODO says `env_path_through` (`dependencies.py:54`), but the attribute is `env_pass_through`. Fix it when the TODO is implemented.

## Current data flow

1. **TODO text**, `lib/galaxy/tool_util/deps/dependencies.py:52-54`:
   > Introduce tool XML syntax to annotate the optional environment variables they can consume (e.g. JVM options, license keys, etc..) and add these to env_path_through
2. **`ToolInfo.__init__`** (`dependencies.py:57-86`). If `env_pass_through is None`, it defaults to the five `GALAXY_SLOTS` / `GALAXY_MEMORY_*` vars (`:67-74`). Real jobs always pass a list. The metadata container passes `[]` (`jobs/runners/__init__.py:~619`).
3. **Where names come from.** They're built on the `Tool` as `tool.docker_env_pass_through`:
   - `ToolSource.parse_docker_env_pass_through()` (`tool_util/parser/interface.py:270-280`): a hardcoded base-class default of `GALAXY_SLOTS`, `GALAXY_MEMORY_*` (5), `HOME`, `_GALAXY_JOB_HOME_DIR`, `_GALAXY_JOB_TMP_DIR` plus `parse_tmp_directory_vars()` (`TMPDIR`, `TMP`, `TEMP`). **No XML or YAML parser overrides it. It is not a tool attribute**, so no tool syntax exists for it today.
   - Tool `<environment_variables>` names get appended (`tools/__init__.py:1455-1459`, PR #8292).
   - Credentials `inject_as_env` names (secrets and variables) get appended (`tools/__init__.py:1579-1588`, PR #21821 / issue #21715).
   - The "resource" vars are the `GALAXY_SLOTS` / `GALAXY_MEMORY_*` items above. `<resource>` requirements don't add anything.
4. **Consumers.** `_find_container` builds `ToolInfo(tool.containers, tool.requirements, tool.requires_galaxy_python_environment, tool.docker_env_pass_through, ...)` (`jobs/runners/__init__.py:563-611`, pass-through at `:592`). `rule_helper.py:54` does the same for dynamic rules.
   - Docker: `DockerContainer.containerize_command` (`container_classes.py:463-498`) emits `"NAME=$NAME"` for each pass-through name, then `docker_env_<X>` destination params as literal `"X=value"` (`:470-474`). Its comment points at this TODO: "Better approach is to set for destination and then pass through only what tool needs however. (See todo in ToolInfo.)"
   - Singularity/Apptainer: `SingularityContainer.containerize_command` (`container_classes.py:591-604`) builds `(NAME, "$NAME")` pairs plus `singularity_env_<X>` params. `singularity_util.py:86-89` turns them into `SINGULARITYENV_NAME="value"` prefixes. `--cleanenv` is on by default (`singularity_util.py:15`, PR #14429), so nothing else leaks in. There is no Apptainer-specific class; the `SINGULARITYENV_` prefix is used for both.
5. **Where the job-script env comes from.** `get_job_file` (`jobs/runners/__init__.py:529-559`) concatenates `destination.env` + `job_wrapper.environment_variables` (tool `<environment_variables>` templates + credentials). It renders them via `env_to_statement` (`jobs/runners/util/env.py:4-30`: `X="Y"; export X`, `. file`, or raw `execute`) into `$env_setup_commands` inside `_galaxy_setup_environment` in `DEFAULT_JOB_FILE_TEMPLATE.sh`. After that come `$instrument_pre_commands`, then `$command`, which is the containerized command from `command_factory.build_command` (`command_factory.py:115`).
6. **Credentials when missing.** Server-side is silent. Variables are injected as `""` if unset (`managers/credentials.py:341-342`), and secrets are skipped if unset (`:326-338`). "Required" is enforced only in the client submit guard (`client/src/components/Tool/ToolForm.vue:128-134`, "Please provide all required credentials before running the tool."). `ToolCredentialsContextCheck.vue` warns on the job-rerun view. No `JobMessage` is involved.

## Static vs dynamic

| Aspect | Static? | Who knows | Notes |
|---|---|---|---|
| Declaration (names, optional/required, description) | Yes | Tool author, via tool source | Parse-time like `credentials`; lint and API-visible |
| Pass-through into container | Yes (names only) | Galaxy at `_find_container` | Values expanded by shell at runtime |
| Value configured in Galaxy destination (`env` name/value, `docker_env_*`, future `tool_env`/`job_env`) | Mostly | Galaxy at job prep | `env file=` / `execute=` are opaque |
| Value present on compute host (cluster env, modules, Pulsar host, `execute`) | No | Only the job script | Needs a runtime check |
| Required vs optional semantics | Yes (declared) | Tool | Enforcement is runtime |

## Runtime-warning options

The job message plumbing already exists. `AnyJobMessage` TypedDict union is at `tool_util/output_checker.py:44-87`. `Job.job_messages` is a JSON column (`model/__init__.py:1684`). Messages are rendered generically as key/value lists in `client/src/components/JobInformation/JobInformation.vue:230-256` and shown in `DatasetError.vue`. One catch: `check_output()` (`output_checker.py:~135-237`) **replaces** `job_messages`, so framework-generated messages have to be appended afterwards. The precedent is `StdioReadErrorJobMessage`, appended after `check_tool_output` in `_finish_or_resubmit_job` (`jobs/runners/__init__.py:717-758`, comment at `:755`). A second `check_output` call site is in extended metadata: `metadata/set_metadata.py:303`. Pulsar finishes through `job_wrapper.finish(...)` (`jobs/runners/pulsar.py:862-872`), not `_finish_or_resubmit_job`.

| Option | How | Pros | Cons |
|---|---|---|---|
| (a) Galaxy-side check at job prep | Compare declared names with `destination.env` name/value entries, `docker_env_*`/`singularity_env_*` params, future `tool_env`/`job_env`, credentials | No job-script changes; can warn before queueing; also works as an admin lint/report (#4953 "GUI for admins") | False positives whenever the var comes from `file`/`execute`/cluster/Pulsar env, which is the common HPC case (module load, site profiles). Can't be authoritative, so it can't fail jobs |
| (b) Job-script check, marker file collected by Galaxy | After `$env_setup_commands`, before the container call: `[ -n "${X+x}" ] \|\| echo X >> <marker>`; Galaxy reads the marker at finish and appends a typed message | Authoritative: sees the exact env the container sees. Works for every env source. Names only, never values | Needs a new marker path. Must be staged back for Pulsar (reuse the job-metrics dir, see below). Two finish paths (runner + extended metadata) need the append. `set -u`/strict shells are fine with `${X+x}` |
| (c) `optional="false"` fails early | Same script check, but `exit` non-zero before running the tool, and Galaxy marks the job FATAL with a clear message | Fast, clear failure instead of an obscure tool crash; same idea as Snakemake `envvars:` | Needs (b)'s transport anyway. Admin misconfiguration shows up as user-visible job failures. Must not trigger stdio regexes; set state from the marker, not the exit code |
| (d) Submit-time enforcement (credentials model) | Client/API refuses to run | Matches credentials UX | Only fits user-supplied values. These are admin/host values the user can't fix. Wrong layer |

**Recommendation: (b) as the mechanism, with (c) as its `optional="false"` mode. Add (a) as an admin-only diagnostic, never as a job failure.**

For (b)'s transport, reuse the job-metrics instrumentation pattern instead of inventing a new file channel. The `env` metrics plugin already does "dump env in the job script, read it back at finish" (`job_metrics/instrumenters/env.py:36-66`). It writes `__instrument_*` files via `_instrument_file_path` (`job_metrics/instrumenters/__init__.py:22,98`). The files run from `$instrument_pre_commands`, which sits after env setup in the template. The metrics directory is already returned by Pulsar (`job_metrics_directory=result.job_metrics_directory`, `pulsar.py:871`). So a framework-owned (not plugin-configured) pre-command that writes `__instrument_env_missing` or similar gets Pulsar support for free. A dedicated `galaxy_<id>.env_missing` beside `.ec` would also work for local/cluster jobs, but Pulsar needs extra handling (see how it writes `.ec` itself at `pulsar.py:853-857`).

Also extend `check_output` (or add a small helper called at both call sites) to accept pre-detected framework messages, so they aren't overwritten. That's a reusable fix for the append-after-replace pattern that `stdio_errors` already works around.

Message shape: a new `MissingEnvironmentVariableJobMessage(JobMessage)` with `type: "missing_environment_variable"`, `name: str`, `error_level`. Use `WARNING` for optional and `FATAL` for required. It could also carry `desc` from the declaration. `JobInformation.vue` renders it with no client change.

## Prior art

- **Galaxy #4953** (jmchilton, 2017, open): "Tool syntax to document optional runtime environment variables ... from standard variables such as `GALAXY_SLOTS` to tool specific such as `TRINITY_MAX_MEMORY`. After that is added - build a GUI for displaying this to admins." This is the original issue behind the TODO. bgruening linked #4741 (reserved memory/storage vars, which became `GALAXY_MEMORY_MB` in PR #4958).
- **Galaxy #21640** (open): `_JAVA_OPTIONS` / `EGGNOG_DBMEM` from the TPV shared DB don't reach Singularity jobs without `SINGULARITYENV_`. This is exactly the problem a tool declaration fixes (eggnog declares `EGGNOG_DBMEM`, TPV sets it in `env`, and it gets passed through).
- **Galaxy PR #21821 / #21715**: credentials `inject_as_env` added to pass-through. This is the model for "declared name gets passed through".
- **Galaxy PR #8292** (tool `<environment_variables>` get passed to Docker), **PR #4612** (structured job env, HOME/TMP pass-through), **PR #14429** (`--cleanenv` default), **#14408** (Singularity leaking host env).
- **#16666 thread**: mvdbeek worries about "leaking secrets into containers" (2023-09-10, 2024-05-08). nuwang/bernt-matthias proposed system/tool env splits. The 2026-02-03 thread settled on `job_env` / `tool_env`.
- **Snakemake `envvars:`** (6.x+, [docs](https://snakemake.readthedocs.io/en/stable/snakefiles/configuration.html)): a top-level list of required env var names. Snakemake "will fail with a reasonable error message if the variables ... are undefined, and otherwise it will take care of passing them to cluster and cloud environments". It deliberately does *not* expose them to shell commands implicitly; you pass them via `params`. This is the closest precedent: static declaration, early runtime failure, executor-aware pass-through. The difference is that Snakemake checks on the submit host, and Galaxy has to check in the job script because values come from the compute side.
- **Nextflow**: process `secret 'NAME'` directive ([docs](https://nextflow.io/docs/latest/secrets.html)) declares per-process inbound secrets injected as env vars; outbound `env` config scope; `docker.envWhitelist` / `singularity.envWhitelist` are an **admin-side allow-list** of host vars forwarded into containers. That's precedent for the security section below.
- **CWL**: `EnvVarRequirement` is outbound only, like Galaxy `<environment_variables>`. There's no inbound declaration. cwltool's `--preserve-environment NAME` is runner/admin-side pass-through, again an allow-list on the executor side.
- **Planemo / linters**: there are no env or credential linters in `lib/galaxy/tool_util/linters/`; only `xml_order.py:34` knows the `environment_variables` tag. galaxy-language-server reads `galaxy.xsd` for completion/validation (`server/galaxyls/services/xsd/constants.py`), so a new XSD element gets editor support for free. Planemo would need a small linter (duplicate names, reserved names, secret-looking names warning).

## Design sketch

**XML** (under `<requirements>`, next to `credentials`, which is also "a runtime thing the tool needs that Galaxy doesn't bundle"):

```xml
<requirements>
    <container type="docker">quay.io/biocontainers/eggnog-mapper:2.1.12--pyhdfd78af_0</container>
    <runtime_environment_variable name="EGGNOG_DBMEM" optional="true"
        description="Set to load the eggNOG DB into memory (needs ~44 GB)."/>
    <runtime_environment_variable name="_JAVA_OPTIONS" optional="true"
        description="JVM options, e.g. -Xmx."/>
    <runtime_environment_variable name="MY_LICENSE_SERVER" optional="false"
        description="License server host for the proprietary binary."/>
</requirements>
```

- Attribute names follow credentials: `name`, `optional` (boolean, default `true`, matching the TODO's "optional environment variables" framing; note that credentials default `optional` to false), and `description`. Add an `xs:unique` on `@name` like `uniqueInjectAsEnv` (`galaxy.xsd:683-687`).
- Don't reuse `<environment_variable>`. That element means outbound (tool sets it, Cheetah body) under `<environment_variables>` (`galaxy.xsd:7389+`), and the same name with the opposite direction is a trap. The element name is an open question (see below).
- **YAML tools**: `requirements` is a `type:`-discriminated list (`parser/yaml.py:167-194`), so use `- {type: runtime_environment_variable, name: EGGNOG_DBMEM, optional: true, description: ...}` and a pydantic model beside `ResourceRequirement` in `tool_util_models/tool_source.py`.
- **User-defined tools (`GalaxyUserTool`)**: reject by default. They're untrusted (see Security). `UserToolSourceAuthoringView` already rejects container requirements (`_models.py:~449-460`), so the same validator pattern works here.
- **Parsing / data flow**: have `parse_requirements_from_xml` / `parse_requirements_from_lists` (`deps/requirements.py:419-494`) return the new list. That tuple is already 5 wide (`tools/__init__.py:1569-1571`), so consider a small `ParsedRequirements` dataclass instead of a 6-tuple. Then append the names into `docker_env_pass_through` in `tools/__init__.py` exactly like the credentials block at `:1579-1588`. Consider collapsing the three `if not self.docker_env_pass_through: ... = []` blocks into one helper. `ToolInfo` then needs no signature change, and the TODO becomes a docstring. Keep the full declaration objects on the `Tool` (e.g. `tool.runtime_environment_variables`) for the check, the API (`to_dict`/tool show, like credentials), and the admin UI.
- **Runtime check**: in `command_factory.build_command`, or better as a framework instrument pre-command, emit the `${X+x}` checks only when the tool declares any. For declared-required vars, write the marker and `exit` with a sentinel before `$command`. At finish, turn marker lines into `MissingEnvironmentVariableJobMessage`s in both finish paths. For required-missing, force the ERROR state no matter what the stdio rules say.
- **Profile gating**: not needed for pass-through, since the element is opt-in and only tools that declare it change behavior. Older Galaxy XML parsers ignore unknown elements, so a tool that uses it degrades to today's behavior. Only XSD validation (planemo lint on an older Galaxy) complains. Document it as "added in 26.x" in the XSD, the way credentials notes its version (`galaxy.xsd:77`).
- **Unrelated cleanup**: `get_job_file` does `envs = destination.env; envs.extend(job_wrapper.environment_variables)` (`jobs/runners/__init__.py:536-537`), which mutates the destination's env list in place. It's worth checking whether that list is per-job or shared.

## Security

- **The threat**: a tool that declares `AWS_SECRET_ACCESS_KEY`, `GALAXY_CONFIG_*`, `DATABASE_URL`, or `*_TOKEN` gets it passed into its container. That can happen if the admin exported it in the job env for a different reason, or if it leaks from the handler env on local runners. That's the leak mvdbeek raised in #16666. It's no worse than non-container jobs today, which already see the whole job-script env. But it removes the isolation that containers plus `--cleanenv` currently give.
- **Trust split**: tool-shed/admin-installed tools are admin-trusted (same trust as credentials `inject_as_env`, which can already name anything). User-defined tools are not, so reject the declaration there, or only honor names on an admin allow-list.
- **Admin control** (following Nextflow `envWhitelist` and cwltool `--preserve-environment`): add a destination param such as `tool_env_pass_through_deny` (default patterns like `*SECRET*`, `*TOKEN*`, `*PASSWORD*`, `AWS_*`, `GALAXY_CONFIG_*`) and/or an opt-in `..._allow` list. Denied names are dropped from pass-through and reported to the admin, not the user. Galaxy's own reserved names (`GALAXY_SLOTS`, `HOME`, `TMP*`, `_GALAXY_*`) should be rejected at parse/lint time.
- **Marker hygiene**: write names only, never values. Log denied or dropped names at debug level, not in user-visible messages, because a secret-looking name that exists is itself a small leak.

## Relation to `job_env` / `tool_env`

- `tool_env` is **admin push**: name and value set on the destination and delivered to the tool (container included) for every tool on that destination.
- The tool declaration is **tool pull**: names only; the value comes from wherever the job env gets it (`env`/`job_env`, `file`/`execute`, cluster).
- They compose. `tool_env` covers "the admin knows the value and wants every tool to see it". The declaration covers "only tools that asked for it see it". That's how TPV's shared DB can set `EGGNOG_DBMEM` in plain `env`/`job_env` and have it reach Singularity without `SINGULARITYENV_` (#21640) and without leaking every `job_env` value into every container.
- The check should treat names in `tool_env` as satisfied. The (a) lint can use `tool_env` + `job_env` + `env` name/value as its "known configured" set.
- Ordering: `tool_env` values should be visible before the runtime check runs, so both belong in `$env_setup_commands` ahead of the instrument pre-commands.

## Test plan (red-to-green)

1. **Parser unit** (extend the existing credentials/requirements tests, e.g. the doctests in `deps/requirements.py:441+` and `test/unit/tool_util/test_parsing.py`): XML and YAML parse the names, `optional`, and `description`. This red test is cheap.
2. **XSD**: add the element to a test tool, and `test/unit/tool_util/test_tool_validation` (or lint tests) validates it. Also test duplicate-name uniqueness.
3. **Integration, containers (main red test)**: add a tool `test/functional/tools/runtime_env_pass_through.xml` that declares `JOBCONF_ENV_VAR` (the var #16666's `job_environment_default.xml` already probes) and echoes it. In `test_containerized_jobs.py::TestDockerizedJobsIntegration`, add `env: [{name: JOBCONF_ENV_VAR, value: ...}]` to the `local_docker` destination in `dockerized_job_conf.yml`. Assert that the value reaches the container. That's red today and green after the change. `TestSingularityJobsIntegration` inherits it, so Singularity is covered too. Keep the existing `JOBCONF_ENV_VAR`-not-passed assertion for tools that *don't* declare it; that's the security property.
4. **Runtime message**: same tool with an undeclared-on-destination optional var. Assert `job_messages` has `type == "missing_environment_variable"`, WARNING level, and the job state is `ok`. A required variant should give job state `error` plus a FATAL message, with the tool command not run (output absent or a sentinel not written). Also run this in non-container `TestDefaultJobEnvironmentIntegration` (`test_job_environments.py`), since the check isn't container-specific.
5. **Pulsar**: `TestEmbeddedPulsarDefaultJobEnvironmentIntegration` (`test_job_environments.py:123`) checks that the marker comes back through the metrics dir.
6. **Extended metadata path**: rerun test 4 under an extended-metadata config so that `set_metadata.py:303` doesn't drop the message.
7. **User-defined tool rejection**: a unit test on `UserToolSource` validation.
8. Run the Galaxy integration tests one at a time (they're slow).

## Unresolved questions

- Element name: `runtime_environment_variable` vs `env_pass_through` vs `consumes_env` vs YAML-only `type: environment_variable`?
- Default `optional`: true (per the TODO) or false (per credentials)?
- Required-missing: fail in the job script (exit before the tool) or run anyway and only mark FATAL?
- Transport: reuse the job-metrics `__instrument_*` dir (Pulsar support for free) or a dedicated `.env_missing` beside `.ec`?
- Security default: deny-list of secret-looking names, admin allow-list, or trust installed tools fully?
- User-defined tools: reject outright or allow-list only?
- Should the (a) admin lint ship in v1, or wait for the admin UI from #4953?
- Should this land before, with, or after `job_env`/`tool_env`, given that the tests share `dockerized_job_conf.yml`?
- Should the `destination.env` in-place `extend` in `get_job_file` be checked or fixed separately?
