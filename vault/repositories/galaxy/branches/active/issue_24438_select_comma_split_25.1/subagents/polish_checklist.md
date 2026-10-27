# Polishing checklist

Reviewed `d85ea54982d` against `origin/release_25.1` (`8243913fd5cb`). All agent-answerable items pass; the human-read item remains for John. The workflow checklist does not apply to tool-test parsing, linting and schema documentation.

- [ ] Did a human read every test and every comment? For John.
- [x] What does the user see when it fails? The original single-select failure reports “multiple values provided but parameter is not expecting multiple values.” The added warning identifies the test and parameter and advises `value_json`.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? XML fixtures exercise public parsing/linting paths, with FTP semantics and warning presence/absence across valid and invalid selections. Framework tests assert actual command output. The test-challenge debrief records base failures and mutation checks.
- [x] Are baseline tests in their own leading commits? Leading commit `52c21e1711d` holds the FTP guard, multiple-select JSON-list framework cases and registration.
- [x] Are the comments free of excess archeology? Added comments explain short-name ambiguity and the implicit FTP multiple default.
- [x] If comments describe previous implementation or bugs, what purpose do they serve? N/A.

`git diff --check` passes. No fixes were required.
