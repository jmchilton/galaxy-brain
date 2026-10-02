> **Drafted by Claude (AI assistant) on jmchilton's behalf.**

Follows #23784 (Pulsar transfer job metrics). Replaces #23821, which I closed: knowing
which Pulsar version Galaxy assumed, and which one actually ran, seemed more useful than
more version logic. This also fixes the launch/finish disagreement Marius found reviewing
that PR.

Pulsar side: galaxyproject/pulsar#518 (transfer metrics, includes the matching rename),
galaxyproject/pulsar#529 (Pulsar records its own version, on top of #518), and
galaxyproject/pulsar#523 (`pulsar_version_source`). Either side can land first. Nothing
breaks without the other, but see "What you'll see before the Pulsar side ships" below.

**Renames the `pulsar_transfer` job metrics plugin to `pulsar`.** #23784 is only on `dev`,
so nothing released uses the old name. A `dev` job metrics config that names
`pulsar_transfer` will now fail to load. One plugin now reports everything Pulsar-related.
The files it reads keep their names: `transfer_<phase>` under plugin `pulsar` is still
`__instrument_pulsar_transfer_<phase>`.

**Records Pulsar versions as job metrics.** These are admin-only; the transfer figures stay
public.

| metric | meaning |
|---|---|
| `client_version` | Galaxy's `pulsar-galaxy-lib` |
| `target_version` | the remote version Galaxy submitted the job for |
| `target_version_source` | how Galaxy knew it (from pulsar#523): `remote`, `destination` (`remote_pulsar_version`), `container_image` (a published staging image), `client` (unknown, so the client library's version stands in), or `unreported` (a client library that predates pulsar#523) |
| `server_version` | the Pulsar that actually ran the job |
| `server_version_source` | `status` (reported in the finished job's status) or `job_files` (written by Pulsar into the job's files, pulsar#529; the only report from polling Kubernetes, TES, GCP Batch and AWS Batch runners) |

The runner writes the target at submission and the status version at finish. For now these
only record a mismatch; nothing warns about it.

**Finishes jobs for the version they were submitted for.** `finish_job` described outputs
using the version in the finished job's status, while submission used the version from
setup. Marius found two places these disagree:
- a `jobs_directory` (MQ) remote, where setup never asks the remote and the status reports
  the real version;
- polling coexecution, whose status carries no version at all, so it read as `0.6.0`.

Finishing now reuses the recorded target version, so it describes outputs the way the
remote was told to collect them. If the target itself was wrong, that is, an old remote
whose version Galaxy couldn't know (`target_version_source: client`), outputs can still go
missing. The fix there is declaring `remote_pulsar_version` (pulsar#523). The new metric is
how to spot those destinations. Jobs submitted before this change fall back to the old
behaviour.

The job metrics docs describe `remote_pulsar_version` and link to Pulsar's Galaxy
configuration docs. That setting does nothing until Galaxy's Pulsar client library includes
pulsar#523.

**Relation to #23821.** That PR skipped `check_job_config`'s minimum-version check when the
version came from the client library. This one doesn't. With `pulsar_version_source:
client` the compared version is the pinned client library, which meets every entry in
`MINIMUM_PULSAR_VERSIONS`, so the skip only removed a log line. The coexecution concern
from that review (Galaxy knows the default staging image's version) is handled on the
Pulsar side by pulsar#523's map of published images.

**What you'll see before the Pulsar side ships.** With today's pin (`pulsar-galaxy-lib`
0.15.15), every job records `target_version_source: unreported`. Polling coexecution jobs
record no `server_version` until pulsar#529 is released. Transfer figures need pulsar#518.

Tests:
- unit tests for the plugin: reading, which server version source wins, admin-only
  visibility (including when the plugin is only configured per destination), formatting,
  and logged failures;
- unit tests for picking the submitted version at finish, and one that drives `finish_job`
  with a status carrying no version (polling coexecution) and checks outputs are described
  for the recorded target, not `0.6.0`. It fails without the runner change;
- an embedded Pulsar integration test that checks every version metric is recorded and that
  server, target and client versions agree.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
