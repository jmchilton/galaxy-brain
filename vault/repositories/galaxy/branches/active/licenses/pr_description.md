Implement 🎯 #23261 (unconditional agreements) - require the person submitting a tool or workflow to affirm its declared terms, and record how each job was authorized.
[Implementation slides](https://jmchilton.net/slides/licenses)

A checkbox saved in a tool's parameters can carry a workflow author's answer into someone else's run. A rerun can replay the same answer. For an affirmation such as “I am not using this tool for commercial purposes,” that saved value cannot speak for the next runner or their next analysis. This adds an agreement requirement outside tool parameters, enforced by the server for browser and API submissions.

***Tool authors opt in by declaring agreements. Existing wrappers gain no new license prompt, and each workflow runner supplies their own authorization.***

![Expanded terms and the runner's affirmation on the tool form, with Run disabled until affirmed](screenshots/tool_license_agreement_terms.png)

The tool form shows the terms and the statement the runner must affirm. Both workflow run forms collect agreements from nested steps and show one prompt for shared terms. The screenshots use the branch's test wrappers.

| What the tool author declares | What the runner does | What carries forward |
|---|---|---|
| `binds="submission"` (default) | Affirms for each submission | Authorization covers that submission's jobs, including its delayed workflow steps. A new rerun or remap needs authorization again. |
| `binds="user"` | Affirms once for the submission, or chooses to remember it | Remembered acceptance can satisfy later submissions until revoked. Preferences exposes accepted terms and acceptance/revocation history. |

Changing the terms or affirmation requires acceptance again. Changing a display label or URL does not. Jobs retain the agreement identity and whether authorization came from a one-time affirmation or remembered acceptance.

***The supported contract is unconditional, all-required agreements. Input-dependent terms, alternative entitlements such as academic use OR a purchased license, and administrator acceptance remain outside this PR.***

***The existing wrapper SPDX `license` attribute remains metadata. This feature records an authenticated account's affirmation, without verifying the statement's truth or the legal adequacy of the terms.***

<details><summary>Declaring an agreement</summary>

For profile 27.0+, add an agreement under `<requirements>` alongside package requirements:

```xml
<license_agreement id="non-commercial" version="1" path="terms.txt">
    <label>Non-commercial use terms</label>
    <affirmation>I certify that I am not using this tool for commercial purposes.</affirmation>
</license_agreement>
```

`terms.txt` is a UTF-8 file inside the tool directory and is included when the tool is archived. Short terms can instead use inline `<text>`. Declaring an agreement requires login. Agreement identity is a versioned SHA-256 of the affirmation and terms, shared across tools with identical wording. When the same wording is declared with both binding scopes, submission binding wins.

See [the authoring and API guide](https://github.com/jmchilton/galaxy/blob/licenses/doc/source/dev/tool_license_agreements.md) for normalization rules, endpoints and examples. The tool XML reference also documents the element.

</details>

<details><summary>Enforcement and failure behavior</summary>

- Tool execution checks access and agreement authorization before creating jobs or output collections. Direct tool submission and workflow invocation return `403009` with typed `unmet` entries when a precondition is missing. The forms refresh the prompt after a refused submission.
- An asynchronous tool request can be accepted before execution. If authorization fails in the worker, its failed state preserves the structured reason and the tool form displays it.
- Workflow submission checks installed tools and agreements before creating a requested history. Each (sub)invocation stores only the one-time hashes declared by its own steps, so authorization survives scheduler restart. Discovery omits terms for tools the user cannot access, and invocation still refuses inaccessible tools.
- Scheduling checks each step again. Revocation blocks later steps relying on remembered acceptance. A one-time affirmation already pinned to that invocation remains valid. Revocation does not cancel jobs already created, and paused-job resume or automatic resubmission retains the existing job's authorization.
- Workflow preflight also requires agreements for steps that a `when` condition will skip.
- Tools with actions that bypass the execution checks, and `data_source`/`data_source_async` tools, cannot declare agreements. Converters declaring agreements are excluded from implicit conversion, conversion options and `/api/datatypes/converters`, but can still be run directly from the tool panel.

</details>

<details><summary>Remembered acceptance and stored records</summary>

![Preferences shows accepted terms and a Revoke action](screenshots/license_preferences_accepted.png)

Migration `01cbf54bb541` adds four tables for agreement terms, account acceptance/revocation events, job authorization associations and durable invocation associations. Persistent acceptance confirms the hash displayed to the user. User purge removes the account's events while jobs retain the agreement hash and authorization kind. There is no public job-authorization view in this PR.

</details>

## Risks

The tool XML contract, public API and persisted authorization records are difficult-to-reverse decisions, even though wrappers must opt in to the new prompts.

<details><summary>Risk Details</summary>

- Tool authors choose whether an affirmation concerns each submission or the account. Using remembered acceptance for a statement about the purpose of a particular run would weaken that statement.
- Agreement identity intentionally excludes display metadata and binding scope. Wording changes invalidate acceptance, and mixed declarations always require a submission affirmation.
- The migration adds durable records. Downgrading drops them, so rollback after real use loses their history.
- The precondition extraction changes existing access refusals to structured `403009` responses. API consumers must inspect the typed reason, and asynchronous requests report it through their failed state.
- Workflow scheduling and revocation interact over time. The branch explicitly preserves one-time invocation authorization and existing jobs while rechecking remembered acceptance for later steps.
- Validation uses representative fixture wrappers. No production wrapper or operator-reviewed set of terms has been migrated. Planemo workflow tests do not yet support the new one-time acceptance field. MCP/agent submissions currently require remembered acceptance for user-bound agreements.

</details>

<details><summary>Risk Review Advice</summary>

Review the binding defaults and content identity as a tool-author contract, then the job/invocation associations and purge behavior as a database contract. Check direct submission, asynchronous refusal, delayed scheduling and revocation together, since they expose different points in the same authorization lifecycle.

Before adopting this in a production wrapper, have its maintainers and the operator review the actual terms and affirmation. The recorded account action establishes what was supplied to Galaxy. It does not establish that a person read the terms, that their statement is true, or that the wrapper's terms are legally adequate.

</details>

## Context

Implements the unconditional-agreement portion of 🎯 #23261. Software-license metadata and deployment policy remain separate discussions in #12663 and #8006. Alternative kept on 🌿[`licenses_alt_original_scope`](https://github.com/jmchilton/galaxy/tree/licenses_alt_original_scope) - the earlier hardened implementation without the later workflow-discovery access filter, converter-list filtering, gxwf one-time acceptance support and added regression coverage. Developed with [John's Galaxy Brain Branch Factory](https://jmchilton.github.io/galaxy-brain/factory/galaxy-branches/).

## Agentic Checks

These summarize the recorded October 22–23 hardening runs. The polish debrief records the current rebase and verification separately.

### ✅ [Scope Evaluation](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_SCOPE_EVALUATION.md)

<details><summary>The implemented scope covers discovery, execution and lifecycle behavior together.</summary>

The second evaluation retained the implementation after the first pass's discovery, converter, workflow-test and PostgreSQL cleanup additions. Split options are recorded, with leading baseline/refactor commits separable from the feature. The production-wrapper pilot and Planemo support remain companion work.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Removed a redundant workflow result class and a duplicate refusal scan.</summary>

Workflow authorization now returns the per-step one-time hashes its caller needs. The scheduler refusal handler filters typed license refusals once. The recorded verification includes 369 unit tests, API and integration tests, both workflow rerun modes and mypy.

</details>

### ✅ [John's Galaxy Test Challenges](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_CHALLENGE_TESTS.md)

<details><summary>Removed overlapping unit coverage and strengthened the remaining access-check test.</summary>

The unit test now uses real workflow objects, covers duplicate inaccessible steps and refuses before the acceptance manager is consulted. The equivalent discovery behavior is exercised through integration endpoints. The recorded run passed 224 tests, 17 workflow integration cases and both framework rerun modes.

</details>

### ✅ Second Frontier Model Review

<details><summary>Fixed workflow run-data filtering and inclusion of terms files in tool archives.</summary>

Regression tests verify that an inaccessible top-level step exposes no terms and that external-file collection includes a declared terms path. Both failed before their fixes and passed afterward.

</details>

### ✅ [Refactoring of base branch](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/GX_PROCESS_REFACTOR_BASELINE.md)

<details><summary>Baseline tests, shared execution checks and independent corrections lead the feature commits.</summary>

The stack starts with existing `require_login` behavior, the execution-precondition extraction and a shared workflow tool walker. Whitespace-preserving tool re-parsing and converter cache invalidation have their own regression tests and leading commits. Current dev already checks missing workflow tools before history creation, so the rebased stack keeps its regression and composes license authorization with that preflight.

</details>

## John's Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? A named missing-agreement prompt or structured API refusal. Delayed workflow failures identify the agreement failure in invocation status.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. They pin content identity, scope precedence, database invariants and refusal side effects, with API, scheduling and browser coverage.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc., what purpose do they serve? They explain current ordering, whitespace and cache invariants that prevent regressions.
- [x] Which existing workflows change behavior? Workflows using a wrapper that declares agreements require the runner's authorization. Unchanged wrappers gain no new license prompt. The leading pre-feature corrections are described above.
- [x] Who hits this in practice and what is the evidence? Authors and runners of tools with use restrictions. Fixture wrappers and lifecycle/browser tests demonstrate the behavior. A production-wrapper pilot remains outstanding.
- [x] Were simpler or existing approaches considered? Yes. Saved parameters replay an old answer, and browser-only prompts cannot enforce API submission or delayed scheduling.

## How to test the changes?

- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Coverage and verification</summary>

Tests cover parsing and canonicalization, lint, acceptance/revocation, database constraints and purge, tool/API refusals, asynchronous execution, nested scheduling and restart, reruns/remaps, converter filtering, and browser prompts/preferences. Tool framework tests supply declared hashes automatically. Workflow framework cases opt in with `accept_license_agreements: true`.

Fresh polish verification: 460 unit tests passed (one skipped), 31 API tests passed, and 35 tool/workflow integration tests passed after rebasing onto current `dev`. `make format`, pinned ruff and mypy passed. Both generated API schemas match fresh generation. Earlier hardening also exercised PostgreSQL cleanup and browser flows, as recorded above. New fork CI is pending.

For a manual pass, migrate a test instance and load the registered `license_agreement_*` fixtures. Confirm an unaffirmed run is blocked, a one-time affirmation does not satisfy the next submission, remembered user acceptance survives login and can be revoked, and nested steps sharing terms produce one prompt. Compare the browser refusal with the direct API response and the asynchronous failure display.

</details>

- [x] This is a refactoring of components with existing test coverage.

<details><summary>Existing behavior retained</summary>

The leading extraction retains anonymous/logged-in `require_login` coverage and gives failures a typed precondition response. Re-parsing and converter-cache corrections have isolated regressions ahead of the feature.

</details>

## License

- [ ] Author to confirm: I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
