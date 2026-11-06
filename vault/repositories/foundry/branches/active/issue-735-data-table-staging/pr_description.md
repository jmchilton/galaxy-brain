Implement 🎯 #735 - test-data Molds have no recipe for data tables, so runs stage them in a form Planemo ignores.

A wrapper that takes its reference database only from a Galaxy data table needs a staged table in its test, and no Mold says how. The funcscan golden-brief build improvised:

| | What the build wrote | The portable form |
| --- | --- | --- |
| Configuration | `test-data/tool_data_table_conf.xml` | `test-data/tool_data_table_conf.xml.test` |
| Paths | `/Users/.../test-data/tool-data/mmseqs2_databases.loc` | `${__HERE__}/mmseqs2_databases.loc` |
| Test plan | `planemo test must add --tool_data_table <run>/test-data/...` | no flag |

That test can only run on one machine, with a flag someone has to remember. Planemo has supported the portable form all along, and only the guidance was missing.

I ran the two forms against each other in a one-step probe, not funcscan, on planemo 0.75.47 and a managed Galaxy `release_26.1`, using a shed-installed wrapper and no data-table flag:

| Configuration name | Result |
| --- | --- |
| `tool_data_table_conf.xml` | Job rejected: `Parameter 'index': requires a value, but no legal values defined` |
| `tool_data_table_conf.xml.test` | Passed, and the job's command line read the database path from the staged `.loc` |

The failure is also hard to diagnose. Galaxy accepts the invocation and the job errors with no command line or stderr. Planemo's report and the job API carry no reason. It's in the Galaxy log and the output dataset's `misc_info`, and the note says to look there.

**This does not add data tables to translated workflows.** The rule against introducing new tables stands. The recipe covers existing wrappers with no dataset input, and the note says that. **It is for Planemo-managed Galaxy.** IWC and external Galaxy keep server-side tables.

- **`planemo-workflow-test-architecture`** gets the recipe: layout, a worked configuration and `.loc`, and the rules behind them. `${__HERE__}` means the directory of the file it appears in, so copying a tools-iuc configuration into `test-data/` unchanged breaks it.
- **`find-test-data`** gets a staging step for workflow inputs on data-table-only wrappers, plus eval properties and a scenario.
- **`implement-galaxy-workflow-test`** treats these values as scalars, keeps the staged files together, and is told to check every data-table value it reaches against a row. This also covers a step's fixed state and a value an earlier leg resolved, neither of which `find-test-data` can see.
- **`workflow-brief-to-galaxy-test-plan`** now says not to ask for the flag, with an eval property. That's where the flag appeared.
- **`iwc-test-data-conventions`** links to the recipe.

Not changed:

- `nextflow-to-test-data`, `cwl-to-test-data` and `paper-to-test-data`. The issue says "where they stage references", and they don't: they map declared fixtures and leave the rest as gaps. The check in `implement-galaxy-workflow-test` covers a value they resolve.
- The `test-data-refs` schema. The funcscan feedback ledger suggests a `data_table` block, but staging works without one, so a staged value stays a `cvmfs-string` ref.
- The other test-plan Molds.

<details><summary>Facts checked against source</summary>

- Search order: workflow directory, working directory, detected `test-data/`, first match wins. `.sample` fallback only in the first two. Unsuffixed file never read. `--tool_data_table` replaces discovery. (`_find_tool_data_table`, planemo 0.75.47)
- Only `local_galaxy_config` calls discovery, so `--engine docker_galaxy` and `--engine external_galaxy` don't read the file.
- Galaxy expands `${__HERE__}` per file in both `<file path>` and `.loc` lines. (`lib/galaxy/tool_util/data/__init__.py`, `release_26.1` and `dev`)
- Planemo's generated job configuration mounts the detected `test-data/` read-only for Docker and Singularity (rendered through `build_job_config`). A custom `--job_config_file` replaces it, which is why the funcscan run needed its own mount.

</details>

<details><summary>What this doesn't prove</summary>

- **No container job ran.** Docker was down, so the generated mount was read from rendered configuration only. The note lists this under Verification Gaps.
- **funcscan itself wasn't rerun.** Its build hung on an unrelated `card/rgi` install before any invocation. The probe is a one-step workflow on `devteam/fasta_compute_length`, chosen because it needs only Python. It also accepts a history dataset and has no filter on its select, so it tests the table select, not a data-table-only wrapper. The note lists this too.
- **IWC CI wasn't checked.** The recipe is for Planemo-managed Galaxy. IWC tests use their CI's CVMFS tables.
- **The eval properties have not been run against a cast.**

Probe files: [`probe/`](https://github.com/jmchilton/galaxy-brain/tree/main/vault/repositories/foundry/branches/active/issue-735-data-table-staging/probe).

</details>

## Risks

Risks are minimal - this is Mold guidance and research notes with no schema or code change, so it's a two-way door.

## Context

Companion to 🔀 #733 (#730), the detect-and-defer side, which edits the same note. Once both land, #733's "caller supplied data-table configuration" sentence should point at this recipe, since a staged `.xml.test` is that configuration. Related: galaxyproject/planemo#1764 (docs and logging for the same discovery).

## Agentic Checks

### ✅ Normal Review

<details><summary>Corrected a wrong container claim and closed two contract gaps.</summary>

The first draft told readers to pass `--job_config_file` for container jobs, which replaces the configuration that already mounts `test-data/`. Rendering that configuration confirmed it, and the text changed. The review also led to dropping a nested artifact declaration that run tooling can't see, and to adding the no-flag rule where test plans are written.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-735-data-table-staging/subagents/normal_review/). Run via claude-opus-5-5 at default effort.

</details>

### ✅ Second Frontier Model Review

<details><summary>Two data-table values could reach a test with no row. Both are now checked.</summary>

A step's fixed state and a value resolved by an earlier leg both bypass the `find-test-data` step. `implement-galaxy-workflow-test` has the workflow and the refs, so the check went there, with an eval property and a scenario.

[Full report](https://galaxy-brain.jmchilton.net/repositories/foundry/branches/issue-735-data-table-staging/codex_review/). Run via gpt-6-sol at medium effort.

</details>
