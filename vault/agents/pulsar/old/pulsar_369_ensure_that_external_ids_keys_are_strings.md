# PR 369 — Ensure that `_external_ids` keys are strings

PR: https://github.com/galaxyproject/pulsar/pull/369  
Author: Marius van den Beek  
Opened: 2024-06-18  
Reviewed against: `origin/master` at `135072f9d7bdc59d736026a2dcbd9ed1fd668b4d` (2026-09-10)

## Recommendation

Do **not** rescue this patch as a replacement PR. Close it as superseded by the more precise startup-race fix in PR 496, assuming PR 496 lands.

PR 369 is a plausible defensive change, but its stated diagnosis was explicitly speculative ("I think that might have been part of the issue"), it added no regression test, and the normal Pulsar/Galaxy paths already make internal job IDs strings. The same missing-external-ID symptom has since been reproduced with timing evidence in PR 439 and addressed, with tests, by its replacement PR 496.

## What the patch does

The single commit converts `job_id` to `str` at every access to `ExternalBaseManager._external_ids` and annotates the dictionary as `Dict[str, Any]`.

The branch no longer applies cleanly because PR 427 added comprehensive manager typing to the same file. Current master already declares `_external_ids: Dict[str, str]` and all relevant methods accept `job_id: str`, although type hints alone do not perform runtime conversion.

## Why it is probably not the real fix

- `BaseManager._get_job_id()` has returned `str(self.id_assigner(input_job_id))` since 2019.
- Galaxy has explicitly passed `job_id=str(job_id)` when constructing its Pulsar client since March 2023.
- HTTP path/query parameters arrive as strings, while persisted active job IDs come from `os.listdir()` and are therefore strings.
- `_register_external_id()` writes metadata through `_job_directory(job_id)` before PR 369 converts the dictionary key. A genuinely numeric job ID is therefore not made generally safe by this patch: filesystem/path handling can fail before the proposed normalization is reached.
- PR 439 later captured the same class of warning with a concrete cause: the monitor could poll active jobs before recovery had repopulated `_external_ids`. PR 496 fixes the lifecycle ordering while preserving recovery-failure callbacks and adds regression coverage.

Together, this makes PR 369 look like a speculative workaround for the recovery race rather than an independently demonstrated compatibility fix.

## Review findings

### No demonstrated failing path or test

The PR supplies no test showing one supported ingress path registering an ID under one type and looking it up under another. Without that, the broad conversion at four dictionary operations is difficult to justify, especially because supported callers already use strings.

### The proposed typing is now stale and less precise

`Dict[str, Any]` is broader than current master's `Dict[str, str]`. External IDs are decoded to strings before storage, and PR 427 correctly records that contract. A mechanical resurrection would regress type precision and conflict with current formatting/import ordering.

### Normalization belongs at a boundary if a real mixed-type producer exists

If a supported non-Galaxy producer is later shown to send numeric job IDs, normalize once where the request/message is decoded (or at a single manager entry boundary) and test setup, launch, status, kill, persistence, and recovery together. Normalizing only the private external-ID dictionary would leave filesystem-backed job state using the unnormalized value.

## Suggested disposition

1. Land PR 496 for the reproduced missing-external-ID startup race.
2. Close PR 369 with a note that its observed symptom is now covered by PR 496 and that standard job-ID producers already emit strings.
3. Do not carry a separate fallback unless there is a reproducible mixed-type client. If one appears, open a focused boundary-normalization PR with an end-to-end regression test rather than reviving this implementation.
