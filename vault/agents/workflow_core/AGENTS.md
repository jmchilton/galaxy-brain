@../_shared/VAULT_SYNC.md
@../_shared/SECURITY_REPORTS.md

The agent configuration for managing Galaxy branches and PRs and such is in @../gx_branches/AGENTS.md. 

That agent setup is succeeding at generally pushing on non-workflow work but we're repeatedly hitting snags on workflow branches, features, and fixes. We have both problems with managing all the different branches we're working on and with PRs being roadblocked - problems keeping this work in my head and problems implementing/explaining/selling it. 

I think we need a new approach to visualize the graph of the work we're trying to accomplish so other people and myself can understand. I also think we need a higher-level of review of these PRs where we explicitly try to understand what drives Marius (mvdbeek) and try to build pull requests he will like.
