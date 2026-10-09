Follow-up to 🔀 #23784 - record which Pulsar version a job was submitted for and which one ran it, and finish jobs for the version they were submitted for.

Galaxy decides how to stage a Pulsar job's outputs from a guess at the remote Pulsar's version, and when the guess is wrong, discovered outputs quietly go missing (galaxyproject/pulsar#135). Today nothing records that guess, so an admin can't tell which destinations are guessing or guessing wrong. With this branch, the `pulsar` job metrics plugin shows admins this on each Pulsar job:

| Metric | Example | Meaning |
|---|---|---|
| Pulsar Client Version | `0.15.16` | Galaxy's `pulsar-galaxy-lib` |
| Pulsar Target Version | `0.15.16` | the remote version Galaxy submitted the job for |
| Pulsar Target Version Source | `client` | how Galaxy knew it (below) |
| Pulsar Server Version | `0.15.12` | the Pulsar that actually ran the job |
| Pulsar Server Version Source | `status` | `status` (in the finished job's status) or `job_files` (written by Pulsar, galaxyproject/pulsar#529) |

These rows read "Galaxy didn't know the remote's version, assumed a current Pulsar, and a 0.15.12 Pulsar ran the job". 0.15.12 predates dataset collector descriptions (0.15.13), so this destination's discovered outputs can go missing, and it needs `remote_pulsar_version`. ***These metrics only record a mismatch; Galaxy doesn't warn about one.*** They're admin-only by default (`POTENTIALLY_SENSITVE`); the transfer figures from #23784 stay public.

***Useful with today's client library: on `jobs_directory` destinations the target is Galaxy's own client version and the server version comes from the status, so a mismatch already shows. Only `target_version_source` reads `unreported` until pulsar#523 ships.***

<details><summary>Target version sources</summary>

From galaxyproject/pulsar#523's `pulsar_version_source`:

- `remote` - the remote Pulsar reported it at setup.
- `destination` - the destination's `remote_pulsar_version`.
- `container_image` - a published Pulsar staging image Galaxy recognizes.
- `client` - unknown, so the client library's version stands in and a current Pulsar is assumed.
- `unreported` - a client library that predates pulsar#523.

</details>

### Finishing uses the submitted version

***This replaces #23821: the launch/finish disagreement found reviewing it is fixed here, its `check_job_config` skip is dropped (it compared the client library against itself), and recognizing coexecution staging images moved to pulsar#523.***

`finish_job` used to describe outputs for the version in the finished job's *status*, while submission used the version from *setup*. The two disagree in two places (found reviewing #23821):

| Job | Outputs described at submission for | At finish, before | At finish, now |
|---|---|---|---|
| Polling coexecution (Kubernetes, TES, GCP Batch); status has no version | the target, e.g. `0.15.16` | `0.6.0` (missing version) | the recorded target |
| `jobs_directory` (MQ) remote; setup never asks the remote | the client library's version | the version in the status | the recorded target |

Finish now reads the target recorded at submission: one version per job, the one the metric reports. Jobs submitted before this change have no recorded target and fall back to the status version, as before.

***For `remote_transfer` destinations (the default for MQ and coexecution) this changes no collected outputs: the remote already staged them using the submission-time description. Galaxy's finish-time description only decides what Galaxy fetches itself.***

***It also doesn't fix a wrong target.*** An old remote Galaxy couldn't identify (`target_version_source: client`) is still told to collect outputs for a current Pulsar, and outputs can still go missing. The fix there is declaring `remote_pulsar_version` (pulsar#523); the new metric is how to find those destinations.

### Renames `pulsar_transfer` to `pulsar`

One plugin now reports everything Pulsar-related. ***#23784 is only on `dev`, so no release has the `pulsar_transfer` name; a `dev` job metrics config that names it will fail to load.*** The files it reads keep their names, so Pulsar's side is unchanged: `transfer_<phase>` under plugin `pulsar` is still `__instrument_pulsar_transfer_<phase>`.

<details><summary>What you'll see before the Pulsar side ships</summary>

- With today's pin (`pulsar-galaxy-lib` 0.15.15), every job records `target_version_source: unreported`.
- Polling coexecution jobs record no server version until the destination's staging image includes pulsar#529. Galaxy's default `galaxy/pulsar-pod-staging:0.15.0.2` never will.
- Transfer figures need galaxyproject/pulsar#518.
- `remote_pulsar_version` does nothing until Galaxy's client library includes pulsar#523; the job metrics docs say so and link to Pulsar's Galaxy configuration docs.

Either side can land first. Nothing breaks without the other: missing files just mean missing metrics.

</details>

<details><summary>Implementation notes</summary>

- The runner writes `__instrument_pulsar_version_target` into the job's metadata directory before launch, and `__instrument_pulsar_version_status` after `pulsar_finish_job`, so staged-back files can't overwrite it. Writes are best effort and logged with `log.exception`; a metric never fails a job.
- `InstrumentPlugin.safety` and the instrument file-name helpers are now classmethods. `JobMetrics.dictifiable_metrics` used the plugin class's `default_safety` for a plugin configured only per destination, which dropped per-metric safety; it now calls `safety(metric_name)`.
- `PulsarPlugin` owns reading and writing its files, so the runner and the plugin share one naming convention.

</details>

## Risks

The one-way piece is the plugin name: once `pulsar` ships in a release, job metrics configs will name it, and renaming again means breaking them.

<details><summary>Risk Details</summary>

- `dev` job metrics configs naming `pulsar_transfer` stop loading.
- A job metrics file shared with Pulsar and naming `pulsar` stops a Pulsar without pulsar#518's "skip unknown plugins" from starting. #23784's `pulsar_transfer` had the same issue.
- The metric names and their `source` vocabularies (`remote`, `destination`, `container_image`, `client`, `unreported`; `status`, `job_files`) become what admins query.
- Finishing now trusts the recorded target over the status version. For Galaxy-fetched outputs, a wrong target is now consistently wrong with submission instead of inconsistently.

</details>

<details><summary>Risk Review Advice</summary>

Check the plugin name and metric names are ones we're happy to keep. In `runners/pulsar.py`, check `finish_job`'s use of `submitted_pulsar_version` and the fallback for jobs submitted before this change.

</details>

## Context

Builds on 🔀 #23784 (Pulsar transfer job metrics). Replaces 🔀 #23821 (see above). Pairs with galaxyproject/pulsar#518 (transfer metrics and the matching rename), galaxyproject/pulsar#529 (Pulsar records its own version) and galaxyproject/pulsar#523 (`pulsar_version_source`).

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A metric that can't be written or read is logged and left out; the job still runs and finishes. A `dev` config still naming `pulsar_transfer` fails at startup.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The finish test drives `finish_job` and checks the version outputs are described for, and the integration test reads the metrics back through `/api/jobs/{id}/metrics`.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `test_finish_job_describes_outputs_for_the_submitted_version` drives `finish_job` with a status carrying no version and a recorded target of `0.15.16`. It fails with the old finish line (`0.6.0`).
- Unit tests for the plugin: reading, which server version source wins, admin-only visibility (including a plugin configured only per destination), formatting, and logged failures.
- `test_records_pulsar_version_metrics` runs a job on embedded Pulsar and checks every version metric is recorded and that server, target and client versions agree.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
