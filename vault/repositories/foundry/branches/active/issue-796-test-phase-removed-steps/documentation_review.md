Run via Claude Opus 5.5 at high effort.

# Documentation review — issue-796-test-phase-removed-steps

Per the worktree's `.agents/skills/foundry-documentation/SKILL.md`, over the branch's authored Markdown (`ef1607a8..HEAD`, casts and generated tables excluded). Done together with the [upstream fix follow-up](subagents/upstream_fix_followup.md), in the same commit. No check weakened.

## Rewritten

- **CLI page `check-step-removals.md`.** Matching rule now says the full diff key names a step, how an inline subworkflow step is keyed (`nested/first`), and that only a top-level step also matches its label. Replaced the stale "top-level steps only" gotcha with the one a ledger writer needs: `step: first` never names `nested/first`, copy the key from `unlabelled`.
- **run-workflow-test.** Opening paragraph dropped "top-level" (now wrong) and a semicolon on the touched line. Step 6 said "save it ... as `artifacts.step_diff_json`", which reads as a filename; now the output is saved and its path recorded there. Rewrapped the eval line the branch had left overlong.
- **debug-galaxy-workflow-output.** Step 8 lost the relabel workaround (upstream fixed it) and now tells the agent to copy the key from `step_removals.unlabelled` verbatim. The eval property says the same, so a bare inner label is a failure. Step 4: semicolon on the touched line split into two sentences.
- **open-requirements-ledger.** One sentence: a nested step is named by its `/`-joined path, as `gxwf diff` keys it.
- **Example README.** Diff provenance now `a5c6cd57`.

## Checked, left as is

- No banned words, no "ships"/"substrate"/"earns", no stock prefaces. Remaining semicolons in added lines are generated Dashboard summaries from untouched frontmatter.
- advance-galaxy-draft-step snapshot paragraph, outputs and eval/scenario: lead with the action, each file named once with its write-once rule.
- Changeset and package README: state the command, exit 4 and the unwired-input report, matching the code.
- The CLI page doesn't mention that `gxwf diff` is unreleased. Kept that way, per the Codex review's refutation (house convention). The release condition lives in the branch record.

## Followed as the reader

A ledger writer facing exit 4 on `nested/first` now finds, on the CLI page and in debug step 8, the exact `step` value to write. Ran the CLI from source (`tsx`) on the example's two ledgers after regenerating `step-diff.json`: exit 4 and exit 0, as the scenarios state.
