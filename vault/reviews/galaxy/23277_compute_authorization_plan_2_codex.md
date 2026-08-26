# Crypt4GH compute authorization: revised path forward

This plan supersedes the proposed Galaxy-only ownership check in `23277_compute_authorization_plan.md`. That check is still worth implementing as an early rejection layer, but it does not by itself establish who owns a compute key. The browser and Service A are inside the user's trust boundary, and the current flow lets the browser submit the compute header, keypair ID, and expiry to Galaxy. Moving those same client-supplied values into a server-side table changes where they are stored, not where they came from. An attacker who copies another user's values can still claim them unless enrollment is independently verified.

The secure path therefore has to join three ideas into one gated feature:

1. verified enrollment of a user's compute identity;
2. server-managed preparation of each encrypted dataset for that enrollment; and
3. job-scoped authorization enforced by the recryptor.

Galaxy's ownership/readiness checks should be built early because they improve behavior and make the policy explicit. They should not be described as closing the authorization issue until the recryptor also enforces the verified, job-scoped grant.

## Security boundary and required invariants

The design should assume that a malicious user controls their browser, requests, Service A deployment, tool definition, tool process, and everything serialized into the job. Galaxy's trusted control plane, its vault, and the protected part of Service B are trusted. Object storage and transport may contain encrypted data but should not receive plaintext.

The implementation is complete only if these invariants hold:

- Copying or importing an HDA conveys data visibility, not another user's compute authority.
- Values visible to a browser or stored with a dataset are never sufficient to impersonate the enrolled recipient.
- Enrollment cannot complete without a fresh, replay-resistant proof tied to the corresponding private key or to an equivalently authenticated Service A identity.
- Service B recrypts only for an authenticated, active Galaxy job and only for the user, destination, dataset/source header, and ephemeral recipient named by that authorization.
- A capability for one job, dataset, destination, recipient key, or source header cannot be replayed for another.
- Long-lived delegation credentials never appear in HDA metadata, `JobIO`, tool parameters, command lines, environment variables, working directories, logs, or browser-readable responses.
- An unauthorized or stale input fails readiness before Service B is called, before plaintext can be staged, and preferably before a runner is selected.
- Legacy client-written compute metadata is not accepted as proof and is not silently promoted into the new tables.
- Every job output covered by the feature is transformed and verified before transport or persistence; the absence of marker files is not treated as evidence that no plaintext output exists.
- Protected mode fails closed. There is no runtime fallback to the unprotected recryptor protocol.

The public key recoverable from a Crypt4GH compute header is an identifier, not a credential. It is useful for consistency checks but cannot prove that the requester possesses the private key.

## Target authorization model

There are three related records, with deliberately different lifetimes and grains.

### 1. Verified enrollment

`Crypt4ghEnrollment` represents a user's verified relationship with a particular recryptor/audience. A plausible model is:

- Galaxy user ID;
- stable recryptor/audience ID;
- verified public-key fingerprint or other stable compute identity;
- Service B compute keypair ID;
- key generation and expiry;
- verification state and timestamps;
- a vault reference to any long-lived delegation secret.

The delegation secret itself must be in Galaxy's vault, not in the database record. The recryptor/audience ID should be an explicit stable identifier understood by Galaxy, Service A, and Service B. A mutable Galaxy destination name or URL is not a sufficient identity, although it can map to one.

Enrollment needs a protocol change. Service B must not issue a usable delegation merely because a caller supplies a public key: Alice can submit Bob's public key just as easily as Bob can. The protocol must establish private-key possession or use an authenticated Service A identity that is itself bound to the Galaxy user. Because the current X25519 material is not a signing key, this needs an explicit challenge protocol rather than an improvised signature. One possible shape is a fresh challenge encrypted to the proposed recipient key, with a response bound to the enrollment request, Galaxy user, recryptor audience, nonce, and short expiry. The precise cryptographic construction should be reviewed separately; freshness, audience binding, and replay prevention are requirements, not optional hardening.

The browser may relay an opaque enrollment artifact to Galaxy over TLS with exact-origin CORS, but browser relay does not authenticate the artifact. Galaxy must validate it with Service B or through a signed/opaque protocol that Service B can authoritatively verify. The CORS work is useful boundary hardening, not authorization.

### 2. Dataset preparation

`Crypt4ghDatasetPreparation` records that an underlying encrypted Galaxy `Dataset` has been prepared for a specific verified enrollment generation. It should contain:

- underlying Dataset ID;
- enrollment ID and generation;
- compute header;
- source header or ciphertext identity/digest sufficient to prevent substitution;
- Service B keypair ID, if it is not implicit in the enrollment generation;
- creation, expiry, and state fields.

The compute header is dataset-specific and therefore does not belong on the user-wide enrollment record. Key rotation creates a new enrollment generation; preparations made for an older generation become stale and readiness should tell the user to prepare the dataset again.

Using the underlying `Dataset` rather than an HDA as the data-side key gives the intended semantics: same-user HDA copies can reuse the preparation, while a cross-user copy cannot reuse the original user's enrollment. A second legitimate recipient can create a separate preparation for the same underlying encrypted bytes using their own verified enrollment.

Output finalization may create preparations for newly encrypted outputs on behalf of the job owner, but only from trusted server-side state. It must not derive authority from client-written output metadata.

### 3. Ephemeral job authorization

The job must receive only a short-lived, narrowly scoped capability or an already recrypted header. It must never receive Galaxy's long-lived delegation credential.

The preferred flow is:

1. Galaxy readiness resolves the selected destination/recryptor and verifies enrollment and dataset preparations.
2. A trusted Galaxy-side broker reads the delegation secret from the vault.
3. The broker asks Service B to mint or honor a short-lived authorization bound to the active job, Galaxy user, source Dataset and source-header digest, recryptor audience, destination, ephemeral job recipient public key, expiry, and nonce.
4. Only the scoped capability or resulting recrypted header crosses into the job boundary.
5. Service B validates all bindings and enforces expiry and replay rules.

An alternative is for a privileged Galaxy runner-side component to call Service B and deliver only the recrypted header to the tool sandbox. Either architecture is viable if the long-lived credential remains outside the tool/job trust boundary.

This means a long-lived user delegation phase followed later by a job-scoped phase is not a safe rollout sequence. Anything serialized in `JobIO`, a tool command, files, or environment is available to a malicious tool. Job scoping or a trusted broker must be part of the first configuration described as secure.

The existing Galaxy job-token mechanism is a useful lifecycle analogy, but its token authenticates callbacks using Galaxy secrets and is not directly a Service B credential. Service B should either validate a separately signed capability using a dedicated key, or introspect an opaque capability through a trusted Galaxy endpoint. Galaxy's global security secret must not be shared with Service B.

## Galaxy readiness and API behavior

Once the job destination is known, readiness should perform these checks before staging or runner submission:

1. The user is authenticated, unless anonymous enrollment is deliberately designed and supported.
2. The destination maps to a configured, stable recryptor audience.
3. The user has a current, verified enrollment for that audience.
4. Every Crypt4GH input has a current dataset preparation for that enrollment generation.
5. The preparation's source identity/header digest and compute-header recipient agree with the actual encrypted dataset.
6. The relevant key and preparation will remain valid for a defined minimum execution window.
7. Multiple encrypted inputs have a compatible authorization context, or the implementation explicitly supports more than one context.
8. A job-scoped authorization can be issued without exposing the long-lived delegation.

Failure should be actionable, for example: “This encrypted dataset has not been prepared for your current compute key. Use Recrypt and try again.” A copied dataset should fail in exactly this way and should make zero calls to Service B.

The dedicated preparation/enrollment service or API should own authorization. `datatype.after_setting_metadata` is still useful for structural datatype validation, but it lacks the authenticated user, selected destination, and enrollment context required to make an ownership decision.

The current `crypt4gh_compute_*` HDA metadata fields must be treated as untrusted legacy hints. Do not backfill the new tables from them. Prefer moving compute header, keypair ID, and expiry out of generic HDA metadata entirely. If compatibility or display requirements temporarily retain them, no security decision may consume them. The original Crypt4GH file header may remain read-only datatype metadata.

Extracting a reusable `deserialize_metadata` API remains a reasonable independent Galaxy cleanup and can proceed in its own PR. It is not a prerequisite for the authorization fix, and the final Crypt4GH design may no longer need generic client metadata writes at all.

## Test infrastructure before feature claims

The test recryptor must model the security properties closely enough to detect identity substitution. The current single global compute key and fixed keypair ID cannot distinguish Bob from Alice, and ignoring the supplied keypair ID makes the most important negative tests meaningless.

Update the mock service to provide:

- a per-user/per-keypair registry;
- realistic compute-key-info issuance and lookup;
- rejection of unknown, mismatched, expired, or revoked IDs;
- protected-mode capability validation;
- a recryptor that consistently uses the key material needed to decrypt/re-encrypt headers;
- thread-safe, per-test counters and reset behavior.

Land red tests for the invariants before enabling the new path. Unit, model/service, and API tests should carry most of the security matrix; Selenium should cover the user journey rather than serve as the only proof.

At minimum, test:

- Bob enrolls, prepares, and computes successfully.
- Alice copies Bob's HDA and is rejected before any Service B call.
- Alice actively replays Bob's visible keypair/header/enrollment values and cannot enroll or compute.
- Alice, as a legitimate recipient, succeeds only after her own verified enrollment and preparation.
- Same-user HDA copies reuse the underlying Dataset preparation.
- Rotation invalidates old-generation preparations with an actionable error.
- Audience/destination mismatch, mixed incompatible inputs, anonymous use, expiry, revocation, and source-header substitution fail closed.
- Capabilities fail for the wrong job, user, dataset, source digest, destination, recipient key, expiry, or nonce, and fail when replayed.
- The vault delegation is absent from serialized job configuration and all job-visible files, parameters, command lines, environment, and logs.
- Server-created outputs receive a valid preparation for the job owner without trusting browser metadata.

## Output handling is a parallel security track

The direction in PR 23277—centralizing encrypted output handling instead of predicting every discovery path—is correct, but `ModelPersistenceContext` is not currently a universal pre-storage seam. Discovered primary outputs can update object storage directly, declared and discovered outputs take different paths, `from_work_dir` is materialized in a separate lifecycle, and non-shared Pulsar may transport data before Galaxy-side persistence.

Introduce a generic payload transform/validation abstraction rather than hard-coding Crypt4GH into the persistence layer. Its contract should be: after output identity and datatype are resolved, but before any object-store update or runner/Pulsar transfer, transform and verify the payload. The integration audit must cover:

- declared outputs;
- discovered primary outputs;
- collection elements;
- `from_work_dir` outputs;
- dynamic formats;
- extra files and composite datatypes;
- shared-filesystem and non-shared Pulsar execution.

For non-shared Pulsar, the transform will likely need a remote-side implementation so plaintext is never transported back to Galaxy. A shared filesystem implementation is a useful first adapter, not proof that the general invariant is met.

Generate an expected-output manifest before execution, update it only through trusted discovery events, and verify each expected and actual artifact. Verification should inspect Crypt4GH framing and recipient information where possible. Marker directories may coordinate work, but missing markers during an active secure job must be an error, and markers cannot define the universe of outputs by themselves.

There is also a broader leakage track that should be explicit rather than hidden in the file-output work. A malicious or merely noisy tool can emit plaintext to stdout/stderr or send it over the network. A claim that “Galaxy never sees plaintext” therefore requires a deployment policy or implementation for log suppression/encryption, network isolation or a tightly controlled tool allowlist, and fail-closed cleanup of plaintext work artifacts. If those controls are deferred, document the narrower guarantee accurately.

## Recommended implementation sequence

### Step 0: freeze the security contract

- Document the trust boundaries and invariants above in Galaxy and both services.
- Keep the feature disabled or explicitly experimental unless protected mode is configured end to end.
- Decide the stable recryptor audience identity and capability validation architecture.
- Obtain focused cryptographic review of the enrollment challenge and capability construction.

### Step 1: improve independent foundations

- Extract the generic metadata deserializer in a separate, reviewable Galaxy PR if it remains useful outside Crypt4GH.
- Fix the mock recryptor and add Bob/Alice, replay, rotation, and zero-call test scaffolding.
- Preserve the exact-origin, fail-closed CORS configuration on Service A and keep Service B off the browser CORS surface.

These can merge independently, but none should be labeled the authorization fix.

### Step 2: add Galaxy's server-side model behind a feature flag

- Add enrollment and dataset-preparation tables and service APIs.
- Add destination-aware readiness and actionable failures.
- Stop trusting or propagating legacy client-written compute metadata.
- Create preparations for outputs only through trusted finalization.

This is valuable defense in depth and creates the policy enforcement point. Until enrollment provenance and Service B authorization are protected, it is not sufficient for hostile-user isolation.

### Step 3: deliver verified enrollment and protected Service B together

- Implement the reviewed proof-of-possession/authenticated enrollment flow across Service A, Service B, and Galaxy.
- Store long-lived delegation only in Galaxy's vault.
- Require Service B protected mode and remove or disable the unauthenticated recryption path in production configurations.
- Add revocation, rotation, expiry, and audit events without logging secrets.

### Step 4: deliver job-scoped authorization before enabling compute

- Implement the trusted broker or privileged runner component.
- Bind each authorization to the complete job/dataset/destination/recipient context and enforce one-time or narrowly bounded use.
- Prove by tests and job-artifact inspection that no long-lived credential enters the job.
- Enable readiness only when Service B advertises/enforces the protected protocol; configuration mismatch fails startup or job dispatch.

Steps 3 and 4 may be separate engineering PRs, but they form one security release gate.

### Step 5: remove the legacy browser-to-job path

- Delete the client metadata write path for compute authority.
- Ignore and optionally clear legacy compute metadata lazily; do not migrate it as trusted state.
- Provide an explicit re-enrollment/re-preparation experience for existing users.

### Step 6: converge output handling

- Add the generic pre-transfer/pre-persistence transform contract.
- Route every output path through it, including non-shared Pulsar.
- Add expected-output verification and failure cleanup.
- Address or explicitly constrain stdout/stderr and network egress before making the broad no-plaintext claim.

## Enablement gate

The feature is ready for a security claim only when a full integration test demonstrates all of the following:

1. Bob can enroll, prepare, and run.
2. Alice can copy all dataset-visible and browser-visible Bob values and still cannot enroll, obtain a grant, call Service B successfully, or stage plaintext.
3. Service B rejects unscoped, expired, mismatched, and replayed authorizations.
4. The only job-visible secret is ephemeral and unusable outside its exact scope.
5. Legacy metadata grants no authority.
6. Every supported output path encrypts before transport/persistence, or unsupported paths are rejected before execution.
7. Audit records identify the principal, job, dataset, audience, key generation, and decision without containing credential material.
8. Protected mode cannot silently downgrade when a service or configuration is missing.

This is a larger step than the original Galaxy ownership lookup, but it gives each intermediate PR an honest role. Galaxy's model and readiness work remain worthwhile and can land early; the key correction is to treat them as policy and defense-in-depth infrastructure, while verified enrollment and recryptor-enforced job authorization provide the proof that the policy is actually about the right user.
