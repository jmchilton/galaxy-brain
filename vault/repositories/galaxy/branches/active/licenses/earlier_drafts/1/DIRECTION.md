# Direction review: native license agreements

Reviewed 2026-10-01 against `4d0583c24ad`, with base `1eed562dfc2` (11 commits; 102 changed files). This review reads the debrief, implementation, and public discussions; it does not independently rerun the reported suites. Detailed correctness follow-ups belong in [FOLLOW_UPS.md](FOLLOW_UPS.md).

## Recommendation

Keep the core work, but steer it toward **explicit runner affirmations for a small, validated set of unconditional requirements**, with a real wrapper pilot before calling it ready for adoption. The workflow gap is real and this branch addresses it substantially. Treat this as one capability in a broader license transparency and deployment policy effort, rather than the solution to that entire problem.

Do not extend immediately into conditional JavaScript rules, administrator acceptance, or a general compliance system. First settle scope identity, show a real migration, and make the records and unsupported paths understandable to users and operators. Fix the correctness blockers before merging; splitting the branch improves reviewability but does not replace that work.

## What the discussions actually establish

**Evidence:** [#8006](https://github.com/galaxyproject/galaxy/issues/8006) distinguishes wrapper licenses from underlying software licenses and debates dependency metadata rather than user acceptance. In the originating [xref discussion](https://github.com/galaxyproject/galaxy/pull/7905#issuecomment-493661429), Björn stresses underlying licenses, workflows, domains beyond bio.tools, and isolated networks. [#12663](https://github.com/galaxyproject/galaxy/issues/12663) again asks for underlying license metadata; [Marius's reply](https://github.com/galaxyproject/galaxy/issues/12663#issuecomment-937686061) describes helping operators keep certain licenses out, while [Brad's reply](https://github.com/galaxyproject/galaxy/issues/12663#issuecomment-937680349) questions normalizing restricted licenses.

**Evidence:** The [MAKER workflow discussion](https://github.com/galaxyproject/iwc/pull/47) contains disagreements about package metadata, upstream terms, community policy, and commercial use. [Nicola's comment](https://github.com/galaxyproject/iwc/pull/47#issuecomment-937692701) recommends deprecation absent a written exception; a later [posted statement attributed to Mark Yandell](https://github.com/galaxyproject/iwc/pull/47#issuecomment-962260646) permits Galaxy/Bioconda distribution while requiring commercial users to obtain a license. This is historical discussion, not verification of current MAKER licensing. [IWC #60](https://github.com/galaxyproject/iwc/issues/60) separately raises contribution policy.

**Evidence:** [#23261](https://github.com/galaxyproject/galaxy/issues/23261) proposes an enforcement layer. Its body and the author's detailed follow-up explicitly say they were posted by Claude on behalf of the author. The one independent review comment, [Nicola's warning](https://github.com/galaxyproject/galaxy/issues/23261#issuecomment-5192334345), concerns users remembering a non-commercial affirmation long after circumstances change. The [reply](https://github.com/galaxyproject/galaxy/issues/23261#issuecomment-5193938348) motivates separating submission certification from standing acceptance. That is useful design feedback; neither the long issue body nor a reaction establishes broad endorsement of the whole architecture. The issue's current “all open questions resolved” wording also overstates the debrief's remaining gaps.

**Inference:** The broader goals are (1) help runners discover relevant restrictions, including inside workflows, (2) let operators and communities choose what to distribute/install, (3) avoid silently reusing someone else's assertion, and (4) retain understandable evidence of what a submission asserted. A checkbox and an audit table help goals 3 and 4, partially help 1, and do not decide 2. Success should be measured against those goals, not completion of the issue's phases.

## What is worth preserving

The branch moves affirmation out of ordinary scientific parameters, enforces it on the server, and explicitly scans nested workflow tools. Those decisions address author-baked workflow checkboxes and scripted submissions that the UI alone cannot protect. A per-submission default is a reasonable response to the independent review concern. One affirmation for a map-over or workflow is a workable unit when the whole submission shares a purpose; it is not a certification of each future execution context.

Local terms, small canonicalization rules, a versioned content hash, and checking the displayed hash on persistent acceptance are good foundations. They avoid network dependence, prevent stale forms accepting unseen replacement terms, and let a suite share an agreement without depending on arbitrary identifiers. Durable invocation pins and associations created with jobs fit delayed workflow scheduling. Keeping terms after account erasure while removing personal events is a deliberate retention boundary worth documenting.

Keep the server semantics even if the UI is simplified. A metadata-only solution would leave the workflow runner affirmation bug in place; a special runtime boolean would keep authorization entangled with tool state and reruns. Do not delay the narrow feature until every license metadata question is solved either.

## Where to steer differently

### 1. Separate agreement content identity from authorization scope

**Evidence:** `license_agreements.py` hashes terms and affirmation, excluding `binds`. Manager `_unique`, workflow collection, and execution authorization caches deduplicate by that hash. The correctness reviewer reproduced the order dependence after persistent acceptance: `unmet([user, submission])` returns no unmet agreement, while the reversed list requires submission affirmation. Within a single tool this can bypass the fresh affirmation entirely; separate workflow tools can instead fail later at scheduling after preflight passed. That conflicts with the intended rule that a submission declaration always needs fresh affirmation; see the correctness review for reproduction and affected paths.

**Recommendation:** Preserve a content hash for stored terms, but preserve scope throughout authorization and presentation. Either aggregate to the strictest required scope for the current submission, or introduce a separate policy key containing the scope. The former keeps suite sharing and avoids needless term copies, but every collection/cache must obey it. The latter is more explicit, but changes payloads and persistence. Decide before releasing schema/hash contracts. Including `binds` in the hash is an option, not the only fix. Add order-independent mixed-scope tests.

### 2. Validate one real migration before expanding the model

**Evidence:** The branch introduces fixtures, not a production IUC migration. The issue postpones IUC buy-in and legal sufficiency until implementation and adoption to a later project. The debrief reports no licensed-tool workflow framework/Planemo test.

**Recommendation:** Prepare a companion wrapper example with its maintainer: verified adjacent terms, a precise affirmation, supported Galaxy/profile requirements, old parameter removal, workflow upgrade behavior, and automation instructions. A MEME-like unconditional case is a better pilot than optional models/data or disputed terms. Request operator and IUC review of this concrete migration before the core merge. A pilot is evidence of usability, not a claim that Galaxy has verified legal eligibility.

**Evidence:** The issue suggests splitting MAKER's academic-use-or-purchased-license assertion into two agreements. This implementation requires every declared agreement; it has no alternative authorization operator. Splitting an OR into two required affirmations would exclude legitimately licensed commercial users. Conditional applicability is a separate problem and does not automatically solve alternatives.

**Recommendation:** Document that v1 supports a conjunction of unconditional affirmations. Do not migrate MAKER by that proposed recipe. Clarify the intended bearer, restricted artifact, and alternative eligibility paths with wrapper maintainers before choosing a representation.

### 3. Make audit claims proportional to the available evidence

**Evidence:** Persistent events preserve metadata and time. A direct one-time acceptance creates a job association with content hash and authorization kind, without its own acceptance event. Invocation pins have a creation time. The new public APIs expose declared agreements and persistent acceptance history; they do not expose a corresponding per-job audit endpoint or user view. Tool tests automatically fetch and send hashes through the interactor.

**Inference:** These are useful authorization records, but cannot demonstrate that a human read the terms or that asserted facts were true. Automated clients are assertions by the authenticated account, and automatic tool tests should not be described as informed human acceptance.

**Recommendation:** Describe records as “the affirmation supplied to authorize this job.” Define the supported provenance question and retrieval path. If users/operators must answer who asserted what, for which submission, and when after jobs are retained or tools change, decide whether a submission-level receipt and a read-only job view are necessary. Do this before promising full auditability; avoid growing the model for hypothetical legal evidence requirements. Make test automation consent policy explicit rather than silently equating test execution with a person's eligibility certification.

### 4. Bound the unsupported and surprising behavior

Workflow preflight conservatively collects every tool, including `when`-skipped steps; the debrief says skipped jobs also get associations. Fail-fast is a sensible initial default, but can demand an affirmation for software the workflow never uses. Explain this limitation and test what “authorized” means for a skipped job. Later evaluated requirements may need a recoverable workflow state; reject-now is not necessarily the right answer once applicability depends on runtime inputs.

Converter and asynchronous data-source paths cannot carry a fresh submission affirmation today. A submission-only agreement on such a path can therefore be unusable despite successful loading. Choose explicit load-time rejection for unsupported combinations or implement an affirmation path before advertising support. Also document scheduling-time persistent revocation, stale terms, server upgrades, and failed tool requests. Fail-closed behavior is necessary, but unsupported behavior should be discoverable before a user starts an expensive workflow.

Do not commit now to the issue's conditional CWL JavaScript extension. Reusing an existing evaluator may be technically sensible, but first inventory actual artifact/option cases and compare simpler explicit selectors and data-table metadata. Runtime conditions, alternative entitlements, operator installation policy, and credentials are different requirements. Resolving all of them with expressions risks hiding policy in difficult-to-preview code.

## A practical landing sequence

1. Resolve the correctness findings in [FOLLOW_UPS.md](FOLLOW_UPS.md), especially policy aggregation and any direct/async submission or UI contract mismatches. Reconcile the issue and debrief with implemented behavior.
2. Agree on the small public contract: unconditional AND requirements, submission default, user opt-in, authenticated-account assertions, conservative workflow preflight, and supported execution paths. Document examples and automation rather than leaving the XSD as the only guide.
3. Review the precondition refactor separately if useful, then the parser/storage/API/enforcement changes, then workflow/UI integration. Treat these as a review stack; a user-facing release should include the corresponding workflow and prompt behavior.
4. Complete the pilot and missing targeted regressions, validate migration/cleanup on PostgreSQL as well as SQLite, and obtain current browser/async/workflow results. The previous session's reported counts are not fresh CI evidence.
5. Track underlying software/data metadata and operator exclusion policy separately, with links from this feature. Consider conditional and alternative eligibility support only after the pilot identifies concrete demand.

The main steering change is thus the acceptance criterion: ship a proven runner-affirmation capability with clear limits and an adoption path, not a completed design document whose broader policy assumptions have never been validated.
