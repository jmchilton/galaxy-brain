Keep iteration eleven at its implemented scope: fifteen selected unit-test reviews, reuse of existing helpers and factories, and correction of one obsolete README example description. No additional shared abstraction or product change is supported by the reviewed consumers.

## As implemented

The delta from `da55fde9518fddae07a6cf5ab67ee7c6423591c5` changes the fifteen selected suites and the README's task-monitor example row, with the table reformatted by Prettier. It covers form rendering and output labels, chat/panel/quota utilities, beacon settings, polling and task monitoring, workflow/activity/collection stores, upload helpers, and login routing; all source edits remain in tests or test documentation.

| Pros | Cons |
| --- | --- |
| • Completes the fifteen requested originators on the existing branch and worktree. | • The varied domains require review across several distinct test boundaries. |
| • Reuses existing Pinia, workflow-step, history/user and collection fixtures where they remove relevant setup. | • Small domain-specific helpers remain local when other consumers need different data. |
| • Covers cleanup, named combinations, meaningful payloads and actions without introducing dependencies or configuration changes. | • Some mocked application boundaries remain deliberately narrow. |
| • Corrects a README description that no longer matches the updated task-monitor example. | • Prettier reflows the example table around that one substantive documentation change. |

## Contract to renaming and formatting only

Keep the current wrappers, switch handlers, real-clock sleeps and duplicated fixtures, changing only names and presentation. This would reduce implementation depth but leave the overwhelming setup and opaque execution that motivated the experiment.

| Pros | Cons |
| --- | --- |
| • Produces a smaller, mechanically reviewable patch. | • Leaves repeated domain arrangement and irrelevant successful request handlers in place. |
| • Avoids changing test infrastructure boundaries. | • Loses useful improvements from awaiting actual operations, exercising real queue submission, and cleaning pending work. |

## Expand shared fixture and async harness work

Create new activity, detailed collection, Galaxy-user, legacy upload, or polling harness abstractions and migrate additional suites. The current originator reviews found either an existing useful factory or materially different neighboring inputs, so this expansion would be speculative.

| Pros | Cons |
| --- | --- |
| • Could remove more setup if future full reviews identify matching consumers. | • A collection detail fixture currently adds only elements to the existing typed summary factory. |
| • Could standardize domain defaults across later batches. | • Full Galaxy or legacy-upload defaults would obscure these tests' narrow inputs and intentional partial payloads. |
| • Follows the loop's reuse objective when a concrete benefit exists. | • A polling harness or combined task-state helper would hide scenario-specific timing or endpoint contracts. |

## Expand guidance, production changes or browser coverage

Add new best-practice prose, change the tested cache/router/upload implementations, or run and modify browser screenshot tests. The existing guidance already explains the retained patterns; this iteration supplies no production behavior change requiring those larger scopes.

| Pros | Cons |
| --- | --- |
| • Could address separate implementation or coverage goals once specific evidence exists. | • No unresolved advice from prior iterations or new useful guidance requires follow-up here. |
| • Could document the existing screens through browser captures. | • The source delta changes no rendered component, style, route implementation or E2E test. |

No scope change or user decision is recommended. This evaluation addresses the batch boundary; normal review, test challenges, strict quality review and driver validation assess correctness and retained coverage.
