# Stage log

One section per stage, appended by the stage's agent. Newest last.

## Stage 1: research (2026-11-14)

Output: [`RESEARCH.md`](RESEARCH.md). The research was split across five nested subagents (Opus, effort high): Galaxy WES, the Pulsar TES runner, tesp-api, TES servers plus interop, and IWC candidates. The coordinator rechecked the load-bearing claims against source.

What was done:

- Read Galaxy at `65e6daff233` (dev, 2026-10-30) and compared it with `origin/dev` `a6ed8bfdf9d` after a `git fetch` (the checkout state was not changed). Read Pulsar at `08dedcb9` (`0.16.0-69`).
- Cloned `~/projects/repositories/tesp-api` (upstream `3d470f76`, release 0.2.0; fork remote `mirelaminkova` at `c3a9f237`), `~/projects/repositories/cesnet-usegalaxy` (`1b87ceb6`), and `~/projects/repositories/iwc` (shallow, `c07557fb`).
- Pulled `galaxy/pulsar-pod-staging:0.15.0.2` and inspected it; the image is still on the machine. Ran `docker manifest inspect` on candidate tool images and on the Funnel, TESK and tesp-api images. Ran Galaxy's mulled resolver read-only. No services were started, and no containers are left running.

Main findings:

- Galaxy WES has been in releases since v26.0.0. Use v26.0.2 or later: before that, a finished run reported `UNKNOWN` instead of `COMPLETE`.
  - The submit body must be multipart or urlencoded form data.
  - It accepts only Galaxy workflow types.
  - The code accepts URL and CWL-style `File`/`Collection` inputs in `workflow_params`, but no test covers them.
  - A run whose jobs failed still reports `COMPLETE`.
  - The vault note [[PR 21335 - GA4GH WES API]] is out of date on several points.
- The Pulsar TES runner needs an AMQP broker that both Galaxy and the task containers can reach, and it never polls TES.
  - Neither Galaxy CI nor Pulsar CI runs TES.
  - The default staging image dates from 2023 (Pulsar 0.15.0.dev1). With Galaxy's pulsar-galaxy-lib 0.16.0 it silently drops `discover_datasets` outputs (`docs/compatibility.rst`).
  - Pulsar's own default image tag (`0.15.0.0`) doesn't exist.
- tesp-api runs Galaxy's stock `PulsarTesJobRunner` tasks through an outer Pulsar REST server. It is development-grade and quiet upstream since 2026-02, with an active third-party fork. Its AMQP mode, S3/FTP outputs and cancel don't work as documented. A task can't run longer than about 27 minutes by default.
- Funnel v0.12.3 (host binary) is the TES server for the demo. TESK needs Kubernetes, which isn't installed here.
- No non-Galaxy WES server runs Galaxy workflows. `wes-client` and probably the Dockstore CLI can't drive Galaxy WES.
- Demo workflow: IWC `short-read-qc-trimming` (fastp + MultiQC, `list:paired` input, about 44 MB of Zenodo data). Both containers are confirmed, and it avoids the discovered-outputs bug.

Not verified (left for stage 2): everything in RESEARCH.md marked inferred, in particular WES URL inputs, the Funnel config, the networking from task containers back to Galaxy and RabbitMQ, and tesp-api's handling of long launch messages.

Security: the subagents wrote private notes outside the repository, as the brief requires. Nothing sensitive is in RESEARCH.md.
