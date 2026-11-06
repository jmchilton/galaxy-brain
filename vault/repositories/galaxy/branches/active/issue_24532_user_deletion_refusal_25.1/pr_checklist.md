Run via claude-sonnet at medium effort.

- [x] What does the user see when it fails? Config refusal (403004) shows "User deletion must be configured on this instance..." in the modal; any other error or failed request shows "An error occurred while deleting the user."; modal stays open, user stays logged in.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes, tests drive the mounted modal via mocked 403/network responses and assert visible alert text, button state, logout and modal-open behavior.
- [x] Are baseline tests in their own leading commits (if applicable)? Yes, db1fdf9e9ce is the first commit and only touches UserDeletion.test.ts.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A
