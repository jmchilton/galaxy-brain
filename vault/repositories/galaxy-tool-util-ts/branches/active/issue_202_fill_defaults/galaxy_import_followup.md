# Galaxy import follow-up: existing fix explains the rejection

Investigated 2026-10-26 after John supplied the Galaxy agent's rejection and debrief. The rejection's no-new-issue conclusion is supported. The missing explanation is that Galaxy PR [#24272](https://github.com/galaxyproject/galaxy/pull/24272) already fixes this failure class.

## Existing fix and branch history

- PR #24272, `[26.1] Fix workflow import KeyError on missing __job_resource selector`, merged into `release_26.1` on 2026-10-20 at 14:13:26 UTC.
- Implementation commit: `9a97db13b65324badad105f8e0139864ba1d14ba`. Merge commit: `0b5bda4bf373692af08b089a7bd0e86b77f4c33e`.
- Although the title names `__job_resource`, the implementation applies to every conditional. In `lib/galaxy/tools/parameters/__init__.py::visit_input_values`, after the callback, it fills a still-absent selector using `input.test_param.get_initial_value(None, context)` before resolving the case and visiting its children.
- That is exactly the default-resolution behavior the queued draft requested. `Conditional.value_to_basic` can continue requiring a concrete selector because the caller now supplies it.
- The initially investigated development checkout, `1e6125acd93b22a682043509e9549b124546fd25`, does not contain the fix. Current locally fetched `origin/dev`, `origin/release_26.2`, and `origin/release_26.1` do contain it.
- Even the earlier local `release_26.1` ref cited in the draft, `4d652be1cd8b87c691cf9c2340333a913e00284b`, contains the fix. The earlier investigation inspected the serializer on that ref but missed its now-correct caller. Recommending a new issue for 26.1 was an investigation error.

## Audit of the rejection's tests

The YAML tests used `WorkflowPopulator.upload_yaml_workflow` without specifying `fill_defaults`. That helper sends `fill_defaults=True`, whereas the API option defaults to false. Their native tests used no input connections, so they did not exercise import's `add_dummy_datasets` traversal. Those were legitimate gaps in the evidence, but filling those gaps still produced successful imports on the fixed release branch.

I used the Galaxy backend-test skill and the same scratch checkout at `5a5850702d0807d01e83af79e6456214f30dc402`, with the same locally loaded fastp 1.4.0+galaxy0 and minimal section/conditional test tool. The new test posts directly to `POST /api/workflows` and bypasses the helper's default injection.

The matrix uses both a minimal tool and the exact fastp state from tool-util-ts #202, each as format2 and converted native workflows, with `fill_defaults` omitted, false, and true. All retain real input connections. A thirteenth control omits the minimal native workflow's connections. All 13 imports return HTTP 200 on the fixed checkout. Pytest reports one passing matrix test.

These are live API import results. Fastp is loaded locally under `fastp` rather than installed through the Tool Shed. No fastp execution is claimed. The exact Galaxy build used by the original Foundry run remains unknown, so attributing that run to a pre-fix build is an inference.

## Controlled comparison

I temporarily removed only the five lines added to the visitor by #24272, reran the same matrix, and restored the original source in a `finally` block. The restored file has no Git diff.

| Import variant | With #24272 | Without its five-line fix |
| --- | --- | --- |
| Minimal tool, format2, filling omitted / false | 200 / 200 | 500 / 500 |
| Minimal tool, native, filling omitted / false | 200 / 200 | 500 / 500 |
| Fastp, format2, filling omitted / false | 200 / 200 | 500 / 500 |
| Fastp, native, filling omitted / false | 200 / 200 | 500 / 500 |
| Either tool, either format, filling true | 200 | 200 |
| Minimal native workflow without connections | 200 | 200 |

The eight failing imports raise `KeyError: 'sel'` for the minimal tool and **`KeyError: 'eval_dups'` for fastp**, reproducing the original failure exactly. The relevant frames are:

```text
POST /api/workflows
WorkflowContentsManager._workflow_from_raw_description
WorkflowContentsManager.__module_from_dict
ToolModule.save_to_step
WorkflowModule.get_state
DefaultToolState.encode
params_to_strings
Section.value_to_basic
Conditional.value_to_basic (grouping.py:780)
KeyError: 'eval_dups'
```

The control also explains the rejection's coverage gaps: explicit default filling and connection-free imports succeed even without the fix. The rejection's conclusion is right because the target branch already has the fix, not because these omissions could never cause the reported failure.

## Implications

- Do not file the queued Galaxy draft as a new unresolved defect. Point to #24272 as the existing fix. Leave the draft and rejection artifacts in place for John's decision instead of moving or deleting the other agent's files.
- Keep tool-util-ts #207's revised contract: defaulted omitted selectors are valid, and `gxwf fill-defaults` is an optional transformation.
- Update #207's description to link the merged Galaxy fix instead of claiming the fix is still queued. No further TypeScript code change is required by this finding.
- If the original environment still fails, first identify its exact Galaxy commit/version and whether it includes `9a97db13b653`. Only investigate a new bug after reproducing on a build that contains the fix.

## Reproduction artifacts

Scratch root: `/private/tmp/claude-503/-Users-jxc755-projects-repositories-galaxy-brain-vault-agents-gx-issues/3dfd070f-a0a6-46ff-aecc-723e0a431622/scratchpad/galaxy-26.1-repro`.

Additional test: `lib/galaxy_test/api/test_conditional_default_audit.py`. It imports the two original scratch tests' workflow constants, loops over direct API imports, records statuses, and asserts every import returns 200. It intentionally fails against code without the fix.

Run from the scratch checkout:

```sh
GALAXY_CONFIG_OVERRIDE_CONDA_AUTO_INIT=false \
GALAXY_CONFIG_ENABLE_BETA_WORKFLOW_MODULES=true \
GALAXY_CONFIG_OVERRIDE_ENABLE_BETA_TOOL_FORMATS=true \
GALAXY_TEST_TOOL_CONF=lib/galaxy/config/sample/tool_conf.xml.sample,test/functional/tools/sample_tool_conf.xml \
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=lib \
.venv/bin/python -m pytest lib/galaxy_test/api/test_conditional_default_audit.py -v --tb=short
```

Results and logs are in `/tmp/conditional-default-audit-fixed.json`, `/tmp/conditional-default-audit.log`, `/tmp/conditional-default-audit-without-fix.json`, and `/tmp/conditional-default-audit-without-fix.log`. These are ephemeral and have not been committed.
