Toward 🎯 #789 - the IWC maturation Mold let run history fill the workflow README.

The first maturation submitted to IWC-Lab, galaxyproject/iwc-lab#4, has a README that is half run log. Next to the purpose, inputs and outputs, it carries:

```markdown
- **Planemo test:** the test file as submitted passed on usegalaxy.org (Galaxy 26.2rc1), invocation `4ae2da923366f120`. An earlier version of the workflow had also passed there (invocation `fbf1b200b6a8b01c`).
...
### C. Earlier runs during the translation
- **Local Planemo on arm64 macOS:** NanoPlot failed when its amd64 container ran under emulation. ...
- **Legacy medaka 1.4.4 diploid-pipeline wrapper:** failed on usegalaxy.org (invocation `cf5318de2072ffe4`). ...
## Notes for reviewers
- ... `gxwf validate` reports these as tool-state errors, which is a known validator false positive.
```

The reviewer's feedback was that the agent talked too much about failed attempts. None of the 121 workflow READMEs on IWC `main` cites an invocation id or carries a validation or benchmark table. The IWC checklist bundled with the Mold asks the README for purpose, inputs, outputs, resources and differences from similar workflows, and nothing about test runs.

The cause is step 5 of `mature-galaxy-workflow-for-iwc`. It asked for a README "from evidenced workflow purpose, valid inputs, and expected outputs" and told the agent to "preserve useful supplied material". Nothing limited what else went in or said where run evidence belongs. This PR:

- **Writes the README for a user of the workflow as submitted.** Invocation ids, test and validation outcomes, benchmark tables, failed or abandoned tools, environment-only failures, validator caveats and reviewer notes move to `iwc-maturation-report.md`. The report now holds them ready to paste into the PR description. Changelog entries likewise say what a release contains, not how it was reached.
- **Keeps what a user does need**: current limitations, a sentence or two on why the workflow departs from its source (Clair3 rather than medaka), and one sentence stating an evidenced accuracy claim.
- **Moves run evidence out of a supplied README instead of preserving it**, so a rerun on a README like #4's cleans it up.
- **Extends the `galaxy-workflow-maturation` harness note.** Phase 3 and 4 validation and Planemo evidence, and any repair attempts, never go into the README.
- **Adds an eval property, "README without run evidence"**, plus a `readme-history` scenario. Its fixture is a trimmed version of #4's README.

It does not touch iwc-lab#4 itself; that README gets cleaned up when the maturation is re-run.

<details><summary>Files</summary>

- `content/molds/mature-galaxy-workflow-for-iwc/index.md`: step 5 README and changelog bullets, step 6 report, report output description, revision 2.
- `content/molds/mature-galaxy-workflow-for-iwc/{eval,scenarios}.md`: new property and case.
- `content/molds/mature-galaxy-workflow-for-iwc/examples/readme-history/`: skeleton workflow whose `doc` states the Clair3 reason, plus a README seeded with run evidence.
- `content/pipelines/galaxy-workflow-maturation/index.md`: extended harness note, revision 3.
- Regenerated: the Mold's cast bundle, the pipeline harness, and `content/Dashboard.md`.

</details>

This is a prose change to a Mold, so it has no mechanical red-to-green test. The new scenario is the check for the next `/test-drive` of this Mold, and that drive hasn't been run. `make check` passes except `validate-roadmap` and `check-vendored`. `validate-roadmap` fails because #783 is missing from #768's roadmap, which is live GitHub state. `check-vendored` fails only on this machine.

## Risks

Risks are minimal - this changes Mold guidance and adds a scenario. It is a two-way door.

## Context

Reported from review of galaxyproject/iwc-lab#4.

## Agentic Checks

### ✅ Second Frontier Model Review

<details><summary>Codex found 3 issues; all were fixed.</summary>

- The fixture's Clair3 reason was evidenced only by the supplied README. It now also appears in the workflow `doc`.
- Moving a whole history section could have dropped a current limitation. The rule now keeps limitations in the README.
- README guidance repeated the bundled IWC checklist. It is merged into one bullet, and the extra sections are optional.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-789-readme-no-archeology/codex_review/)

</details>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
