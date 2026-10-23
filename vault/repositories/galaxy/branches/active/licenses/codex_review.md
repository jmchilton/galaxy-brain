# Codex review (re-harden pass 2): `licenses` vs `0073b5e9224`

Codex (`codex exec -s read-only`, structured findings) reviewed `0073b5e9224...e800797aa9f` fresh. The brief gave it the PR description, plus two areas to weight: the expansion since `licenses_alt_original_scope`, and the typed `UnmetPrecondition` union with its local `Model`. It also got the REVIEW_FOCUS areas. It returned **2 findings, and I confirmed both against the code**. It found nothing wrong with the typed `UnmetPrecondition` union, the `state_message` round trip (which it reproduced manually), the migration rename, the converter offering, the gxwf opt-in or pgcleanup. None of the items settled in earlier_drafts/2 has regressed.

**Acted on: both.** Each was fixed red-to-green in the commit it belongs to. The branch still has 19 commits, with "Baseline tests" first. New head: `fad3634045a`; backup: `backup/licenses_pre_codex_2` = `e800797aa9f`. Not pushed.

- **(P1, bug) A workflow run form exposed agreement terms to users without tool access.**
  - `Tool.to_json` described agreements unconditionally. `_workflow_to_dict_run` calls it for each top-level tool step, so `steps[i].license_agreements` carried the terms and affirmation. This happened even though the top-level `license_agreements` was access-filtered (rescope item a).
  - The existing test only had the licensed tool inside a subworkflow, whose steps aren't built with `to_json`, so it missed this.
  - Fix: `to_json` returns `[]` for agreements when `allow_user_access` fails.
  - Folded into `637f1c75457`, "Refresh workflow run forms when license agreements are refused", where the access-filtered discovery and its test live.
  - The client doesn't read the per-step field; the workflow forms use the top-level list. The tool build endpoint already checks access before calling `to_json`.
- **(P2, bug) `path=` terms files were missing from `get_externally_referenced_paths`.**
  - `Tool.to_archive` and Tool Shed `ToolValidator.load_tool_from_tmp_config` use it to collect a tool's companion files. Because loading requires the terms file, an archived tool or a historical Tool Shed revision failed to load.
  - Fix: also collect `requirements/license_agreement/@path`.
  - Folded into `dd2e10fa389`, "Parse and resolve `<license_agreement>`".

## Not acted on

- **None of Codex's findings.**
- **Not treated as security-sensitive.** The P1 is an access gap in unreleased branch code, of the same kind as rescope item (a), which the PR already discusses openly. No security report was written.
- **The `pr_description.md` is stale (vault side, not changed here).**
  - It says profile "26.2+", but the code, the commit message and the docs say `27.0`.
  - Its "Known defects still open" section still lists items that have since been fixed: the mixed-binds dedupe, workflow discovery ignoring tool access, and `/api/datatypes/converters`.
  - The "Incomplete" section still says workflow framework tests can't send one-time hashes, though gxwf now has an opt-in.
  - Refresh these at hand-off.
- **Carried decisions are unchanged:** the gxwf default, `binds="user"`, and the local `Model`. Codex raised nothing about any of them.

## Tests (red at old head, green after)

| Test | Red | Green |
|---|---|---|
| `test/unit/app/tools/test_tool_external_files.py::test_finds_license_agreement_terms_file` (new) | `[] != ['terms/license.txt']` | passes at `dd2e10fa389` and at HEAD |
| `test/integration/test_license_acceptance_workflows.py::test_workflow_license_agreements_hidden_from_users_without_tool_access` (strengthened) | `all(step["license_agreements"] == [] ...)` was False for the top-level step | passes |

The strengthened test adds `SIMPLE_WORKFLOW`, which has a top-level licensed step, alongside the subworkflow case. It also checks that the owner does see `[LICENSE_ID]` on that step, so the anonymous check can't pass vacuously.

## Validation at `fad3634045a`

| Check | Result |
|---|---|
| Unit tests: external files, agreement loading, tool_util agreements, manager, preconditions, actions, walk_tool_steps, workflow agreements, linters | 254 passed |
| `make mypy` | Success, 2583 files |
| ruff 0.17.1 check, black, isort, flake8 7.4.1 + bugbear (changed files) | Clean. `ruff format --check` flags existing code in `tools/__init__.py`, not the changed lines, and the black fallback passes. |
| Integration `test_license_acceptance_workflows.py` | 17 passed |
| Integration `test_license_acceptance.py` | 18 passed |
| API `test_license_agreements.py` | 18 passed |

No API model changed, so `schema.ts` wasn't regenerated. No client or UI change, so vitest and E2E weren't run.

<details>
<summary>Full Codex review (structured findings)</summary>

Coverage notes (Codex): "Coverage prioritized the requested runtime paths; some listed files were read only in relevant sections or diffs. Remaining fixture changes, browser/client test bodies, documentation wiring, and unrelated generated-schema sections were not exhaustively reviewed. All 101 focused unit tests passed. Manual reproductions confirmed both findings and a successful typed state-message round trip. Live API, PostgreSQL cleanup, browser, and client suites were not run."

### [P1] Per-step workflow run data exposes agreements without checking tool access

`lib/galaxy/tools/__init__.py:3160` (api-contract, confidence certain)

Tool.to_json unconditionally describes license agreements. WorkflowContentsManager._workflow_to_dict_run calls this for each top-level tool and embeds the result in steps, independently of the access-filtered top-level license_agreements list. Consequently, filtering describe_workflow_license_agreements does not hide the terms from the complete run response. An isolated reproduction returned the terms while tool.allow_user_access(None) was False.

**Failure scenario:** Publish a workflow containing a top-level license_agreement_path_tool step. An anonymous GET of its download?style=run response has an empty top-level license_agreements list but exposes the inaccessible tool's terms and affirmation under steps[0].license_agreements.

### [P2] File-based license terms are missing from external tool dependencies

`lib/galaxy/tools/__init__.py:1813` (correctness, confidence certain)

Loading now requires agreement path files, but AbstractTool.get_externally_referenced_paths still discovers only code and macro files. Tool.to_archive and Tool Shed historical-revision validation both rely on that existing abstraction to collect required files. The new dependency must be registered there; otherwise valid file-based declarations become unloadable when those consumers reconstruct the tool.

**Failure scenario:** Load a valid tool declaring path="license.txt", then download its tool archive and extract it elsewhere. The archive omits license.txt, and loading the extracted tool fails with Cannot read license agreement file. Reproduced with the branch's tool-loading fixture: the generated archive did not contain license.txt.

</details>
