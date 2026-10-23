# gxui: drive a live Galaxy with Galaxy's own UI vocabulary

Agents driving a web UI usually work from accessibility snapshots and element refs, which means a lot of reading and a lot of guessing about when the page is done. Galaxy already has a better vocabulary for its UI: `NavigatesGalaxy` methods and `navigation.yml` components, which know where things are and what to wait for. `gxui` puts that vocabulary on the command line for humans and agents, backed by one long-lived browser. A paired skill teaches agents to use it. In a small trial on a GTN tutorial (n=3, one model), agents using gxui read about half the input tokens and finished about 40% faster than with playwright-cli alone.

```console
$ gxui help collection-convert
gxui collection-convert HID CONVERTER [--timeout TIMEOUT]  (backs onto collection_edit_convert)

Convert collection HID with the converter tool named CONVERTER (pencil > Convert); prints the new hid.

The Convert tab only shows when a converter exists for the elements' datatype. Waits for the
new collection's jobs.
```

A GTN FAQ walked against a local Galaxy, excerpted from its replay script `collections_convert_datatype.gxui.sh`:

```sh
N=collconv-$$
gxui register "$N@example.org" --password faqpass123 --username "$N"
gxui history-new "collection convert faq"
gxui upload-paste ">s1
ACGT" --ext fasta --name s1.fasta
gxui upload-paste ">s2
GGCC" --ext fasta --name s2.fasta
gxui collection-build list 1,2 --name samples
gxui collection-convert 5 "Convert FASTA to Tabular"
gxui history-items
```

## More efficient than generic browser tools, in a small dated trial

We ran a GTN tutorial end to end in two ways:

- **Arm B:** an agent using only `playwright-cli` and its stock skill.
- **Arm A:** the same agent using `gxui` and its skill, with `playwright-cli` available as a fallback.

| GTN `galaxy-intro-short`, 3 runs per arm | Arm B: playwright-cli | Arm A: gxui + skill |
|---|---|---|
| Passed independent verification | 3 / 3 | 3 / 3 |
| Wall time | 24.0 / 20.1 / 29.1 min | (outage) / 13.6 / 15.7 min |
| Input tokens | 9.51 / 8.18 / 9.59M | 6.41 / 4.81 / 4.55M |
| Shell commands (failed) | 182 (16) / 193 (18) / 205 (21) | 193 (15) / 143 (7) / 67 (1) |
| Model requests | 106 / 95 / 108 | 95 / 82 / 88 |
| Mean context per request | 86–90k | 52–68k |

In these runs, input tokens fell by 42% (49% without the outage run) and wall time by about 40% (outage run excluded). Failed commands dropped from 16–21 per run to 15, 7 and 1, falling as gxui improved between runs. Run A1 was no better than arm B, so this is not yet a resilience result.

**These numbers are dated and need to be redone.** The setup was:

- **When and where:** 2026-10-07, against test.galaxyproject.org, on the tutorial with its FAQ snippets inlined.
- **Agent:** one agent and model, Codex `gpt-6.1-sol` at high effort.
- **Sample size:** n=3 per arm.
- **Arm A moved between runs:** gxui changed from run to run, and run A1 lost 43 minutes to a DNS outage on the server.
- **Missing comparisons:** no other models, and no current gxui.

There is no paired run against the Playwright MCP. What was measured on 2026-10-06 (`@playwright/mcp` 0.0.83, `@playwright/cli` 0.1.22) is the fixed cost:

- **MCP:** its default tool schemas cost about 5k tokens on every turn of every session.
- **playwright-cli:** its skill costs about 3.9k tokens, and only when it triggers.
- **Behaviour:** the two drive the same engine. Their post-action snapshots behave the same way, written to a file with only a link returned.

At about 100 model requests per run, MCP's schemas would add roughly 0.5M tokens to a ~9M-token run, about 5%. Most of the saving comes from gxui, not from picking playwright-cli over MCP.

## The skill

The `galaxy-ui-driver` skill (`jmchilton/galaxy-skills`, `gxui` branch, not yet proposed upstream) is one page (91 lines). It teaches an agent three layers to try in order:

1. **Verbs:** `history-new`, `upload-url`, `tool-describe`/`tool-fill`/`tool-run`, `workflow-run --wait`, `collection-build`, and so on.
2. **Named components:** `gxui component 'history_panel.item(hid=3).title' click`.
3. **Fallback:** `playwright-cli` attached to the same page.

It also tells the agent how to wait, chain commands, recover from failures and narrate. Its central rule:

> Before each playwright-cli command or REST call, run `gxui gap "<what was missing>"`. Gaps are the main output of a run - be specific.

Each gap is written to the session transcript, so every run leaves a list, in the agent's words, of what it had to do without gxui. The arm A runs above logged 4, 6 and 5 gaps.

## Release QA as scripts

For 26.2 QA, `gxui` has walked 18 GTN FAQs so far against a local Galaxy. Each walk-through was saved as a replayable script and re-run on its own. They surfaced #24309, #24311, #24315 and #24316.

## Looking ahead: decision models

A new kind of model, typed "System One" decision models like TypeSafe's [Jev](https://docs.typesafe.ai/primitives/choice) and the open-weight Laya, doesn't generate text. It picks one option from a fixed list (up to 255 for Jev) and returns a calibrated confidence. Vendor figures put Jev at 70–500 ms per decision, against seconds for a frontier LLM; none of this is independently verified. On a generic site, the options are raw page elements pulled from snapshots. gxui already turns Galaxy into a small, stable, documented action set: about 60 verbs plus `navigation.yml` components. Many arguments can be listed too: hids from `history-items`, and form paths and select values from `tool-describe`. So "which verb next" could go to a decision model, and the LLM is called only to write free text or when confidence is low. We haven't tried this. It's one more reason a typed UI vocabulary is worth having.

<details><summary>How gxui works</summary>

- **Packaging.** `gxui` is a script of `galaxy-selenium` and needs no test framework. It builds on `NavigatesGalaxy` helpers that land upstream separately.
- **Daemon.** A per-session daemon holds one Playwright browser and a `GalaxySeleniumContextImpl`. The thin client sends it verbs over a Unix socket.
- **Verbs.** CLI arguments and help come from each verb function's signature and docstring; for the nine method verbs, that is the `NavigatesGalaxy` method's own. Nine verbs expose a `NavigatesGalaxy` method unchanged; the rest are adapters that compose them.
- **Reaching beyond the verbs.** `gxui component PATH ACTION` reaches any `navigation.yml` component with Galaxy's waits, and `gxui call` reaches any public method.
- **Transcript.** Every call goes to a JSONL transcript with its layer (`verb`, `component`, `call`, `note`, `external`). Gaps are recorded there by hand with `gxui gap`.
- **Profiles and login.** Named profiles in `~/.config/gxui/config.yml` pick the Galaxy, the browser mode and the login source: a password, an environment variable, the OS keyring or saved storage state.
  - `login --interactive` waits in a headed browser for an SSO or 2FA sign-in.
  - `login --save` keeps the session.
  - Passwords that `gxui login` sends to the daemon stay out of process arguments, busy status, errors and transcripts.
- **Docs and tests.** Usage, profiles and login are documented in `packages/selenium/README.rst`. Unit tests are in `test/unit/selenium/test_gxui*.py`.

</details>
