# Acceptance criteria

The project is ready for an initial implementation when all of the following are true:

- [ ] A repository subject is bound to an immutable Tool Shed repository revision and repository-content digest, with the source commit recorded when available.
- [ ] A tool subject is anchored to that repository revision and records its tool ID, tool version, wrapper path, and a digest of the wrapper plus the macros, scripts, and other files that affect it.
- [ ] Every result declares one modality: `automated_test`, `agent_check`, or `human_review`.
- [ ] All modalities use a common claim envelope containing subject, scope, assessor, method and version, outcome, timestamp, and evidence.
- [ ] Repository-level and tool-level assessments use the same storage and evidence infrastructure, while each claim type declares the subject levels to which it can apply.
- [ ] An automated-test record can state that tests were actually executed and passed, including the test suite, runner and versions, execution environment, timestamps, and durable report or log artifacts.
- [ ] An agent-check record includes the harness, model, skill or policy version, inspected scope, findings, and supporting evidence.
- [ ] A human-review record includes the reviewer's identity, decision, reviewed scope and content digest, timestamp, and any declared organizational affiliation or role.
- [ ] The model can specifically represent: “A verified IUC member reviewed the complete contents of this repository revision and approved it.”
- [ ] IUC membership is backed by verification evidence captured at review time rather than only a self-declared affiliation.
- [ ] Review scope distinguishes the complete repository contents, a revision diff, selected tools, and selected files.
- [ ] A review covering a complete repository or multiple tools records an explicit manifest of the tools and shared components that were reviewed.
- [ ] One assessment may cover multiple subjects without losing its original scope; per-tool coverage derived from a repository review links back to that assessment rather than inventing separate reviews.
- [ ] Dependencies between tools and shared macros, scripts, data managers, and configuration are recorded well enough to determine which tool assessments a change invalidates.
- [ ] A tool-level result cannot imply repository-wide approval, and an “all tools passed” repository summary is derived only when the complete tool inventory is known and every applicable current tool result passes.
- [ ] Outcomes distinguish `pass`, `fail`, `warning`, `waived`, `not_applicable`, and `not_checked`; waivers record their actor, rationale, scope, and expiry.
- [ ] A policy can independently require any combination of claims, including both passing automated tests and approval by an IUC member.
- [ ] One modality cannot silently satisfy another: an agent check is not a human review, and static analysis is not an executed test.
- [ ] Published results expose enough provenance and artifacts for an administrator or independent service to verify who or what made each claim and against which content.
- [ ] Results can expire, be superseded by a newer assessment, or be revoked without erasing historical evidence.
- [ ] The Tool Shed API and user interface expose repository-wide coverage and per-tool claims, including their modality, scope, outcome, assessor, evidence, and freshness, rather than only an opaque aggregate badge.
- [ ] An end-to-end demonstration applies all three modalities to a multi-tool, non-IUC repository revision; preserves a partial result where one tool is not approved; publishes the records; and evaluates an administrator policy that requires the modalities separately.
