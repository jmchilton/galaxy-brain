# Implementation debrief

- Verified root cause on the egapx run: `validate-tests --workflow` passes the dataset-form `star_bam` (workflow resolves `list`) and `ftype: bam` on fasta. `check.js` checks labels, required inputs, and JSON type only.
- Foundry fix, no upstream needed now; gtu#210 would only let step 5 absorb step 3.
- Commits: `cc3df02b` (Mold step 3 trace, narrowed claims, eval/scenario, validate-tests gotcha), `88e38f05` (normal-review fixes; `--connections` reading guide moved to `content/cli/gxwf/validate.md`), `064ff5a5` (Codex fixes: skip drops rank, `change_datatype`).
- No committed test (content-only). Red/green ran as a scratch recipe over the egapx run, recorded in `index.md` § Evidence.
- Local gate: validate, check-generated, check-planemo-pin, check-casts, check-verify, check-assemble-pipelines, check-fixtures, and test (496/496) are green. `validate-roadmap` is red on live #672 roadmap linkage, not this branch (it also hit an unauthenticated rate limit without `GITHUB_TOKEN`). `check-vendored` is red, as is known for this machine.
- Left for John: a follow-up for the test-plan Molds (e.g. `nextflow-test-to-galaxy-test-plan`) to trace kinds where `output_kind` is written.
