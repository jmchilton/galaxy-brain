# Pulsar issue triage

Companion to `index.md` (which tracks PRs to review). This tracks the **issue** backlog:
57 open as of 2026-09-22, the oldest from 2014-09-21.

Sections below the fold are mechanical — built from GitHub cross-reference events, not from
reading each issue. Annotate lines in place as triage proceeds.

## Blocked issues

- 492 report failure reason to Galaxy — blocked on https://github.com/galaxyproject/pulsar/pull/486 (the issue's own Sequencing section puts 485/486 first)
- 510 modernize Windows support — blocked on access to a Windows development environment. Tracker for the seven Windows issues closed 2026-09-16 (8, 46, 55, 57, 92, 121, 128); reopen the work only if a Windows box gets hooked up to an agent.

## Open issues with an open PR

- 384 status publisher dies on oversize message https://github.com/galaxyproject/pulsar/pull/499 (closes)
- 465 batch co-execution tracker https://github.com/galaxyproject/pulsar/pull/473 (partial — tracker issue, won't close)
- 490 extract resilience harness https://github.com/galaxyproject/pulsar/pull/509 (closes)
- 498 ubuntu-22.04 runner deprecation https://github.com/galaxyproject/pulsar/pull/508 (partial — 506, 507 merged; packaging metadata PR still unwritten)

## Had a PR that never landed

Prior attempts worth reading before starting fresh.

- 384 — https://github.com/galaxyproject/pulsar/pull/386 (closed unmerged, superseded by 499; review note `pulsar_386_drop_stdout_and_stderr_from_message_status.md`)
- 469 resilience suite fixture flakiness — https://github.com/galaxyproject/pulsar/pull/470 (merged, partial) + https://github.com/galaxyproject/pulsar/pull/471 (closed unmerged)

## Triaged, still open

Checked and confirmed real. Don't re-derive these from cross-reference links.

- 263 support Galaxy expression tools — https://github.com/galaxyproject/pulsar/pull/266 and the other referenced commits are **workarounds**, not a fix. The gap stands.

## Untriaged

Grouped by title, mechanically. 48 issues.

### Caching

- 47 finish old-style caching
- 48 caching rewrite
- 49 cache expiry

### Configuration and framework design

- 35 data transfer job metrics
- 56 configurable retries on client HTTP requests
- 66 periodic check-in on specific jobs
- 250 batch-mode Pulsar
- 289 remove `pulsar/util/pastescript`?

### Test infrastructure

- 9 integration test for local setup
- 11 integration test for cancelling during staging
- 17 condor in the dockerized suite
- 127 BioContainers test cases
- 484 9 tests in 3 files never run — filenames don't match `python_files`

### Job lifecycle and reliability

- 75 detect cancellation from job limits
- 135 `jobs_directory` breaks version checking
- 158 include the tail when trimming stdout/stderr
- 162 exit code not returned on staging problems
- 283 large stdout/stderr crashes the acknowledgement manager
- 284 clean the job directory on new jobs
- 327 slow completion when expected files are missing
- 344 MQ unacknowledged retries not multiprocess-aware
- 349 queue/limits for pre- and post-processing
- 354 losing jobs on restart while postprocessing
- 355 deleted jobs not cleaned from `${manager}-preprocessing-jobs`
- 358 node failure with no `return_code` marked successful
- 393 losing jobs to network interruptions
- 408 sync slurm runner features with Galaxy's
- 416 `JSONDecodeError` on `launch_config` needs manual intervention

### Staging and file transfer

- 193 working-dir outputs produce no outputs found
- 341 tool files copied without execute bit
- 342 postprocessing POST 403 with nothing logged
- 362 curl remote transfers have no timeout
- 363 resume support for `remote_transfer_tus`
- 400 rsync helpers unsafe with shell metacharacters

### Containers and cloud

- 330 support rewriting the image name
- 335 container scheduling with Azure Batch

### User reports needing reproduction

- 125 bogus escape `u'\39'`
- 209 recommended settings for shared filesystem setup
- 359 "must specify user submit parameter with this manager"
- 373 `KeyError: 'username'` when authenticating
- 374 cannot access remote login node host
- 375 `queued_python` not executing jobs
- 377 is `pulsar-check` expected to work?
- 389 job not running — empty tool script?
- 452 document local relay setup; single-core default and shared-password auth
