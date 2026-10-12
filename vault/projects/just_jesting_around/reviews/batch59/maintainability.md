# Batch 59 — strict maintainability review

Reviewed canonical `ee56ad6a3715b5b792d5537e84dc9f2446920d2e..bc3b5f773a059d2a19aa2be333d06ba53eaf246e` under the shared thermo-nuclear code-quality prompt, with relevant production sources and shared test guidance. Approve; no blocking structural, abstraction, type-boundary, branching, or size findings. Changes remain confined to four originator test files.

GForm keeps the native DOM dispatch and parent's real submit.prevent path. Required form lookup is explicit, wrapper teardown is owned, and an extra strict-identity assertion checks forwarding the original event rather than only counting calls or comparing structurally equal event objects. Removing unused async declarations makes these synchronous DOM assertions direct; no event harness or component mock is introduced.

Visualization API checks keep canonical typed MSW and the existing visualization factory. Comparing the whole request array to a single objectContaining entry removes an unchecked first-request assumption, retains every expected query field, permits additional keys, and requires exactly one request. The corrected capture comment matches its array-returning contract. A new shared query helper would add indirection for two explicit expectations without solving a broader need.

Tool Shed ManagePushAccess creates and injects an owned real Pinia, seeds explicitly targeted stores, registers disposal, and auto-unmounts. The one scenario keeps all original owner/collaborator/removal/current-user assertions with inline setup. There is no reason to extract a factory for this single mount or change the existing SelectUser boundary stub.

SingleItemSelector adds wrapper ownership and required-element/component lookup while preserving presence/absence assertions. Both unique-ID mounts reuse the existing inferred factory, eliminating duplicate object casts. Existing ordering and selection transitions remain visible. The loading-case title now describes its actual assertion and independent component rendering conditions, avoiding a false claim without introducing product changes or weakening checks.

No production branch grows, no file approaches 1,000 lines, and no shared helper is duplicated. Further generalization would obscure four different contracts: native event forwarding, HTTP query options, repository permissions display, and reactive selection. Existing guidance supports the improvements; no README or marginal advice change proposed.

Final identity follow-up inspected: the sole change from the initially reviewed canonical tree is `expect(onSubmit.mock.calls[0]?.[0]).toBe(event)`, which verifies the forwarded native event is the identical dispatched object. Approval includes this stronger check; no new structural concern.
