# Run findings

How the coordinator turns what a pipeline run hits into reviewable units. Started 2026-10-29 on the Linux host.

## Split

After a driver reports, read its report, `run-summary.md`, the feedback ledger and the open-requirements ledger. Split what went wrong into distinct units: one root cause each, not one per symptom or per ledger entry. Merge units that later runs hit again into the existing finding rather than writing a new one.

Sort each unit:

- **Fix now:** our process (these agent docs, the driver brief, GOLDEN_PLANS) or this machine (missing tool, venv, cache, disk). Make the change before the next run starts, and log it in the queue's machine/process log.
- **Research:** everything else. One subagent per unit, briefed as below.

## Research brief

```text
Research one problem a Foundry pipeline run hit, and write it up for John to review. Do not post anything to GitHub, push, or open PRs.
Problem: <one paragraph: symptom, run dir, phase, error text, ledger ids>
Worktree for reading Foundry code: <WT> (prefix shell commands with `cd <WT> &&`).
1. Find the root cause, or verify the stated one, with evidence (file:line, commands, versions). If you can't, say what you ruled out.
2. Decide the right target repository. We don't paper over upstream issues in Foundry: galaxy-tool-util-ts (gxwf, galaxy-tool-cache), planemo, Galaxy, and tool wrappers (tools-iuc etc.) absorb fixes that belong there. Foundry owns Molds, pipelines, casts, its packages and harness. Search existing issues and PRs in the target (`gh issue list --search`, `gh pr list --search`) and in galaxyproject/foundry; link duplicates.
3. Write <FINDINGS_DIR>/<NN>-<slug>.md, no frontmatter, at most ~80 lines:
   # <title>
   - Target: <owner/repo> (and why); Foundry tracking needed: yes/no
   - Seen in: <run dir, phase, date>
   - Existing issues/PRs: <links or none>
   ## Symptom
   ## Root cause
   ## Evidence
   ## Proposed fix
   ## Draft issue
   <ready-to-post issue body for the target repo. If the target is not Foundry, also a short draft comment for a Foundry tracking issue quoting the upstream text, with label `upstream/<project>`.>
If the security policy in vault/agents/_shared/SECURITY_REPORTS.md applies, follow it instead and return only a non-sensitive summary.
Return under 10 lines: target, root-cause confidence, file path.
```

## Where

`vault/repositories/foundry/findings/<YYYY-MM-DD>/`, numbered in order found, plus a `README.md` index there: one line per file with target and status (`draft`, `fixed-locally`, `posted`). John reviews; nothing is posted without his go-ahead (agent markers per AGENT_MARKERS.md on ad-hoc comments).
