---
type: moc
tags:
  - moc
status: draft
created: 2026-06-29
revised: 2026-09-12
revision: 6
ai_generated: false
summary: "Running personal task list of Galaxy dev work threads tracked by date with checkboxes"
---

# John's Tasks

## September 7, 2026
- [x] [galaxy#23465](https://github.com/galaxyproject/galaxy/pull/23465) — Fix some package test warnings on dev
- [x] [galaxy#23459](https://github.com/galaxyproject/galaxy/pull/23459) — Reject output-only format_source references in the XML linter
- [x] [foundry#486](https://github.com/galaxyproject/foundry/pull/486) — Fix commented Nextflow workflow parsing
- [x] [guerler/galaxy#36](https://github.com/guerler/galaxy/pull/36) — Handle output discovery failures consistently
- [x] [pulsar#495](https://github.com/galaxyproject/pulsar/pull/495) — Fix typos and grammar in documentation
- [x] [pulsar#494](https://github.com/galaxyproject/pulsar/pull/494) — Fix daemon handling in webless mode
- [ ] IUC Standards Docs
	- [x] [standards#85](https://github.com/galaxy-iuc/standards/pull/85) — Add Pulsar / remote-execution compatibility best-practices docs
	- [ ] [standards#86](https://github.com/galaxy-iuc/standards/pull/86) — Add security corpus-research deep-dives
- [ ] Foundry
	- [x] [iwc-lab#3](https://github.com/galaxyproject/iwc-lab/pull/3) — Read workflow descriptors as YAML so Format-2 works
	- [x] [foundry#489](https://github.com/galaxyproject/foundry/pull/489) — Add linear Pi Pipeline evaluation controller
	- [x] [foundry#490](https://github.com/galaxyproject/foundry/pull/490) — Vendor IWC workflow review prompts
	- [x] [iwc#1364](https://github.com/galaxyproject/iwc/pull/1364) — Skip combine_outputs when there is nothing to combine
	- [ ] [iwc#1365](https://github.com/galaxyproject/iwc/pull/1365) — Only report deploy status when deploy actually failed
	- [ ] [iwc#1366](https://github.com/galaxyproject/iwc/pull/1366) — Expanded Agent Review Command
	- [ ] [planemo#1695](https://github.com/galaxyproject/planemo/pull/1695) — Require workflow tests under the IWC lint profile
	- [x] [planemo#1696](https://github.com/galaxyproject/planemo/pull/1696) — Fix Dockstore names for Galaxy workflow suffixes
	- [ ] [planemo#1697](https://github.com/galaxyproject/planemo/pull/1697) — Validate dates in IWC changelog headings
	- [ ] [planemo#1698](https://github.com/galaxyproject/planemo/pull/1698) — Skip Zenodo-dependent tests when the API is unavailable
	- [x] [foundry#495](https://github.com/galaxyproject/foundry/pull/495) — Resolve bundled Foundry validator in Pi harness
	- [x] [foundry#497](https://github.com/galaxyproject/foundry/pull/497) — Add lifecycle taxonomy for review and publication pipelines
	- [x] [foundry#498](https://github.com/galaxyproject/foundry/pull/498) — Add IWC workflow maturation Mold
	- [x] [foundry#502](https://github.com/galaxyproject/foundry/pull/502) — The gallery shows the badge a note page shows, not a copy of it
	- [x] [foundry#506](https://github.com/galaxyproject/foundry/pull/506) — Single-source the planemo pin behind a check
	- [ ] [foundry#508](https://github.com/galaxyproject/foundry/pull/508) — Add GALAXY WORKFLOW MATURATION pipeline (draft)
	- [ ] [foundry#509](https://github.com/galaxyproject/foundry/pull/509) — Add GALAXY WORKFLOW REVIEW pipeline and review-galaxy-workflow Mold (draft)
- [ ] [galaxy#22860](https://github.com/galaxyproject/galaxy/pull/22860) — Empower Researches to Extract Workflows with Reproducible Narratives from a Notebook
- [ ] [galaxy-skills#26](https://github.com/galaxyproject/galaxy-skills/pull/26) — Add project-review skill (stub)
- [ ] [foundry-pattern#59](https://github.com/galaxyproject/foundry-pattern/pull/59) — Add the edge of human knowledge to the Case (draft)
- [ ] [statistical-genomics-foundry#164](https://github.com/jmchilton/statistical-genomics-foundry/pull/164) — Adopt the shared source-note frontmatter contract
- [ ] [topoqa-interface-quality-replication#1](https://github.com/jmchilton/topoqa-interface-quality-replication/pull/1) — Name the benchmark as the papers do
- [ ] [crypt4gh-recryptor-service#3](https://github.com/elixir-europe/crypt4gh-recryptor-service/pull/3) — Harden CORS per service mode
- [x] [foundry#488](https://github.com/galaxyproject/foundry/pull/488) — Add Pi-backed clean-room skill evaluation harness
- [ ] [galaxy#23482](https://github.com/galaxyproject/galaxy/pull/23482) — Default missing workflow comment colors
- [ ] [pulsar#496](https://github.com/galaxyproject/pulsar/pull/496) — [WIP] Fix job recovery startup race
- [ ] Embed Galaxy in Planemo — [[embedded_galaxy_in_planemo]]
	- [ ] [planemo#1701](https://github.com/galaxyproject/planemo/pull/1701) — Run package-installed Galaxy through Gravity (draft)
- [ ] Tool Shed — [[toolshed]]
	- [ ] [galaxy#23500](https://github.com/galaxyproject/galaxy/pull/23500) — More Tool Shed Dead Code Removal.
	- [ ] [galaxy#23502](https://github.com/galaxyproject/galaxy/pull/23502) — Prevent dependency cache failures from rolling back Tool Shed installs
- [x] [galaxy#23498](https://github.com/galaxyproject/galaxy/pull/23498) — Use TRS IDs as fallback names for GalaxyAI workflow suggestions
- [x] [pulsar#497](https://github.com/galaxyproject/pulsar/pull/497) — Clarify real-user job configuration documentation
- [x] [pulsar#500](https://github.com/galaxyproject/pulsar/pull/500) — Close leaked file and transport handles
- [ ] [pulsar#499](https://github.com/galaxyproject/pulsar/pull/499) — Limit stdout and stderr in status responses
- [ ] [planemo#1700](https://github.com/galaxyproject/planemo/pull/1700) — Allow anonymous access to external Galaxy instances
- [ ] [planemo#1702](https://github.com/galaxyproject/planemo/pull/1702) — Add --use_cache to planemo test, off by default (draft)
- [ ] [galaxy#23513](https://github.com/galaxyproject/galaxy/pull/23513) — Set Galaxy memory variables in GB and support memory overhead
- [ ] [galaxy#23514](https://github.com/galaxyproject/galaxy/pull/23514) — Add the Galaxy Conda environment hash to `mulled-hash`
- [ ] [foundry-lib#133](https://github.com/jmchilton/foundry-lib/pull/133) — A contested wiki-link address says so
- PRs Reviewed
	- [galaxy#23526](https://github.com/galaxyproject/galaxy/pull/23526) mvdbeek — Keep the center GalaxyAI view mounted across its own route changes
	- [galaxy#23525](https://github.com/galaxyproject/galaxy/pull/23525) mvdbeek — Use pydantic-aware serializer for celery control replies
	- [galaxy#23524](https://github.com/galaxyproject/galaxy/pull/23524) mvdbeek — Keep collection input form state local until undo or redo
	- [galaxy#23512](https://github.com/galaxyproject/galaxy/pull/23512) mvdbeek — Prevent mapper deferrals from starving later ready jobs
	- [galaxy#23511](https://github.com/galaxyproject/galaxy/pull/23511) nsoranzo — Document configuration schema and Python dependency workflows in `CONTRIBUTING.md`
	- [galaxy#23510](https://github.com/galaxyproject/galaxy/pull/23510) mvdbeek — Return rate-limit rejections as Galaxy error responses
	- [galaxy#23506](https://github.com/galaxyproject/galaxy/pull/23506) afgane — Accept a directory as a fetch src=path target
	- [galaxy#23494](https://github.com/galaxyproject/galaxy/pull/23494) ahmedhamidawan — Prevent `ScrollList` from doing infinite fetches on error
	- [galaxy#23491](https://github.com/galaxyproject/galaxy/pull/23491) nsoranzo — Remove remaining Reports webapp config and docs
	- [galaxy#23490](https://github.com/galaxyproject/galaxy/pull/23490) afgane — Upload test files the server cannot see, even with --force_path_paste
	- [galaxy#23488](https://github.com/galaxyproject/galaxy/pull/23488) mvdbeek — Document unique server names for multi-instance Gunicorn deployments
	- [galaxy#23483](https://github.com/galaxyproject/galaxy/pull/23483) afgane — Retry not-ready dataset downloads and surface HTTP status in the tool test client
	- [galaxy#23481](https://github.com/galaxyproject/galaxy/pull/23481) davelopez — Add support to cancel file uploads
	- [galaxy#23476](https://github.com/galaxyproject/galaxy/pull/23476) guerler — Fail the job when output discovery fails
	- [galaxy#23467](https://github.com/galaxyproject/galaxy/pull/23467) afgane — Don't set job state to OK before finish_job runs in the GCP Batch runner
	- [galaxy#23460](https://github.com/galaxyproject/galaxy/pull/23460) nsoranzo — Add pkg-resources-backport dependency for fs
	- [galaxy#23450](https://github.com/galaxyproject/galaxy/pull/23450) ahmedhamidawan — Migrate `ToolForm` to Composition API and TypeScript
	- [galaxy#23401](https://github.com/galaxyproject/galaxy/pull/23401) afgane — Forward force_path_paste for non-composite test inputs
	- [galaxy#23329](https://github.com/galaxyproject/galaxy/pull/23329) guerler — Enable tool request by default
	- [galaxy#23245](https://github.com/galaxyproject/galaxy/pull/23245) Rajioba1 — Populate AnnData spec version metadata
	- [galaxy#23171](https://github.com/galaxyproject/galaxy/pull/23171) pauldg — Retry transient connection errors on idempotent iRODS reads
	- [pulsar#427](https://github.com/galaxyproject/pulsar/pull/427) bernt-matthias — Add typing for managers

## August 31, 2026
- Ekkk - Chicago.
- 
- [ ] Embed Galaxy in Planemo
	- [ ] [planemo#1691](https://github.com/galaxyproject/planemo/pull/1691) — [WIP] Run package-installed Galaxy through Gravity
- [ ] Linting Overhaul
	- [ ] [galaxy#23229](https://github.com/galaxyproject/galaxy/pull/23229) — Repository-level data-table linting for data-manager / reference-data bundles
- [ ] Kubernetes
	- [ ] [galaxy#23324](https://github.com/galaxyproject/galaxy/pull/23324) — Refactor Kubernetes PV/PVC setup between integration test classes for reuse
	- [ ] [galaxy#23325](https://github.com/galaxyproject/galaxy/pull/23325) — Fix stale Kubernetes job naming docs
- [ ] Pick Value
	- [ ] [galaxy#23433](https://github.com/galaxyproject/galaxy/pull/23433) — Bug fix - pick_values inputs need to be available before picking.
	- [ ] [galaxy#23455](https://github.com/galaxyproject/galaxy/pull/23455) — Add a failure-tolerant Pick Value mode (draft)
- [ ] Job Finishing
	- [ ] [galaxy#23436](https://github.com/galaxyproject/galaxy/pull/23436) — Add FINISHING job state and pulsar recovery for restart safety (redo)
	- [ ] [galaxy#23448](https://github.com/galaxyproject/galaxy/pull/23448) — Move metadata handling into finish_job on the work queue
- [ ] [galaxy#23334](https://github.com/galaxyproject/galaxy/pull/23334) — Warn when a post job action cannot run on a step with no job
- [ ] [galaxy#23340](https://github.com/galaxyproject/galaxy/pull/23340) — Accumulated review nits - 2026-08-21
- [x] [pulsar#493](https://github.com/galaxyproject/pulsar/pull/493) — Size GCP Batch jobs from requested resources

## August 24, 2026
- [ ] iwc-lab
- [ ] Foundry FAQ
- [x] Handle Foundry Prompt
- [ ] Handle Foundry Feedback
- [ ] Optional Input
	- [ ] 
- [ ] Embed Galaxy in Planemo
	- [x] Wheel Fixes PR
	- [x] Research and Plan
	- [ ] Implement
	- [ ] [planemo#1690](https://github.com/galaxyproject/planemo/pull/1690) — [WIP] Add an embedded Galaxy engine for package-installed Galaxy
- [ ] Linting Overhaul
- [x] [planemo#1683](https://github.com/galaxyproject/planemo/pull/1683) — Document running Planemo workflows on Slurm clusters (rebase + fixes)

## August 17, 2026
- [x] Register for Conference.
- [x] Add Application kind to topo-bio-foundry.
- [x] Pulsar Review - Docs from mvdbeek.
- [x] Hand-off iwc-lab
- [x] Pulsar Review - missing state.
- [ ] Fix Tool Submission Errors
	- [x] PR
	- [ ] Usher
- [ ] Pulsar HTCondor2
	- [ ] [pulsar#486](https://github.com/galaxyproject/pulsar/pull/486) — Add a queued_htcondor manager on the htcondor2 bindings, shared with Galaxy
	- [ ] [galaxy#23326](https://github.com/galaxyproject/galaxy/pull/23326) — Share HTCondor mechanics with Pulsar via util/condor (draft)
- [x] Many Pulsar and Planemo PRs.
- [ ] [galaxy#23330](https://github.com/galaxyproject/galaxy/pull/23330) — Don't apply PJAs to skipped elements of mapped over outputs (draft)
- [ ] [planemo#1679](https://github.com/galaxyproject/planemo/pull/1679) — Various fixes for targeting postgres in singularity (rebase)
- [ ] [planemo#1684](https://github.com/galaxyproject/planemo/pull/1684) — Drop dead interactor.VERBOSE_GALAXY_ERRORS assignment
- [ ] [foundry-pattern#64](https://github.com/galaxyproject/foundry-pattern/pull/64) — One route is the rule; the key as the segment is the preference
- [ ] [statistical-genomics-foundry#168](https://github.com/jmchilton/statistical-genomics-foundry/pull/168) — A summary is shown wherever a note has one
- [ ] [ksuderman/galaxy#10](https://github.com/ksuderman/galaxy/pull/10) — Review suggestions for #23295: self-enforcing seam, three-tier resolution
## July 27, 2026
- [x] PR the Data Validation Work
- [x] PR the Tool Dependency Stuff
- [ ] 
- [ ] [tools-iuc#8255](https://github.com/galaxyproject/tools-iuc/pull/8255) — Fix ARTIC data table declaration and protocol URL
- [ ] [statistical-genomics-foundry#134](https://github.com/jmchilton/statistical-genomics-foundry/pull/134) — Read ScientistOne's Chain-of-Evidence against our probes
- [ ] [joachimwolff/galaxy#1](https://github.com/joachimwolff/galaxy/pull/1) — Collection panel selection: one identity per row, keyed by element occurrence



## July 13, 2026
- [ ] WES PR Update
- [x] Extract https://github.com/galaxyproject/galaxy/pull/22996/changes/ef93b9f6bcfe9686069b9af2c9efadc9501a1d35 into its own PR. 
- [ ] 1. The CLI --preserve/--strip flags oversell the same way (they promise per-category selection clean.py doesn't implement, documented in wf_tooling.md). Fix in scope, file separately, or ignore?

## July 6, 2026
- [ ] Workflow state stuff 
	- [x] Clean export in Galaxy for gxformat2 and ga files.
	- [x] Tool Parsing in galaxy-tool-util-ts
- [ ] Publish some foundry workflows - foundry-experiments
- [ ] Decide Next Steps on Notebook Paper
- [x] Update two Notebook PRs.
- [x] DRS PR


## June 29, 2026
- [X] Auto-layout in gxformat2
- Clean export in Galaxy for gxformat2 and ga files.
- Tool Parsing in galaxy-tool-util-ts
- Linting Overhaul
- [X] FAIR Foundries and Licensing Details.
- Better Unit tests.
- 