Fix coexecution jobs with more than about 108 inputs failing to start, because the launch message is too long for one container argument.

> **Stacked on 🔀 #582** (on #581, #580, #579, #578 and #577). This PR's own commits are the last five, from `c778e40` to `869d63d`. Review `c778e40` (compression) and `7c57747` (job-id-only finish) first; the last three tighten argument parsing and tests. The code needs `test/submit_util_test.py` from #578, but otherwise doesn't depend on the rest of the stack.

Every coexecution client (TES, Kubernetes, GCP Batch, AWS Batch) passes Pulsar's launch message to `pulsar-submit` as one base64 container argument. The message lists every input path and file action, about 1.2 KB per input. Linux refuses a single argument of 131 072 bytes or more (`MAX_ARG_STRLEN`), so a `collapse_dataset`-style Galaxy job with 109 inputs can't start:

| TES server, 110-input job | `master` client | this branch |
| --- | --- | --- |
| tesp-api | executor exits 126, Galaxy job stays `queued` | runs (109, 110 and 600 inputs tested) |
| Funnel 0.12.3 | `SYSTEM_ERROR` (with a fake exit code 0) | runs (109 and 110) |

The largest job that can start goes from 108 to about 1 244 inputs in this setup. The same message was also sent a second time, whole, to `pulsar-finish`, which counts against TESK's 256 KiB task JSON limit.

<details><summary>What changed</summary>

- **Compress only what doesn't fit (`c778e40`).** `job_message_arguments` keeps a message plain `--base64` while it fits in one argument, so `pulsar-submit`'s arguments are byte-identical to `master` for every job that worked before and older staging images keep working. A longer message goes as `--base64_zlib`: URL-safe base64 of zlib-compressed JSON, about a tenth of the size (a 49 264-byte hyphy message becomes 4 948 bytes). It has to be URL-safe because tesp-api stores executor arguments as paths and collapses `//`, which standard base64 of compressed data contains. If the message is still too long after compression, `launch` raises with the sizes.
- **`pulsar-finish` gets only the job id (`7c57747`, `e4caffb`).** Every staging image since 0.15.0 reads only `job_id` there: `pulsar-submit` persisted the launch config in the job directory on the shared volume. This halves the task JSON. Both messages go through `job_message_arguments`, so the choice of flag lives in one place.
- **Parsing (`8209081`).** `--file`, `--base64` and `--base64_zlib` form an argparse mutually exclusive group, so passing two is an error instead of one silently winning.
- `docs/compatibility.rst` / `.yml` describe the new contract.

</details>

<details><summary>Tests</summary>

- `test/coexecution_launch_test.py` runs Galaxy-shaped messages of growing size through the real `CoexecutionLaunchMixin.launch` and parses each container's arguments with the real `pulsar-submit` / `pulsar-finish` parsers. It covers plain under the limit, compressed over it, an error when still too long, and a job-id-only finish. Removing `--base64_zlib` from the parser fails 4 of the 6 tests.
- `test/submit_util_test.py` runs real `pulsar-submit`, a tool and `pulsar-finish` with a hand-built `--base64_zlib` value, which pins the wire format independently of the helper, and with a job-id-only finish.
- The numbers in the table come from the pre-hardening revision of these two commits, at the TES level on tesp-api and Funnel 0.12.3 with real client and staging images, and through Galaxy v26.1.2.

</details>

## Risks

The one-way part is the wire format: once staging images read `--base64_zlib`, clients will depend on it. Everything else is easy to revert.

<details><summary>Risk Details</summary>

- Staging images older than this change reject `--base64_zlib` at argument parsing (exit 2). That includes the current default, `galaxy/pulsar-pod-staging:0.15.0.2`. Jobs over the limit fail with exit 2 instead of 126 until a new image is published and made the default. Jobs that fit are unaffected.
- A staging image older than 0.15.0 that read the full launch message in `pulsar-finish` would break on the job-id-only message. No published image does that.
- `--file`, `--base64` and `--base64_zlib` are now mutually exclusive on `pulsar-submit`, `pulsar-finish` and `pulsar-run`. A caller passing more than one used to get one of them silently.
- `MessageCLIJobClient`'s `nohup pulsar-submit --base64` path is unchanged and keeps its own shell-command length limit.

</details>

<details><summary>Risk Review Advice</summary>

The wire format deserves a look before it ships: the flag name, URL-safe base64 and zlib. It goes into staging images that Galaxy releases pin. Also check that `MAX_ARGUMENT_LENGTH`, the Linux single-argument limit, is the right threshold for every coexecution backend.

</details>

## Context

Part of a set of fixes found while running Galaxy jobs on GA4GH TES servers (Funnel, TESK, tesp-api) through Pulsar coexecution. No Galaxy change is needed: Galaxy picks this up with a new pulsar-galaxy-lib and a staging image built from this branch.

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>No structural regressions. The flag choice moved to one function, parsing became exclusive, and tests use the real parsers.</summary>

- The encoding decision is one pure function in the coexecution module, which owns the argument limit, and no conditionals spread into the clients.
- The finish message was encoded inline, so the flag choice lived in two places. Both messages now go through `job_message_arguments`.
- The message options became an argparse mutually exclusive group with a flat dispatch, replacing order-dependent precedence.
- The launch test parsed arguments with a hand-built copy of the parser. It now uses the scripts' real `main()`.
- Refuted: decoding at the argparse boundary, which would echo the whole message to stderr on a decode error.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_compact_launch/thermo_nuclear_review/). Run via Claude Opus 5.5 at high effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>No findings in two runs.</summary>

Codex got the diff, the full post-change files and the coexecution clients, the CLI submit path, the script parsers and the job-directory persistence code. Neither run reported anything to fix. Triage noted the release-order point under Risks: the default image can't read `--base64_zlib` yet.

[Full report](https://galaxy-brain.jmchilton.net/repositories/pulsar/branches/coexecution_compact_launch/codex_review/). Run via gpt-6.1-sol at high effort.

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01S9mD3nK1ghSGVVYtkV411H
