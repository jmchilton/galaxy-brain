```gb-tasks
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#549
  agent_dir: pulsar
  description: 🔎 mvdbeek sends all chunks of a TUS stage-out over one connection (natefoo already reviewed).
  status: idea
- prompt: |
    De-conflict branch jobs-directory-version-source. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/jobs-directory-version-source/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔀 jobs-directory-version-source (#523, draft) — conflicting; mvdbeek commented 2026-09-29.
  status: idea
- prompt: Respond to mvdbeek's review of galaxyproject/pulsar#522 (branch pulsar-shared-constant) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/pulsar-shared-constant/.
  agent_dir: pulsar
  profile: Opus (low)
  description: 🙇 pulsar-shared-constant (#522) — mvdbeek (2026-10-09) asks whether
  status: recommended
- prompt: |
    Fix CI on branch htcondor2. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/htcondor2/. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔧 htcondor2 (#486) — Type Check (pyrefly, 3.14) fails twice; Lint (3.14, format) also red.
  status: recommended
- prompt: |
    Fix CI on branch towncrier_changelog. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/towncrier_changelog/. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔧 towncrier_changelog (#545) — Check changes/ entry failing; nsoranzo asks for rationale.
  status: recommended
```
