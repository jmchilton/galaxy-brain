Implement 🎯 #1746 - fail `planemo test` tool tests that print one of their secrets.

A tool can get secrets from Galaxy: credentials from the vault, or the user's API key via `inject="api_key"`. If the tool prints one, Galaxy saves it in the job's stdout and stderr, in the dataset info and in outputs, where anyone the history is shared with can read it. Galaxy core won't mask these (galaxyproject/galaxy#23878), so they need to be caught before the tool ships. Today a tool like this passes `planemo test`:

```xml
<command>echo "request rejected for token \$API_TOKEN" >&2 && echo "done" > '$output'</command>
...
<test>
    <credentials name="leaky_service">
        <secret name="API_TOKEN" value="fake_token_4c1d2e"/>
    </credentials>
    ...
```

With this branch the test fails, and `tool_test_output.json` reports:

```
Secret 'API_TOKEN' of credentials 'leaky_service' was found in job stderr.
Secret 'API_TOKEN' of credentials 'leaky_service' was found in the info of output 'output'.
```

A tool that writes `printf '%s' "$GX_API" | base64 > '$output'` fails with `The test user's API key was found (base64-encoded) in output 'output'.`

**It's always on, and tests fail only if a test secret or the test user's API key appears in stdio or outputs - including tools that write the key on purpose.** **This doesn't mask anything:** the report still holds the raw stdout and stderr, and failure messages name the secret, never its value. **Only Galaxy tool tests (`planemo test`, `planemo shed_test`) are checked; workflow and CWL tests aren't.** Test secrets are fake values written in the test XML, so no mock service is needed. A fake secret just gets rejected, and that error path (`curl -v`, tracebacks, request logs) is where tools usually leak.

<details><summary>What's checked</summary>

- **Secrets:** each `<secret>` value in the test's `<credentials>`, plus the API key planemo runs the test as. The API key is checked for every tool, not only `inject="api_key"` ones. A 32+ character key doesn't collide by accident.
- **Where:** the job's stdout, stderr and job messages, and each output dataset's info and content, including collection elements (declared and discovered). Tests that expect the job to fail are checked too.
- **Encodings:** plain, base64 (any alignment, line-wrapped, URL-safe alphabet) and URL-encoded. Base64 runs in the content are decoded and searched, so a partial match doesn't count.
- **Not checked (best effort):**
  - composite or `extra_files` contents
  - stdio past Galaxy's truncation point
  - values transformed in other ways
- **Short secrets:** secrets shorter than 8 characters are skipped with a warning, because values like `test` would match unrelated output.
- **Fail closed:** if the check itself can't fetch something from Galaxy, the test is marked `error` with the reason, not passed.

</details>

<details><summary>Why in planemo and not <code>galaxy.tool_util.verify</code></summary>

The issue left this open.

- **Planemo has everything it needs.** It hooks the `register_job_data` callback planemo already passes to `verify_tool`. That callback has the job and its status, the test dict carries the secret values, and outputs are still fetchable before the test history is deleted. One hook covers the local, Docker and external Galaxy engines.
- **A default-on check in core verify would fail Galaxy's own tests.** Galaxy's `environment_variables_inject.xml` test tool writes the injected API key to an output on purpose.
- **No release wait.** It ships without waiting on a `galaxy-tool-util` release.

</details>

<details><summary>Tests</summary>

- **Integration:** `tests/test_cmd_test.py::CmdTestTestCase::test_fails_tests_that_leak_secrets` runs `planemo test` on seven fixture tools in `tests/data/tools/secret_leak_tools/`:
  - a secret leaked to stderr
  - a secret leaked into a declared collection element
  - a secret leaked into a discovered collection element
  - a secret leaked to stderr by a job the test expects to fail
  - the API key leaked base64-encoded into an output
  - two clean credential tools (one passing, one expected to fail) that only print the secret's length or nothing

  It asserts the exact status and problem list for each. On `master` all seven pass. Here the five leaky ones fail and the two clean ones pass.
- **Unit:** `tests/test_galaxy_test_secrets.py` covers:
  - base64 at every alignment, wrapped, URL-safe and unpadded
  - rejecting a partial base64 match
  - URL encoding
  - skipping short secrets
  - failing closed on API errors and malformed credentials

</details>

## Risks

Risks are minimal - this change doesn't lock the project into particular difficult to change choices (a two-way door). Tool tests that print a test secret or the API key now fail where they passed before, which is the point. There is no opt-out. The scan downloads every output of every tool test in full and holds it in memory, including outputs no assertion read before, so tests with very large outputs get slower and use more memory.

## Context

Follows the Galaxy dev meeting outcome on galaxyproject/galaxy#23878 (no masking in core; catch leaky tools in planemo).

## Agentic Checks

### ✅ [Cursor's Thermo Nuclear Review](https://github.com/jmchilton/galaxy-brain/blob/main/vault/agents/_shared/prompts/thermo-nuclear-code-quality-review.md)

<details><summary>Replaced encoded-needle matching with one base64 decode pass, which fixed a missed unpadded base64url leak.</summary>

- Merged the hook into a single `check_for_secret_leaks` call.
- Moved secret collection inside the fail-closed path, so a malformed credential errors that test instead of aborting the run.
- Checked the HTTP status of the dataset-info fetch.
- `secrets.py` shrank from 139 to 124 lines.

</details>

### ✅ Second Frontier Model Review

<details><summary>Fixed collection outputs erroring passing tests and partial base64 false positives.</summary>

- `jobs/{id}/outputs` lists collections without a `dataset` key, so every passing test with a collection output became an `error`. Collections are now skipped, and their elements are scanned as datasets (new fixture).
- A partial base64 match no longer counts.
- Left as decisions: scanning `extra_files`, and the 8-character minimum.

</details>
