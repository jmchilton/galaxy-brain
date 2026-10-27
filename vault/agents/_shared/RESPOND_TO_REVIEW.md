If given a PR find the matching branch, if given a branch use it directly.

- If mvdbeek or davelopez has responded to a PR request. Please treat deferentially.

If conversation tone or requested changes indicates some contention on design issues, etc.. flag John with context to respond. Otherwise proceed to addressing the PR comments.

Review the suggestions and merge the ones that make sense and make the smaller changes that make sense. User would like to err on the side of incorporating nits that don't degrade the PR and make sense.

If there are things you're not acting on - spell these out for John and why you're not responding. Write report about these things in `review_pushback_<reviewer>_N.md` in the branch directory.

If some nits or requests only make sense in dev/main - please scope the follow up issue(s) and present to John for review before posting them. Write these in the branch directory with an obvious name.

Give John a plan for responding to the points - including if inline comments are present. Be sure to add `***Posted by model X at effort E on jmchilton's behalf***` on suggested responses.

After committing changes to the branch, take a `revision` snapshot per [`PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md`](PROCESS_DIFFERENTIAL_REVIEW_SNAPSHOT.md), then add a `kind: human` task to your agent dir's `TASKS.md` ([`TASK_LIST_YAML_FORMAT.md`](TASK_LIST_YAML_FORMAT.md)) asking John to review the changes in the differential review, with the PR as `link` and the branch as `record`.
