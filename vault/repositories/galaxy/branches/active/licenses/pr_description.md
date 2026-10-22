# Native tool license affirmations for tool and workflow submissions

Ordinary license checkboxes are saved as tool parameters, which causes two problems. A workflow author can bake in an affirmation that future runners never see, and a rerun can replay it. This branch adds an agreement requirement that the server enforces, prompts the person running the tool, and records on each job how its agreements were authorized.

It implements the unconditional-agreement portion of [#23261](https://github.com/galaxyproject/galaxy/issues/23261). Metadata about the underlying software's license and deployment policy remain separate concerns ([#12663](https://github.com/galaxyproject/galaxy/issues/12663), [#8006](https://github.com/galaxyproject/galaxy/issues/8006)).

## Changes

- **Tool XML:** adds `<license_agreement>` under tool `<requirements>`, for profile 26.2+.
  - Terms come from a UTF-8 file next to the tool (`path`) or inline `<text>`.
  - Tool loading fails for: an older profile, unreadable terms, actions that skip execution checks, and `data_source`/`data_source_async` tools. A data source job is created by the remote site's callback, which can't carry an affirmation.
  - An agreement's identity is a versioned SHA-256 of its terms and affirmation. Display metadata is not included.
- **Scope:** `binds="submission"` is the default; the affirmation covers the jobs of one submission. `binds="user"` also allows a remembered acceptance. Declaring an agreement implies `require_login`.
- **Storage:** agreement terms, acceptance and revocation events, job authorization associations, and durable one-time invocation associations.
  - Migration `01cbf54bb541`, plus cleanup when a user is purged.
  - A persistent acceptance must confirm the hash that was displayed.
  - After a user's events are purged, job records keep the agreement hash and how it was authorized.
- **API:**
  - Discovery endpoints for tool and workflow agreements, and user acceptance endpoints.
  - `one_time_license_acceptances` on submission payloads.
  - The default tool action's bare access assertion is replaced by structured execution preconditions (`403009`, with an `unmet` list).
  - Asynchronous tool-request failures keep the structured reason.
- **Workflows:**
  - Agreements are found in nested subworkflows too.
  - An invocation request with unmet agreements is rejected.
  - Each (sub)invocation pins the one-time hashes its own steps declare.
  - Agreements are checked again as each step is scheduled. A revocation blocks later persistently authorized steps; pinned one-time authorization stays with its invocation.
- **Converters:** a converter declaring agreements is never selected for implicit or offered conversion. It can still be run directly from the Built-in Converters panel section.
- **UI:**
  - Prompts in the tool form and both workflow run forms.
  - A preferences page to manage remembered acceptances and view their history.
  - Forms refresh after a refused submission.
- **Tool tests:** test execution automatically supplies the declared agreement hashes.
- **Docs:** `doc/source/dev/tool_license_agreements.md` covers authoring, enforcement points, the API flow and operator concerns. `license_agreement` is added to the generated tool XML reference.

## Scope and known limitations

- **Not in scope:**
  - Declared agreements are unconditional and all are required. There is no input-dependent applicability and no alternative entitlements (for example academic use *or* a purchased license).
  - No production wrapper is migrated.
  - No instance-wide or admin acceptance.
  - No public view of job authorization records.
- **Conservative behavior:**
  - Workflow preflight also requires agreements for `when`-skipped steps.
  - Paused-job resume and automatic resubmission don't re-check; a new rerun or remap does.
- **Incomplete:**
  - Workflow framework tests and Planemo can't send one-time hashes yet.
  - MCP and agent runs can't send them either, so they work only with remembered acceptance.
- **Known defects still open:**
  - Identical terms declared as both `user` and `submission` are deduplicated by hash. The first declaration wins, so a remembered acceptance can satisfy a submission-bound declaration. A workflow can also pass preflight and then fail when the step is scheduled.
  - Workflow agreement discovery doesn't check tool access, so it can show the terms of tools the user can't access.
  - `/api/datatypes/converters` still lists licensed converters.

## How to test the changes?

- [x] Appropriate automated tests are included:
  - parsing, canonicalization and lint;
  - persistence, the manager and preconditions;
  - converter filtering and data-source rejection;
  - API;
  - direct and asynchronous execution;
  - nested workflow scheduling and restart;
  - cleanup;
  - client components;
  - Selenium for prompts, preferences and refusals.
- [x] The precondition extraction refactors existing access checks.
- [ ] Fresh full validation has completed.
  - The focused unit suites pass locally (manager, preconditions, parsing/hash, workflow walker, tool loading, datatypes registry).
  - The API, integration and Selenium suites passed earlier in development but haven't been rerun on the latest commits.
  - The PostgreSQL cleanup test was skipped locally.
- [ ] Manual verification with a production wrapper and operator-reviewed terms is complete.

To check by hand, load the registered `license_agreement_*` fixture tools on a migrated test server, then verify:

- an unaffirmed tool submission is blocked;
- affirming once permits that run but doesn't satisfy the next submission;
- a `binds="user"` agreement can be remembered and revoked;
- nested workflow tools produce one prompt per shared agreement.

Compare a browser submission with a direct API refusal, including delayed scheduling and how an asynchronous failure is displayed.

## License

- [ ] Author to confirm: I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
