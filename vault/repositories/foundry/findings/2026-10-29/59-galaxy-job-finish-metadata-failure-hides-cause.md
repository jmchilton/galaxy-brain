# A job that fails while Galaxy sets output metadata keeps no streams, no exit code and no reason

- Target: galaxyproject/galaxy (`lib/galaxy/jobs/runners/__init__.py` finish path, `lib/galaxy/jobs/__init__.py` `JobWrapper.fail`). Foundry tracking needed: yes, label `upstream/galaxy`; the Foundry reference half is finding [60](60-bam-sort-order-datatypes-and-converters.md).
- Seen in: /home/ubuntu/foundry-runs/prose-wb2g-hic-v0-2026-11-01, phase 10 attempt 1 (case `test`, Galaxy release_26.1, planemo master 2a815808) and phase 11 (debug), 2026-11-01. Ledger `invocation-failure-reference-silent-on-job-finish-metadata-failure` (major).
- Existing issues/PRs: same symptom reported in galaxy [#8717](https://github.com/galaxyproject/galaxy/issues/8717) (2019, closed without a fix; a commenter notes "since it's not a tool error, you won't see a reason for the failure in your history"). Same class, other trigger: [#23408](https://github.com/galaxyproject/galaxy/issues/23408) (closed; missing `tool_stdout`), fixed via #23631/#23635. Related: #18727 (pick_value "Unable to finish job"). No open issue for the metadata path.

## Symptom
The embedded user tool `hicpro_merge_bowtie2` ran `samtools sort -n` (as HiC-Pro does) and wrote its output as `format: bam`. The command succeeded for both mates. Galaxy then failed both jobs: `exit_code` null, empty stdout and stderr, job info "Unable to finish job"; 5 downstream jobs paused. Nothing in the job record or the dataset said metadata or indexing failed; the cause appeared only in the managed Galaxy's server log. Planemo's `test-output.json` reported `status: error` with `execution_problem: None`, `output_problems: []`, `invocation_state: ready`, `history_state: error`. The authoring mistake (wrong datatype) is finding 60; this finding is that Galaxy hides it.

## Root cause
Confirmed by reading release_26.1 (`ced59bc8`) and dev (`269efa7a`):
1. `Bam.set_meta` (`lib/galaxy/datatypes/binary.py:937-959`) calls `pysam.index` unguarded. A name-sorted file can't be indexed, so it raises.
2. External metadata failed first; `retry_metadata_internally` defaults to true, so `JobWrapper._finish_dataset` (`jobs/__init__.py:2078-2098`) calls `dataset.datatype.set_meta` in the handler, which raises again.
3. The exception escapes `job_wrapper.finish(...)`, and `JobRunner._finish_or_resubmit_job` catches it with `job_wrapper.fail("Unable to finish job", exception=True)` (`jobs/runners/__init__.py:715-717` on 26.1, `:890-892` on dev). The tool stdout, stderr and exit code the runner had just read are not passed, so `fail()` stores `""`/`""`/NULL (`jobs/__init__.py:1469-1560`). The exception text goes only to `job.traceback` (admin-only) and `log.exception`.
4. No message names the output, the datatype or the metadata step, so a user (or an agent reading the API) sees a tool that "failed" with nothing to read.

The planemo half (error with no problem and invocation `ready`) is planemo's documented stop rule; see finding [37](37-planemo-early-stop-coverage-frontier.md).

## Evidence
- Attempt 1 `planemo/attempt1/test/test-output.json` (fields above); `rc.txt` 892 s. 52 ok / 2 error / 5 paused (run-summary).
- Repair R1 (open-requirements decision `repair-r1-bam-sort-datatypes`) changed only datatypes (`qname_sorted.bam`, `qname_input_sorted.bam`, `[unsorted.bam]` inputs); the same commands then ran green, so the commands were fine.
- `JobWrapper.fail` keeps `exit_code` NULL when none is passed (`jobs/__init__.py:1561-1563`).

## Proposed fix
Galaxy: in the metadata path, catch the `set_meta` exception per output and fail the job with a specific, user-visible message (`job_messages` entry or `info`), e.g. "Setting metadata for output 'merged' (bam) failed: pysam index error ...". Keep the tool's stdout, stderr and exit code by passing them into `fail()` from the finish path, as #23631 did for missing stream files. Optionally mark the dataset `failed_metadata` instead of `error` when the command succeeded.

## Draft issue
**Title:** Output metadata failure at job finish discards the tool's streams and exit code and reports only "Unable to finish job"

A tool writes a name-sorted BAM and declares `format: bam`. The command exits 0. At finish, `Bam.set_meta` runs `pysam.index`, which fails on a name-sorted file. With `retry_metadata_internally` (default true) `_finish_dataset` re-runs `set_meta` in the handler, it raises, and `_finish_or_resubmit_job` calls `job_wrapper.fail("Unable to finish job", exception=True)` (`lib/galaxy/jobs/runners/__init__.py:890-892` on dev) without the stdout, stderr and exit code it had already read. The job ends with `exit_code` NULL, empty streams and no message naming the output or datatype; only `job.traceback` (admin) and the server log hold the cause. Downstream jobs pause. Workflow test drivers see an error with nothing to explain it.

Reproduced on release_26.1 in a workflow test (user tool `samtools sort -n ... -o out.bam`, output `format: bam`). #8717 (2019) reported the same thing and was closed without a change; #23408 fixed a sibling path (missing stream files) via #23631.

Ask: (1) catch a `set_meta` failure per output and report it in `job_messages`/`info` with the output name, datatype and exception summary; (2) pass the tool streams and exit code into `fail()` on the finish-exception path; (3) consider `failed_metadata` for that output rather than a job error with blank streams.

Foundry tracking comment (label `upstream/galaxy`), for the issue that carries finding 60:

> The hic wb2g run hit a job-finish metadata failure (`bam` output that was name-sorted). Galaxy discards the streams and reports only "Unable to finish job"; filed upstream as galaxyproject/galaxy#NNNN: "the job ends with `exit_code` NULL, empty streams and no message naming the output or datatype". Until it ships, the debug reference should read the managed Galaxy's log on this signature.
