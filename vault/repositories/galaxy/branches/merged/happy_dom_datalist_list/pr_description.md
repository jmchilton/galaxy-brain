Unpin happy-dom (20.6.2 → 20.14.5) by stopping `FormText` from pointing tool text inputs at a datalist with no options.

happy-dom has been pinned to exactly 20.6.2 since 🔀 #22913. From 20.6.3, its `input.list` getter runs an unescaped `querySelector("datalist#<id>")`, and tool form ids contain pipes:

```text
DOMException: Failed to execute 'querySelectorAll' on 'Element': 'datalist#conditional_section|conditional_leaf-datalist' is not a valid selector.
```

The pin means Galaxy's client tests miss happy-dom's 20.8.8/20.8.9 security fixes and every release since. It's also why Dependabot's #22915 can't merge.

What `FormText` binds for a tool text parameter:

| Parameter | `dev` | This PR |
| --- | --- | --- |
| Text, no options (the server sends `datalist: []`) | `list="<id>-datalist"` and an empty `<datalist>` 😬 | no `list`, no `<datalist>` ✅ |
| No `datalist` sent (e.g. workflow-mode selects) | `list="<id>-datalist"` pointing at nothing 😬 | no `list` ✅ |
| Text with static options | `list="<id>-datalist"` and the options | unchanged |

😬 = a `list` that offers no suggestions in a browser, but that happy-dom ≥ 20.6.3 throws on when the id contains a pipe.

***No suggestions change in the browser: real browsers resolve `list` by id and handled these ids fine. This is about Galaxy's test DOM.***

***It doesn't fix happy-dom.*** A text parameter with static options inside a section or conditional still gets a piped datalist id. That would throw if a client test rendered one; none does today. The proper fix is upstream, in happy-dom's `list` getter (`getElementById` or `CSS.escape`).

## Risks

Risks are minimal - this change doesn't lock Galaxy into particular difficult to change choices (a two-way door).

## Context

Undoes the pin from 🔀 #22913, which explains why it was added and that it should be revisited. Supersedes Dependabot's 🔀 #22915; close it on merge.

## John's Checklist

- [x] Did a human read every test and every comment? (Requires human author to check)
- [x] What does the user see when it fails? Nothing. The browser behaviour is unchanged.
- [x] Is the diff free of unrelated or stale generated changes? Yes!
- [x] Are unit tests not just testing the literal implementation? Yes. The new `FormText` test mounts a piped id with no options and with the server's `datalist: []`, under the new happy-dom. On the previous commit the `[]` case throws the selector error.
- [x] Are the comments free of excess archeology? Yes.
- [x] If comments contain some description of previous implementation, bugs, etc.. - what purpose do they serve? N/A

## How to test the changes?
- [x] I've included appropriate [automated tests](https://docs.galaxyproject.org/en/latest/dev/writing_tests.html).

<details><summary>Tests</summary>

- `FormText.test.js` has a new test, "should not point at a datalist without options". Under happy-dom 20.14.5 its `datalist: []` case was red with the selector error until `FormText` treated an empty list as none.
- With happy-dom 20.14.5 and `dev`'s `FormText`, `FormDisplay.test.js` has 3 tests red with the same error (error highlighting, parameter replacement, conditional switch).
- On node 22.20.0, Form, Tool and Workflow Run pass (72 files, 383 tests). The full client suite passed (4196) before the empty-list fix.
- The lockfile changes only happy-dom (both importers move to 20.14.5) and the transitive packages it pulls in or drops.

</details>

## License
- [x] I agree to license these and all my past contributions to the core galaxy codebase under the [MIT license](https://opensource.org/licenses/MIT).
