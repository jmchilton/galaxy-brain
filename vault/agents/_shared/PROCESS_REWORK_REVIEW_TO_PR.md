You're given a review that was setup with `./PROCESS_INITIAL_REVIEW.md`. It should contain a `initial_review_response.md` file - if it does not half immediately and inform requestor.

I want the initial response composed in `initial_review_response.md` the `REVIEW_DIRECTORY` to be rewritten to `initial_pr_description.md` as a PR description against the target branch. Use the literal contents (mv the file or equiv) - do not re-compose.

Update the actions in `REVIEW_DIRECTORY/initial_response_action.md` to check open a pull request.

Rewrite `initial_review_response.md` as:

```
(Space for John to respond. -John)

I have opened a [pull request](FILL_IN_AT_RUNTIME) against your branch with findings described in said PR. Please review and incorporate them or push back on the findings. Thanks so much.

> Agent model (model) with effort (effort) acting on behalf of John.
```

