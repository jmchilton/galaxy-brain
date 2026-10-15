HOT TAKE: Unit tests are a deeply human thing.

Two of the fundamental reasons unit tests are good - are not problems with agents.

Good unit tests require good decomposition - humans feel shame when writing a ton of mocking and implementing tests with greater complexity than the feature/fix - it pushes us to decompose and design better. Humans know when they are writing a bad test and the bad test is telling them the implementation sucks. Agents don't adjust implementation based on tests - they just write around the implementation.

The test the implementation not the design.

The difference between seconds and minutes for unit tests is much more important for humans than agents. In the before times - when I run an API or Integration test in Galaxy by hand - I would click away to Slack / Github / etc.. between runs. This causes time loss and context loss. Agents don't have these problems - when a whole implementation takes 30 minutes for the agent - what does seconds vs minutes unit tests really matter?

It still matters - but the amount of communication between implementation, agents, and humans these Storybook tests impart is worth that slow down. Our review time should be prioritized over unit test run time up to a point - and these are much easier to review and the review covers so much more to see the story in action.


