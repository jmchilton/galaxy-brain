Branch `pr_24413_review_0` (from 4f2e4126a6b) strengthens the PR's API test so it guards the round trip and the `published` value, not just the absence of the 500. Test passes locally.

- `1b881f03d8a` Assert embedded subworkflow content survives PUT round trip — checks the re-exported subworkflow still has exactly the `cat1` tool step.
- `5b6156bcc8a` Assert subworkflows built on PUT are not published — lists workflows with `show_hidden` and asserts none are published.
