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
