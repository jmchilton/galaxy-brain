# Batch 53 — scope evaluation

Keep the implemented scope: four selected originators, existing shared utilities, and their focused validation. Publish after integrated type, lint, formatting, coverage, and independent review gates pass. No production behavior change warrants screenshots or new E2E tests.

## Selected originators

Review `client/src/components/Panels/ToolBox.test.js`, `client/src/components/Tool/ToolForm.test.ts`, `client/src/components/User/UserOidcProfile.test.ts`, and `client/src/composables/upload/useUploadStaging.test.ts` as one batch. Preserve their behavior assertions and transitions while improving mock fidelity, fixture typing, lifecycle ownership, and readability. ToolForm adds two focused scenarios to make inherited loading and recent-tool behavior explicit; its independent review passed and approved 15 ancillary coverage exceptions while preserving every target location.

| Pros | Cons |
| --- | --- |
| Existing helpers remove bespoke setup; one origin commit per suite keeps review and rollback local. | Integrated gates must resolve coverage or typing issues introduced by fixture changes. |
| Stateful transition checks remain focused on client policies. | Full mount dependencies can expose unrelated configuration warnings. |

## Narrow to cosmetic changes

Restrict the batch to names, comments, and selectors, leaving existing lifecycle and fixture setup unchanged.

| Pros | Cons |
| --- | --- |
| Smaller diffs with few setup changes. | Leaves unowned effects/components and incomplete casted fixtures behind; loses concrete cleanup already supported by shared utilities. |

## Expand shared upload fixtures or helpers

Extract typed upload fixture constructors into a shared utility and seek supporting consumers.

| Pros | Cons |
| --- | --- |
| Could help future consumers of upload item types. | Current search found no second concrete consumer; exports and supporting edits would add speculative maintenance burden. |

Keep the twice-used local content fixture and existing shared effect-scope utility. No evidence supports a new shared abstraction in this batch.

## Move assertions to API or browser tests

Replace or supplement these checks with live server requests or browser upload/user/tool scenarios.

| Pros | Cons |
| --- | --- |
| Broader workflows can exercise full feature integration when product behavior changes. | Server requests cannot observe transient client state; browser setup obscures exact computed transitions and binding assertions while expanding scope. |

These changes refine existing tests without altering application behavior. Retain focused client cases and existing feature integration coverage; no new screenshots or browser/server checks are needed here.
