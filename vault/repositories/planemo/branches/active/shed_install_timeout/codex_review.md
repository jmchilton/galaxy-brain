Run via gpt-6.1-sol (Codex reported reasoning effort "none").

Acted on the one finding: `wait_for_all_installed` polled through a fresh, timeout-less client, so a hung status GET could outlast `wait_on`'s deadline. Fixed in `edb50f4b` with a shared timeout-bearing client and a test. The test hangs on the previous head and passes after.

Not acted on: nothing.

Process note: `/codex-review` isn't installed on this Linux machine, and `codex review --base origin/master` couldn't run git because its bubblewrap sandbox failed (`bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`). The review was run as `codex exec -s read-only` with the full diff inlined in the prompt.

<details><summary>Full review</summary>

- **P2 — The installation status check can still block forever** — `planemo/galaxy/config.py:988` (`wait_on(..., timeout=self.shed_install_timeout)`). The polling callback obtains repositories through `self.tool_shed_client`, which creates a separate Galaxy client whose HTTP timeout remains unset. If that status request never returns, `wait_on` cannot regain control to enforce its deadline. **Suggested fix:** use a retained client with an explicit HTTP timeout for status polling as well, ideally capped to the remaining polling deadline. Add a test where installation returns successfully but the subsequent repository-status GET hangs.

</details>
