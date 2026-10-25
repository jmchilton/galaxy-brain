```gb-tasks
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#550
  agent_dir: pulsar
  description: 🔎 Blankenberg adds a detached local job manager with restart recovery.
  status: recommended
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#549
  agent_dir: pulsar
  description: 🔎 mvdbeek sends all chunks of a TUS stage-out over one connection (natefoo already reviewed).
  status: idea
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#548
  agent_dir: pulsar
  description: 🔎 natefoo enables retries in the tus uploader.
  status: recommended
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#547
  agent_dir: pulsar
  description: 🔎 natefoo logs job ID with job cleanup failure/skip messages.
  status: recommended
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#401
  agent_dir: pulsar
  description: 🔎 domgz Pulsar client for ARC (open since 2025-07; jmchilton already reviewed, not in vault).
  status: idea
- prompt: Run ./REVIEW.md on galaxyproject/pulsar#399
  agent_dir: pulsar
  description: 🔎 domgz file staging delegation via JSON staging manifest (open since 2025-06; not in vault).
  status: idea
- prompt: |
    Fix CI on branch towncrier_changelog. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/towncrier_changelog/. Diagnose each red check; fix the ones the branch caused, rerun the unrelated ones, and record the diagnosis in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔧 towncrier_changelog (#545) — "Check changes/ entry" failing; needs `no changelog` exemption.
  status: recommended
- prompt: |
    De-conflict branch pulsar-transfer-metrics. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/pulsar-transfer-metrics/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔀 pulsar-transfer-metrics (#518) — conflicting; #529 is stacked on it.
  status: recommended
- prompt: |
    De-conflict branch action-destination-defaults. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/action-destination-defaults/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔀 action-destination-defaults (#517) — conflicting.
  status: recommended
- prompt: |
    De-conflict branch pulsar-shared-constant. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/pulsar-shared-constant/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔀 pulsar-shared-constant (#522) — conflicting; mvdbeek asks whether #537 supersedes it.
  status: recommended
- prompt: |
    De-conflict branch htcondor2. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/htcondor2/. Rebase it onto its actual base branch, resolve mechanical and clear conflicts, and stop and ask me about substantial ones. Force-push with `--force-with-lease`, update the SHA in the branch record, and note the rebase in the branch notes.
  agent_dir: pulsar
  profile: Sonnet (high)
  description: 🔀 htcondor2 (#486) — conflicting; coordinate Galaxy #23326.
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
  description: 🙇 pulsar-shared-constant (#522) — mvdbeek (2026-10-09) asks whether #537 supersedes it.
  status: recommended
- prompt: Respond to nsoranzo's review of galaxyproject/pulsar#545 (branch towncrier_changelog) per ../_shared/RESPOND_TO_REVIEW.md. BRANCH_DIRECTORY is vault/repositories/pulsar/branches/active/towncrier_changelog/. Confirm your plan with me before changing the branch.
  agent_dir: pulsar
  profile: Opus (low)
  description: 💬 towncrier_changelog (#545) — nsoranzo (2026-10-13) asks for rationale.
  status: recommended
```
