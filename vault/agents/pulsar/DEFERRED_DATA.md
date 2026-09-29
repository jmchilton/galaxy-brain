# Deferred data with Pulsar: research and test plan

## Goal

Make deferred dataset inputs reliable on Pulsar, then allow an opt-in path that
materializes them on the execution side. The second goal should avoid downloading
the source to the Galaxy job handler and uploading the same bytes to Pulsar.

## What we know (2026-09-24)

- [Galaxy issue #16744](https://github.com/galaxyproject/galaxy/issues/16744)
  reported failures on Galaxy 23.1. Its table combines two problems: deferred
  inputs missing from the Pulsar job, and remote tool evaluation failing even
  with ordinary inputs. The reported remote failures include a missing
  `$GALAXY_LIB/galaxy/tools/remote_tool_eval.py` and missing
  `metadata/params.json` / `outputs_populated/datasets_attrs.txt`.
- In the October 2025 discussion on that issue, Martin states that deferred
  data is materialized before ordinary Pulsar submission. Sanjay, Björn, and
  other operators want materialization at Pulsar or the compute node. This is
  an efficiency and placement requirement beyond making the current path work.
- In the local Galaxy checkout (`a63da1dfd19`, 2026-08-11),
  `lib/galaxy/tools/evaluation.py` materializes deferred objects in
  `ToolEvaluator.set_compute_environment()`. The ordinary evaluator does this
  during `job_wrapper.prepare()`, before Pulsar stages inputs.
  `PartialToolEvaluator` sets `materialize_datasets = False` for remote command
  evaluation; `RemoteToolEvaluator` later materializes on the execution side.
- `lib/galaxy/jobs/runners/pulsar.py` builds `ClientInput` records from
  `job_io.get_input_paths(compute_environment.materialized_objects)`. In Pulsar,
  `pulsar/client/staging/up.py` stages these as paths. This path-only contract
  cannot itself carry a deferred source and its transforms/credentials.
- `lib/galaxy/jobs/command_factory.py` still marks the Pulsar remote-evaluation
  command as a workaround that breaks path rewriting when paths are not shared.
  The remote evaluator also depends on Galaxy code on the execution host, the
  serialized job/model store, file-source configuration, and metadata files.
  See [[Component - Galaxy Pulsar Runner Code Sharing]] for the runtime-version
  boundary.
- Existing `test/integration/test_extended_metadata.py` covers deferred data
  with remote evaluation on a non-Pulsar runner. Embedded Pulsar integration
  tests cover staging and extended metadata separately. I did not find a test
  crossing deferred input, Pulsar, and both evaluation strategies.

These are code and issue observations, not a fresh production reproduction.
The 2023 failures may have changed. In particular, a successful tool run does
not prove where data was downloaded.

## First test matrix and result

Use embedded Pulsar with explicit `default_file_action: copy` and a local
source fixture. Keep the same simple `cat` tool and expected bytes across
cases. Capture the job state, output content, Galaxy job `inputs/` state,
Pulsar staging `inputs/` state, and the earliest failure message.

| Input | Tool evaluation | Metadata | Result on embedded Pulsar | Purpose |
| --- | --- | --- | --- | --- |
| ordinary text | local | directory | pass | Staging control |
| deferred text | local | directory | pass; materialized bytes in Galaxy job `inputs/` | Current compatibility |
| ordinary text | remote | extended | pass | Isolate remote evaluation |
| deferred text | remote | extended | pass; no materialized file in Galaxy job `inputs/` | Combined case |
| deferred binary (BAM) | local | directory | pass; materialized bytes in Galaxy job `inputs/` | Binary input baseline |
| deferred binary (BAM) | remote | extended | pass; no materialized file in Galaxy job `inputs/` | Combined binary case |

The implemented first fixture is `base64://` so results are deterministic and
network independent. The Galaxy job-directory assertion identifies which side
materialized the bytes in this embedded configuration, but base64 does not
measure remote network access or transfer efficiency. Add a controlled HTTP
source reachable from both sides, then a source reachable only by Galaxy, as
separate tests. Instrument the source or Pulsar staging process before making
claims about which network endpoint downloaded data. Do not rely solely on a
public URL; availability would obscure the result.

## Implementation sequence

1. Keep the six-case embedded matrix as a regression baseline. The current
   `RemoteToolEvaluator` already provides a remote-materialization path in this
   topology. A separate repair PR is warranted only if a real Pulsar deployment
   reproduces the old runtime/staging failure.
2. Repeat the matrix against a separate Pulsar service with non-shared storage,
   the same Galaxy revision, and its configured Galaxy runtime. Record the
   Pulsar version, job status, metadata artifacts, and input placement. This
   tests the boundary absent from embedded Pulsar.
   Completed as a separate sandboxed process on 2026-09-26: local evaluation
   passes; remote evaluation fails on dataset path resolution. See below.
3. Add controlled HTTP and restricted file-source cases to determine whether
   remote evaluation fetches at the desired location and how user-scoped
   credentials work. Check transforms, hashes, binary metadata, and collections
   before calling remote evaluation production ready.
4. If remote evaluation is too broad a requirement for data locality, build an
   opt-in staging-level path using a source descriptor on the existing
   `ClientInput` contract. Reuse Galaxy's materialization semantics rather than
   adding a second downloader. Keep Galaxy-side materialization as a fallback
   for unsupported or inaccessible sources.

## Design questions to resolve with the first tests

- Does the existing remote evaluator work with a separate Pulsar service and
  non-shared storage, or is the old issue reproducible there?
- Does materialization on the execution side need the full Galaxy runtime, or
  can the existing materializer be packaged behind a smaller entry point?
- How will user-scoped file-source access be represented safely on Pulsar?
  A raw URI cannot stand in for Galaxy's authorization and credentials.
- Should remote fetching run in Pulsar's staging phase or in the scheduled job?
  That determines network locality, queue time, and retry ownership.
- How will a destination declare support so TPV can select it and Galaxy can
  fall back without silently changing data placement?

## Verification status

Implemented in the local Galaxy checkout as
`test/integration/test_pulsar_deferred_data.py` with
`embedded_pulsar_deferred_job_conf.yml`. Galaxy revision:
`a63da1dfd19` (2026-08-11). The test environment used
`pulsar-galaxy-lib==0.15.15` and Python 3.13.12. The six-case run passed
(`6 passed`); a focused
rerun of four deferred cases with materialization-location assertions passed
(`4 passed, 2 deselected`). The tests compare byte-for-byte outputs, including
the BAM fixture. They establish input placement relative to the Galaxy job
directory; they do not yet cover a separate Pulsar installation, external
network source, source authorization, or retry behavior.

Run with:

```sh
GALAXY_PYTHON=python3.13 ./run_tests.sh -integration test/integration/test_pulsar_deferred_data.py
```

## Separate Pulsar service experiment (2026-09-26)

The eight-case matrix completed with **4 passed, 4 failed** in 178.01 seconds
on the same Galaxy revision and `pulsar-galaxy-lib==0.15.15`.

Pulsar's real HTTP API runs in its own process with a separate staging directory.
The REST runner uses `default_file_action: transfer`; files cross the HTTP API
instead of being copied directly between directories. A macOS sandbox denies
Pulsar and its child processes all reads and writes under Galaxy's test storage
root. A startup probe confirms that reading a Galaxy-owned file raises
`PermissionError` before the service accepts jobs.

This enforces the absent job-storage boundary on one machine. It is not a run on
a second host: Galaxy code and its Python environment remain readable on both
sides, and both processes share the host's network. The experiment is opt-in
and macOS-specific; a container or separate-host version is still needed for
portable CI and deployment validation.

| Input | Local evaluation / directory metadata | Remote evaluation / extended metadata |
| --- | --- | --- |
| Ordinary text | pass | fail: `cat '' > ''` |
| Deferred text (`base64://`) | pass | materializes correctly at Pulsar; fail: empty output path |
| Deferred BAM (`base64://`) | pass | materializes correctly at Pulsar; fail: empty output path |
| Deferred text (controlled HTTP) | pass; Galaxy downloads | Pulsar evaluator downloads and materializes; fail: empty output path |

### Evidence and failure boundary

- All four local-evaluation cases produce the expected output bytes. Local
  deferred cases retain materialized input bytes in Galaxy's job `inputs/`.
- All four remote jobs have input files in Pulsar's staging directory. A
  separate byte comparison confirms that every input matches its fixture,
  including the 3,592-byte BAM.
- The remote ordinary-input command is `cat '' > ''`. For deferred inputs,
  the input argument is the correct Pulsar staging filename, but the output
  argument is still empty. The shell exits with code 1.
- `metadata/params.json` and `metadata/outputs_populated/datasets_attrs.txt`
  exist for all four remote jobs. This reproduction is not the missing-runtime
  or missing-metadata-files failure reported in the original issue.
- The HTTP fixture holds each connection open while `lsof` identifies its
  client process. Local evaluation downloads from the Galaxy test process
  (PID 8212). Remote evaluation downloads from a separate process (PID 9638)
  running `galaxy/tools/remote_tool_eval.py`. The materialized HTTP bytes match
  the fixture even though the subsequent command fails. No HTTP GET occurs
  while creating the deferred dataset.
- The remote HTTP job also logs an ignored `Bad file descriptor` exception
  from URL materialization. Its input bytes are complete; the fatal failure is
  the empty output path. Keep that warning as a separate follow-up observation.

The likely code boundary is `remote_tool_eval.py`: it reloads the serialized
Galaxy object-store configuration and constructs `SharedComputeEnvironment`.
That class explicitly assumes shared filesystems. The serialized object-store
configuration still points at Galaxy's storage root, which Pulsar cannot read
in this experiment. Ordinary input path resolution becomes empty; deferred
materialization supplies a valid local input path, but output resolution still
becomes empty. This is a diagnosis from the code and artifacts, not a verified
production fix.

### Recommended first repair

1. Keep the ordinary-input failure as the control regression: remote evaluation
   must work before deferred-input success can be attributed to materialization.
2. Give remote evaluation execution-side dataset paths using the existing
   `JobIO`, `DatasetPath`, and Pulsar path-mapping abstractions. Include input,
   output, extra-files, and metadata paths; avoid resolving tool paths through
   Galaxy's original disk object store on the execution side.
3. Make all eight isolated-storage cases pass with their existing byte and
   placement assertions. The tests deliberately retain their failing assertions
   rather than declaring the broken remote cases successful or expected failures.
4. Then test restricted file sources, user credentials, hashes/transforms, and
   collections. The current evidence supports repairing remote evaluation
   before introducing a second deferred-source staging protocol.

### Reproduction and artifacts

The Galaxy checkout now contains `test/integration/test_pulsar_deferred_external.py`
and the small `deferred_pulsar_service.py` HTTP-service launcher. They reuse the
three baseline cases in `test_pulsar_deferred_data.py` and add one HTTP case per
evaluation strategy. The external experiment skips unless explicitly enabled.

On macOS, with Galaxy's prepared virtualenv:

```sh
source .venv/bin/activate
export GALAXY_TEST_EXTERNAL_PULSAR=1
export GALAXY_PYTHON="$VIRTUAL_ENV/bin/python"
export GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false
export GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true
export GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true
export GALAXY_TEST_TOOL_CONF="lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml"
python -m pytest test/integration/test_pulsar_deferred_external.py -v --tb=short
```

Local artifacts from the eight-case run:

- Test log: `/private/tmp/deferred_external_matrix.log`.
- HTML report: `/private/tmp/deferred_external_matrix.html`.
- Local-evaluation service, staging, and HTTP evidence:
  `/private/tmp/deferred_pulsar_external_mwt7umah/`.
- Remote-evaluation service and staging:
  `/private/tmp/deferred_pulsar_external_k_gy7f1k/`.
- Sanitized input hashes, command lines, and metadata presence summary:
  `/private/tmp/deferred_pulsar_remote_summary.json`.

The final harness additionally retains `http_evidence.json` when tool execution
fails, so subsequent reproductions do not depend on pytest's captured locals.
Service logs contain transient test job keys and are not included in the branch.

A focused rerun of the final HTTP diagnostic reproduced the same output-path
failure (`1 failed` in 43.49 seconds). Its retained JSON confirms that Galaxy
PID 10858 did not fetch the source: remote evaluator PID 12022 did. Its Pulsar
input again matches the expected bytes. Evidence is in
`/private/tmp/deferred_pulsar_external_faydpbxl/http_evidence.json`; the rerun log
is `/private/tmp/deferred_external_http_diagnostic.log`.

The tests and reproduction report are preserved on the research branch
[`jmchilton/galaxy:deferred-pulsar-matrix-20260926`](https://github.com/jmchilton/galaxy/tree/deferred-pulsar-matrix-20260926).
No production code has been changed. The external cases remain failing
regressions until execution-side path resolution is repaired.


## 2026-09-27 implementation: remote evaluation paths

Work now runs from `vault/agents/pulsar`; explicit working directories avoid the
removed `vault/reviews/pulsar` path. The implementation worktree is
`/private/tmp/galaxy-deferred-pulsar-fix` on the existing
[deferred-pulsar-matrix-20260926 branch](https://github.com/jmchilton/galaxy/tree/deferred-pulsar-matrix-20260926).

### Implemented

- Export the runner-resolved compute environment next to `job_io.json`, including
  ordinary input, output, extra-file and metadata-file mappings and job directories.
- Reuse those mappings during remote evaluation, avoiding Galaxy object-store
  filename lookups for ordinary inputs and outputs.
- Leave deferred inputs out of the input mapping so Pulsar's materializer supplies
  their execution-side paths. Keep the shared-environment fallback for old jobs.
- Avoid registering missing input extra-file directories, which would otherwise
  make Pulsar attempt to stage nonexistent files.
- Support remote evaluation with `remote_metadata: false`: stage the exported job
  and datatype registry, transfer outputs back, and run extended metadata in Galaxy.
- Add four isolated-storage cases for that configuration while preserving the
  original remote-metadata cases and all byte-content/download-placement assertions.

### Findings and acceptance boundary

All four isolated cases with remote evaluation and Galaxy-side extended metadata
pass: ordinary text, deferred base64 text, deferred BAM, and deferred HTTP text.
The HTTP evidence proves the remote evaluator performed the GET, the storage
probe was denied, and the final recovered output matched the source bytes.
Evidence: `/private/tmp/deferred_pulsar_external_s9ihz7rr/http_evidence.json`.

The original four isolated remote-evaluation/remote-extended-metadata cases still
fail, now at the **next boundary**: `set_metadata.py` attempts to write directly
to Galaxy's disk object store and receives `PermissionError`. Each tool produced
correct output bytes on Pulsar; all four outputs were independently compared with
the fixtures (text 22 bytes; BAM 3592 bytes). These failures are retained, not
marked xfail or converted to weaker assertions. Their evidence is under
`/private/tmp/deferred_pulsar_external_pixucq4o/`.

This establishes a usable remote-evaluation configuration with output transfer;
it does not establish portable remote extended metadata. The isolation remains
separate processes on one host with enforced job-storage denial, not separate
hosts. Composite tools, metadata-dependent tools, authenticated sources,
reference-data path rewriting, transforms and collections need further coverage.
The extra-file and metadata-path snapshot currently has unit regression coverage.

### Next repair

Define how extended metadata returns output files and discovered datasets when
Pulsar cannot access Galaxy's object store. Use the retained four isolated remote
metadata failures as acceptance tests. Evaluate an explicit model-store/file
transfer contract rather than silently assuming direct object-store access.

### Reproduce the passing remote configuration

Use the environment variables from the matrix instructions above, then:

```sh
python -m pytest test/integration/test_pulsar_deferred_external.py::TestExternalPulsarRemoteEvaluationLocalMetadata -v --tb=short
```

Reports/logs:

- Remote configuration and embedded remote regression run:
  `/private/tmp/deferred_path_fix_verified.log`,
  `/private/tmp/deferred_path_fix_verified.html`.
- Retained remote-metadata failures:
  `/private/tmp/deferred_path_fix_remote_metadata_final.log`.
- Local evaluation controls: `/private/tmp/deferred_path_fix_controls.log`.
- Unit regressions: `/private/tmp/deferred_path_fix_unit_final.log`.
- Formatting/lint hooks: `/private/tmp/deferred_path_fix_hooks_final.log`.


### Verification results

Across the selected final and control runs:

| Configuration | Result |
| --- | --- |
| Embedded Pulsar, local evaluation | 3 passed |
| Embedded Pulsar, remote evaluation | 3 passed |
| Isolated Pulsar, local evaluation | 4 passed |
| Isolated Pulsar, remote evaluation, metadata in Galaxy | 4 passed |
| Isolated Pulsar, remote evaluation, extended metadata in Pulsar | 4 failed at object-store writes |
| Compute environment and JobIO unit regressions | 3 passed |

The final remote-configuration plus embedded-remote run reports **7 passed** in
176.30 seconds. The original isolated remote-metadata run reports **4 failed**
in 103.89 seconds. All four of those remote outputs independently match the
fixtures; the remaining failure is a denied object-store write. The earlier
control run caught the missing-extra-directory registration regression; its
ordinary embedded case passed in the final rerun after the fix.

HTTP evidence for the passing configuration:
`/private/tmp/deferred_pulsar_external_s9ihz7rr/http_evidence.json` (remote
evaluator PID 37076, Galaxy PID 36340, isolation probe denied).

Final report: `/private/tmp/deferred_path_fix_verified.html`.
Original remote-metadata failure evidence:
`/private/tmp/deferred_pulsar_external_pixucq4o/`.
All Python formatting/lint hooks pass. Service logs and runtime credentials are
retained locally and are not committed.
