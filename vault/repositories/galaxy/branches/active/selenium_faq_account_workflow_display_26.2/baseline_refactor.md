Moved the behavior-preserving Visualize navigation-target cleanup into the existing helper extraction commit, ahead of the empty-catalog extension; preserved the first baseline commit and the final source tree exactly.

The prior history already separated baseline coverage from helper extraction and the empty-catalog extension. The final E2E polish commit independently deduplicated the Visualize-tab CSS lookup through the existing `dataset_view.visualize_tab` SmartTarget. That refactor works with the baseline behavior and has no dependency on the new empty-catalog helper contract, so it belongs with the existing extraction refactor rather than after the extension.

Folded that tiny cleanup into the extraction commit rather than introducing another refactor commit. The main branch remains unpublished; the original-scope alt was not changed.

| Final commit | Responsibility |
| --- | --- |
| `1046d1b61d2` | Unchanged first baseline commit: four tests of current release behavior, readiness instrumentation and realistic existing component fixture. |
| `85060de5c87` | Behavior-preserving FAQ helper extraction and consumer migrations, including the existing Visualize navigation-target reuse. The empty-catalog baseline remains inline. |
| `fbb015b3916` | Extend catalog inspection to return an empty mapping after successful dataset loading and migrate the pre-existing empty baseline to that helper. |

Commit mapping for earlier fresh reports: extraction `915fc25af54` plus polish `2f95abc74ce` became `85060de5c87`; empty extension `531119341eb` became `fbb015b3916`. Earlier reports describe the same final implementation, and their original hashes identify the reviewed/tested snapshots.

No further baseline restructuring is justified. The remaining extraction is already before the extension, and the provider marker is necessary baseline test instrumentation rather than a later product-behavior change. Moving all helpers into an earlier commit would collapse the deliberate test-before-extraction boundary.

Before rewriting, saved the full patch, affected final files and original tree hash in `/private/tmp/gx-faq-before-baseline-refactor*`. Verified afterward:

- First baseline commit is still exactly `1046d1b61d2`.
- `git diff --exit-code 2f95abc74ce HEAD` passed.
- Final tree hash before and after is `c282fb724ab4f604415a52e1f55c3f6f3699c27e`.
- Original-scope alt remains `3855a1843def697ff0330e4860f37ba6e75e6b4e`.
- Working tree is clean.
- All applicable commit hooks passed for both rewritten commits, including Python formatting/lint and other repository checks.

No source behavior or tests changed during this history-only evaluation. Existing runtime evidence applies to the identical final tree; no additional browser process was started.
