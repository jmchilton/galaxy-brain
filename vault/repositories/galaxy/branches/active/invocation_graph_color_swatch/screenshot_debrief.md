# Screenshot debrief

**BLOCKER: port contention.** No screenshots captured. Ports 8080 and 5173 were held for the whole window by another session's Galaxy and Vite, from the `invocation_graph_e2e` worktree (gunicorn PIDs 61181/61286, vite PID 58969). Per the one-Galaxy-at-a-time rule I didn't kill them and didn't start a server on other ports. I waited about 35 minutes and the ports never freed. The fix itself is fine; nothing is wrong with the implementation. Rerun this step once the machine is free.

## Relevance

The screenshots are relevant: the change is visible on the invocation Overview graph. The branch has no E2E screenshot steps, and no existing Selenium or Playwright test runs a workflow with a `color` parameter (see test_challenges_debrief.md), so there is no test to extend. The plan was to drive the UI by hand. I added no E2E test.

## Done so far

- Bootstrapped the worktree with `jmchilton:galaxy-bootstrap`: `.venv`, Playwright, client deps, `config/galaxy.yml`. The worktree is still clean (`git status --short` is empty).
- Confirmed `gx_color` loads under `GALAXY_RUN_WITH_TEST_TOOLS=1`, through `<tool_dir dir="parameters/"/>` in `sample_tool_conf.xml`.

## Recipe for the retry

1. Check `lsof -i :8080 -i :5173` again right before starting.
2. Start Galaxy: `GALAXY_CONFIG_OVERRIDE_BOOTSTRAP_ADMIN_API_KEY=colorswatchbootkey123 NO_PROXY=* GALAXY_SKIP_CLIENT_BUILD=1 GALAXY_RUN_WITH_TEST_TOOLS=1 sh run.sh --skip-wheels`.
3. Start Vite from this worktree: `npm_config_use_node_version=22.20.0 make client-dev-server`.
4. Set up the data: create the user `jmchilton@gmail.com` with the bootstrap key, upload the workflow below, and invoke it with a vivid color (`#e31a1c`) for step 0.
5. "After": open `http://localhost:5173/workflows/invocations/<id>` on the Overview tab. Screenshot the parameter node, at element level or zoomed in, because `.truncate` can clip the swatch. If it still shows bold hex, inspect `steps[0].outputs[0].type` in the full-workflow payload. The unit tests mocked that value; nothing has yet checked it against a real server.
6. "Before": `git show origin/dev:client/src/composables/useInvocationGraph.ts > client/src/composables/useInvocationGraph.ts`, wait for HMR to reload, take the screenshot, then `git restore` the file. Don't use `git stash` or `git checkout origin/dev -- path`.
7. Save the images to `screenshots/`, stop only the servers you started, and confirm the worktree is clean.

<details><summary>Demo workflow (native .ga)</summary>

```json
{
  "a_galaxy_workflow": "true", "format-version": "0.1", "name": "Color parameter swatch demo", "annotation": "",
  "steps": {
    "0": {"id": 0, "type": "parameter_input", "label": "Highlight color", "name": "Input parameter",
          "tool_id": null, "tool_state": "{\"parameter_type\": \"color\", \"optional\": false}",
          "inputs": [{"description": "", "name": "Highlight color"}], "outputs": [], "input_connections": {},
          "position": {"left": 0, "top": 0}, "annotation": "", "workflow_outputs": []},
    "1": {"id": 1, "type": "tool", "label": "Echo color", "name": "gx_color", "tool_id": "gx_color", "tool_version": "1.0.0",
          "tool_state": "{\"parameter\": {\"__class__\": \"ConnectedValue\"}}",
          "input_connections": {"parameter": {"id": 0, "output_name": "output"}},
          "inputs": [], "outputs": [{"name": "out_file1", "type": "txt"}],
          "position": {"left": 320, "top": 0}, "annotation": "", "workflow_outputs": []}
  }
}
```

Invoke with `POST /api/workflows/{id}/invocations` and `{"history_id": ..., "inputs": {"0": "#e31a1c"}, "inputs_by": "step_index"}`. If the tool step causes trouble, drop step 1; the parameter node alone is enough to show the swatch.

</details>
