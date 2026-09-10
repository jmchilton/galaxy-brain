# Standards-derived review pipelines for Galaxy tools

_Research draft, 2026-09-09_

## Executive finding

The IUC standards are a strong basis for decentralized Tool Shed trust, but are not an executable certification suite. They mix schema requirements, Planemo-checkable conventions, runtime behaviors, and questions needing semantic or legal judgment. The useful unit of trust is therefore not one “IUC quality” badge, but revision-bound claims such as **schema valid**, **tests passed**, **dependencies resolved**, **Pulsar exercised**, **security reviewed**, and **license evidence reviewed**.

A frontier model's highest-value roles are tracing values across language boundaries, comparing wrappers with upstream CLIs, finding indirect file dependencies, designing adversarial tests, and assembling evidence. Deterministic or runtime results should outrank model opinion; model-only findings are review evidence, not proof.

This document maps the standards into proposed pipelines. **Facts** below describe current documented behavior or source code. **Recommendations** describe a possible shed-review system.

## Source and terminology

The primary snapshot is [`galaxy-iuc/standards` commit `d7a0dfef`](https://github.com/galaxy-iuc/standards/tree/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449), current on 2026-09-09. It covers integration, security, remote execution, tool XML, dependencies, Data Managers, licensing, repository layout, `.shed.yml`, and management ([index](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/index.rst)).

Automation labels used below:

- **D:** deterministic parsing/lint/file analysis; **R:** controlled execution; **M:** inspectable model analysis or test generation; **H:** explicit human adjudication.

## The proposed pipeline set

| Pipeline / claim | What it checks | Evidence to retain | Practical automation | Important limit |
|---|---|---|---|---|
| 1. Repository and Tool Shed package | `.shed.yml`, included payload, metadata, README, repository type/name, dependency XML, version bump | expanded file manifest + digests; normalized lint findings; metadata snapshot | D: high | Valid packaging does not imply a correct or safe tool |
| 2. Tool contract and interface | XML schema/profile; IDs/versions; inputs, outputs, datatypes, filters, tests, help, citations; wrapper/upstream CLI agreement | parser/linter report; extracted interface; upstream comparison with citations | D: high; M: medium-high | Semantic fidelity to upstream cannot be established by schema alone |
| 3. Dependencies and execution environment | pinned requirements; Conda availability; BioContainer/mulled image availability; clean install and invocation | exact solve; package URLs/hashes; image digest; version-command result; logs | D/R: high | Availability is not provenance, vulnerability analysis, or successful scientific execution |
| 4. Functional and scientific behavior | declared Galaxy tests; output assertions; failure paths; parameter/conditional coverage; determinism | Planemo JSON/xUnit/HTML; job logs; output digests; coverage inventory | R: high for declared tests; M: high for test design | Tests only support the cases and assertions they exercise |
| 5. Security | value flow, quoting, validators/sanitizers, generated code, server-side Cheetah effects, unsafe formats, secrets, downloads, active content | source-located findings; taint traces; adversarial test cases and results; waivers | D: partial; M: high; R/H: needed | No static or model review proves absence of vulnerabilities |
| 6. Remote/Pulsar compatibility | staged tool files; head-node filesystem assumptions; data-table paths; absolute paths; real outputs and discovery inside job tree | resolved staging manifest; static findings; Pulsar job description/logs; returned-output manifest | D/M: medium-high; R: decisive | Static simulation cannot reproduce every deployment and data mount |
| 7. Licensing and restrictions | wrapper, wrapped software, dependencies, data/models; redistribution; scope and visibility of restrictions | cited license inventory; captured texts/digests; policy rationale; human sign-off | M: high for research; H: decisive | This is not legal advice; absence of a restriction is hard to prove |
| 8. Data Manager reproducibility | stable identifiers/paths; immutable upstream identity; content change handling; portable tests and migration | two-run table-row diff; source identity/digest; download manifest; migration note | D/M/R: medium-high | Mutable upstreams and large reference data make full tests expensive |

### 1. Repository and Tool Shed package pipeline

**Current facts.** The standards recommend a `.shed.yml`, a recognized README for unrestricted Tool Shed repositories, test data, and conventional tool/data-manager/suite layout ([repository guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/repositories.rst), [`.shed.yml` guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/shed_yml.rst)). Planemo's current `shed_lint` implementation checks inclusion expansion, expected files for special repository types, legacy dependency XML/schema/checksums/actions, repository dependencies, `.shed.yml` parsing and fields, README reStructuredText, optional URLs, embedded tools, the version against the Main Tool Shed, and whether `remote_repository_url` resembles the local repository path ([source](https://github.com/galaxyproject/planemo/blob/13e311785d5ab70f24a0583074e8e55676a83da4/planemo/shed_lint.py)).

**Recommended gate.** Run `planemo shed_lint --tools --ensure_metadata --urls` with a pinned Planemo/Galaxy environment. Independently expand the exact publishable repository and record every path, size, mode, and content digest. Reject missing inclusions, unexpected generated/secret/large files, invalid metadata, or an unaccounted lint suppression. Store warnings as findings even when policy allows the gate to pass.

**Limitation.** `shed_lint` is partly network-dependent and its native artifact is principally console output and an exit status. A trust service should normalize each finding, checker version, severity, target path, and suppression into a durable format.

### 2. Tool contract and interface pipeline

**Current facts.** The standards require versions for reproducibility, recommend a recent tool profile, pinned requirements, a version command, quoted dataset/text paths, typed inputs, outputs, tests, help, citations, and a consistent XML order ([tool XML guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/tool_xml.rst)). Galaxy's current linter modules cover XSD validity and many checks over general metadata, commands, inputs and validators, outputs, tests, help, citations, datatypes, stdio, XML order, containers, and required files ([linter sources](https://github.com/galaxyproject/galaxy/tree/dev/lib/galaxy/tool_util/linters)). Planemo exposes additional network checks for URLs, DOIs, Conda requirements, and BioContainers ([command source](https://github.com/galaxyproject/planemo/blob/13e311785d5ab70f24a0583074e8e55676a83da4/planemo/commands/cmd_lint.py)).

**Recommended gate.** First use the Galaxy parser, XSD, and all applicable linters. Then have the agent extract a canonical contract: tool/profile/version, dependencies, command tokens, every parameter and conditional, output production/discovery, tests, help, and citations. Compare that contract with the pinned upstream version's `--help`, manual, and release notes. Emit source-located discrepancies such as an upstream option not represented, inverted boolean semantics, invalid ranges, stale help, an output whose format disagrees with the program, or wrapper version drift.

**Limitation.** A model can make a strong semantic comparison, but ambiguous upstream documentation and dynamic CLIs require executable probes or human review. “No difference found” is not equivalent to completeness.

### 3. Dependency and execution-environment pipeline

**Current facts.** IUC guidance makes pinned Conda packages from Bioconda/conda-forge the community standard. A single requirement can obtain a corresponding BioContainer; combinations of multiple requirements need a registered mulled container. `planemo-monitor` performs daily registration for repositories it tracks ([dependency guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/package_xml.rst)). The same page marks legacy Tool Shed dependency packages as deprecated for new tools.

**Recommended gate.** Parse every requirement; require versions where the standard calls for them; query the intended channels and container registry; solve in a clean environment; pull the resolved image; run the wrapper's version command; and, where feasible, run a smoke test in both Conda and container modes. Record exact package build strings, artifact URLs and hashes, channel order, solver/version, architecture, and the immutable container digest rather than only a mutable tag.

**Limitation.** A resolvable package or existing image does not demonstrate that it starts on every architecture, contains the expected executable, has acceptable vulnerabilities/licenses, or produces correct results. Registry and channel state can also change; evidence must include time and resolved identities.

### 4. Functional and scientific-behavior pipeline

**Current facts.** The integration checklist calls for `planemo lint`, functional `planemo test`, and local manual inspection with `planemo serve` ([checklist](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/integration_checklist.rst)). Current Planemo writes human HTML and structured JSON test reports by default and can also emit xUnit, text, and Markdown ([command documentation in source](https://github.com/galaxyproject/planemo/blob/13e311785d5ab70f24a0583074e8e55676a83da4/planemo/commands/cmd_test.py)). Galaxy's test linters check that declared inputs and outputs exist, assertions are valid, discovered outputs are checked, failing tests are coherent, and tests have expectations ([source](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util/linters/tests.py)).

**Recommended gate.** Run all declared tests in a clean, pinned Galaxy environment and preserve Planemo JSON plus job logs and actual outputs. Add a coverage inventory across conditionals, repeat/collection shapes, optional outputs, error detection, and meaningful parameters. Let an agent propose compact boundary, punctuation, malformed-input, empty-input, and refusal-path tests; run those tests through Galaxy before crediting them.

For higher-value tools, compare against a small upstream golden result, invariant, independent calculation, or trusted prior revision. Repeat selected tests to detect nondeterminism.

**Limitation.** Passing declared tests can be gamed by weak assertions such as existence alone. Coverage is structural evidence, not proof of biological correctness, and model-generated expected outputs must never be accepted solely because the same model produced both implementation and oracle.

### 5. Security pipeline

**Current facts.** The IUC security checklist treats wrappers as a trust boundary and defines ten review areas: single-quote dynamic shell values; constrain free text; treat identifiers/filenames as untrusted; preserve sanitization through Cheetah expressions; keep template evaluation side-effect free; keep user values out of generated code; treat serialized objects and archives as active input; keep credentials out of commands/logs; verify downloads while preserving TLS; and explicitly handle browser-active output ([checklist](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/security.rst)). It notes that Cheetah executes on the Galaxy server before a job container can isolate it and that quoting, validation, and sanitization are context-specific rather than interchangeable.

**Recommended gate.** Build a value-flow graph from user-influenced sources—parameters, datasets/metadata, identifiers, credentials, uploads—to sinks such as shells, nested interpreters, generated code/config, filenames, deserializers, archives, downloads, and active browser content. Combine deterministic patterns with model review at each parsing boundary. Generate adversarial cases and run safe cases in isolated Galaxy. Record each flow, controls, source locations, results, residual risk, and waivers.

Obvious unquoted text/data paths, command-interpolated secrets, disabled TLS verification, or literal `eval` over user data can fail automatically. Custom sanitizers, nested interpreters, code generation, filename normalization, and active output need review.

**Limitation.** This check crosses XML, Cheetah, shell, helper languages, dependency behavior, and Galaxy rendering policy. Static taint is incomplete and dynamic testing explores only samples. Publish the inspected surface and model/checker versions; use **security-review-passed** or narrower claims, never “secure.”

### 6. Remote/Pulsar-compatibility pipeline

**Current facts.** The remote-execution checklist requires explicit `<required_files>`, no data-file I/O in Cheetah, no `$__app__` data-table lookup, no hardcoded absolute paths, real output files inside the job output directory, and discovered outputs inside the job tree ([checklist](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/pulsar.rst)). Galaxy and Pulsar share the `RequiredFiles` resolver; an explicit declaration controls staging and bypasses the legacy command-line scanning heuristic ([mechanism research](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/pulsar/required-files-mechanism.md)). The current Galaxy linter verifies that each declared include or pattern matches an existing file, but it does not prove all runtime-needed files were declared ([source](https://github.com/galaxyproject/galaxy/blob/dev/lib/galaxy/tool_util/linters/required_files.py)).

**Recommended gate.** Resolve the declaration to a concrete staging manifest. Have the agent recursively inspect entry scripts, imports, `source`/include calls, copied resources, templates, and runtime path construction; compare the resulting candidate closure with the manifest and flag both missing and dead entries. Statically reject Cheetah filesystem calls on datasets, `$__app__` access, inappropriate absolute paths, and output symlinks or discovery outside the job tree. Then execute at least one representative test through a Pulsar destination with no shared tool directory and verify the staged and returned manifests.

**Evidence.** Preserve the resolved staged paths/digests, dependency graph, Galaxy/Pulsar versions and relevant configuration, job logs, and returned output manifest.

**Limitation.** A remote run establishes compatibility only for its destination, architecture, mounts, and tested parameter path. Reference-data presence is often deployment configuration rather than a wrapper defect. Static checks cannot discover every dynamic import or path assembled from data.

### 7. Licensing and use-restrictions pipeline

**Current facts.** The standards separate four licensing layers: wrapper, wrapped software, dependencies, and reference data/models. IUC policy normally requires the wrapped software to permit use by anyone, while restrictions may still live in optional dependencies, data, or models. The guide requires redistribution to be checked separately, restrictions to be visible, and any gate to cover only the restricted feature; it also states that the current boolean-affirmation pattern is ordinary parameter state, not a first-class acceptance record ([guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/licensing.rst)).

**Recommended gate.** Have the agent build a four-layer inventory from repository licenses, upstream sites, package recipes, containers, models/data, citations, and wrapper help. Archive authoritative URLs, retrieval date, content digests, SPDX identifiers where appropriate, redistribution path, restriction scope, and wrapper visibility. Require human sign-off for publication, ambiguous/custom terms, and organization-level obligations.

**Limitation.** License classification is not legal advice. SPDX metadata alone is insufficient, upstream terms change, container transitive contents are difficult to enumerate, and a model cannot conclusively infer permission from silence. An evidence-complete result may properly be **unknown** or **requires administrator decision**.

### 8. Data Manager reproducibility pipeline

**Current facts.** The Data Manager standard says workflow-facing `value`, `dbkey`, and identity-bearing paths must not be derived from local wall-clock time. It prefers an upstream release/version, tag/commit, versioned manifest, or canonical content digest; mutable “latest” content must be resolved before a row is added. Different content must not silently reuse an identity, and migrations should preserve old values or aliases ([guidance](https://github.com/galaxy-iuc/standards/blob/d7a0dfef9309fcccae9060c4bb38e7eb09d7e449/docs/best_practices/data_managers.rst)).

**Recommended gate.** Scan code and templates for time-derived identity fields and mutable downloads. Trace the chosen upstream identity to its source. Run the Data Manager twice with controlled different clocks and installations, then compare normalized data-table rows and installed-content digests. Test that changed upstream content either fails integrity validation or yields a new identity. For an update, require an explicit compatibility/alias analysis against serialized workflow values.

**Limitation.** Full reference data may be too large for every review, APIs may be rate-limited, and some upstreams publish no immutable version. In those cases a deterministic manifest digest can support identity, but the pipeline must disclose that this is locally constructed rather than upstream-issued.

## Evidence model for decentralized trust

**Recommendation.** Bind every claim to the immutable Tool Shed revision and, when available, source commit and expanded payload digest. A minimal attestation should contain:

- claim type, versioned ruleset, subject identifiers/digests, and status (`pass`, `fail`, `warning`, `waived`, `not applicable`, or `not checked`);
- runner identity, checker/model versions, time, and relevant environment;
- raw artifacts, normalized results, citations, and network-resolved identities;
- suppressions/waivers with scope, reason, author and expiry, plus prerequisite claims and human decisions.

Claims should compose without collapsing into an opaque score. A Galaxy administrator could require, for example, `schema-valid + dependencies-resolved + tests-passed`, while a Pulsar-backed public server additionally requires `remote-tested`, and a security-sensitive deployment requires a recent security review. Trust then follows reproducible evidence and independent attesters instead of repository membership.

Freshness should be claim-specific. Schema validity can remain valid for an immutable payload under the same parser/ruleset; URL reachability, package/container availability, vulnerabilities, and upstream license terms need re-evaluation. A later failure should not rewrite historical evidence but should supersede the current status visibly.

## Agentic maturation loop

**Recommendation.** Inventory the wrapper, run deterministic gates, apply model-assisted contract/security/remote/license/test-gap review, generate traceable patches and tests, and re-run lint plus clean local and Pulsar execution. Escalate scientific/policy questions, ambiguous licenses, security waivers, and residual failures to humans. Publish only artifacts for the exact passing Tool Shed revision. This makes maturation legible—parsed, lint-clean, locally tested, dependency/container verified, remotely tested, security/license reviewed—without treating unfinished dimensions as passed.

## Implementation priority

Start by normalizing existing lint and Planemo test artifacts. Next add security value-flow review, `required_files` completeness plus Pulsar execution, upstream-interface comparison/test generation, and exact dependency/container resolution. Licensing inventory and Data Manager reproducibility follow, retaining explicit human adjudication where needed.

## Verified uncertainty

- The corpus includes AI-generated Pulsar research pages. Their counts are snapshots; this draft uses mechanism/case analysis, not those counts as policy.
- The Pulsar compatibility research page says that an IUC remote-simulation lint catches undeclared `$__tool_directory__` references. In the current Galaxy tree inspected for this draft, the general `RequiredFilesExist` linter only verifies that declared include patterns match existing files, and the current tools-iuc PR workflow visibly invokes ordinary `planemo shed_lint` through `planemo-ci-action` ([workflow](https://github.com/galaxyproject/tools-iuc/blob/4b11b48437eda75a22a13aa6f64945c847f64656/.github/workflows/pr.yaml), [action implementation](https://github.com/galaxyproject/planemo-ci-action/blob/02ee772c043636ba1e80f1e7dbe13a2d8955e749/planemo_ci_actions.sh)). I did not find a generally available semantic completeness or remote-simulation linter in those sources. This draft therefore treats that capability as a proposed model-assisted check plus runtime gate, not as established automation.
- Trust storage/UI are intentionally unspecified; the evidence shape should work in Tool Shed metadata, an external service, or signed attestations.
