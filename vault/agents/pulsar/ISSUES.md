Triage index for `galaxyproject/pulsar` issues, per [`ISSUES_INDEX.md`](../_shared/ISSUES_INDEX.md); detail lives in `vault/repositories/pulsar/issues/`. PR reviews are tracked in `index.md`.

GitHub state last refreshed: 2026-10-06. Issues here are unassigned by default.
## Waiting on John (`needs_decision`)

None yet.
## In motion (`wip`)

- [#465](https://github.com/galaxyproject/pulsar/issues/465) — batch co-execution tracker; [#473](https://github.com/galaxyproject/pulsar/pull/473) (ksuderman) addresses part, won't close it; next: review #473. [notes](../../repositories/pulsar/issues/wip/465/index.md)

## Queued (`queued`)

- (assigned) [#498](https://github.com/galaxyproject/pulsar/issues/498) — ubuntu-22.04 runner deprecation; lint/test moved to 24.04 (#508 merged); next: packaging metadata PR. [notes](../../repositories/pulsar/issues/queued/498/index.md)
- [#263](https://github.com/galaxyproject/pulsar/issues/263) — expression tools unsupported; #266 and friends are workarounds; next: design a real fix from the research note. [notes](../../repositories/pulsar/issues/queued/263/index.md)
- [#469](https://github.com/galaxyproject/pulsar/issues/469) — resilience suite fixture startup flakiness; next: read #470 (partial) and #471 (unmerged) before starting fresh. [notes](../../repositories/pulsar/issues/queued/469/index.md)
- [#542](https://github.com/galaxyproject/pulsar/issues/542) — Galaxy Docker EXIT trap replaces cvmfsexec `mountrepo` unmount (unreleased code); next: subshell `$command` before release. [notes](../../repositories/pulsar/issues/queued/542/index.md)

## Blocked on others (`blocked`)

- [#492](https://github.com/galaxyproject/pulsar/issues/492) — report job failure reason to Galaxy for resubmission; blocked on: [#486](https://github.com/galaxyproject/pulsar/pull/486). [notes](../../repositories/pulsar/issues/blocked/492/index.md)
- [#510](https://github.com/galaxyproject/pulsar/issues/510) — modernize Windows support; blocked on: a Windows dev environment for an agent. [notes](../../repositories/pulsar/issues/blocked/510/index.md)
- (assigned) [#520](https://github.com/galaxyproject/pulsar/issues/520) — release 1.0; blocked on: a 0.16.0 we really like and a Galaxy 26.2 release process that feels good. [notes](../../repositories/pulsar/issues/blocked/520/index.md)

## Untriaged (`untriaged`)

Grouped by title, mechanically.

### Caching

- [#47](https://github.com/galaxyproject/pulsar/issues/47) — finish old-style caching
- [#48](https://github.com/galaxyproject/pulsar/issues/48) — caching rewrite
- [#49](https://github.com/galaxyproject/pulsar/issues/49) — cache expiry

### Configuration and framework design

- [#35](https://github.com/galaxyproject/pulsar/issues/35) — data transfer job metrics
- [#56](https://github.com/galaxyproject/pulsar/issues/56) — configurable retries on client HTTP requests
- [#66](https://github.com/galaxyproject/pulsar/issues/66) — periodic check-in on specific jobs
- [#250](https://github.com/galaxyproject/pulsar/issues/250) — batch-mode Pulsar
- [#289](https://github.com/galaxyproject/pulsar/issues/289) — remove `pulsar/util/pastescript`?

### Test infrastructure

- [#9](https://github.com/galaxyproject/pulsar/issues/9) — integration test for local setup
- [#11](https://github.com/galaxyproject/pulsar/issues/11) — integration test for cancelling during staging
- [#17](https://github.com/galaxyproject/pulsar/issues/17) — condor in the dockerized suite
- [#127](https://github.com/galaxyproject/pulsar/issues/127) — BioContainers test cases
- [#484](https://github.com/galaxyproject/pulsar/issues/484) — 9 tests in 3 files never run — filenames don't match `python_files`

### Job lifecycle and reliability

- [#75](https://github.com/galaxyproject/pulsar/issues/75) — detect cancellation from job limits
- [#135](https://github.com/galaxyproject/pulsar/issues/135) — `jobs_directory` breaks version checking
- [#162](https://github.com/galaxyproject/pulsar/issues/162) — exit code not returned on staging problems
- [#283](https://github.com/galaxyproject/pulsar/issues/283) — large stdout/stderr crashes the acknowledgement manager
- [#284](https://github.com/galaxyproject/pulsar/issues/284) — clean the job directory on new jobs
- [#327](https://github.com/galaxyproject/pulsar/issues/327) — slow completion when expected files are missing
- [#344](https://github.com/galaxyproject/pulsar/issues/344) — MQ unacknowledged retries not multiprocess-aware
- [#349](https://github.com/galaxyproject/pulsar/issues/349) — queue/limits for pre- and post-processing
- [#355](https://github.com/galaxyproject/pulsar/issues/355) — deleted jobs not cleaned from `${manager}-preprocessing-jobs`
- [#358](https://github.com/galaxyproject/pulsar/issues/358) — node failure with no `return_code` marked successful
- [#408](https://github.com/galaxyproject/pulsar/issues/408) — sync slurm runner features with Galaxy's
- [#416](https://github.com/galaxyproject/pulsar/issues/416) — `JSONDecodeError` on `launch_config` needs manual intervention

### Staging and file transfer

- [#193](https://github.com/galaxyproject/pulsar/issues/193) — working-dir outputs produce no outputs found
- [#341](https://github.com/galaxyproject/pulsar/issues/341) — tool files copied without execute bit
- [#342](https://github.com/galaxyproject/pulsar/issues/342) — postprocessing POST 403 with nothing logged
- [#362](https://github.com/galaxyproject/pulsar/issues/362) — curl remote transfers have no timeout
- [#363](https://github.com/galaxyproject/pulsar/issues/363) — resume support for `remote_transfer_tus`
- [#400](https://github.com/galaxyproject/pulsar/issues/400) — rsync helpers unsafe with shell metacharacters

### Containers and cloud

- [#330](https://github.com/galaxyproject/pulsar/issues/330) — support rewriting the image name
- [#335](https://github.com/galaxyproject/pulsar/issues/335) — container scheduling with Azure Batch

### User reports needing reproduction

- [#125](https://github.com/galaxyproject/pulsar/issues/125) — bogus escape `u'\39'`
- [#209](https://github.com/galaxyproject/pulsar/issues/209) — recommended settings for shared filesystem setup
- [#359](https://github.com/galaxyproject/pulsar/issues/359) — "must specify user submit parameter with this manager"
- [#373](https://github.com/galaxyproject/pulsar/issues/373) — `KeyError: 'username'` when authenticating
- [#374](https://github.com/galaxyproject/pulsar/issues/374) — cannot access remote login node host
- [#375](https://github.com/galaxyproject/pulsar/issues/375) — `queued_python` not executing jobs
- [#377](https://github.com/galaxyproject/pulsar/issues/377) — is `pulsar-check` expected to work?
- [#389](https://github.com/galaxyproject/pulsar/issues/389) — job not running — empty tool script?
- [#452](https://github.com/galaxyproject/pulsar/issues/452) — document local relay setup; single-core default and shared-password auth

### Releases

- [#535](https://github.com/galaxyproject/pulsar/issues/535) — proposal: maintain a Pulsar release branch per Galaxy release
