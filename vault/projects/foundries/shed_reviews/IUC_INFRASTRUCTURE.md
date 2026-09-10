# IUC tool review and publication infrastructure

_Research snapshot: 2026-09-09. This describes the infrastructure that confers practical “IUC quality” today, then identifies what can and cannot be generalized into revision-level trust signals for the wider Tool Shed._

## Executive summary

The IUC’s authority is not one check. It is a bundled social and technical process:

1. contributions land in a known GitHub repository and are expected to follow published IUC standards;
2. changed wrappers are linted and executed in Galaxy CI;
3. a contributor explicitly requests review only after CI succeeds and review threads are resolved;
4. at least one IUC member approves the pull request;
5. merging triggers another lint/test run and automated publication to the public Tool Shed as owner `iuc`; and
6. a weekly run retests the full maintained corpus.

This is a strong maintenance pipeline, but most of its evidence remains in GitHub. The Tool Shed stores repository ownership, installability, parsed metadata, test-presence information, and administrative malicious/deprecated flags; it does **not** store the CI run, source commit, reviewing identities, test environment, individual gate outcomes, or expiry policy that produced a revision. Administrators therefore use `owner == iuc` as a lossy proxy for the entire process.

Agentic review is visible as work in progress, not deployed infrastructure. Open PR [#8213](https://github.com/galaxyproject/tools-iuc/pull/8213) adds tool-update and review guidance intended to become source material for a Foundry-generated skill for Claude Code, Codex, and Cursor. The PR does not itself add a skill or model-backed command to `tools-iuc`, and the current repository's command-shaped workflows only orchestrate deterministic CI and review-queue state.

The reusable unit should be a signed, revision-scoped assessment containing independently named claims—such as `schema-valid`, `tests-passed`, `dependencies-resolved`, `pulsar-static-compatible`, and `human-reviewed`—rather than a new binary “IUC-like” label. That would let non-IUC repositories earn the same mechanically demonstrated claims without implying IUC stewardship or scientific endorsement.

## What the IUC pipeline does today

### 1. Policy and submission contract

The IUC describes itself as a community committee that maintains high-quality tools, publishes best practices, and helps tool developers. Membership is evolving rather than a fixed certification body ([Galaxy IUC page](https://galaxyproject.org/iuc/)). The contribution policy accepts new tools, updates, bug fixes, documentation, and tests, subject to suitability rules. It requires adherence to the [IUC standards](https://galaxy-iuc-standards.readthedocs.io/), tests, an unrestricted-use license, and at least one approving IUC review ([CONTRIBUTING.md](https://github.com/galaxyproject/tools-iuc/blob/main/CONTRIBUTING.md)).

The pull-request template asks contributors to declare the change type, unrestricted educational and commercial use, and whether AI generated or assisted the contribution. It documents two exceptional labels: `skip-version-check` and `skip-url-check`. A contributor requests review by commenting `please review` ([PR template](https://github.com/galaxyproject/tools-iuc/blob/main/.github/PULL_REQUEST_TEMPLATE.md)). These declarations are useful process inputs, but checkboxes are not independently verified attestations.

The reviewer guide covers substantially more than CI: Tool Shed ownership and naming, package versions, command construction and quoting, error detection, datatype correctness, output discovery, depth and quality of tests, data tables, help, citations, and repository organization ([review guide](https://github.com/galaxyproject/tools-iuc/blob/main/docs/guide_for_reviewers.md)). Newer standards add explicit [security](https://github.com/galaxy-iuc/standards/blob/main/docs/best_practices/security.rst), [remote-execution/Pulsar](https://github.com/galaxy-iuc/standards/blob/main/docs/best_practices/pulsar.rst), and [licensing](https://github.com/galaxy-iuc/standards/blob/main/docs/best_practices/licensing.rst) checklists. These standards define the intended quality envelope; not every item is machine-enforced.

### 2. Pull-request automation

The primary [PR workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/pr.yaml) discovers only repositories and tools changed relative to the base. For tool changes it currently runs against the floating Galaxy `release_26.1` branch on Python 3.11 and performs:

- `planemo shed_lint --tools --ensure_metadata --urls --recursive`, failing the job at warning level;
- version and URL checks unless an authorized PR label suppresses the relevant linter;
- `flake8` over Python files in changed repository directories;
- R formatting verification with `styler`;
- a 1 MiB maximum for newly changed files;
- `planemo test` in Galaxy, backed by PostgreSQL, with up to four chunks and a 15-minute per-test timeout;
- BioContainers execution by default (`--biocontainers --no_dependency_resolution`), with explicit repository paths able to fall back through `.tt_biocontainer_skip`; and
- merged JSON/HTML test reports plus a final check that all test records succeeded and every expected chunk produced output.

The shared [Planemo CI action](https://github.com/galaxyproject/planemo-ci-action/blob/main/planemo_ci_actions.sh) reveals two important semantics. First, individual `planemo test` failures are temporarily swallowed so all reports can be combined; the later `check` mode is what fails CI for any non-success status. Second, `.tt_skip`, `.tt_biocontainer_skip`, and global/per-repository `.lint_skip` files are deliberate escape hatches. A mature evidence model must record those exceptions, not merely the final green status.

Non-tool-only changes use a [fallback workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/pr_without_tool_change.yaml) that emits the same successful `Check workflow success` context without running tool tests. Thus the context name alone does not prove tests ran; its event, inputs, discovered tool list, and job results matter.

### 3. Review queue and merge control

The [`please review` workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/ready-for-review.yaml) refuses to apply `ready-for-review` when a PR is a draft, has unresolved review threads, has no CI results, has incomplete checks, or has failing checks. On success it labels the PR and moves it to “Needs Review” on a project board. This is queue management, not itself review.

Public branch-protection data, queried on 2026-09-09, showed one required approval and one required status context, `Check workflow success`; it did not require a code-owner review, dismiss stale approvals, require approval of the last push, require conversation resolution at branch level, or enforce the rule for administrators ([GitHub branch-protection API](https://api.github.com/repos/galaxyproject/tools-iuc/branches/main/protection)). The contribution policy supplies the stronger social requirement that the approval come from an IUC member. `CODEOWNERS` assigns named maintainers for only a subset of tool paths ([CODEOWNERS](https://github.com/galaxyproject/tools-iuc/blob/main/.github/CODEOWNERS)).

Consequently, “IUC reviewed” means more than “GitHub says one approval,” but that distinction is not captured in the published artifact.

### 4. Pending agentic update/review guidance

As of this snapshot, `tools-iuc` has no committed `SKILL.md`, `AGENTS.md`, Claude/Codex prompt, or model-backed review command. There are two command-like interactions, but neither performs agentic review:

- commenting `please review` invokes the [ready-for-review workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/ready-for-review.yaml), which checks draft, conversation, and CI state before labeling and queueing the pull request; and
- `/run-all-tool-tests` is dispatched by the [slash-command workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/slash.yaml) to run the existing full-corpus test workflow.

Open, approved PR [#8213, “Add tool update and review guidance”](https://github.com/galaxyproject/tools-iuc/pull/8213), is the concrete precursor to an agentic review skill. It adds `docs/guide_for_tool_updates.md`, expands `docs/guide_for_reviewers.md`, links the guidance from `CONTRIBUTING.md` and the pull-request template, and asks AI-assisted contributions to identify their harness and model ([changed files](https://github.com/galaxyproject/tools-iuc/pull/8213/files)). Its description explicitly says the documents are planned as source material for Foundry to build a reusable tool-update and review skill for Claude Code, Codex, and Cursor. It also says a generated prototype passed Foundry cast, index, dashboard, and skill validation.

The distinction matters: PR #8213 standardizes the human-readable source policy and reports that a prototype exists, but its four changed files contain neither the generated skill nor an executable review integration. No separate public skill PR was found in `tools-iuc` or `galaxyproject/foundry` during this review. The prototype may be local, on an unindexed branch, or otherwise unpublished. Until the skill and its execution path are published, versioned, and evaluated, it should be recorded as **planned agentic infrastructure**, not as a current IUC gate or trust signal.

This work is nevertheless relevant to decentralized review. It creates a promising separation between canonical policy in IUC documentation and generated harness-specific skills. A future assessment system should preserve that separation by recording the exact policy/document commit, generated skill version, harness/model, tool calls, deterministic results, and any human approval. Merely disclosing that AI was used does not establish review quality.

### 5. Merge, Tool Shed publication, and continuous maintenance

On pushes to `main`, changed repositories are linted and tested again. If those jobs pass, the deploy job calls `planemo shed_update --force_repository_creation`: first for the Test Tool Shed, where failure is explicitly allowed to continue, and then for the main Tool Shed, where failure fails deployment ([PR/deploy workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/pr.yaml)). Publication uses the IUC Tool Shed API credentials and therefore creates or updates repositories under `iuc`.

A separate [weekly workflow](https://github.com/galaxyproject/tools-iuc/blob/main/.github/workflows/ci.yaml) discovers the entire corpus, lints it, and runs tests in up to 40 chunks. It can also be dispatched by `/run-all-tool-tests`. This is a meaningful maintenance property: passing at merge is not assumed to mean passing forever. However, the latest weekly result is neither attached to each Tool Shed revision nor surfaced to installers.

The pipeline installs the latest released Planemo by default (`pip install ... planemo`), targets a moving Galaxy release branch, and references reusable GitHub Actions mostly by mutable major tags. That is practical for maintenance CI, but it prevents byte-for-byte reproduction of a historical assessment unless the run metadata is retained and resolved versions are captured.

## What the Tool Shed records and exposes

The public repository API currently exposes fields such as owner, name, type, source/homepage URLs, description, private/deleted/deprecated status, download count, and create/update timestamps ([repository API](https://toolshed.g2.bx.psu.edu/api/repositories)). In a 2026-09-09 snapshot it returned 7,871 active repositories across 727 owners; 2,389 (30.4%) were owned by `iuc`. This count is a point-in-time observation, not a stable catalog statistic.

Revision metadata includes the Tool Shed changeset hash, numeric revision, `downloadable`, `malicious`, `missing_test_components`, parsed tools and requirements, invalid tools, and repository dependencies ([Tool Shed revision schema](https://github.com/galaxyproject/galaxy/blob/dev/lib/tool_shed_client/schema/__init__.py)). The current UI presents installability, download count, last update, parsed/invalid tools, and a prominent malicious warning ([RepositoryPage.vue](https://github.com/galaxyproject/galaxy/blob/dev/lib/tool_shed/webapp/frontend/src/components/pages/RepositoryPage.vue)). These are useful facts, but `downloadable` means the Shed could derive an installable revision, and `missing_test_components == false` means test components were found; neither means the tests passed.

No current repository or revision field records:

- the exact upstream Git commit or pull request that produced the Mercurial changeset;
- which CI workflow/run and Planemo/Galaxy/container versions evaluated it;
- individual lint, functional, dependency, security, or Pulsar results;
- which checks were skipped, suppressed, or waived and by whom;
- reviewer identity, review organization, policy version, or approval timestamp;
- artifact signatures, SBOM/vulnerability evidence, or assessment expiry; or
- the latest scheduled retest result.

This is the core reason ownership carries so much weight: it is the only durable, immediately visible field that implies the richer external process.

## Coverage: what “IUC” does and does not presently imply

| Claim administrators may infer | Evidence actually present | Confidence / limitation |
|---|---|---|
| Wrapper parses and follows common conventions | XSD/tool linters, Shed metadata generation | Strong for machine-checkable syntax; not semantic correctness. |
| Declared tests pass | Planemo executes changed tools before merge and publication; weekly corpus tests | Strong at a particular run, but the result is not persisted with the Shed revision. Test coverage can still be shallow. |
| Dependencies work | Default CI executes BioContainers | Good Linux/container smoke evidence. It is not a universal conda solve, architecture matrix, or administrator-specific deployment test. |
| Safe to install/run | Manual IUC security review plus general linters and tests; Tool Shed can mark a revision malicious | Valuable review, but no comprehensive automated security scan, dependency vulnerability report, sandbox analysis, or signed security claim. Upstream application code is explicitly outside systematic Galaxy review ([Galaxy maintenance overview](https://galaxyproject.org/news/2023-02-05-how-tools-are-maintained/)). |
| Works with Pulsar | IUC remote-execution rules plus static lint around `required_files` | Useful static evidence, but the normal tool PR workflow does not execute an end-to-end Pulsar job on a disjoint filesystem. |
| Scientifically valid | Upstream software, citations, wrapper tests, and expert review | CI validates wrapper behavior against declared expectations; it does not independently validate the upstream algorithm or scientific claims. |
| Maintained | Central repository, maintainers, updates, weekly full-corpus CI | Stronger than a one-time badge, but no per-revision freshness/last-success signal reaches the Shed. |

## Implications for a decentralized review system

The design should preserve the valuable decomposition that the present owner proxy hides.

1. **Assess immutable revisions.** Bind every result to Tool Shed host, owner, repository, changeset revision, source commit when known, and content digest. Never attach a timeless badge only to a repository name.
2. **Publish atomic claims.** Use named checks with result, tool/version, policy version, execution environment, timestamps, evidence URL/digest, and expiration. A bundle may summarize these, but must not erase them.
3. **Keep provenance distinct from quality.** `maintained-by-iuc`, `reviewed-by-iuc`, and `passes-iuc-policy-vN` are different facts. External projects should be able to satisfy the policy without impersonating IUC stewardship.
4. **Represent exceptions.** `.lint_skip`, `.tt_skip`, URL/version skip labels, non-container fallbacks, allowed failures, and manual waivers must appear as first-class outcomes (`pass-with-waiver`, reason, actor, scope), not disappear behind green CI.
5. **Separate static from dynamic compatibility.** For example, `pulsar-static-compatible` should not be rendered as `pulsar-tested`; container availability on x86-64 should not become generic `dependencies-work`.
6. **Support renewal and revocation.** Scheduled retests should update a latest assessment while preserving the merge-time result. Malicious/deprecated status and newly found vulnerabilities should be able to revoke or supersede claims without rewriting history.
7. **Make the Shed the discovery surface, not necessarily the runner.** CI providers can emit signed attestations to a stable Tool Shed API. The UI and installation APIs can then filter or warn based on explicit administrator-selected policy.

## Sources, method, and uncertainty

This draft used primary sources: the live `tools-iuc` workflows, contribution/reviewer documents and public branch settings; the `planemo-ci-action` implementation; IUC standards; current Galaxy/Tool Shed models and frontend; and read-only queries to the public Tool Shed API. The most consequential uncertainty is enforcement outside the files examined: repository rulesets, GitHub organization privileges, private project settings, secret configuration, and informal reviewer practice may strengthen or weaken the visible process. The same applies to PR #8213's reported Foundry skill prototype: the public PR does not contain it, so this review could not inspect its behavior or validation evidence. Branch settings, PR state, and catalog counts are dated snapshots. Workflow files are mutable, so any future attestation format should capture their resolved commit and dependencies rather than citing `main`.
