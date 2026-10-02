	
## The Checklist

- [ ] Did a human read every test and every comment? (Requires human author to check)
- [ ] What does the user see when it fails?
- [ ] Is the diff free of unrelated or stale generated changes?
- [ ] Are unit tests not just testing the literal implementation?
- [ ] Are the comments free of excess archeology?
- [ ] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?

## Usage

Add this in its own section above the standard Galaxy checklist.

- Agent must not check "Did a human read every test and every comment?"
- Answers should be one top-line at the most - be concise! Detailed responses should be enclosed in details tags.
	- Don't add more than a "Yes." if adding a sentence doesn't improve the answer. In particular - "Is the diff free of unrelated or stale generated changes?" should always just have a "Yes!" response. and "N/A" is probably the most common response to: "If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve?"

