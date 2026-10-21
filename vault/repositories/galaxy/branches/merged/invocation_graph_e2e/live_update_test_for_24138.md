# Live-update graph test — handed to issue_24138_invocation_graph_refresh

The review suggested turning the terminal-state test into the issue's "open while jobs are still running" variant. It is intermittently red on dev `c63ffc2ccae`: 1 failure in 6 local runs (Selenium). On failure, the header showed "2 of 2 jobs complete" and the history was all green, but both `cat1` nodes stayed at "1 job running".

Likely cause: on dev, `InvocationGraph.vue` runs its own polling loop (`pollInvocationGraph`), which stops as soon as `isTerminal` turns true. The last graph load can come before the jobs finish, so the final states never get drawn. [issue_24138_invocation_graph_refresh](../../merged/issue_24138_invocation_graph_refresh/index.md) removes that loop and makes the graph follow the parent's polled props, which should fix it. That fix is unverified in a browser.

So this test stays off `invocation_graph_e2e`, to keep the branch green on dev. It's ready to land with the #24138 fix, or after both merge. Add `wait` back to the helper in `lib/galaxy_test/selenium/test_workflow_invocation_graph.py`:

```python
    @selenium_test
    def test_graph_updates_to_terminal_state(self):
        # Open the invocation without waiting for its jobs, so the graph has to poll its way to ok.
        self._open_two_branches_invocation(wait=False)
        self.screenshot("invocation_graph_terminal")

    def _open_two_branches_invocation(self, wait: bool = True):
        self.workflow_populator.run_workflow(WORKFLOW_TWO_BRANCHES, history_id=self.current_history_id(), wait=wait)
        ...
```

Because the failure is intermittent, a single green run on the fix branch proves little. Run it about 10 times, under Selenium at least.
