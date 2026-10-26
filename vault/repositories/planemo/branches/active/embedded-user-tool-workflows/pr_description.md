Fix 🎯 #1757 — run local workflows with embedded user-defined tools in Planemo-managed Galaxy.

`planemo test --docker wf.gxwf.yml` currently stops with `KeyError: 'tool_id'` when a step embeds a `GalaxyUserTool`. Bypassing discovery then exposes a second failure: the managed user cannot import that tool without the `user_tool_execute` role.

Planemo now skips embedded tool definitions when collecting toolbox dependencies and grants its managed workflow user the required role before import. Native `.ga` files and format2 workflows are covered, including nested and linked subworkflows. Docker-managed Galaxy also gets the beta-format setting already used for local Galaxy.

**Permission provisioning applies to local workflow files in Planemo-managed Galaxy; external administrators retain permission management, and direct TRS imports are outside this change.**

**Galaxy must already support embedded user tools and `user_tool_execute` roles.**

<details><summary>Validation</summary>

- Discovery tests fail on master with the reported `KeyError`; mixed native/gxformat2 tests also catch embedded IDs being treated as toolbox dependencies.
- HTTP tests verify role type, user assignment, admin authentication, existing-role reuse, replacement of deleted roles, and external-engine isolation.
- A real `planemo test --docker` run against pristine Galaxy dev `c93175dc985` passed 1/1, including the output assertion. No Galaxy code changes or manual role setup were used.
- Relevant local suites passed: 89 tests, 5 skipped. `make lint` passed.

</details>

## Risks

Managed instances retain the assigned role if their database is reused; the code change itself is easy to revert.

<details><summary>Risk Details</summary>

- Role provisioning uses existing Galaxy APIs and only runs when a local workflow embeds a user tool.
- Active-role lookup avoids reusing deleted roles listed by Galaxy 26.1.
- **The end-to-end check used local managed Galaxy with Docker job execution.** A complete Docker-hosted Galaxy deployment was not exercised.

</details>

## Context

Addresses the Planemo setup failures reported in #1757 and its duplicate #1758, downstream of galaxyproject/foundry#582. Galaxy already supports embedded user-tool import and role creation.

## Agentic Checks

### ✅ Normal review

<details><summary>Fixed deleted-role reuse and added native, nested, linked and real-run verification.</summary>

Managed permissions remain isolated from external Galaxy connections; direct TRS imports remain outside the claims.

</details>

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Reused the canonical recursive workflow walker and found no remaining structural blocker.</summary>

Discovery no longer maintains separate native/gxformat2 recursion branches. Permission setup stays in the managed configuration and API layers.

</details>
